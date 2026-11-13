import {suggestStyle} from './styles.js';
const clean = text => text.replace(/\s+/g,' ').trim();
const cap = s => s ? s[0].toUpperCase()+s.slice(1) : '';
function shorten(s) { return s.length > 75 ? s.slice(0,72).trimEnd() + '…' : s; }
function wrap(s) { const words=s.split(' '); if(words.length<4) return s; const mid=Math.ceil(words.length/2); return words.slice(0,mid).join(' ')+'\n'+words.slice(mid).join(' '); }
export function createVideo(prompt, duration, ratio, styleId, cutFrames, mediaId, sfx=true) {
 const raw=clean(prompt); const frames=Math.max(1,Math.ceil(duration*30));
 const cuts=(cutFrames?.length?cutFrames:[0,Math.round(frames/3),Math.round(frames*2/3)]).filter((f,i,a)=>Number.isInteger(f)&&f>=0&&f<frames&&(i===0?f===0:f>a[i-1]));
 const phrases=raw.split(/[.!?।\n]+/).map(x=>clean(x)).filter(Boolean);
 let subject=raw.replace(/^(?:please\s+)?(?:create|make|generate)\s+(?:a\s+)?(?:(?:short|cinematic|beautiful)\s+)*(?:video|film|story|animation|trailer)\s+(?:about|of|for|showing)\s+/i,'');
 const short=cap((subject||raw||'Your audio story').split(/\s+/).slice(0,8).join(' ')).slice(0,58);
 const scenes=cuts.map((from,i)=>({from,label:`SCENE ${String(i+1).padStart(2,'0')}`,headline:wrap(shorten((phrases.length>1?phrases[i%phrases.length]:i===0?short:'') || `Scene ${String(i+1).padStart(2,'0')}`)),caption:raw ? (i===0?'A story in motion':'') : 'Add a prompt to set your text'}));
 return {title:short, duration:frames/30, ratio, styleId:styleId||suggestStyle(raw), scenes, mediaId:mediaId||null,sfx:!!sfx,prompt:raw};
}
