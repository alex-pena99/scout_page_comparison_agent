"""Resolve reviewed headline facts against captured evidence and aggregate row results."""

import argparse
import json
from pathlib import Path
import re
import unicodedata


ROLES = ('vanity', 'tracking')
CHECKS = {'pricing', 'promo_codes', 'benefits_inclusions', 'dates_durations'}
FIELDS = ('product', 'prices', 'savings', 'benefits', 'promo_codes', 'durations')
GAP_FIELDS = ('section_or_action', 'affected_headline_offer', 'necessary_headline_field_unreadable',
              'why_existing_headline_evidence_is_insufficient', 'affected_checks_and_records')
SAFE_FILE = re.compile(r'[a-z0-9][a-z0-9-]{0,79}\.(?:json|png|zip)')


def read(path):
    return json.loads(path.read_text())


def save(path, value):
    with path.open('x') as file:
        json.dump(value, file, indent=2, ensure_ascii=False)
        file.write('\n')


def safe_file(name):
    if not isinstance(name, str) or not SAFE_FILE.fullmatch(name):
        raise ValueError(f'Invalid evidence filename: {name!r}')
    return name


def load_captures(spec, evidence):
    captures = {}
    for target in spec['targets']:
        key = target['key']
        if not re.fullmatch(r'entry-[a-z0-9-]+', key):
            raise ValueError('Invalid capture key')
        directory = evidence / key
        record = read(directory / 'capture.json')
        for field in ('audit_id', 'runner_revision', 'inventory_revision', 'config_version', 'revision'):
            if record[field] != spec[field]:
                raise ValueError(f'{key} has the wrong {field}')
        if record['target'] != target:
            raise ValueError(f'{key} target differs from the selected inventory')
        states = {}
        for attempt in record['attempts']:
            if attempt.get('invalidatedVisit'):
                states.clear()
            if not attempt['ready']:
                continue
            for state in attempt['states']:
                data = read(directory / safe_file(state['json']))
                if any(data[field] != state[field] for field in ('name', 'id', 'json', 'png', 'fingerprint')):
                    raise ValueError(f'{key} state does not match its checkpoint')
                if state['png'] and not (directory / safe_file(state['png'])).is_file():
                    raise ValueError(f'{key} has a missing screenshot file')
                states[state['name']] = {
                    **state, 'visibleText': data['visibleText'],
                    'frameEvidence': [{'data': {'visibleText': frame['data']['visibleText']}}
                                      for frame in data.get('frameEvidence', []) if 'data' in frame],
                }
        captures[key] = {'record': record, 'states': states, 'directory': directory}
    return captures


def normalize(text, field):
    if field == 'promo_codes':
        return text.strip()
    text = ' '.join(unicodedata.normalize('NFKC', text).casefold().split())
    text = re.sub(r'[‐‑–—−]', '-', text).rstrip('.')
    text = re.sub(r'(?<=\d)[ -](?=(?:day|month|year)\b)', ' ', text)
    text = re.sub(r'(?<=\d),(?=\d{3}\b)', '', text)
    if field == 'prices':
        text = re.sub(r'\s*(?:/\s*| per )(mo\.?|month|yr\.?|year|line)\b',
                      lambda match: '/' + {'mo': 'month', 'yr': 'year'}.get(
                          match[1].rstrip('.'), match[1]), text).rstrip('.')
        text = re.sub(r'\$\s+(?=\d)', '$', text)
        text = re.sub(r'(\$\d[\d,]*)\.00(?!\d)', r'\1', text)
    return text


def reviewed_side(side, capture):
    if set(side) - {'offers', 'gaps', 'finding', 'evidence'} or not side['finding'].strip():
        raise ValueError('Each reviewed side needs a finding and only supported fields')
    gaps = side.get('gaps', [])
    for gap in gaps:
        if set(gap) != set(GAP_FIELDS) or any(not str(value).strip() for value in gap.values()):
            raise ValueError('Describe each necessary headline evidence gap in all five fields')
    evidence = {}
    for item in side['evidence']:
        if set(item) - {'state', 'quotes', 'source'} or item.get('source', 'text') not in ('text', 'image'):
            raise ValueError('Use only text or image evidence from a named capture state')
        data = capture['states'][item['state']]
        if item.get('source') == 'image':
            if not data['png']:
                raise ValueError('An image transcription requires a saved screenshot')
        else:
            extracted = ' '.join([data['visibleText'], *(frame['data']['visibleText']
                                 for frame in data.get('frameEvidence', []) if 'data' in frame)])
            if any(' '.join(quote.split()) not in ' '.join(extracted.split()) for quote in item['quotes']):
                raise ValueError('A quote does not appear in its visible capture state')
        if item['state'] in evidence or any(not quote.strip() for quote in item['quotes']):
            raise ValueError('Use one evidence entry per state and omit blank quotes')
        evidence[item['state']] = item
    offers = {}
    for offer in side['offers']:
        if (set(offer) - {'id', 'fields', 'unknown', 'state'} or offer['id'] in offers or
                not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', offer['id']) or offer['state'] not in evidence or
                not evidence[offer['state']]['quotes']):
            raise ValueError('Each aligned offer needs a unique ID and a cited state with quotes')
        unknown = offer.get('unknown', [])
        fields = offer['fields']
        if (set(unknown) - set(FIELDS) or set(fields) - set(FIELDS) or set(unknown) & fields.keys() or
                (unknown and not gaps) or (not fields and not unknown)):
            raise ValueError('Offer contains invalid fields or undocumented unknown headline facts')
        for values in fields.values():
            if not isinstance(values, list) or any(not isinstance(value, str) or not value.strip() for value in values):
                raise ValueError('Headline fields must be lists of nonempty canonical values')
        offers[offer['id']] = offer
    if not evidence:
        raise ValueError('A reviewed page needs a captured state, including for a confirmed absence')
    return offers


def decide(review, available, blockers):
    """Compare aligned offers. Independent differences take precedence over gaps."""
    if set(review) - {'correspondence', 'reason', *ROLES}:
        raise ValueError('Invalid pair review fields')
    if not all(available.values()):
        return 'Needs Review', blockers
    correspondence = review['correspondence']
    if correspondence not in ('corresponding', 'unrelated', 'uncertain'):
        raise ValueError('Choose an explicit correspondence result')
    if correspondence != 'corresponding':
        if not review['reason'].strip():
            raise ValueError('Explain why there is no identifiable comparable offer')
        return 'Needs Review', [review['reason']]
    sides = {role: reviewed_side(review[role], capture) for role, capture in available.items()}
    gaps = [f"{role.title()} {gap['necessary_headline_field_unreadable']}"
            for role in ROLES for gap in review[role].get('gaps', [])]
    differences = []
    vanity, tracking = (sides[role] for role in ROLES)
    for offer_id in sorted(vanity.keys() | tracking.keys()):
        if offer_id not in vanity or offer_id not in tracking:
            absent = 'vanity' if offer_id not in vanity else 'tracking'
            if not review[absent].get('gaps'):
                differences.append(f'{offer_id} is absent from the readable {absent} page')
            continue
        left, right = vanity[offer_id], tracking[offer_id]
        for field in FIELDS:
            if field in left.get('unknown', []) or field in right.get('unknown', []):
                continue
            # A gap can hide unstated data. Only compare independently documented fields on that side.
            if ((review['vanity'].get('gaps') and field not in left['fields']) or
                    (review['tracking'].get('gaps') and field not in right['fields'])):
                continue
            a, b = left['fields'].get(field, []), right['fields'].get(field, [])
            if {normalize(value, field) for value in a} != {normalize(value, field) for value in b}:
                differences.append(f"{offer_id} {field.replace('_', ' ')} differs: "
                                   f"{', '.join(a) or 'not displayed'} versus {', '.join(b) or 'not displayed'}")
    if differences:
        return 'Mismatch', differences + gaps
    if gaps:
        return 'Needs Review', gaps
    if not vanity and not tracking:
        return 'Needs Review', ['No identifiable comparable headline offer']
    return 'Match', ['Displayed headline pricing and offers agree']


def compare(spec, captures, reviews):
    if (spec['config_version'] != 5 or spec['comparison']['scope_version'] != 'headline-offers-v1' or
            len(spec['checks']) != len(CHECKS) or set(spec['checks']) != CHECKS or set(reviews) - {'pairs'}):
        raise ValueError('Invalid headline review scope')
    pairs = reviews['pairs']
    rows = []
    used = set()
    for row in spec['rows']:
        keys = {role: row[role + '_capture'] for role in ROLES}
        pair = '/'.join(keys[role] or 'missing' for role in ROLES)
        available = {role: captures[key] if key and captures[key]['states'] else None for role, key in keys.items()}
        blockers = [row['input_blockers'].get(role, f'{role.title()} page unavailable or no usable capture')
                    for role in ROLES if not available[role]]
        review = pairs.get(pair, {})
        if not blockers and not review:
            raise ValueError(f'Row {row["row"]} requires a reviewed pair: {pair}')
        if review:
            used.add(pair)
        status, reasons = decide(review, available, blockers)
        for role, capture in available.items():
            if role in review and capture and (blockers or review.get('correspondence') != 'corresponding'):
                reviewed_side(review[role], capture)
        rows.append({'number': row['row'], 'status': status, 'reason': reasons[0],
                     'contentFinding': '. '.join(reasons).rstrip('.') + '.',
                     'captures': keys, 'review': review})
    if set(pairs) - used:
        raise ValueError('Review file contains pairs outside the selected inventory')
    return {'audit_id': spec['audit_id'], 'runner_revision': spec['runner_revision'],
            'revision': spec['revision'], 'rows': rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run_dir', type=Path)
    parser.add_argument('reviews', type=Path)
    args = parser.parse_args()
    spec = read(args.run_dir / 'input.json')
    result = compare(spec, load_captures(spec, args.run_dir / 'evidence'), read(args.reviews))
    save(args.run_dir / 'checkpoint-comparisons.json', result)
    print(f"Compared {len(result['rows'])} selected rows")


if __name__ == '__main__':
    main()
