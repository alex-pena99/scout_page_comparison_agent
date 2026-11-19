"""Prepare and verify a Scout audit from one immutable capture batch."""

import argparse
import csv
from datetime import datetime, timezone
from hashlib import sha256
import io
import json
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'capture'))
from prepare import map_records, pinned, revision


def timestamp(value):
    date = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if date.utcoffset() is None:
        raise ValueError('Capture timestamp must include a timezone')
    return date.astimezone(timezone.utc)


def manifest_at(root, batch):
    data = json.loads((root / 'manifest.json').read_bytes())
    if (data['batchId'] != batch or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', batch) or
            data['schemaVersion'] != 1 or data['kind'] != 'page-capture-batch' or
            data['comparisonPerformed'] is not False or data['status'] not in ('finished', 'finished_with_gaps')):
        raise ValueError('Wrong or unfinished capture batch')
    return data


def artifact(root, manifest, name):
    if not name or not re.fullmatch(r'[a-zA-Z0-9._/-]+', name) or any(
            part in ('', '.', '..') for part in name.split('/')):
        raise ValueError('Invalid capture artifact path')
    file = root / name
    record = manifest['files'].get(name)
    if not record or file.is_symlink() or not file.is_file() or not file.resolve().is_relative_to(root.resolve()):
        raise ValueError(f'Missing or unsafe capture artifact {name}')
    data = file.read_bytes()
    if len(data) != record['bytes'] or sha256(data).hexdigest() != record['sha256']:
        raise ValueError(f'Capture artifact digest differs for {name}')
    return file, data


def entry_path(name, key, suffix):
    if not name or not re.fullmatch(rf'entries/{re.escape(key)}/[a-z0-9-]+\.{suffix}', name):
        raise ValueError(f'Invalid entry artifact for {key}')
    return name


def prepare(root, batch, row_filter, instructions, audit_id):
    source = root / 'evidence'
    manifest = manifest_at(source, batch)
    instructions = revision(instructions)
    config = json.loads(pinned(instructions, 'config/audit-config.json'))
    if config['config_version'] != 5 or manifest['profile'] != config['capture']['profile_id']:
        raise ValueError('Capture profile disagrees with the headline audit profile')
    ref = revision(manifest['inventoryRevision'])
    raw = pinned(ref, config['inventory']['path'])
    if sha256(raw).hexdigest() != manifest['inventoryHash'] or raw != pinned(instructions, config['inventory']['path']):
        raise ValueError('Batch inventory differs from the pinned audit CSV')
    runner_ref = revision(manifest['runnerRevision'])
    if 'sha256:' + sha256(pinned(runner_ref, 'capture/capture.cjs')).hexdigest() != manifest['runnerHash']:
        raise ValueError('Stored runner hash disagrees with the pinned runner revision')
    source_ref = revision(manifest['instructionRevision'])
    source_config = json.loads(pinned(source_ref, 'config/audit-config.json'))
    if source_config['capture'] != config['capture']:
        raise ValueError('Stored capture settings differ from the audit capture settings')

    inventory = json.loads(artifact(source, manifest, 'inventory.json')[1])
    columns = config['inventory']['required_columns']
    reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig'), newline=''))
    records = {number: {column: row[column] for column in columns} for number, row in enumerate(reader, 2)}
    batch_rows = [row['row'] for row in manifest['rows']]
    if not batch_rows or len(set(batch_rows)) != len(batch_rows) or set(batch_rows) - records.keys():
        raise ValueError('Invalid CSV row numbers in the stored batch')
    rows, targets = map_records(records, batch_rows)
    expected_rows = [{'row': row['row'], 'account': row['Account'], 'creative': row['Creative Name'],
                      'vanityEntry': row['vanity_capture'], 'trackingEntry': row['tracking_capture'],
                      'inputFailures': row['input_blockers']} for row in rows]
    if inventory != {'rows': rows, 'targets': targets} or manifest['rows'] != expected_rows:
        raise ValueError('Stored row-to-entry mappings differ from the pinned CSV')
    fields = {'key': 'key', 'originalUrl': 'original', 'navigationUrl': 'prepared', 'rows': 'rows', 'roles': 'roles'}
    expected_entries = [{stored: target[source] for stored, source in fields.items()} for target in targets]
    actual_entries = [{field: entry[field] for field in fields} for entry in manifest['entries']]
    if (actual_entries != expected_entries or manifest['selectedRows'] != len(rows) or
            manifest['uniqueEntryUrls'] != len(targets)):
        raise ValueError('Stored entry-to-row mappings or counts differ from the pinned CSV')
    if row_filter is None and set(batch_rows) != set(records):
        raise ValueError('A full audit requires a full inventory capture batch')
    selected = batch_rows if row_filter is None else row_filter
    if not selected or len(set(selected)) != len(selected) or set(selected) - set(batch_rows):
        raise ValueError('Requested rows are absent or duplicated in the selected batch')
    rows = {row['row']: row for row in rows}
    rows = [rows[number] for number in selected]
    keys = {row[role + '_capture'] for row in rows for role in ('vanity', 'tracking')}
    windows = [(timestamp(e['startedAt']), timestamp(e['finishedAt'])) for e in manifest['entries']
               if e.get('startedAt') and e.get('finishedAt')]
    if not windows or any(start > finish for start, finish in windows):
        raise ValueError('Invalid capture batch timestamps')
    now = datetime.now(timezone.utc)
    audit_id = audit_id or now.strftime('scout-saved-%Y%m%d-%H%M%S-%f')
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', audit_id) or audit_id == batch:
        raise ValueError('Invalid or reused audit ID')
    return {
        'audit_id': audit_id, 'revision': instructions, 'inventory_revision': ref,
        'inventory_sha256': manifest['inventoryHash'], 'config_version': config['config_version'],
        'runner_git_revision': runner_ref, 'runner_revision': manifest['runnerHash'],
        'pre_capture_checkpoint_utc': now.isoformat(), 'region': manifest['region'],
        'settings': config['capture'], 'comparison': config['comparison'], 'results': config['results'],
        'checks': config['checks'], 'tracking_policy': config['tracking_urls'], 'rows': rows,
        'targets': [target for target in targets if target['key'] in keys],
        'capture_source': {'batch_id': batch, 'instruction_revision': source_ref,
                           'manifest_sha256': sha256((source / 'manifest.json').read_bytes()).hexdigest(),
                           'started_at': min(start for start, _ in windows).isoformat(),
                           'finished_at': max(end for _, end in windows).isoformat(),
                           'batch_rows': len(batch_rows), 'batch_entries': len(targets)},
    }


def load_saved_captures(spec, evidence):
    source = spec['capture_source']
    manifest = manifest_at(evidence, source['batch_id'])
    if sha256((evidence / 'manifest.json').read_bytes()).hexdigest() != source['manifest_sha256']:
        raise ValueError('Stored capture manifest differs from the prepared audit')
    entries = {entry['key']: entry for entry in manifest['entries']}
    captures = {}
    for target in spec['targets']:
        key = target['key']
        entry = entries[key]
        status = entry['status']
        if status not in ('captured', 'captured_with_gaps', 'unavailable'):
            raise ValueError(f'Invalid availability for {key}')
        record = {'target': target, 'attempts': [], 'queue': []}
        paths = []
        if entry.get('captureRecord'):
            path, raw = artifact(evidence, manifest, entry_path(entry['captureRecord'], key, 'json'))
            record = json.loads(raw)
            provenance = {'audit_id': source['batch_id'], 'revision': source['instruction_revision'],
                          'runner_revision': spec['runner_revision'], 'inventory_revision': spec['inventory_revision'],
                          'config_version': spec['config_version'], 'region': spec['region'], 'target': target,
                          'started': entry.get('startedAt'), 'finished': entry.get('finishedAt')}
            if any(record.get(field) != value for field, value in provenance.items()):
                raise ValueError(f'Capture record provenance differs for {key}')
            paths.append(path)
        elif status != 'unavailable':
            raise ValueError(f'Capture record missing for {key}')

        active = {}
        for attempt in record['attempts']:
            if attempt.get('invalidatedVisit'):
                active.clear()
            if attempt['ready']:
                active.update((state['name'], state) for state in attempt['states'])
        states = {}
        for item in entry['states']:
            state = active.get(item['id'])
            if status == 'unavailable' or not item['readable'] or state is None:
                continue
            doc, raw = artifact(evidence, manifest, entry_path(item['json'], key, 'json'))
            text, rendered = artifact(evidence, manifest, entry_path(item['text'], key, 'txt'))
            data = json.loads(raw)
            if (any(data[field] != state[field] for field in ('id', 'name', 'fingerprint', 'png')) or
                    doc.name != state['json'] or item['capturedAt'] != state['time'] or
                    data['url'] != item['url'] or data['visibleText'] != rendered.decode('utf-8')):
                raise ValueError(f'State and rendered text disagree for {key}')
            if item.get('screenshot'):
                image, png = artifact(evidence, manifest, entry_path(item['screenshot'], key, 'png'))
                if image.name != state['png'] or not png.startswith(b'\x89PNG\r\n\x1a\n'):
                    raise ValueError(f'Invalid screenshot for {key}')
                paths.append(image)
            paths.extend((doc, text))
            states[item['id']] = {**state, 'png': Path(item['screenshot']).name if item.get('screenshot') else None,
                                   'visibleText': data['visibleText'], 'frameEvidence': data.get('frameEvidence', [])}
        # An unavailable entry or a manifest without an active, readable baseline is a review gap.
        if not any(s['id'] == 'baseline' and s['visibleText'].strip() for s in states.values()):
            states.clear()
        captures[key] = {'record': record, 'states': states, 'directory': evidence / 'entries' / key,
                         'paths': paths, 'entry': entry}
    return captures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run_dir', type=Path, help='Private directory containing downloaded evidence/')
    parser.add_argument('--batch', required=True)
    parser.add_argument('--rows', help='Comma-separated CSV row numbers')
    parser.add_argument('--instructions', default='HEAD')
    parser.add_argument('--audit-id')
    args = parser.parse_args()
    try:
        rows = [int(n) for n in args.rows.split(',')] if args.rows is not None else None
        spec = prepare(args.run_dir, args.batch, rows, args.instructions, args.audit_id)
        load_saved_captures(spec, args.run_dir / 'evidence')
        with (args.run_dir / 'input.json').open('x') as file:
            json.dump(spec, file, indent=2, ensure_ascii=False)
            file.write('\n')
    except (ValueError, OSError, KeyError) as error:
        parser.error(str(error))
    source = spec['capture_source']
    print(f"{source['batch_id']} | {source['batch_rows']} batch rows | {source['batch_entries']} entry URLs")
    print(f"Capture window {source['started_at']} to {source['finished_at']} | {len(spec['rows'])} audit rows")


if __name__ == '__main__':
    main()
