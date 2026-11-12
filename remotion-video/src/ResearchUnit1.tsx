import React, {useEffect, useState} from "react";
import {AbsoluteFill, Audio, Easing, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from "remotion";

type Card = {lead: string; key: string; note: string};
type Chapter = {frames: number; image: string; audio: string; name: string; cards: Card[]};
const chapters: Chapter[] = [
 {frames:453,image:"unit1-idea.png",audio:"unit1-01.mp3",name:"शोध दर्शन",cards:[
  {lead:"UNIT I",key:"शोध दर्शन",note:"Philosophical Understanding of Research"},
  {lead:"सर्वे से पहले समझें",key:"दृष्टिकोण",note:"हम वास्तविकता को कैसे देखते हैं?"},
  {lead:"रिसर्च की नींव है",key:"सही ज्ञान",note:"हम किसे वैध ज्ञान मानते हैं?"}]},
 {frames:452,image:"unit1-reality.png",audio:"unit1-02.mp3",name:"तीन प्रश्न",cards:[
  {lead:"वास्तविकता क्या है?",key:"ऑन्टोलॉजी",note:"ONTOLOGY · वास्तविकता का स्वरूप"},
  {lead:"हम कैसे जानें?",key:"एपिस्टेमोलॉजी",note:"EPISTEMOLOGY · ज्ञान का आधार"},
  {lead:"शोध में मूल्यों की भूमिका?",key:"ऐक्सियोलॉजी",note:"AXIOLOGY · मूल्य और नैतिकता"}]},
 {frames:403,image:"unit1-reality.png",audio:"unit1-03.mp3",name:"ऑन्टोलॉजी",cards:[
  {lead:"वास्तविकता की प्रकृति",key:"ऑन्टोलॉजी",note:"Reality कैसी है?"},
  {lead:"सोच से स्वतंत्र सत्य",key:"वस्तुनिष्ठ",note:"OBJECTIVISM / REALISM"},
  {lead:"सामाजिक अनुभव से बना",key:"निर्माणवादी",note:"CONSTRUCTIVISM"}]},
 {frames:357,image:"unit1-idea.png",audio:"unit1-04.mp3",name:"ऑन्टोलॉजी उदाहरण",cards:[
  {lead:"गाँव की जनसंख्या",key:"संख्या",note:"गिनी जा सकने वाली वास्तविकता"},
  {lead:"वस्तुनिष्ठ तथ्य",key:"जनसंख्या",note:"लोगों की भावनाओं से अलग"},
  {lead:"कार्यस्थल पर",key:"खुशी",note:"अनुभव और संस्कृति से जुड़ा अर्थ"}]},
 {frames:501,image:"unit1-knowledge.png",audio:"unit1-05.mp3",name:"एपिस्टेमोलॉजी",cards:[
  {lead:"ज्ञान का स्रोत",key:"एपिस्टेमोलॉजी",note:"ज्ञान कैसे मिले और मान्य कैसे हो?"},
  {lead:"मापने योग्य प्रमाण",key:"प्रत्यक्षवाद",note:"POSITIVISM · आँकड़े और अवलोकन"},
  {lead:"लोगों के अनुभव",key:"व्याख्यावाद",note:"INTERPRETIVISM · अर्थ और संदर्भ"}]},
 {frames:424,image:"unit1-knowledge.png",audio:"unit1-06.mp3",name:"ज्ञान का उदाहरण",cards:[
  {lead:"सोचिए परीक्षा का",key:"तनाव",note:"एक ही प्रश्न, अलग रास्ते"},
  {lead:"अंक और शारीरिक",key:"माप",note:"मात्रात्मक प्रमाण इकट्ठा करना"},
  {lead:"छात्रों से गहरी",key:"बातचीत",note:"अनुभव और अपेक्षाएँ समझना"}]},
 {frames:435,image:"unit1-meaning.png",audio:"unit1-07.mp3",name:"हर्मेन्यूटिक्स",cards:[
  {lead:"व्याख्या की पद्धति",key:"हर्मेन्यूटिक्स",note:"पाठ और व्यवहार को समझना"},
  {lead:"शब्दों के साथ",key:"संदर्भ",note:"इतिहास, संस्कृति और परिस्थिति"},
  {lead:"हर्मेन्यूटिक सर्कल",key:"हिस्सा ↔ पूरा",note:"हिस्से से पूरा, पूरे से हिस्सा"}]},
 {frames:600,image:"unit1-meaning.png",audio:"unit1-08.mp3",name:"उदाहरण और पुनरावृत्ति",cards:[
  {lead:"गांधी जी के",key:"जेल पत्र",note:"शब्दों को इतिहास में रखकर पढ़ें"},
  {lead:"शब्दों के साथ",key:"संदर्भ",note:"औपनिवेशिक शासन और स्वतंत्रता आंदोलन"},
  {lead:"ऑन्टोलॉजी",key:"क्या है?",note:"EPISTEMOLOGY · कैसे जानें?"},
  {lead:"हर्मेन्यूटिक्स",key:"अर्थ कैसे?",note:"यूनिट 1 · संक्षिप्त पुनरावृत्ति"}]},
];
export const researchUnit1Frames = chapters.reduce((sum,chapter)=>sum+chapter.frames,0);
const soft=Easing.bezier(.42,0,.58,1);
const ease=(frame:number,start:number,end:number,a:number,b:number)=>interpolate(frame,[start,end],[a,b],{easing:soft,extrapolateLeft:"clamp",extrapolateRight:"clamp"});

const Background:React.FC=()=><AbsoluteFill style={{background:"radial-gradient(ellipse at 50% 20%, #fff1e2 0%, #f8dbc6 40%, #edbda1 100%)",overflow:"hidden"}}>
  <div style={{position:"absolute",top:170,left:90,width:520,height:550,borderRadius:300,background:"#fff7ee",filter:"blur(80px)",opacity:.45}}/>
  <svg width="720" height="1280" viewBox="0 0 720 1280" style={{position:"absolute",opacity:.06,filter:"blur(9px)"}}><path d="M700 -10 Q440 205 540 540 M660 34 Q550 155 410 170 M630 85 Q530 205 390 230 M600 130 Q520 250 400 290 M580 180 Q530 310 430 340" fill="none" stroke="#493228" strokeWidth="24" strokeLinecap="round"/></svg>
</AbsoluteFill>;

const CardView:React.FC<{card:Card; frames:number}>=({card,frames})=>{
 const f=useCurrentFrame();const opacity=Math.min(ease(f,0,9,0,1),ease(f,frames-9,frames,1,0));const lead=ease(f,2,13,0,1);const key=ease(f,10,23,0,1);const words=card.lead.split(" ");
 return <AbsoluteFill style={{opacity,alignItems:"center",textAlign:"center",fontFamily:"ResearchSerif, serif",color:"#29211e"}}>
  <div style={{position:"absolute",top:172,left:45,right:45,fontSize:34,lineHeight:1.45,opacity:lead}}>{words.map((word,i)=><span key={i} style={{display:"inline-block",marginRight:9,opacity:ease(f,2+i*3,13+i*3,0,1)}}>{word}</span>)}</div>
  <div style={{position:"absolute",top:243,left:28,right:28,color:"#ae492d",fontWeight:700,fontSize:card.key.length>12?61:76,lineHeight:1.35,opacity:key,transform:`translateY(${(1-key)*20}px)`}}>{card.key}</div>
  <div style={{position:"absolute",top:378,width:58,height:2,background:"#29211e",opacity:key}}/>
  <div style={{position:"absolute",top:1025,left:45,right:45,fontSize:23,lineHeight:1.5,opacity:ease(f,20,32,0,1)}}>{card.note}</div>
 </AbsoluteFill>;
};

const ChapterView:React.FC<{chapter:Chapter; index:number}>=({chapter,index})=>{
 const frame=useCurrentFrame();const alpha=Math.min(ease(frame,0,10,0,1),ease(frame,chapter.frames-10,chapter.frames,1,0));const enter=ease(frame,0,26,index%2===0?-85:85,0);const exit=ease(frame,chapter.frames-24,chapter.frames,0,index%2===0?85:-85);const ring=ease(frame,5,65,0,1);let prior=0;
 return <AbsoluteFill style={{opacity:alpha}}>
   <div style={{position:"absolute",top:455,left:45,width:630,height:545,transform:`translateX(${enter+exit}px)`}}>
    <svg width="630" height="545" viewBox="0 0 630 545" style={{position:"absolute"}}><circle cx="315" cy="270" r="195" fill="#cf6944" opacity=".2"/><circle cx="315" cy="270" r="225" stroke="#b85739" strokeWidth="2" fill="none" opacity=".55" strokeDasharray="1414" strokeDashoffset={1414*(1-ring)} transform="rotate(-90 315 270)"/><circle cx="315" cy="270" r="237" stroke="#b85739" strokeWidth="1" fill="none" opacity=".22"/></svg>
    <Img src={staticFile(chapter.image)} style={{position:"absolute",left:43,top:45,width:544,height:445,objectFit:"contain"}}/>
   </div>
   {chapter.cards.map((card,i)=>{const start=prior; const end=Math.round(chapter.frames*(i+1)/chapter.cards.length);prior=end;return <Sequence key={i} from={start} durationInFrames={end-start} name={card.key}><CardView card={card} frames={end-start}/></Sequence>})}
   <Audio src={staticFile(chapter.audio)}/>
 </AbsoluteFill>;
};

export const ResearchUnit1:React.FC=()=>{
 const [handle]=useState(()=>delayRender("Loading Hindi serif font"));
 useEffect(()=>{const font=new FontFace("ResearchSerif",`url(${staticFile("NotoSerifDevanagari.ttf")})`);font.load().then(f=>{document.fonts.add(f);continueRender(handle)}).catch(err=>{console.error(err);continueRender(handle)})},[handle]);
 const frame=useCurrentFrame();let from=0;
 return <AbsoluteFill><Background/><Audio src={staticFile("editorial-bed.m4a")} volume={.23} loop/>
  <div style={{position:"absolute",top:72,left:0,right:0,textAlign:"center",fontFamily:"Arial, sans-serif",fontWeight:700,fontSize:14,letterSpacing:3,color:"#ad4b30"}}>✦ &nbsp; RESEARCH METHODOLOGY &nbsp; ✦</div>
  {chapters.map((chapter,i)=>{const start=from;from+=chapter.frames;return <Sequence key={chapter.audio} from={start} durationInFrames={chapter.frames} name={chapter.name}><ChapterView chapter={chapter} index={i}/></Sequence>})}
  <svg width="720" height="180" viewBox="0 0 720 180" style={{position:"absolute",bottom:25,left:0,opacity:.8}}><path d="M-110 170 Q360 -90 830 170" fill="none" stroke="#29211e" strokeWidth="1.4"/><circle cx={90+540*frame/researchUnit1Frames} cy="70" r="5" fill="#b74c2c"/></svg>
  <div style={{position:"absolute",bottom:48,left:0,right:0,textAlign:"center",fontFamily:"Arial, sans-serif",fontSize:12,letterSpacing:2,color:"#29211e",opacity:.7}}>PG-MD-204 &nbsp; · &nbsp; UNIT I &nbsp; · &nbsp; NOTES PP. 2–3</div>
 </AbsoluteFill>;
};
