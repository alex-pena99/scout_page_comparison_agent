"""Create a private, pinned selection checkpoint before any browser work."""

import argparse
import csv
from datetime import datetime, timezone
from hashlib import sha256
import io
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
GUIDES = (
    'README.md', 'coordinate-scout-audit/SKILL.md', 'references/capture-execution.md',
    'config/audit-config.json', 'pricing-comparison-workflow-guide.md',
    'compare-promo-codes.SKILL.md', 'compare-benefits-inclusions.SKILL.md',
    'compare-dates-durations.SKILL.md', 'compare-advertised-requirements.SKILL.md',
)


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])


def revision(ref):
    return git('rev-parse', '--verify', '--end-of-options', ref + '^{commit}').decode().strip()


def pinned(ref, file):
    return git('show', f'{ref}:{file}')


def navigation_url(original):
    value = original.strip()
    if not value or re.search(r'[\s\\]', value):
        return None
    prepared = value if re.match(r'https?://', value, re.I) else 'https://' + value
    try:
        parts = urlsplit(prepared)
        if (not parts.hostname or '.' not in parts.hostname or parts.username is not None or
                parts.password is not None):
            return None
        _ = parts.port
    except ValueError:
        return None
    return prepared


def map_records(records, selected):
    targets = {}
    rows = []
    for number in selected:
        row = {**records[number], 'row': number, 'input_blockers': {}}
        for role, column in [('vanity', 'Vanity URL'), ('tracking', 'Tracking URL')]:
            original = row[column]
            prepared = navigation_url(original)
            if prepared is None:
                row[role + '_capture'] = None
                row['input_blockers'][role] = f'Missing or unusable {role} URL'
                continue
            target = targets.setdefault(prepared, {
                'key': f'entry-{len(targets) + 1:03}', 'original': original, 'prepared': prepared,
                'rows': [], 'roles': [],
            })
            if number not in target['rows']:
                target['rows'].append(number)
            if role not in target['roles']:
                target['roles'].append(role)
            row[role + '_capture'] = target['key']
        rows.append(row)
    return rows, list(targets.values())


def prepare(args):
    instructions = revision(args.instructions)
    runner = revision(args.runner)
    runner_bytes = pinned(runner, 'capture/capture.cjs')
    if Path(__file__).with_name('capture.cjs').read_bytes() != runner_bytes:
        raise ValueError('The local runner differs from the pinned runner revision')
    config = json.loads(pinned(instructions, 'config/audit-config.json'))
    if config['comparison']['scope_version'] not in ('headline-offers-v1', 'default-view-headlines-v1') or config['config_version'] != 5:
        raise ValueError('This runner requires config v5 and a supported headline scope')
    inventory_file = config['inventory']['path']
    inventory_ref = instructions
    pilot = json.loads(pinned(instructions, 'config/pilot-config.json')) if args.pilot else None
    if pilot:
        inventory_ref = revision(pilot['inventory']['revision'])
        if inventory_file != pilot['inventory']['path']:
            raise ValueError('Pilot inventory path differs from the active inventory path')
    raw = pinned(inventory_ref, inventory_file)
    columns = config['inventory']['required_columns']
    reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig'), newline=''))
    if not set(columns) <= set(reader.fieldnames or []):
        raise ValueError('Inventory is missing required columns')
    records = {number: {column: row[column] for column in columns}
               for number, row in enumerate(reader, 2)}
    if any(value is None for row in records.values() for value in row.values()):
        raise ValueError('Inventory contains a truncated record')
    if pilot:
        selection = pilot['selection']
        guarded = {entry['csv_row']: entry['expected_record'] for entry in selection['records']}
        if (len(guarded) != len(selection['records']) or len(guarded) != selection['expected_count'] or
                sha256(raw).hexdigest() != pilot['inventory']['sha256_utf8'] or
                git('rev-parse', f'{inventory_ref}:{inventory_file}').decode().strip() != pilot['inventory']['git_blob_sha'] or
                any(records.get(number) != row for number, row in guarded.items())):
            raise ValueError('Pilot revision, hash, count or row guard failed')
        selected = list(guarded)
    else:
        selected = [int(value) for value in args.rows.split(',')] if args.rows else list(records)
    if not selected or len(set(selected)) != len(selected) or set(selected) - records.keys():
        raise ValueError('Select unique existing CSV data rows')
    rows, targets = map_records(records, selected)
    now = datetime.now(timezone.utc)
    audit_id = args.audit_id or now.strftime('scout-headlines-%Y%m%d-%H%M%S-%f-') + instructions[:7]
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', audit_id):
        raise ValueError('Invalid audit ID')
    hashes = {name: sha256(pinned(instructions, name)).hexdigest() for name in GUIDES}
    if pilot:
        hashes['config/pilot-config.json'] = sha256(pinned(instructions, 'config/pilot-config.json')).hexdigest()
    return {
        'audit_id': audit_id, 'revision': instructions, 'inventory_revision': inventory_ref,
        'runner_git_revision': runner, 'runner_revision': 'sha256:' + sha256(runner_bytes).hexdigest(),
        'config_version': config['config_version'], 'source_hashes': hashes,
        'inventory_sha256': sha256(raw).hexdigest(), 'pre_capture_checkpoint_utc': now.isoformat(),
        'region': args.region, 'settings': config['capture'], 'comparison': config['comparison'],
        'results': config['results'], 'checks': config['checks'], 'tracking_policy': config['tracking_urls'],
        'rows': rows, 'targets': targets,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-dir', type=Path, required=True)
    parser.add_argument('--region', required=True, help='Actual browser execution region')
    parser.add_argument('--audit-id')
    parser.add_argument('--instructions', default='HEAD')
    parser.add_argument('--runner', default='HEAD')
    filters = parser.add_mutually_exclusive_group()
    filters.add_argument('--rows', help='Comma-separated CSV data rows, header is row 1')
    filters.add_argument('--pilot', action='store_true')
    args = parser.parse_args()
    try:
        data = prepare(args)
        args.run_dir.mkdir(parents=True, mode=0o700)
        (args.run_dir / 'input.json').write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
        (args.run_dir / 'offer-plan.json').write_text('{}\n')
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        parser.error(str(error))
    print(data['audit_id'], 'rows:', ','.join(str(row['row']) for row in data['rows']),
          'unique entry URLs:', len(data['targets']))


if __name__ == '__main__':
    main()
