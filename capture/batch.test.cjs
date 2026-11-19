const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtemp,mkdir,writeFile,readFile,rm,readdir}=require('node:fs/promises');
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
  let failedRead=false;
  const intermittent={...client,read:async p=>{if(!failedRead){failedRead=true;throw new Error('Failed to fetch blob: 500 Internal Server Error');}return client.read(p);}};
  await publish(pkg.base,intermittent);assert.equal(failedRead,true);assert.equal(order.length,result.filesVerified+1);
  await retrieve('test-batch',path.join(dir,'download'),client,'entry-001');
  assert.match(await readFile(path.join(dir,'download/entries/entry-001/attempt-1-baseline.txt'),'utf8'),/35/);
  const subset=path.join(dir,'row-download');
  await retrieve('test-batch',subset,client,undefined,{rows:[2]});
  assert.deepEqual(await readdir(path.join(subset,'entries')),['entry-001']);
  assert.match(await readFile(path.join(subset,'inventory.json'),'utf8'),/Fixture/);
  await assert.rejects(retrieve('test-batch',path.join(dir,'bad-row'),client,undefined,{rows:[99]}),/Invalid batch row selection/);
  objects.set('captures/test-batch/entries/entry-001/attempt-1-baseline.txt',Buffer.from('corrupt'));
  await assert.rejects(retrieve('test-batch',path.join(dir,'corrupt'),client),/verification failed/);
  await assert.rejects(publish(pkg.base,client),/Immutable object differs/);
  assert.throws(()=>safePath('../secret'),/Unsafe/);
  assert.throws(()=>credentials({SCOUT_CAPTURE_STORE_ID:CAPTURE_STORE,BLOB_READ_WRITE_TOKEN:'report-token'}),/required/);
  assert.throws(()=>credentials({SCOUT_CAPTURE_STORE_ID:CAPTURE_STORE,SCOUT_CAPTURE_READ_WRITE_TOKEN:'wrong'}),/does not belong/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('nested headline views without panel IDs are captured before leaving their parent',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'scout-nested-tabs-'));
 const html=`<!doctype html><main><h1>Internet and wireless offers</h1><p>${'Compare our headline internet and mobile plans. '.repeat(5)}</p>
 <nav><a href="/wrong">Wireless</a></nav>
 <div role="tablist"><button role="tab" aria-selected="false" data-key="wireless">Wireless</button><button role="tab" aria-selected="true" data-key="internet">Internet</button></div>
 <div id="internetCards">Internet $35/month</div>
 <section id="devices" hidden><button aria-pressed="false" data-key="apple">Apple iOS</button><button aria-pressed="true" data-key="android">Android</button><div style="height:1100px"></div><p id="deviceCard">Galaxy $10/month</p></section>
 <button role="tab" aria-selected="false" data-key="hyper">Hyper-gig speeds</button><p id="speedCard">1 GIG $55/month</p>
 <button role="tab" aria-selected="false" data-key="terms">Offer terms</button>
 <form><button aria-pressed="false" type="submit">Android</button></form>
 <div id="consent-banner" style="position:fixed;bottom:0;background:white">Cookies <button id="consent">Continue without changes</button></div>
 </main><script>
 const el=id=>document.getElementById(id)||document.querySelector('[data-key="'+id+'"]');
 el('consent').onclick=()=>el('consent-banner').hidden=true;
 for(const id of ['wireless','internet'])el(id).onclick=()=>{for(const x of ['wireless','internet'])el(x).setAttribute('aria-selected',String(x===id));if(id==='wireless'){const group=el('wireless').parentElement;const wrap=document.createElement('div');group.before(wrap);wrap.append(group);}el('devices').hidden=id!=='wireless';el('internetCards').hidden=id!=='internet';};
 for(const id of ['apple','android'])el(id).onclick=()=>{for(const x of ['apple','android'])el(x).setAttribute('aria-pressed',String(x===id));el('deviceCard').textContent=id==='apple'?'iPhone $5/month':'Galaxy $10/month';};
 el('hyper').onclick=()=>{el('hyper').setAttribute('aria-selected','true');el('speedCard').textContent='2 GIG $65/month and 5 GIG $95/month';};
 el('terms').onclick=()=>el('speedCard').textContent='UNEXPECTED DISCLOSURE';
 </script>`;
 const server=createServer((req,res)=>res.end(html));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 try{
  await run({audit_id:'nested',revision:'fixture',runner_revision:'fixture',inventory_revision:'fixture',config_version:5,
   settings:config.capture,region:'test',autonomous_headline_tabs:true,targets:[{key:'entry-001',original:url,prepared:url,roles:['vanity']}]},dir,{});
  const c=JSON.parse(await readFile(path.join(dir,'entry-001/capture.json'),'utf8'));const a=c.attempts[0];
  assert.equal(a.ready,true);assert.equal(a.coverage.filter(x=>x.inspected===false).length,0);
  const states=await Promise.all(a.states.map(async s=>({...s,data:JSON.parse(await readFile(path.join(dir,'entry-001',s.json),'utf8'))})));
  for(const headline of ['iPhone $5/month','Galaxy $10/month','2 GIG $65/month and 5 GIG $95/month'])assert.ok(states.some(s=>s.data.visibleText.includes(headline)),headline);
  assert.ok(states.every(s=>s.fullPage));
  assert.ok(states.every(s=>!s.data.visibleText.includes('Continue without changes')&&!s.data.visibleText.includes('UNEXPECTED DISCLOSURE')));
  const labels=a.actions.map(x=>x.reason);
  assert.ok(labels.findIndex(x=>x.includes('Android'))<labels.findIndex(x=>x.includes('Internet')));
  assert.equal(labels.length,5); // Wireless, its two devices, Internet, Hyper-gig.
 }finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
