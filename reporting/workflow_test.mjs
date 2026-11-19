import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { publishPackage } from './publish.mjs';
import { verifyPackage, verifySignedOut } from './verify.mjs';

const repo = fileURLToPath(new URL('..', import.meta.url));
const save = (path, json) => writeFile(path, JSON.stringify(json));
const statuses = {'Match':2,'Mismatch':1,'Needs Review':1};

test('package and render all selected rows, verify evidence, publish privately and preserve existing objects', async () => {
  const dir = await mkdtemp(join(tmpdir(),'scout-fixture-'));
  try {
    const identity = { audit_id:'synthetic-headlines', revision:'fixture-instructions',
      inventory_revision:'fixture-inventory', runner_revision:'fixture-runner', config_version:5 };
    const targets = [35,45].map((price,index) => ({
      price,key:'entry-'+index,original:'https://fixture.invalid/'+index,prepared:'https://fixture.invalid/'+index,
    }));
    const source = (row,left,right) => ({row, Account:'Fixture', 'Creative Name':'Test row '+row,
      vanity_capture:left, tracking_capture:right, input_blockers:right ? {} : {tracking:'Missing tracking URL'}});
    await save(join(dir,'input.json'), {...identity,targets,region:'fixture',
      pre_capture_checkpoint_utc:'2026-01-01T01:00:00+00:00',runner_git_revision:'fixture-git',
      checks:['pricing','promo_codes','benefits_inclusions','dates_durations'],
      results:{report_title:'Headline pricing and offer comparison'},comparison:{scope_version:'headline-offers-v1'},
      rows:[source(2,'entry-0','entry-0'),source(5,'entry-0','entry-0'),
            source(10,'entry-0','entry-1'),source(20,'entry-0',null)]});
    for (const target of targets) {
      const entry = join(dir,'evidence',target.key);
      await mkdir(entry,{recursive:true});
      const state = {name:'attempt-1-baseline',id:'baseline',json:'attempt-1-baseline.json',
        png:'attempt-1-baseline.png',url:target.prepared,fingerprint:'fixture'};
      await save(join(entry,'capture.json'), {...identity,target,queue:[
        {started:'2026-01-01T01:00:00Z',finished:'2026-01-01T01:00:03Z'}],
        attempts:[{ready:true,states:[state]}]});
      await save(join(entry,state.json), {...state,visibleText:'Fiber $'+target.price+'/mo'});
      await writeFile(join(entry,state.png),Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7V0AAAAASUVORK5CYII=','base64'));
    }
    const side = price => ({finding:'Displayed fiber price',evidence:[{state:'attempt-1-baseline',quotes:['Fiber $'+price+'/mo']}],
      offers:[{id:'fiber',state:'attempt-1-baseline',fields:{prices:['$'+price+'/month']}}]});
    const pair = price => ({correspondence:'corresponding',vanity:side(35),tracking:side(price)});
    const reviews=join(dir,'review.json');
    await save(reviews,{pairs:{'entry-0/entry-0':pair(35),'entry-0/entry-1':pair(45)}});
    execFileSync('python3',['comparison/compare.py',dir,reviews],{cwd:repo});
    execFileSync('python3',['reporting/build.py',dir],{cwd:repo});
    const base = join(dir,'published');
    const built = await verifyPackage(base);
    assert.deepEqual(built.counts,statuses);
    assert.equal(built.report.rows[0].vanityCapture,built.report.rows[1].vanityCapture);
    assert.match(built.html,/\$35\/month versus \$45\/month/);
    const prefix = 'reports/'+identity.audit_id;
    const stored = new Map([['reports/older/report.json',Buffer.from('historical')]]);
    const puts = [];
    const options = {token:'fixture', origin:'https://fixture.invalid',
      checkAccess:async (origin,id,files) => {
        assert.equal(id,identity.audit_id);
        assert.equal(files.length,Object.keys(built.manifest).length);
        return origin+'/reports/'+id;
      },
      readBlob:async (path,opts) => {
        assert.equal(opts.access,'private');
        if (stored.has(path)) return {statusCode:200,stream:[stored.get(path)]};
        return null;
      },
      putBlob:async (path,stream,opts) => {
        assert.equal(opts.access,'private');
        assert.equal(opts.allowOverwrite,false);
        assert.equal(stored.has(path),false);
        const chunks = [];
        for await (const bytes of stream) chunks.push(bytes);
        stored.set(path,Buffer.concat(chunks));
        puts.push(path);
      },
    };
    await publishPackage(base,options);
    assert.equal(puts.at(-1),prefix+'/report.json');
    assert.equal(puts.length,Object.keys(built.manifest).length+1);
    await publishPackage(base,options);
    assert.equal(puts.length,Object.keys(built.manifest).length+1);
    assert.equal(stored.get('reports/older/report.json').toString(),'historical');
    stored.set(prefix+'/report.json',Buffer.from('prior report'));
    await assert.rejects(publishPackage(base,options),/already exists/);
    await writeFile(join(base,'evidence','checkpoint-selection.json'),'tampered');
    await assert.rejects(verifyPackage(base),/digest differs/);
  } finally {
    await rm(dir,{recursive:true,force:true});
  }
});

test('require protection on report, direct API and each present evidence type', async () => {
  const origin = 'https://fixture.invalid';
  const id = 'private-fixture';
  const files = ['selection.json','screenshot.png','raw-evidence.zip'];
  const requested = [];
  await verifySignedOut(origin,id,files,async (url,options) => {
    assert.equal(options.redirect,'manual');
    requested.push(url.replace(origin,''));
    return new Response(null,{status:401});
  });
  assert.deepEqual(requested,[
    '/reports/private-fixture','/api/report?auditId=private-fixture',
    '/reports/private-fixture/evidence/selection.json','/api/report?auditId=private-fixture&asset=selection.json',
    '/reports/private-fixture/evidence/screenshot.png','/api/report?auditId=private-fixture&asset=screenshot.png',
    '/reports/private-fixture/evidence/raw-evidence.zip','/api/report?auditId=private-fixture&asset=raw-evidence.zip',
  ]);
  await assert.rejects(verifySignedOut(origin,id,files,async () => new Response(null,{status:200})),
    /Signed-out protection could not be verified/);
});
