const MAX_CLIP_BYTES=15*1024*1024;
export function selectPexelsVideo(data, orientation='landscape'){
 for(const video of data?.videos||[]){
  if(!Number.isFinite(video.duration)||video.duration<6)continue;
  const files=(video.video_files||[]).filter(f=>f.file_type==='video/mp4'&&f.width>=240&&f.height>=240&&f.width<=1920&&f.height<=1920&&typeof f.link==='string').sort((a,b)=>{
   const ap=orientation==='portrait'?a.height>=a.width:a.width>=a.height;const bp=orientation==='portrait'?b.height>=b.width:b.width>=b.height;
   return Number(bp)-Number(ap) || Math.abs(a.width*a.height-921600)-Math.abs(b.width*b.height-921600);
  });
  for(const file of files){try{const u=new URL(file.link);if(u.protocol==='https:'&&u.hostname==='videos.pexels.com')return {url:u.href,author:String(video.user?.name||'Pexels contributor').slice(0,100),page:typeof video.url==='string'&&video.url.startsWith('https://www.pexels.com/')?video.url:'https://www.pexels.com/videos/'};}catch{}}
 }
 return null;
}
export async function fetchPexelsClip(query,orientation,key,fetcher=fetch){
 const url=new URL('https://api.pexels.com/videos/search');url.searchParams.set('query',query);url.searchParams.set('per_page','15');url.searchParams.set('orientation',orientation);
 const result=await fetcher(url,{headers:{Authorization:key},signal:AbortSignal.timeout(20000),redirect:'error'});
 if(!result.ok)throw new Error(`Pexels search failed (${result.status}). Check the server key or try again.`);
 const clip=selectPexelsVideo(await result.json(),orientation);if(!clip)return null;
 const response=await fetcher(clip.url,{signal:AbortSignal.timeout(60000),redirect:'error'});
 if(!response.ok)throw new Error('Could not download a Pexels clip.');
 const length=Number(response.headers.get('content-length')||0);if(length>MAX_CLIP_BYTES)return null;
 if(!response.body)return null;
 let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>MAX_CLIP_BYTES){await response.body.cancel?.().catch(()=>{});return null;}chunks.push(Buffer.from(chunk));}
 if(!size)return null;return {...clip,data:Buffer.concat(chunks)};
}
