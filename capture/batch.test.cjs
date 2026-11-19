const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtemp,mkdir,writeFile,readFile,rm}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {createServer}=require('node:http');
const {run}=require('./capture.cjs');
const config=require('../config/audit-config.json');

test('standalone discovery captures product tabs and never opens terms',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'scout-batch-tabs-'));
 const server=createServer((req,res)=>res.end(`<!doctype html><main><h1>Mobile and Internet plans</h1>
 <p>${'Compare our mobile offers and internet plans. '.repeat(6)}</p>
 <button role="tab" id="apple" aria-controls="ap" aria-selected="true">Apple</button>
 <button role="tab" id="android" aria-controls="an" aria-selected="false">Android</button>
 <button role="tab" id="terms" aria-controls="legal" aria-selected="false">Terms</button>
 <section id="ap">Apple iPhone $5/month</section><section id="an" hidden>Android Galaxy $10/month</section>
 <section id="legal" hidden>UNEXPECTED TERMS</section></main><script>
 for(const b of document.querySelectorAll('button'))b.onclick=()=>{
 for(const x of document.querySelectorAll('button')){x.setAttribute('aria-selected',String(x===b));document.getElementById(x.getAttribute('aria-controls')).hidden=x!==b;}}
 </script>`));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const input={audit_id:'tabs',revision:'fixture',runner_revision:'fixture',inventory_revision:'fixture',
 config_version:5,settings:config.capture,region:'test',autonomous_headline_tabs:true,
 targets:[{key:'entry-001',original:url,prepared:url,roles:['vanity']}]};
 try{
  await run(input,dir,{});
  const c=JSON.parse(await readFile(path.join(dir,'entry-001/capture.json'),'utf8'));
  const a=c.attempts[0];assert.equal(a.ready,true);assert.equal(a.actions.length,2);
  assert.ok(a.actions.every(x=>['captured','already-in-state','equivalent-evidence'].includes(x.outcome)));
  const states=await Promise.all(a.states.map(s=>readFile(path.join(dir,'entry-001',s.json),'utf8')));
  assert.ok(states.some(s=>JSON.parse(s).visibleText.includes('Android Galaxy $10/month')));
  assert.ok(states.every(s=>!JSON.parse(s).visibleText.includes('UNEXPECTED TERMS')));
 }finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});

test('capture packaging accounts for missing inputs/files; storage is immutable and verified',async()=>{
 const {packageBatch,safePath}=await import('./package-batch.mjs');
 const {publish,retrieve,credentials,CAPTURE_STORE}=await import('./storage.mjs');
 const dir=await mkdtemp(path.join(tmpdir(),'scout-batch-store-'));
 const input={audit_id:'test-batch',revision:'rev',runner_revision:'hash',runner_git_revision:'rev',
 inventory_revision:'rev',inventory_sha256:'inventory',region:'test',settings:config.capture,
 rows:[{row:2,Account:'Fixture',vanity_capture:'entry-001',tracking_capture:null,input_blockers:{tracking:'Missing URL'}}],
 targets:[{key:'entry-001',original:'https://example.com',prepared:'https://example.com',rows:[2],roles:['vanity']},
 {key:'entry-002',original:'https://example.org',prepared:'https://example.org',rows:[3],roles:['tracking']}]};
 const base=path.join(dir,'evidence/entry-001');await mkdir(base,{recursive:true});
 await writeFile(path.join(dir,'input.json'),JSON.stringify(input));
 const state={name:'attempt-1-baseline',json:'attempt-1-baseline.json',png:'attempt-1-baseline.png',time:new Date().toISOString()};
 await writeFile(path.join(base,state.json),JSON.stringify({visibleText:'Fiber $35/mo',url:'https://example.com'}));
 await writeFile(path.join(base,state.png),Buffer.from('fixture image bytes'));
 await writeFile(path.join(base,'capture.json'),JSON.stringify({audit_id:input.audit_id,runner_revision:'hash',
 target:input.targets[0],attempts:[{ready:true,states:[state],coverage:[],finalUrl:'https://example.com'}]}));
 try{
  const pkg=await packageBatch(dir);assert.equal(pkg.manifest.counts.captured,1);
  assert.equal(pkg.manifest.counts.unavailable,1);assert.equal(pkg.manifest.counts.rowsWithInputFailures,1);
  const objects=new Map(),order=[];const client={read:async p=>objects.get(p)||null,write:async(p,b)=>{order.push(p);objects.set(p,b);}};
  const result=await publish(pkg.base,client);assert.equal(result.filesVerified,Object.keys(pkg.manifest.files).length);
  assert.equal(order.at(-1),'captures/test-batch/manifest.json');
  await publish(pkg.base,client);assert.equal(order.length,result.filesVerified+1);
  await retrieve('test-batch',path.join(dir,'download'),client,'entry-001');
  assert.match(await readFile(path.join(dir,'download/entries/entry-001/attempt-1-baseline.txt'),'utf8'),/35/);
  objects.set('captures/test-batch/entries/entry-001/attempt-1-baseline.txt',Buffer.from('corrupt'));
  await assert.rejects(retrieve('test-batch',path.join(dir,'corrupt'),client),/verification failed/);
  await assert.rejects(publish(pkg.base,client),/Immutable object differs/);
  assert.throws(()=>safePath('../secret'),/Unsafe/);
  assert.throws(()=>credentials({SCOUT_CAPTURE_STORE_ID:CAPTURE_STORE,BLOB_READ_WRITE_TOKEN:'report-token'}),/required/);
  assert.throws(()=>credentials({SCOUT_CAPTURE_STORE_ID:CAPTURE_STORE,SCOUT_CAPTURE_READ_WRITE_TOKEN:'wrong'}),/does not belong/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
