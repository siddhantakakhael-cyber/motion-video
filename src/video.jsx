import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Composition, Easing, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {getStyle} from './styles.js';

export const defaultVideo = {
 title:'Chasing the light',duration:12,ratio:'16:9',styleId:'warm-editorial',sfx:true,mediaId:null,
 scenes:[{from:0,label:'SCENE 01',headline:'Imagine the\nextraordinary',caption:'Every story starts with an idea.'},{from:120,label:'SCENE 02',headline:'Make it\nmove',caption:'Find a new perspective.'},{from:240,label:'SCENE 03',headline:'Make it\nmemorable',caption:'Your idea, in motion.'}]
};
const smooth=Easing.bezier(.42,0,.58,1);
const anim=(f,a,b,x,y)=>interpolate(f,[a,b],[x,y],{easing:smooth,extrapolateLeft:'clamp',extrapolateRight:'clamp'});
const safeHex=(s)=>/^#[a-f\d]{6}$/i.test(s)?s:'#b74c2c';
function Art({preset,frame,vertical}){
 const color=safeHex(preset.accent); const scale=anim(frame,0,20,.88,1);const move=anim(frame,0,20,60,0);
 return <div style={{position:'absolute',width:vertical?'86%':'47%',height:vertical?'40%':'74%',right:vertical?'7%':'3%',bottom:vertical?'12%':'8%',display:'grid',placeItems:'center',opacity:.8,transform:`translateY(${move}px) scale(${scale})`}}>
  {preset.motif==='glow' && <div style={{position:'absolute',width:'80%',height:'80%',borderRadius:'50%',background:`radial-gradient(circle, ${color}bb, transparent 70%)`,filter:'blur(20px)'}}/>}
  {preset.motif==='grid' && <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${color}55 1px,transparent 1px),linear-gradient(90deg,${color}55 1px,transparent 1px)`,backgroundSize:'11% 11%',maskImage:'radial-gradient(ellipse, black, transparent 75%)'}}/>}
  {preset.motif==='blocks' ? <div style={{width:'68%',height:'65%',background:color,transform:`rotate(${preset.motion==='pop'?'-7deg':'3deg'})`,borderRadius:preset.id==='playful'?'30% 10% 30% 10%':'4px',opacity:.65}}/> : <svg viewBox="0 0 500 500" style={{width:'90%',height:'90%',position:'absolute'}}><circle cx="250" cy="250" r="160" fill={color} opacity=".22"/><circle cx="250" cy="250" r="195" fill="none" stroke={color} strokeWidth="2" opacity=".6" strokeDasharray="1225" strokeDashoffset={1225*(1-anim(frame,0,40,0,1))}/><path d="M20 360 Q250 20 480 360" fill="none" stroke={preset.ink} strokeWidth="1.5" opacity=".55"/><circle cx="250" cy="90" r="8" fill={color}/></svg>}
  {preset.motif==='frame'&&<div style={{position:'absolute',inset:'12%',border:`2px solid ${color}`,opacity:.6}}/>}
 </div>;
}
export function MotionComposition({video=defaultVideo}) {
 const frame=useCurrentFrame(); const {durationInFrames}=useVideoConfig();
 const [handle]=useState(()=>delayRender('Loading typography'));
 useEffect(()=>{const f=new FontFace('MotionHindi',`url(${staticFile('NotoSansDevanagari.ttf')})`);f.load().then(font=>{document.fonts.add(font);continueRender(handle)}).catch(()=>continueRender(handle));},[handle]);
 const scenes=video.scenes?.length?video.scenes:defaultVideo.scenes;let index=0;for(let i=1;i<scenes.length;i++)if(frame>=scenes[i].from)index=i;
 const scene=scenes[index],start=scene.from,end=scenes[index+1]?.from??durationInFrames, local=frame-start, length=end-start;
 const preset=getStyle(video.styleId),vertical=video.ratio==='9:16';
 const alpha=Math.min(index===0?1:anim(local,0,Math.min(10,Math.max(1,length/3)),0,1),anim(local,Math.max(1,length-9),length,1,0));
 const y=index===0?0:anim(local,0,19,28,0),scale=preset.motion==='zoom'?anim(local,0,Math.max(1,length),1.06,1):1;
 const headline=(scene.headline||'').split('\n');
 return <AbsoluteFill style={{background:preset.background,color:preset.ink,fontFamily:'MotionHindi, sans-serif',overflow:'hidden'}}>
  {preset.id==='cinematic'&&<AbsoluteFill style={{opacity:.42,transform:`scale(${scale})`}}><Img src={staticFile('aurora.png')} style={{width:'100%',height:'100%',objectFit:'cover'}}/></AbsoluteFill>}
  {preset.motif==='glow'&&<AbsoluteFill style={{background:`radial-gradient(circle at 75% 60%, ${preset.accent}33, transparent 55%)`}}/>}
  <Art preset={preset} frame={local} vertical={vertical}/>
  <AbsoluteFill style={{padding:vertical?'9%':'5%',justifyContent:'space-between'}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:vertical?15:13,letterSpacing:3,fontWeight:700,opacity:.75}}><span>✳ &nbsp; MOTION STUDIO</span><span>{String(index+1).padStart(2,'0')} / {String(scenes.length).padStart(2,'0')}</span></div>
   <div style={{opacity:alpha,transform:`translateY(${y}px)`,textAlign:vertical?'center':'left',width:vertical?'100%':'57%',alignSelf:vertical?'center':'flex-start',marginTop:vertical?'-35%':0}}>
    <div style={{fontSize:vertical?18:15,letterSpacing:4,fontWeight:700,marginBottom:18,color:preset.accent}}>{scene.label}</div>
    <div style={{fontFamily:preset.font==='mono'?'monospace':preset.font==='serif'?'Georgia, MotionHindi, serif':'MotionHindi, Arial, sans-serif',fontWeight:preset.font==='sans'?800:600,fontSize:vertical?(scene.headline.length>38?49:64):(scene.headline.length>38?47:68),lineHeight:1.13,letterSpacing:-1,overflowWrap:'anywhere'}}>{headline.map((line,i)=><div key={i} style={{opacity:index===0?1:anim(local,4+i*5,15+i*5,0,1)}}>{line}</div>)}</div>
    {scene.caption&&<div style={{fontSize:vertical?20:17,marginTop:22,opacity:.8,lineHeight:1.45}}>{scene.caption}</div>}
   </div>
   <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:12,letterSpacing:2,opacity:.7}}><span>{preset.name.toUpperCase()}</span><span>✳</span></div>
  </AbsoluteFill>
  {video.mediaId&&<Audio src={video.audioSrc||`/api/media/${video.mediaId}`} />}
  {video.sfx&&scenes.slice(1).map((s,i)=><Sequence key={i} from={s.from} durationInFrames={Math.min(11,durationInFrames-s.from)}><Audio src={staticFile('soft-transition.wav')} volume={.45}/></Sequence>)}
 </AbsoluteFill>;
}
export const RemotionRoot=()=> <Composition id="PromptVideo" component={MotionComposition} durationInFrames={360} fps={30} width={1280} height={720} defaultProps={{video:defaultVideo}} calculateMetadata={({props})=>({durationInFrames:Math.ceil(props.video.duration*30),width:props.video.ratio==='9:16'?720:props.video.ratio==='1:1'?720:1280,height:props.video.ratio==='9:16'?1280:720})}/>;
