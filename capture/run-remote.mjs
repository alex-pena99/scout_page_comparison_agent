// Host-side orchestrator. Storage credentials are never passed to Chromium's VM.
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,open,unlink} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {packageBatch} from './package-batch.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(await readFile(join(root,'config/capture-store.json'),'utf8'));
const sandbox=process.env.SCOUT_SANDBOX_CLI||'sandbox';
const scope=['--project',config.projectId,'--scope',config.team];
async function command(cmd,args,options={}){
  return new Promise((ok,fail)=>{
    const child=spawn(cmd,args,{cwd:root,stdio:options.quiet?['ignore','pipe','pipe']:'inherit',...options});
    let out='',err='';child.stdout?.on('data',b=>out+=b);child.stderr?.on('data',b=>err+=b);
    child.on('error',fail);child.on('close',code=>code===0?ok(out.trim()):fail(new Error(cmd+' exited '+code+(options.quiet?': '+err.slice(-1000):''))));
  });
}
async function sandboxCommand(args){
 const env={...process.env};
 // Use the Sandbox CLI's own authorized login. The uploader's project-scoped
 // OIDC identity and storage secrets must not influence browser provisioning.
 for(const key of ['VERCEL_OIDC_TOKEN','SCOUT_CAPTURE_OIDC_TOKEN','SCOUT_CAPTURE_READ_WRITE_TOKEN',
   'BLOB_READ_WRITE_TOKEN','BLOB_STORE_ID'])delete env[key];
 return command(sandbox,args,{env});
}
async function remote(args){return sandboxCommand(['exec',...scope,config.sandbox,...args]);}
async function main(){
 const args=process.argv.slice(2);let rows,resume,captureOnly=false;
 while(args.length){const flag=args.shift();if(flag==='--rows')rows=args.shift();else if(flag==='--resume')resume=args.shift();
 else if(flag==='--capture-only')captureOnly=true;else throw new Error('Unknown option '+flag);}
 if(rows&&!/^\d+(,\d+)*$/.test(rows))throw new Error('Invalid row selection');
 await mkdir(join(root,'.scout'),{recursive:true,mode:0o700});
 const lock=join(root,'.scout','capture.lock');const handle=await open(lock,'wx',0o600);
 try{
  const revision=await command('git',['rev-parse','HEAD'],{quiet:true});
  const id='scout-captures-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+revision.slice(0,7);
  const runDir=resume?resolve(resume):join(root,'.scout',id);
  if(!resume)await command('python3',['capture/prepare.py','--run-dir',runDir,'--region',config.region,'--audit-id',id,...(rows?['--rows',rows]:[])]);
  const input=JSON.parse(await readFile(join(runDir,'input.json'),'utf8'));
  if(input.runner_git_revision!==revision)throw new Error('Resume from the original committed runner revision');
  const remoteDir='/vercel/sandbox/'+input.audit_id;
  await writeFile(join(runDir,'remote-job.json'),JSON.stringify({sandbox:config.sandbox,remoteDir,revision,startedAt:new Date().toISOString()},null,2),{mode:0o600});
  await command('git',['archive','--format=tar.gz','-o',join(runDir,'source.tgz'),revision,'capture','config']);
  await command('tar',['-czf',join(runDir,'inputs.tgz'),'-C',runDir,'input.json','offer-plan.json']);
  await remote(['mkdir','-p',remoteDir]);
  await sandboxCommand(['copy',...scope,join(runDir,'source.tgz'),config.sandbox+':'+remoteDir+'/source.tgz']);
  await sandboxCommand(['copy',...scope,join(runDir,'inputs.tgz'),config.sandbox+':'+remoteDir+'/inputs.tgz']);
  await remote(['tar','-xzf',remoteDir+'/source.tgz','-C',remoteDir]);
  await remote(['tar','-xzf',remoteDir+'/inputs.tgz','-C',remoteDir]);
  await remote(['npm','ci','--prefix',remoteDir+'/capture','--ignore-scripts']);
  let captureError;
  try{await remote(['node',remoteDir+'/capture/batch.cjs',remoteDir]);}catch(error){captureError=error.message;}
  // Also recover completed checkpoints if some entries or the runner failed.
  await remote(['tar','-czf',remoteDir+'/evidence.tgz','-C',remoteDir,'evidence']);
  await sandboxCommand(['copy',...scope,config.sandbox+':'+remoteDir+'/evidence.tgz',join(runDir,'evidence.tgz')]);
  await command('tar',['-xzf',join(runDir,'evidence.tgz'),'-C',runDir]);
  const {base,manifest}=await packageBatch(runDir);
  console.log(JSON.stringify({runDirectory:runDir,batchId:manifest.batchId,counts:manifest.counts,captureError}));
  if(captureError)throw new Error('Capture runner failed; recovered evidence is retained at '+runDir+'. '+captureError);
  if(!captureOnly)await command(process.execPath,['capture/storage.mjs','publish',base]);
  else console.log('Capture-only requested. Private upload remains pending: '+base);
 }finally{await handle.close();await unlink(lock);}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
