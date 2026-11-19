import { createReadStream } from 'node:fs';
import { stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { get, put } from '@vercel/blob';
import { hash, verifyPackage, verifySignedOut } from './verify.mjs';

export async function publishPackage(base, {token, origin, readBlob = get, putBlob = put, checkAccess = verifySignedOut}) {
  const {report, manifest, reportHash} = await verifyPackage(base);
  const files = Object.entries(manifest);
  const url = await checkAccess(origin, report.id, files.map(([file]) => file));
  const startedAt = new Date().toISOString();
  const options = {access:'private', token};
  async function read(pathname) {
    const result = await readBlob(pathname, {...options, useCache:false});
    if (!result) return null;
    if (result.statusCode !== 200) throw new Error('Unexpected private Blob status '+result.statusCode);
    return hash(result.stream);
  }
  async function preserve(pathname, file, expected) {
    const existing = await read(pathname);
    if (existing === expected) return;
    if (existing !== null) throw new Error('Existing object differs for '+pathname);
    const {size} = await stat(file);
    await putBlob(pathname, createReadStream(file), {
      ...options, allowOverwrite:false, addRandomSuffix:false, multipart:size > 5_000_000,
    });
    for (const wait of [0, 800, 2000, 5000]) {
      if (wait) await delay(wait);
      if (await read(pathname) === expected) return;
    }
    throw new Error('Stored checksum differs for '+pathname);
  }
  const prefix = 'reports/'+report.id;
  const reportPath = prefix+'/report.json';
  const alreadyPublished = await read(reportPath);
  if (alreadyPublished !== null && alreadyPublished !== reportHash) throw new Error('This report ID already exists');
  let next = 0;
  const workers = Array.from({length:Math.min(6,files.length)}, async () => {
    while (next < files.length) {
      const [filename,digest] = files[next++];
      await preserve(prefix+'/evidence/'+filename,join(base,'evidence',filename),digest);
    }
  });
  const results = await Promise.allSettled(workers);
  const failed = results.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
  await preserve(reportPath,join(base,'report.json'),reportHash);
  const publishedAt = new Date().toISOString();
  await checkAccess(origin,report.id,files.map(([file])=>file));
  return {audit:report.id,url,filesVerified:files.length,startedAt,publishedAt,verifiedAt:new Date().toISOString()};
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const [base] = process.argv.slice(2);
    if (!base || !process.env.BLOB_READ_WRITE_TOKEN || !process.env.SCOUT_REPORT_ORIGIN) {
      throw new Error('Set BLOB_READ_WRITE_TOKEN and SCOUT_REPORT_ORIGIN, then pass the verified package directory');
    }
    const result = await publishPackage(base,{token:process.env.BLOB_READ_WRITE_TOKEN,origin:process.env.SCOUT_REPORT_ORIGIN});
    await writeFile(join(base,'publication-checkpoint.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});
    console.log(result.url, 'private evidence files verified:',result.filesVerified);
  } catch (error) {
    // Blob SDK errors can contain request URLs. Keep error details local to the SDK.
    console.error(error.name?.startsWith('Blob') ? 'Private Blob publication failed: '+error.name : error.message);
    process.exitCode = 1;
  }
}
