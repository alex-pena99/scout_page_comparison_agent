"""Package a verified comparison for the existing private Scout viewer."""

import argparse
from collections import Counter
from datetime import datetime
from hashlib import sha256
from pathlib import Path
from shutil import copy2
import sys
from zipfile import ZIP_DEFLATED, ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'comparison'))
from compare import ROLES, compare, load_captures, read, safe_file, save


TITLE = 'Headline pricing and offer comparison'


def capture_time(captures):
    intervals = sorted((datetime.fromisoformat(item['started'].replace('Z', '+00:00')),
                        datetime.fromisoformat(item['finished'].replace('Z', '+00:00')))
                       for capture in captures.values() for item in capture['record']['queue'])
    if not intervals:
        return None
    start, end = intervals[0]
    active = 0
    for next_start, next_end in intervals[1:]:
        if next_start > end:
            active += (end - start).total_seconds()
            start = next_start
        end = max(end, next_end)
    active += (end - start).total_seconds()
    return {'wall_seconds': (end - intervals[0][0]).total_seconds(), 'active_seconds': active}


def failure(record):
    attempt = record['attempts'][-1] if record['attempts'] else {}
    error = attempt.get('error') or ''
    if 'ERR_CERT' in error:
        return 'Chromium rejected the destination TLS certificate.'
    if (attempt.get('httpStatus') or 0) >= 400:
        return f"Destination returned HTTP {attempt['httpStatus']}."
    if 'timeout' in error.casefold():
        return 'The page did not reach a usable rendered state within the capture limits.'
    return 'No usable headline rendered. See the capture record.'


def panel(key, capture, review, files):
    if not key:
        return {'sourceUrl': '', 'finding': 'The supplied inventory URL is blank or unusable.', 'quotes': []}
    states = capture['states']
    record = capture['record']
    baseline = next(iter(states.values()), None)
    result = {'sourceUrl': record['target']['prepared'], 'captureFile': key + '-capture.json',
              'finding': review.get('finding') or ('Rendered desktop landing page.' if baseline else failure(record)),
              'quotes': list(dict.fromkeys(quote for item in review.get('evidence', []) for quote in item['quotes']))}
    if baseline:
        result['finalUrl'] = baseline['url']
        selected = [states[item['state']] for item in review.get('evidence', [])]
        image = next((state for state in reversed(selected) if state['png']), baseline)
        if image['png']:
            filename = safe_file(f"{key}-{image['png']}")
            artifact = files / filename
            if not artifact.exists():
                copy2(capture['directory'] / safe_file(image['png']), artifact)
            result['screenshot'] = {'file': filename, 'alt': 'Captured desktop headline evidence',
                                    'caption': 'Saved desktop view for this comparison'}
    return result


def build(root, output):
    spec = read(root / 'input.json')
    decision = read(root / 'checkpoint-comparisons.json')
    captures = load_captures(spec, root / 'evidence')
    pairs = {}
    for result in decision['rows']:
        keys = result['captures']
        pair = '/'.join(keys[role] or 'missing' for role in ROLES)
        if result['review']:
            if pair in pairs and pairs[pair] != result['review']:
                raise ValueError('Equivalent URL pairs have inconsistent reviews')
            pairs[pair] = result['review']
    if decision != compare(spec, captures, {'pairs': pairs}):
        raise ValueError('Comparison checkpoint disagrees with the captured evidence and selected rows')
    if spec['results']['report_title'] != TITLE:
        raise ValueError('The selected report title is incompatible with this builder')

    output.mkdir(mode=0o700)
    files = output / 'evidence'
    files.mkdir()
    for key, capture in captures.items():
        copy2(capture['directory'] / 'capture.json', files / safe_file(key + '-capture.json'))
    views, rows, panels = {}, [], {}
    for source, finding in zip(spec['rows'], decision['rows']):
        row = {'number': source['row'],
               'name': f'{source["Account"]} — {source["Creative Name"] or "Unnamed inventory record"}',
               'status': finding['status'], 'reason': finding['reason'], 'contentFinding': finding['contentFinding']}
        for role in ROLES:
            key = finding['captures'][role]
            review = finding['review'].get(role, {})
            signature = (key, repr(review))
            if signature not in views:
                view = f'view-{len(views) + 1:03}'
                views[signature] = view
                panels[view] = panel(key, captures.get(key), review, files)
            row[role + 'Capture'] = views[signature]
        rows.append(row)

    documents = []
    for filename, label in (('checkpoint-selection.json', 'Pinned inventory selection'),
                            ('checkpoint-comparisons.json', 'Headline comparisons and coverage')):
        copy2(root / ('input.json' if filename == 'checkpoint-selection.json' else filename), files / filename)
        documents.append({'file': filename, 'label': label})
    for source in sorted((root / 'evidence').glob('runtime-*.json')):
        copy2(source, files / safe_file(source.name))
        documents.append({'file': source.name, 'label': source.stem.replace('-', ' ').capitalize()})
    keys = list(captures)
    for index in range(0, len(keys), 40):
        subset = keys[index:index + 40]
        filename = f'raw-evidence-{index // 40 + 1:02}.zip'
        with ZipFile(files / filename, 'x', ZIP_DEFLATED, compresslevel=3) as archive:
            for key in subset:
                for source in sorted(captures[key]['directory'].iterdir()):
                    if source.is_file() and source.suffix in ('.json', '.png'):
                        archive.write(source, f'{key}/{safe_file(source.name)}')
        documents.append({'file': filename, 'label': f'Raw evidence · {subset[0]} to {subset[-1]}'})

    date = datetime.fromisoformat(spec['pre_capture_checkpoint_utc'])
    timing = capture_time(captures)
    limitations = [
        'Desktop headline pricing and offers only. Eligibility, complete terms and administrative details are outside scope.',
        f'Tracking templates were opened as supplied in {spec["region"]}. No ZIP or address was submitted.',
        f'Instructions {spec["revision"]}. Inventory {spec["inventory_revision"]}. Runner {spec["runner_git_revision"]}.',
    ]
    if timing:
        limitations.append(f'Capture wall time {timing["wall_seconds"]:.1f} seconds across '
                           f'{timing["active_seconds"]:.1f} seconds with an active capture. '
                           'Wall time includes gaps between capture tasks.')
    report = {'id': spec['audit_id'], 'name': TITLE, 'date': date.date().isoformat(),
              'displayDate': date.strftime('%B %d, %Y'),
              'scope': f'{len(rows)} CSV records · {len(keys)} unique usable entry URLs',
              'rows': rows, 'captures': panels, 'documents': documents,
              'limitations': limitations, 'captureTiming': timing}
    save(output / 'report.json', report)
    manifest = {}
    for file in sorted(files.iterdir()):
        digest = sha256()
        with file.open('rb') as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                digest.update(chunk)
        manifest[file.name] = digest.hexdigest()
    save(output / 'evidence-manifest.json', manifest)
    print(f"Built {len(rows)} rows, {len(manifest)} evidence files", dict(Counter(row['status'] for row in rows)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run_dir', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    build(args.run_dir, args.output or args.run_dir / 'published')


if __name__ == '__main__':
    main()
