import test from 'node:test';
import assert from 'node:assert/strict';
import {findCuts} from '../src/audio-analysis.js';
import {createVideo} from '../src/engine.js';
import {styles,suggestStyle} from '../src/styles.js';

test('style catalog is unique and suggestions are meaningful',()=>{
 assert.equal(styles.length,15);assert.equal(new Set(styles.map(s=>s.id)).size,15);
 assert.equal(suggestStyle('दिवाली की कहानी'),'warm-editorial');assert.equal(suggestStyle('research lesson'),'documentary');assert.equal(suggestStyle('technology product'),'tech');
});
test('audio cuts are ordered, bounded and work with silence',()=>{
 const rate=1000,duration=18,samples=new Float32Array(rate*duration);
 for(let i=3000;i<3200;i++)samples[i]=.7;
 const cuts=findCuts(samples,rate,duration);
 assert.equal(cuts[0],0);assert.ok(cuts.length>1);assert.ok(cuts.every((x,i)=>x>=0&&x<duration*30&&(i===0||x>cuts[i-1])));
 assert.deepEqual(findCuts(new Float32Array(500),rate,.5),[0]);
});
test('prompt and audio settings become valid scenes without fabricated transcripts',()=>{
 const v=createVideo('',10,'9:16','tech',[0,90,210],'audio-id',true);
 assert.equal(v.mediaId,'audio-id');assert.equal(v.scenes.length,3);assert.equal(v.scenes[1].headline,'Scene 02');
 assert.equal(v.duration,10);assert.equal(v.sfx,true);
 const phrases=createVideo('First idea. Second idea.',12,'16:9','minimal');assert.equal(phrases.scenes[0].headline,'First idea');assert.equal(phrases.scenes[1].headline,'Second idea');
});
