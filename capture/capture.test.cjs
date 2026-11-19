const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const { createServer } = require('node:http');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { run } = require('./capture.cjs');
const config = require('../config/audit-config.json');

test('continuous queue, actionability, scoped capture, isolation and verified reopen', async () => {
  const root = await mkdtemp(path.join(tmpdir(),'scout-fixtures-'));
  let changed = false;
  const server = createServer((req,res)=>{
    const name = req.url.slice(1);
    const delay = name==='fast' ? 0 : ['slow','three','four'].includes(name) ? 2300 : 0;
    setTimeout(()=>{
      res.setHeader('Content-Type','text/html');
      res.end(`<!doctype html><h1>Internet offers ${name}</h1><main>
        <p>${'Fiber and Mobile plans are available to new customers. '.repeat(5)}</p>
        <p id="price">Internet starting from $${changed && name==='three' ? 85 : 55}/mo.</p>
        <p id="cookie"></p>
        <button id="apple" aria-selected="true">Apple iOS</button>
        <button id="android" aria-selected="false">Android</button>
        <p id="mobile">iPhone offer for $0</p>
        <section id="cards" ${name==='blocked' ? 'style="min-height:2000px"' : ''}><p>1 Gig Fiber service from $60/mo.</p></section>
        <button id="next" aria-disabled="true" onclick="document.body.append('UNEXPECTED NEXT CLICK')">Next slide</button>
        <button id="details" onclick="this.after(' Broad bundle offer for eligible customers')">See details</button>
        <button id="extra" onclick="this.after(' Additional disclosure with AutoPay')">Extra offer details</button>
        <button id="special" onclick="this.after(' Special offer at $20 per line')">Special price</button>
        ${name==='overlay' ? '<div class="overlay" style="position:fixed;inset:0"></div>' : ''}
        ${name==='overlay' || name==='blocked' ? `<div class="modal--active" role="dialog" aria-modal="true" style="position:fixed;inset:0;background:white">
          ${name==='overlay' ? '<button aria-label="Close modal" onclick="this.parentElement.remove();setTimeout(()=>document.querySelector(&quot;.overlay&quot;).remove(),150)">Close</button>' : 'No access to underlying control'}
        </div>` : ''}
        </main><script>
        if(location.pathname==='/blocked') window.scrollTo=()=>{};
        document.getElementById('cookie').textContent=document.cookie || 'fresh context';
        document.cookie='campaign='+location.pathname.slice(1);
        document.getElementById('android').onclick=()=>{
          document.getElementById('apple').setAttribute('aria-selected','false');
          document.getElementById('android').setAttribute('aria-selected','true');
          requestAnimationFrame(()=>document.getElementById('mobile').textContent='Galaxy trade-in offer up to $900 off');
        };
        </script>`);
    },delay);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:'+server.address().port;
  const names = ['slow','fast','three','four','overlay','blocked'];
  const targets = names.map(name=>({key:'entry-'+name,original:base+'/'+name,prepared:base+'/'+name,roles:['tracking']}));
  const input={targets,settings:config.capture,audit_id:'fixtures',revision:'fixture-instructions',
    runner_revision:'fixture-runner',inventory_revision:'fixture-inventory',config_version:config.config_version,region:'local'};
  const action=(id,label,expected,extra)=>({id,label,expected,reason:id,...extra});
  const detail=action('detail','See details',{text:'Broad bundle offer'});
  const disabled=action('next','Next slide',{text:'additional plan'},{carousel:3});
  const plan={
    'entry-fast':[action('android','Android',{device:true,text:'Galaxy trade-in offer'}),disabled],
    'entry-overlay':[detail],
    'entry-blocked':[detail,detail],
  };
  async function read(key) {
    return JSON.parse(await readFile(path.join(root,'entry-'+key,'capture.json'),'utf8'));
  }
  try {
    const {maxActive,events}=await run(input,root,plan);
    assert.equal(maxActive,4);
    assert.ok(events.findIndex(e=>e.key==='entry-overlay'&&e.event==='start') < events.findIndex(e=>e.key==='entry-slow'&&e.event==='finish'));
    assert.ok(events.every(e=>e.active>=0&&e.active<=4));
    const fast=await read('fast');
    const attempt=fast.attempts[0];
    assert.equal(attempt.states.filter(s=>s.presentation==='advertised').length,1);
    assert.equal(attempt.actions[0].outcome,'captured');
    assert.equal(attempt.actions[1].outcome,'disabled-skipped');
    assert.equal(attempt.actions[1].attempted,undefined);
    assert.equal(attempt.actions.filter(a=>a.id==='next').length,1);
    assert.match((await readFile(path.join(root,'entry-fast',attempt.states[1].json),'utf8')),/Galaxy trade-in offer/);
    assert.deepEqual(attempt.coverage.find(c=>c.id==='next').inspected,false);
    assert.ok(attempt.scroll.reachedEnd);
    assert.ok(attempt.timings.some(t=>t.operation==='navigation'&&t.elapsed_ms>=0&&t.at));
    assert.equal(fast.instruction_commit,'fixture-instructions');
    assert.equal(fast.runner_revision,'fixture-runner');
    const overlay=(await read('overlay')).attempts[0];
    assert.equal(overlay.actions[0].recovered,true);
    assert.equal(overlay.actions[0].outcome,'captured');
    const blocked=(await read('blocked')).attempts[0];
    assert.deepEqual(blocked.actions.map(a=>a.outcome),['obstructed','unchanged-skipped']);
    assert.ok(blocked.actions.every(a=>!a.attempted));
    assert.equal(blocked.scroll.interrupted,true);
    assert.equal(blocked.coverage[0].inspected,true);
    assert.ok(blocked.coverage.some(c=>c.required&&!c.inspected));
    for (const name of names) {
      const baseline=(await read(name)).attempts[0].states[0].json;
      assert.match(JSON.parse(await readFile(path.join(root,'entry-'+name,baseline))).visibleText,/fresh context/);
    }
    await run(input,root,{
      'entry-fast':[action('extra','Extra offer details',{text:'Additional disclosure with AutoPay'})],
    },{reopen:true});
    const reopened=(await read('fast')).attempts[1];
    assert.equal(reopened.baselineUse,'reused');
    assert.equal(reopened.scroll,undefined);
    assert.equal(reopened.states.length,1);
    assert.equal(reopened.actions[0].outcome,'captured');
    changed=true;
    await run(input,root,{
      'entry-three':[action('special','Special price',{text:'Special offer'})],
    },{reopen:true});
    const third=(await read('three')).attempts[1];
    assert.equal(third.baselineUse,'invalidated-and-recaptured');
    assert.equal(third.actions[0].outcome,'captured');
    await assert.rejects(run(input,root,{'entry-fast':[detail]},{reopen:true}),/Follow-up budget exhausted/);
  } finally {
    await new Promise(resolve=>server.close(resolve));
    await rm(root,{recursive:true,force:true});
  }
});
