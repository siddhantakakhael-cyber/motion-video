import {execFile as execFileCb} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const execFile=promisify(execFileCb);

// whisper.cpp JSON offsets are in milliseconds. Split long segments into short
// readable captions; sub-segment times are estimates, not word-level alignment.
export function parseWhisperJson(json, duration=120) {
 const segments=Array.isArray(json?.transcription)?json.transcription:[];
 const captions=[];
 for(const item of segments){
  const text=String(item?.text||'').replace(/\s+/g,' ').trim();
  const start=Number(item?.offsets?.from)/1000,end=Number(item?.offsets?.to)/1000;
  if(!text||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||start>=duration) continue;
  const words=text.split(' '),groups=[];for(let i=0;i<words.length;i+=7)groups.push(words.slice(i,i+7).join(' '));
  groups.forEach((group,i)=>{const a=start+(end-start)*i/groups.length,b=Math.min(duration,start+(end-start)*(i+1)/groups.length);if(b>a)captions.push({start:+a.toFixed(3),end:+b.toFixed(3),text:group.slice(0,200)});});
 }
 return captions.sort((a,b)=>a.start-b.start).slice(0,500);
}
export async function transcribeAudio({file,language='auto',model=process.env.WHISPER_MODEL,binary=process.env.WHISPER_CPP_BIN||'whisper-cli',ffmpeg='ffmpeg',duration=120}){
 if(!model)throw new Error('Local Whisper is not configured. Set WHISPER_MODEL and WHISPER_CPP_BIN; see README.');
 try{await fs.access(model)}catch{throw new Error('Whisper model not found. Check WHISPER_MODEL in the server environment.');}
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'motion-whisper-'));const wav=path.join(dir,'audio.wav'),out=path.join(dir,'transcript');
 try{
  await execFile(ffmpeg,['-y','-v','error','-i',file,'-ar','16000','-ac','1','-c:a','pcm_s16le',wav],{timeout:120000,maxBuffer:2*1024*1024});
  await execFile(binary,['-m',model,'-f',wav,'-l',language,'-oj','-of',out,'-nt'],{timeout:900000,maxBuffer:4*1024*1024});
  const json=JSON.parse(await fs.readFile(`${out}.json`,'utf8'));const captions=parseWhisperJson(json,duration);
  if(!captions.length)throw new Error('No speech was detected. Try a clearer recording or check the language.');
  return captions;
 }catch(err){
  if(err.code==='ENOENT')throw new Error('Whisper or FFmpeg was not found. Set WHISPER_CPP_BIN / FFMPEG_PATH; see README.');
  if(err.killed||err.signal)throw new Error('Local transcription timed out or was interrupted.');
  if(err.message?.startsWith('No speech'))throw err;
  throw new Error('Local transcription failed. Check your Whisper model, installation and audio file.');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
