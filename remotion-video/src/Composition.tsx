import React, {useEffect, useState} from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";

const scenes = [
  {tag: "रोशनी का त्योहार", title: "दिवाली के रोचक तथ्य", detail: "आशा, परंपरा और उत्सव की कहानी", image: "diwali.png", audio: "diwali-01.mp3", frames: 216},
  {tag: "तथ्य ०१", title: "श्रीराम की अयोध्या वापसी", detail: "उत्तर भारत में दिवाली को श्रीराम के वनवास\nसे लौटने की खुशी से जोड़ा जाता है।", image: "ayodhya.png", audio: "diwali-02.mp3", frames: 257},
  {tag: "तथ्य ०२", title: "कार्तिक की अमावस्या", detail: "हिंदू पंचांग के अनुसार दिवाली कार्तिक\nमहीने की अमावस्या को मनाई जाती है।", image: "amavasya.png", audio: "diwali-03.mp3", frames: 245},
  {tag: "तथ्य ०३", title: "दीये और लक्ष्मी पूजा", detail: "कई परिवार घरों में दीये जलाते हैं और\nसमृद्धि की देवी लक्ष्मी की पूजा करते हैं।", image: "puja.png", audio: "diwali-04.mp3", frames: 227},
  {tag: "तथ्य ०४", title: "पाँच दिनों का उत्सव", detail: "यह उत्सव आम तौर पर धनतेरस से\nभाई दूज तक पाँच दिनों तक चलता है।", image: "celebration.png", audio: "diwali-05.mp3", frames: 216},
  {tag: "तथ्य ०५", title: "अनेक परंपराएँ", detail: "बंगाल में इसी समय काली पूजा भी\nमनाई जाती है।", image: "bengal.png", audio: "diwali-06.mp3", frames: 250},
  {tag: "प्रकाश और आशा", title: "शुभ दीपावली!", detail: "अंधकार पर प्रकाश की जीत का उत्सव।", image: "diwali.png", audio: "diwali-07.mp3", frames: 244},
];
export const totalFrames = scenes.reduce((sum, scene) => sum + scene.frames, 0);

const Scene: React.FC<{scene: typeof scenes[number]; index: number}> = ({scene, index}) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 12, scene.frames - 12, scene.frames - 1], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const y = interpolate(frame, [0, 18], [22, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const zoom = interpolate(frame, [0, scene.frames], [1, 1.055], {extrapolateRight: "clamp"});
  return <AbsoluteFill style={{backgroundColor: "#100b1e", color: "#fff7ea", fontFamily: "Noto Diwali, sans-serif"}}>
    <AbsoluteFill style={{transform: `scale(${zoom})`}}><Img src={staticFile(scene.image)} style={{width:"100%", height:"100%", objectFit:"cover"}} /></AbsoluteFill>
    <AbsoluteFill style={{background: "linear-gradient(180deg, rgba(13,8,24,.68), rgba(13,8,24,.62) 55%, rgba(13,8,24,.5))"}} />
    <AbsoluteFill style={{opacity:fade, padding:"62px 90px 40px", alignItems:"center", textAlign:"center"}}>
      <div style={{color:"#f4ca8c", fontSize:21, fontWeight:700, letterSpacing:2}}>✦ &nbsp; दीपावली विशेष &nbsp; ✦</div>
      <div style={{height:2, width:110, background:"#e7b878", marginTop:20}} />
      <div style={{marginTop:90, transform:`translateY(${y}px)`}}>
        <div style={{color:"#e6b876", fontSize:25, fontWeight:700}}>{scene.tag}</div>
        <div style={{fontSize: index === 1 ? 64 : 72, fontWeight:700, lineHeight:1.35, marginTop:18, textShadow:"0 3px 22px #0009"}}>{scene.title}</div>
        <div style={{fontSize:30, lineHeight:1.55, color:"#f7e7d3", whiteSpace:"pre-line", marginTop:14}}>{scene.detail}</div>
      </div>
      <div style={{position:"absolute", bottom:53, fontSize:18, color:"#e4c5a1"}}>{String(index+1).padStart(2,"0")} &nbsp;/&nbsp; 07</div>
      <div style={{position:"absolute", bottom:35, width:400, height:3, background:"#ffffff44"}}><div style={{height:"100%", width:`${(index + Math.min(frame/(scene.frames-1),1))/scenes.length*100}%`, background:"#edbd7d"}} /></div>
    </AbsoluteFill>
    <Audio src={staticFile(scene.audio)} />
  </AbsoluteFill>;
};

export const DiwaliVideo: React.FC = () => {
  const [handle] = useState(() => delayRender("Loading Hindi font"));
  useEffect(() => {
    const font = new FontFace("Noto Diwali", `url(${staticFile("NotoSansDevanagari.ttf")})`);
    font.load().then((loaded) => {document.fonts.add(loaded); continueRender(handle);}).catch((error) => {console.error("Could not load Hindi font", error); continueRender(handle);});
  }, [handle]);
  let from = 0;
  return <AbsoluteFill>{scenes.map((scene, index) => {
    const start = from;
    from += scene.frames;
    return <Sequence key={scene.audio} from={start} durationInFrames={scene.frames} name={`${scene.tag}: ${scene.title}`}><Scene scene={scene} index={index} /></Sequence>;
  })}</AbsoluteFill>;
};
