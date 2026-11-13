// Lightweight multilingual mapping; deliberately not semantic search or AI.
const concepts=[
 [/शोध|अनुसंधान|research|study|academic/i,'academic research'],[/विद्यार्थी|छात्र|परीक्षा|student|education|school/i,'students studying'],[/दिवाली|दीपावली|diwali|festival/i,'diwali festival'],[/गांव|गाँव|ग्रामीण|village|rural/i,'rural village'],[/कृषि|किसान|खेती|farm|agricultur/i,'agriculture farming'],[/गरीबी|poverty/i,'rural community'],[/प्रकृति|प्रकृति|nature|forest/i,'nature forest'],[/यात्रा|travel|journey/i,'travel landscape'],[/व्यापार|business|office/i,'business office'],[/तकनीक|technology|computer/i,'technology computer'],[/स्वास्थ्य|health|medical/i,'healthcare'],[/परिवार|family/i,'family'],[/अंतरिक्ष|space|planet/i,'space planet'],[/समुद्र|ocean|sea/i,'ocean'],[/पुस्तक|किताब|book|ज्ञान/i,'books reading'],
];
const stop=new Set(['about','the','and','with','this','that','from','into','your','have','what','when','where','they','their','which','would','there','video','scene','story','make','create','explain','explainers']);
export function queryForText(text) {
 const clean=String(text||'').replace(/\s+/g,' ').trim();
 const found=concepts.find(([pattern])=>pattern.test(clean));if(found)return found[1];
 const words=clean.toLowerCase().match(/[a-z]{4,}/g)||[];
 return [...new Set(words.filter(w=>!stop.has(w)))].slice(0,3).join(' ');
}
export function createStockPlan(scenes,subtitles,override=''){
 const manual=override.trim().slice(0,80);return scenes.map((scene,i)=>{
  const next=scenes[i+1]?.from??Infinity;
  const relevant=(subtitles||[]).filter(s=>s.start*30<next&&s.end*30>scene.from).map(s=>s.text).join(' ');
  return manual||queryForText(relevant);
 });
}
