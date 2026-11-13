import express from 'express';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import chromium from '@sparticuz/chromium';
import path from 'node:path';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {styles} from '../src/styles.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir=path.join(root,'renders'); const uploadsDir=path.join(outputDir,'uploads');
const app=express(); const jobs=new Map(), uploads=new Map(); let bundlePromise; let active=false;
const allowedTypes=new Set(['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/mp4','audio/x-m4a','audio/aac','audio/ogg','audio/webm','audio/flac','audio/x-flac']);
app.post('/api/media',express.raw({type:'application/octet-stream',limit:'30mb'}),(req,res)=>{
 const type=String(req.get('x-audio-type')||'').split(';')[0].toLowerCase();
 if(!allowedTypes.has(type)||!Buffer.isBuffer(req.body)||!req.body.length) return res.status(400).json({error:'Please use a supported audio file (MP3, WAV, M4A, OGG, WebM or FLAC).'});
 const id=randomUUID(); fs.mkdirSync(uploadsDir,{recursive:true});fs.writeFileSync(path.join(uploadsDir,id),req.body);uploads.set(id,{type});res.status(201).json({id});
});
app.get('/api/media/:id',(req,res)=>{const audio=uploads.get(req.params.id);if(!audio)return res.sendStatus(404);res.set({'Content-Type':audio.type,'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.sendFile(path.join(uploadsDir,req.params.id));});
app.use(express.json({limit:'64kb'}));
app.post('/api/render',(req,res)=>{
 const v=req.body.video, frames=Math.ceil((v?.duration||0)*30);
 const valid=v&&typeof v.title==='string'&&v.title.length<=200&&Number.isFinite(v.duration)&&v.duration>0&&v.duration<=120&&['16:9','9:16','1:1'].includes(v.ratio)&&styles.some(s=>s.id===v.styleId)&&typeof v.sfx==='boolean'&&(!v.mediaId||uploads.has(v.mediaId))&&Array.isArray(v.scenes)&&v.scenes.length>=1&&v.scenes.length<=40&&v.scenes.every((s,i,a)=>['label','headline','caption'].every(k=>typeof s[k]==='string'&&s[k].length<=200)&&Number.isInteger(s.from)&&s.from>=0&&s.from<frames&&(i===0?s.from===0:s.from>a[i-1].from));
 if(!valid)return res.status(400).json({error:'Invalid video settings or audio has expired. Please upload it again.'});
 if(active)return res.status(429).json({error:'A render is already in progress. Please try again shortly.'});
 active=true; const id=randomUUID();jobs.set(id,{status:'queued',progress:0});res.json({id});
 (async()=>{try{
  const job=jobs.get(id);job.status='rendering';
  bundlePromise ||= bundle({entryPoint:path.join(root,'src/remotion-entry.jsx'),publicDir:path.join(root,'public')});
  const serveUrl=await bundlePromise;const browserExecutable=process.env.CHROME_PATH||await chromium.executablePath();
  // Rendering happens in a local Chromium process. Browser previews use the relative route instead.
  const inputProps={video:{...v,audioSrc:v.mediaId?`http://127.0.0.1:3001/api/media/${v.mediaId}`:undefined}};
  const composition=await selectComposition({serveUrl,id:'PromptVideo',inputProps,browserExecutable,chromiumOptions:{gl:'angle'}});
  fs.mkdirSync(outputDir,{recursive:true});
  await renderMedia({composition,serveUrl,codec:'h264',outputLocation:path.join(outputDir,`${id}.mp4`),inputProps,browserExecutable,chromiumOptions:{gl:'angle'},concurrency:2,onProgress:({progress})=>{job.progress=Math.round(progress*100)}});
  job.status='done';job.progress=100;
 }catch(e){console.error(e);jobs.set(id,{status:'error',error:e.message});bundlePromise=undefined;}finally{active=false;}})();
});
app.get('/api/render/:id',(req,res)=>{const job=jobs.get(req.params.id);if(!job)return res.status(404).json({error:'Render not found'});res.json(job)});
app.get('/api/render/:id/download',(req,res)=>{const job=jobs.get(req.params.id);if(!job||job.status!=='done')return res.status(404).end();res.download(path.join(outputDir,`${req.params.id}.mp4`),'motion-video.mp4')});
app.use(express.static(path.join(root,'dist')));
app.use((err,req,res,next)=>{if(err.type==='entity.too.large')return res.status(413).json({error:'Audio must be 30 MB or smaller.'});console.error(err);res.status(500).json({error:'Something went wrong.'})});
app.listen(3001,'0.0.0.0',()=>console.log('Render server listening on 3001'));
