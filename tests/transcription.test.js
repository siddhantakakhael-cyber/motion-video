import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseWhisperJson,transcribeAudio} from '../server/transcription.mjs';
import {createStockPlan,queryForText} from '../src/stock-plan.js';
import {selectPexelsVideo,fetchPexelsClip} from '../server/stock.mjs';

test('Whisper segments become bounded, editable timestamped captions',()=>{
 const captions=parseWhisperJson({transcription:[{offsets:{from:0,to:8000},text:'One two three four five six seven eight nine ten.'},{offsets:{from:9000,to:8000},text:'invalid'}]},10);
 assert.equal(captions.length,2);assert.deepEqual(captions[0],{start:0,end:4,text:'One two three four five six seven'});assert.equal(captions[1].end,8);
});
test('actual ffmpeg conversion and local CLI invocation create captions without network',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'whisper-test-'));try{
  const model=path.join(dir,'model.bin'),binary=path.join(dir,'whisper-cli');await fs.writeFile(model,'mock');
  await fs.writeFile(binary,`#!/usr/bin/env node\nconst fs=require('fs'); const a=process.argv; const o=a[a.indexOf('-of')+1]; fs.writeFileSync(o+'.json',JSON.stringify({transcription:[{offsets:{from:0,to:300},text:'नमस्ते दुनिया'}]}));\n`);await fs.chmod(binary,0o755);
  const result=await transcribeAudio({file:path.resolve('public/soft-transition.wav'),model,binary,ffmpeg:path.resolve('node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg'),duration:1});
  assert.equal(result[0].text,'नमस्ते दुनिया');assert.equal(result[0].end,.3);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('stock keywords are local, scoped to matching scenes and support Hindi',()=>{
 assert.equal(queryForText('परीक्षा का तनाव'),'students studying');assert.equal(queryForText('शोध की दुनिया'),'academic research');
 assert.deepEqual(createStockPlan([{from:0},{from:150}],[{start:0,end:5,text:'शोध'}, {start:5,end:10,text:'दिवाली'}]),['academic research','diwali festival']);
 assert.deepEqual(createStockPlan([{from:0}],[],'ocean waves'),['ocean waves']);
});
test('Pexels clips reject unsafe hosts and fetch only trusted video URLs',async()=>{
 const bad={videos:[{duration:8,video_files:[{file_type:'video/mp4',width:640,height:480,link:'https://evil.example/video.mp4'}]}]};assert.equal(selectPexelsVideo(bad),null);
 const data={videos:[{duration:8,user:{name:'Jane'},url:'https://www.pexels.com/video/123/',video_files:[{file_type:'video/mp4',width:640,height:480,link:'https://videos.pexels.com/video-files/123/test.mp4'}]}]};let calls=[];
 const mock=async(url,options)=>{calls.push(String(url));if(calls.length===1){assert.equal(options.headers.Authorization,'fake-key');return new Response(JSON.stringify(data),{status:200});}return new Response(Buffer.from('video'),{status:200,headers:{'content-length':'5'}})};
 const clip=await fetchPexelsClip('ocean','landscape','fake-key',mock);assert.equal(clip.author,'Jane');assert.equal(clip.data.toString(),'video');assert.equal(calls.length,2);assert.ok(calls[0].startsWith('https://api.pexels.com/'));
});
