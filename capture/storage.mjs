import {readFile,writeFile,mkdir,lstat} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {get,put,list} from '@vercel/blob';
import {hash,safePath} from './package-batch.mjs';
export const CAPTURE_STORE='store_JwQkhjM0YGiIsrIe';
const HOST='jwqkhjm0ygiisrie.private.blob.vercel-storage.com';
function batchId(id){if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id||''))throw new Error('Invalid batch ID');return id;}
export function credentials(env=process.env){
  if(env.SCOUT_CAPTURE_STORE_ID!==CAPTURE_STORE)throw new Error('Explicit dedicated capture store ID required');
  const token=env.SCOUT_CAPTURE_READ_WRITE_TOKEN;
  if(!token){
    const oidcToken=env.SCOUT_CAPTURE_OIDC_TOKEN||env.VERCEL_OIDC_TOKEN;
    if(oidcToken)return {access:'private',oidcToken,storeId:CAPTURE_STORE};
    throw new Error('Capture-store credential is required for this external uploader');
  }
  // A store-specific token must never fall back to the report store credential.
  if(!token.startsWith('vercel_blob_rw_JwQkhjM0YGiIsrIe_'))throw new Error('Credential does not belong to the dedicated capture store');
  return {access:'private',token};
}
export function blobClient(auth){
  // Explicit URL locks reads to the intended store. No default BLOB variables are used.
  const url=p=>'https://'+HOST+'/'+p;
  return {
    async read(p){const r=await get(url(p),{...auth,useCache:false});
      if(!r)return null;if(r.statusCode!==200)throw new Error('Private capture read failed');
      return Buffer.from(await new Response(r.stream).arrayBuffer());},
    async write(p,bytes){const r=await put(p,bytes,{...auth,addRandomSuffix:false,allowOverwrite:false,multipart:bytes.length>5_000_000});
      if(new URL(r.url).hostname!==HOST)throw new Error('Unexpected destination store');},
    async list(prefix,cursor){return list({...auth,prefix,cursor,limit:1000});}
  };
}
async function preserve(client,p,bytes){
  const existing=await client.read(p);
  if(existing){if(hash(existing)!==hash(bytes))throw new Error('Immutable object differs: '+p);return;}
  await client.write(p,bytes);
  const stored=await client.read(p);
  if(!stored||hash(stored)!==hash(bytes))throw new Error('Read-back checksum failed: '+p);
}
export async function publish(base,client){
  const bytes=await readFile(join(base,'manifest.json'));
  const m=JSON.parse(bytes);batchId(m.batchId);
  if(m.kind!=='page-capture-batch'||m.comparisonPerformed!==false)throw new Error('Not a capture batch');
  const prefix='captures/'+m.batchId+'/';
  const items=Object.entries(m.files);let next=0;
  await Promise.all(Array.from({length:4},async()=>{while(next<items.length){
    const [file,record]=items[next++];safePath(file);
    const path=join(base,file);if(!(await lstat(path)).isFile())throw new Error('Non-regular artifact');
    const body=await readFile(path);
    if(body.length!==record.bytes||hash(body)!==record.sha256)throw new Error('Local checksum failed: '+file);
    await preserve(client,prefix+file,body);
  }}));
  // Manifest last: a listing never treats a partly uploaded batch as finished.
  await preserve(client,prefix+'manifest.json',bytes);
  return {storeId:CAPTURE_STORE,batchId:m.batchId,manifestPath:prefix+'manifest.json',filesVerified:items.length,counts:m.counts};
}
export async function retrieve(id,dest,client,entryKey){
  const prefix='captures/'+batchId(id)+'/';const bytes=await client.read(prefix+'manifest.json');
  if(!bytes)throw new Error('Finished batch not found');const m=JSON.parse(bytes);
  if(m.batchId!==id||m.kind!=='page-capture-batch')throw new Error('Manifest identity mismatch');
  if(entryKey&&!m.entries.some(e=>e.key===entryKey))throw new Error('Entry is not in this batch');
  await mkdir(dest,{recursive:true,mode:0o700});
  await writeFile(join(dest,'manifest.json'),bytes,{flag:'wx',mode:0o600});
  for(const [file,record]of Object.entries(m.files)){
    safePath(file);if(entryKey&&!file.startsWith('entries/'+entryKey+'/'))continue;
    const data=await client.read(prefix+file);
    if(!data||hash(data)!==record.sha256||data.length!==record.bytes)throw new Error('Stored file verification failed: '+file);
    const target=join(dest,file);await mkdir(dirname(target),{recursive:true,mode:0o700});
    await writeFile(target,data,{flag:'wx',mode:0o600});
  }
  return {batchId:id,destination:dest,entry:entryKey||'all'};
}
async function main(){
  // Ensure @vercel/blob cannot prioritize an unrelated inherited project OIDC/store.
  const auth=credentials();delete process.env.VERCEL_OIDC_TOKEN;delete process.env.BLOB_STORE_ID;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  const client=blobClient(auth);const [command,a,b,c]=process.argv.slice(2);
  if(command==='publish')console.log(JSON.stringify(await publish(a,client)));
  else if(command==='get')console.log(JSON.stringify(await retrieve(a,b,client,c)));
  else if(command==='list'){
    let cursor;do{const r=await client.list('captures/',cursor);
      for(const blob of r.blobs)if(blob.pathname.endsWith('/manifest.json'))console.log(blob.pathname);
      cursor=r.hasMore?r.cursor:undefined;
    }while(cursor);
  }else if(command==='smoke'){
    const p='connection-tests/'+batchId(a)+'/check.txt',bytes=Buffer.from('Scout private capture storage connection verified.\n');
    await preserve(client,p,bytes);
    const anonymous=await fetch('https://'+HOST+'/'+p,{redirect:'manual'});
    if(![401,403,404].includes(anonymous.status))throw new Error('Private file unexpectedly accessible anonymously');
    console.log(JSON.stringify({storeId:CAPTURE_STORE,readBackVerified:true,anonymousStatus:anonymous.status}));
  }else throw new Error('Usage: storage.mjs smoke ID | publish PACKAGE | get BATCH DEST [ENTRY] | list');
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)main().catch(e=>{
  console.error(e.name?.startsWith('Blob')?'Private capture storage request failed: '+e.name:e.message);process.exitCode=1;
});
