// Standalone capture only. No comparison or report generation.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const {run} = require('./capture.cjs');
(async()=>{
  const [dir] = process.argv.slice(2);
  if (!dir) throw new Error('Usage: node capture/batch.cjs RUN_DIRECTORY');
  const input=JSON.parse(await fs.readFile(path.join(dir,'input.json'),'utf8'));
  const actual='sha256:'+createHash('sha256').update(await fs.readFile(path.join(__dirname,'capture.cjs'))).digest('hex');
  if(input.runner_revision!==actual) throw new Error('Runner revision does not match pinned input');
  input.autonomous_headline_tabs=true;
  const plan=JSON.parse(await fs.readFile(path.join(dir,'offer-plan.json'),'utf8'));
  await run(input,path.join(dir,'evidence'),plan);
  console.log(JSON.stringify({captureFinished:true,batch:input.audit_id,entries:input.targets.length}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
