import React, {useEffect, useState} from "react";
import {AbsoluteFill, Audio, Easing, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from "remotion";

const ease = Easing.bezier(0.42, 0, 0.58, 1);
const terracotta = "#b74c2c";
const ink = "#251e19";
const beats = [
  {lead: "एक त्योहार है", keyword: "रोशनी का", image: "cut-diya.png", caption: "दीपों से जगमग", direction: "left"},
  {lead: "उम्मीदों का नाम है", keyword: "दिवाली", image: "cut-diya.png", caption: "खुशियों का उत्सव", direction: "right"},
  {lead: "कार्तिक की", keyword: "अमावस्या", image: "cut-moon.png", caption: "हर साल बदलती तारीख", direction: "top"},
  {lead: "उत्तर भारत में", keyword: "श्रीराम", image: "cut-palace.png", caption: "एक प्राचीन परंपरा", direction: "bottom"},
  {lead: "अयोध्या की", keyword: "वापसी", image: "cut-palace.png", caption: "वनवास के बाद", direction: "right"},
  {lead: "उत्सव के", keyword: "पाँच दिन", image: "cut-lotus.png", caption: "धनतेरस से भाई दूज", direction: "bottom"},
  {lead: "घर आँगन में", keyword: "दीये जलें", image: "cut-diya.png", caption: "प्रकाश की परंपरा", direction: "left"},
  {lead: "समृद्धि के लिए", keyword: "लक्ष्मी पूजा", image: "cut-lotus.png", caption: "आस्था और शुभकामनाएँ", direction: "top"},
  {lead: "आप सभी को", keyword: "शुभ दीपावली", image: "cut-crowd.png", caption: "रोशनी • खुशी • उम्मीद", direction: "bottom"},
] as const;
const animate = (frame: number, start: number, end: number, a: number, b: number) => interpolate(frame, [start, end], [a,b], {easing:ease, extrapolateLeft:"clamp", extrapolateRight:"clamp"});

const Backdrop: React.FC = () => <AbsoluteFill style={{background:"#f5d5bf", overflow:"hidden"}}>
  <AbsoluteFill style={{background:"radial-gradient(ellipse at 53% 22%, #fff0de 0%, #f8dcc7 36%, #eebd9f 100%)"}} />
  <div style={{position:"absolute", top:160, left:105, width:490, height:580, borderRadius:300, background:"#fff4e8", filter:"blur(85px)", opacity:.45}} />
  <svg width="720" height="1280" viewBox="0 0 720 1280" style={{position:"absolute",opacity:.075,filter:"blur(9px)"}}>
    <path d="M690 -10 Q425 200 540 548 M660 34 Q550 155 420 165 M634 80 Q535 205 397 222 M608 125 Q530 255 407 281 M591 173 Q540 308 430 330 M578 225 Q560 352 460 386" fill="none" stroke="#573a2d" strokeWidth="22" strokeLinecap="round"/>
  </svg>
</AbsoluteFill>;

const Beat: React.FC<{index: number}> = ({index}) => {
  const frame=useCurrentFrame(); const beat=beats[index]; const last=index===8;
  const fade = last ? 1 : Math.min(animate(frame,0,9,0,1), index === 7 ? 1 : animate(frame,60,68,1,0));
  const x=beat.direction === "left" ? animate(frame,0,18,-140,0) : beat.direction === "right" ? animate(frame,0,18,140,0) : 0;
  const y=beat.direction === "top" ? animate(frame,0,18,-145,0) : beat.direction === "bottom" ? animate(frame,0,18,145,0) : animate(frame,0,18,25,0);
  const out=last ? 0 : animate(frame,56,68,0, beat.direction === "left" ? -90 : 90);
  const label=animate(frame,5,15,0,1); const word=animate(frame,14,25,0,1);
  const ring=animate(frame,4,48,0,1);
  return <AbsoluteFill style={{opacity:fade, color:ink, fontFamily:"EditorialHindi, serif"}}>
    <div style={{position:"absolute", top:72, left:0, right:0, textAlign:"center", fontFamily:"Arial, sans-serif", fontWeight:700, fontSize:14, letterSpacing:4, color:terracotta}}>✦ &nbsp; DIWALI STORIES &nbsp; ✦</div>
    <div style={{position:"absolute",top:172,left:44,right:44,textAlign:"center"}}>
      <div style={{fontSize:38, lineHeight:1.5, opacity:label, transform:`translateY(${(1-label)*18}px)`}}>{beat.lead.split(" ").map((w,i)=><span key={i} style={{display:"inline-block",marginRight:10,opacity:animate(frame,5+i*4,15+i*4,0,1)}}>{w}</span>)}</div>
      <div style={{fontSize:index===8?89:94,fontWeight:700,lineHeight:1.3,color:terracotta,opacity:word, transform:`translateY(${(1-word)*24}px)`}}>{beat.keyword}</div>
      <div style={{width:62,height:2,background:ink,margin:"20px auto 0",opacity:word}} />
    </div>
    <div style={{position:"absolute", top:440,left:48,width:624,height:615, transform:`translate(${x+out}px,${y}px)`}}>
      <svg width="624" height="615" viewBox="0 0 624 615" style={{position:"absolute",left:0,top:0}}>
        <circle cx="312" cy="304" r="200" fill="#d66a41" opacity=".22" />
        <circle cx="312" cy="304" r="233" fill="none" stroke="#b95436" strokeWidth="2" opacity=".55" strokeDasharray="1464" strokeDashoffset={1464*(1-ring)} transform="rotate(-90 312 304)" />
        <circle cx="312" cy="304" r="245" fill="none" stroke="#b95436" strokeWidth="1" opacity=".25" />
      </svg>
      <Img src={staticFile(beat.image)} style={{position:"absolute",left:index===8?10:57,top:index===8?170:70,width:index===8?604:510,height:index===8?350:470,objectFit:"contain", filter: index===8 ? "grayscale(0.85) sepia(0.28)" : undefined}} />
    </div>
    <div style={{position:"absolute",top:1074,left:0,right:0,textAlign:"center",fontSize:23,opacity:animate(frame,20,30,0,1)}}>{beat.caption}</div>
    <svg width="720" height="180" viewBox="0 0 720 180" style={{position:"absolute",bottom:25,left:0,opacity:.85}}><path d="M-110 170 Q360 -90 830 170" fill="none" stroke={ink} strokeWidth="1.4"/><circle cx={80+(index*70)%560} cy="80" r="5" fill={terracotta}/></svg>
    <div style={{position:"absolute",bottom:48,left:0,right:0,textAlign:"center",fontFamily:"Arial, sans-serif",fontSize:12,letterSpacing:3,color:ink,opacity:.7}}>A LITTLE LIGHT GOES A LONG WAY</div>
  </AbsoluteFill>;
};

export const DiwaliEditorial: React.FC = () => {
  const [handle] = useState(() => delayRender("Loading Hindi serif font"));
  useEffect(() => {
    const font = new FontFace("EditorialHindi", `url(${staticFile("NotoSerifDevanagari.ttf")})`);
    font.load().then((loaded) => {document.fonts.add(loaded); continueRender(handle);}).catch((error) => {console.error(error); continueRender(handle);});
  }, [handle]);
  return <AbsoluteFill><Backdrop/><Audio src={staticFile("editorial-bed.m4a")} volume={0.65}/><Audio src={staticFile("diwali-editorial-narration.mp3")} />
    {beats.map((_,i)=><Sequence key={i} from={i*60} durationInFrames={i < 7 ? 68 : 60} name={`दिवाली · ${beats[i].keyword}`}><Beat index={i}/></Sequence>)}
  </AbsoluteFill>;
};
