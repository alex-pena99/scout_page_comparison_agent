import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderReport } from '../web/lib/view.js';

const idPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;
const filePattern = /^[a-z0-9][a-z0-9-]{0,79}\.(png|json|zip)$/;
const statusNames = ['Match', 'Mismatch', 'Needs Review'];
const reportTitle = 'Headline pricing and offer comparison';
const read = async file => JSON.parse(await readFile(file, 'utf8'));

export async function hash(stream) {
  const digest = createHash('sha256');
  for await (const bytes of stream) digest.update(bytes);
  return digest.digest('hex');
}

export async function verifyPackage(base) {
  const filename = join(base, 'report.json');
  const reportBytes = await readFile(filename);
  const report = JSON.parse(reportBytes);
  const manifest = await read(join(base, 'evidence-manifest.json'));
  if (!idPattern.test(report.id) || report.name !== reportTitle) throw new Error('Invalid report ID or title');
  const evidence = join(base, 'evidence');
  const files = await readdir(evidence, {withFileTypes:true});
  if (files.length !== Object.keys(manifest).length || files.some(file =>
      !file.isFile() || !filePattern.test(file.name) || !/^[a-f0-9]{64}$/.test(manifest[file.name] ?? ''))) {
    throw new Error('The files do not match the evidence manifest');
  }
  const links = new Set(report.documents.map(doc => doc.file));
  for (const panel of Object.values(report.captures)) {
    if (panel.captureFile) links.add(panel.captureFile);
    if (panel.screenshot) links.add(panel.screenshot.file);
  }
  if (links.size !== files.length || [...links].some(file => !Object.hasOwn(manifest, file))) {
    throw new Error('The report evidence links do not match the manifest');
  }
  for (const {name} of files) {
    if (await hash(createReadStream(join(evidence, name))) !== manifest[name]) {
      throw new Error('Evidence digest differs for '+name);
    }
  }
  const spec = await read(join(evidence, 'checkpoint-selection.json'));
  const comparison = await read(join(evidence, 'checkpoint-comparisons.json'));
  if (spec.audit_id !== report.id || comparison.audit_id !== report.id ||
      comparison.revision !== spec.revision || comparison.runner_revision !== spec.runner_revision ||
      report.rows.length !== spec.rows.length || report.rows.length !== comparison.rows.length ||
      new Set(report.rows.map(row=>row.number)).size !== report.rows.length ||
      report.rows.some((row,index) => row.number !== spec.rows[index].row ||
        row.number !== comparison.rows[index].number || row.status !== comparison.rows[index].status ||
        row.reason !== comparison.rows[index].reason || row.contentFinding !== comparison.rows[index].contentFinding ||
        row.identity || !statusNames.includes(row.status))) {
    throw new Error('Report disagrees with the selected rows or saved findings');
  }
  if (spec.capture_source && (!report.captureSource ||
      JSON.stringify(report.captureSource) !== JSON.stringify(spec.capture_source) ||
      comparison.capture_batch !== spec.capture_source.batch_id ||
      !report.limitations.some(note => note.includes(spec.capture_source.started_at) &&
        note.includes(spec.capture_source.finished_at)))) {
    throw new Error('The report is missing the verified capture batch or its timestamps');
  }
  const html = renderReport(report);
  const renderedRows = [...html.matchAll(/data-report-row="(\d+)"/g)].map(match => Number(match[1]));
  if (renderedRows.join(',') !== report.rows.map(row=>row.number).join(',') ||
      !html.includes('<h1>'+reportTitle+'</h1>') ||
      [...links].some(file => !html.includes('href="/reports/'+report.id+'/evidence/'+file+'"'))) {
    throw new Error('The viewer did not render the pinned rows, title or evidence links');
  }
  const counts = Object.fromEntries(statusNames.map(status => [status, report.rows.filter(row=>row.status===status).length]));
  for (const [status,count] of Object.entries(counts)) {
    if (!new RegExp('data-count-for="'+status+'">[\\s\\S]*?<strong>'+count+'</strong>').test(html)) {
      throw new Error('The viewer did not render the count for '+status);
    }
  }
  const reportHash = createHash('sha256').update(reportBytes).digest('hex');
  return {report, manifest, html, counts, reportHash};
}

export async function verifySignedOut(origin, id, filenames, request = fetch) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.origin !== origin.replace(/\/$/,'')) {
    throw new Error('Use the existing HTTPS viewer origin with no path or embedded credentials');
  }
  if (!idPattern.test(id) || filenames.some(file => !filePattern.test(file))) {
    throw new Error('Invalid private report or evidence path');
  }
  const endpoints = ['/reports/'+id, '/api/report?auditId='+id];
  for (const extension of ['.json','.png','.zip']) {
    const file = filenames.find(name => name.endsWith(extension));
    if (file) endpoints.push('/reports/'+id+'/evidence/'+file, '/api/report?auditId='+id+'&asset='+file);
  }
  for (const endpoint of endpoints) {
    const response = await request(url.origin+endpoint, {redirect:'manual',signal:AbortSignal.timeout(15000)});
    await response.body?.cancel();
    if (![401,403].includes(response.status)) throw new Error('Signed-out protection could not be verified for '+endpoint+
      ' (HTTP '+response.status+')');
  }
  return url.origin+'/reports/'+id;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const [base, flag, value] = process.argv.slice(2);
    if (!base || (flag && flag !== '--html' && flag !== '--signed-out') || (flag === '--html' && !value)) {
      throw new Error('Usage: node reporting/verify.mjs PACKAGE [--html PRIVATE_FILE | --signed-out]');
    }
    const {report, manifest, html, counts} = await verifyPackage(base);
    if (flag === '--html') await writeFile(value, html, {flag:'wx',mode:0o600});
    if (flag === '--signed-out') {
      const url = await verifySignedOut(process.env.SCOUT_REPORT_ORIGIN,report.id,Object.keys(manifest));
      console.log('Signed-out report, direct API and sample evidence routes denied:', url);
    }
    console.log('Verified', report.rows.length, 'rows,', Object.keys(manifest).length, 'evidence links', counts);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
