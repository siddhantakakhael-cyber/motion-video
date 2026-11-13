// Energy-onset heuristic, not beat detection or speech recognition. It preserves
// the full source audio and guarantees bounded cut spacing even for silence.
export function findCuts(samples, sampleRate, duration, fps=30) {
 const total = Math.max(1, Math.ceil(duration*fps));
 if (!samples?.length || !Number.isFinite(sampleRate) || sampleRate <= 0 || total <= fps*2) return [0];
 const step = Math.max(1, Math.round(sampleRate*.2));
 const levels=[];
 for (let start=0; start<samples.length; start+=step) {
  let sum=0, n=Math.min(step,samples.length-start);
  for(let j=0;j<n;j++){const v=samples[start+j];sum+=v*v;}
  levels.push(Math.sqrt(sum/n));
 }
 const candidates=levels.map((value,i)=>({time:i*.2,score:Math.max(0,value-(levels[i-1] || 0))}));
 const cuts=[0]; let cursor=0;
 while (cursor+5 < duration && cuts.length<40) {
  const start=cursor+2.5, end=Math.min(cursor+5,duration-1.5);
  const window=candidates.filter(c=>c.time>=start&&c.time<=end);
  const peak=window.reduce((best,c)=>!best||c.score>best.score?c:best,null);
  const next=peak && peak.score>.004 ? peak.time : Math.min(cursor+4,end);
  const cut=Math.round(next*fps);
  if(cut<=cuts[cuts.length-1] || cut>=total) break;
  cuts.push(cut);cursor=cut/fps;
 }
 return cuts;
}
