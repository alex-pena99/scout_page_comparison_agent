import {readFile,writeFile,mkdir,lstat,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function safePath(value) {
  if(typeof value!=='string'||!value||value.startsWith('/')||value.includes('\\')||
    value.split('/').some(p=>!p||p==='.'||p==='..')||!/^[a-zA-Z0-9._/-]+$/.test(value)) throw new Error('Unsafe artifact path');
  return value;
}
const read=async f=>JSON.parse(await readFile(f,'utf8'));
export async function packageBatch(runDir) {
  const input=await read(join(runDir,'input.json'));
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(input.audit_id)) throw new Error('Invalid batch ID');
  const base=join(runDir,'capture-package');
  await mkdir(base,{recursive:true,mode:0o700});
  const files={},entries=[];
  async function save(file,bytes){
    safePath(file);const full=join(base,file);await mkdir(resolve(full,'..'),{recursive:true,mode:0o700});
    await writeFile(full,bytes,{mode:0o600});files[file]={sha256:hash(bytes),bytes:bytes.length};return file;
  }
  async function artifact(entry,name){
    safePath(entry);safePath(name);if(name.includes('/'))throw new Error('Unexpected nested artifact');
    const source=join(runDir,'evidence',entry,name);
    if(!(await lstat(source)).isFile())throw new Error('Artifact must be a regular file');
    return save('entries/'+entry+'/'+name,await readFile(source));
  }
  await save('inventory.json',Buffer.from(JSON.stringify({rows:input.rows,targets:input.targets},null,2)));
  for(const target of input.targets){
    const entry={key:target.key,originalUrl:target.original,navigationUrl:target.prepared,
      rows:target.rows,roles:target.roles,status:'unavailable',states:[],gaps:[]};
    try{
      const capture=await read(join(runDir,'evidence',target.key,'capture.json'));
      if(capture.audit_id!==input.audit_id||capture.runner_revision!==input.runner_revision||
        capture.target.prepared!==target.prepared)throw new Error('Capture provenance mismatch');
      entry.captureRecord=await artifact(target.key,'capture.json');
      entry.startedAt=capture.started;entry.finishedAt=capture.finished;
      entry.elapsedMs=capture.elapsed_ms;
      const last=capture.attempts.at(-1);
      entry.finalUrl=last?.finalUrl;
      for(const attempt of capture.attempts){
        for(const state of attempt.states||[]){
          const data=await read(join(runDir,'evidence',target.key,safePath(state.json)));
          const json=await artifact(target.key,state.json);
          const text=await save('entries/'+target.key+'/'+state.name+'.txt',Buffer.from(data.visibleText||''));
          let screenshot=null;
          if(state.png){try{screenshot=await artifact(target.key,state.png);}catch(e){if(e.code!=='ENOENT')throw e;}}
          entry.states.push({id:state.name,capturedAt:state.time,url:data.url,presentation:state.presentation,
            text,json,screenshot,readable:!!attempt.ready});
          if(!screenshot)entry.gaps.push('Screenshot unavailable for '+state.name);
        }
        for(const gap of attempt.coverage||[])if(gap.inspected===false)entry.gaps.push(gap.reason||gap.id);
      }
      if(last?.ready && entry.states.some(s=>s.readable&&s.screenshot))entry.status=entry.gaps.length?'captured_with_gaps':'captured';
      else entry.failure=last?.error||'No usable text and screenshot capture';
      // Keep observed controls for future adapters; do not claim all custom UI was explored.
      entry.coverage='Rendered baseline, configured actions, semantic product/device tabs, and the reviewed AT&T category switch; no disclosures. Other custom controls may require a capture adapter.';
    }catch(error){
      if(error.code!=='ENOENT')throw error;
      entry.failure='Capture checkpoint or artifact missing';
    }
    entries.push(entry);
  }
  const manifest={schemaVersion:1,batchId:input.audit_id,kind:'page-capture-batch',
    comparisonPerformed:false,createdAt:new Date().toISOString(),
    instructionRevision:input.revision,runnerRevision:input.runner_git_revision,runnerHash:input.runner_revision,
    inventoryRevision:input.inventory_revision,inventoryHash:input.inventory_sha256,
    region:input.region,profile:input.settings.profile_id,selectedRows:input.rows.length,
    uniqueEntryUrls:entries.length,entries,rows:input.rows.map(r=>({row:r.row,account:r.Account,
      creative:r['Creative Name'],vanityEntry:r.vanity_capture,trackingEntry:r.tracking_capture,inputFailures:r.input_blockers})),
    counts:{captured:entries.filter(e=>e.status==='captured').length,
      capturedWithGaps:entries.filter(e=>e.status==='captured_with_gaps').length,
      unavailable:entries.filter(e=>e.status==='unavailable').length,
      rowsWithInputFailures:input.rows.filter(r=>Object.keys(r.input_blockers||{}).length).length},files};
  manifest.status=manifest.counts.unavailable||manifest.counts.capturedWithGaps||manifest.counts.rowsWithInputFailures?
    'finished_with_gaps':'finished';
  await writeFile(join(base,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
  return {base,manifest};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  packageBatch(process.argv[2]).then(({manifest})=>console.log(JSON.stringify({batch:manifest.batchId,...manifest.counts})))
    .catch(e=>{console.error(e.message);process.exitCode=1;});
}
