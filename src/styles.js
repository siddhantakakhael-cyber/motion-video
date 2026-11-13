// These presets describe actual visual behavior, not just labels.
export const styles = [
 {id:'warm-editorial',name:'Warm Editorial',description:'Terracotta, serif & soft paper',background:'#f4d5bf',accent:'#b74c2c',ink:'#271e19',font:'serif',motif:'circle',motion:'slide',light:true},
 {id:'cinematic',name:'Cinematic',description:'Deep indigo & cinematic light',background:'#111424',accent:'#c2adf5',ink:'#ffffff',font:'serif',motif:'glow',motion:'zoom'},
 {id:'minimal',name:'Minimal Studio',description:'Clean type & generous space',background:'#f6f5f0',accent:'#292d31',ink:'#222222',font:'sans',motif:'line',motion:'fade',light:true},
 {id:'neon',name:'Neon Pulse',description:'Electric color & bold type',background:'#100a20',accent:'#df62ff',ink:'#ffffff',font:'sans',motif:'grid',motion:'pulse'},
 {id:'documentary',name:'Documentary',description:'Paper, ink & editorial rules',background:'#e9ddc6',accent:'#8a442f',ink:'#27231f',font:'serif',motif:'line',motion:'slide',light:true},
 {id:'playful',name:'Playful Pop',description:'Bright shapes & punchy words',background:'#ffd966',accent:'#ec5d68',ink:'#291d25',font:'sans',motif:'blocks',motion:'pop',light:true},
 {id:'luxury',name:'Modern Luxury',description:'Black, gold & understated motion',background:'#161512',accent:'#d8b773',ink:'#f8f0df',font:'serif',motif:'frame',motion:'fade'},
 {id:'tech',name:'Tech Interface',description:'Cyan grids & precise movement',background:'#071b23',accent:'#5ee9d5',ink:'#e9fffb',font:'mono',motif:'grid',motion:'slide'},
 {id:'nature',name:'Organic Nature',description:'Sage, cream & gentle movement',background:'#dce6d4',accent:'#426d4f',ink:'#223628',font:'serif',motif:'circle',motion:'fade',light:true},
 {id:'retro',name:'Retro Print',description:'Vintage paper & offset blocks',background:'#f3c99f',accent:'#a43b27',ink:'#2c241c',font:'serif',motif:'blocks',motion:'slide',light:true},
 {id:'bold',name:'Bold Type',description:'High-contrast kinetic headlines',background:'#f3f1ea',accent:'#ec452b',ink:'#151515',font:'sans',motif:'blocks',motion:'pop',light:true},
 {id:'dreamy',name:'Dreamy Pastel',description:'Lavender glow & floating type',background:'#e8dcf5',accent:'#8b68bd',ink:'#392a4b',font:'serif',motif:'glow',motion:'zoom',light:true},
 {id:'corporate',name:'Clean Corporate',description:'Confident blue & structured lines',background:'#e5edf4',accent:'#285b99',ink:'#142b46',font:'sans',motif:'frame',motion:'slide',light:true},
 {id:'noir',name:'Monochrome Noir',description:'Black & white with filmic contrast',background:'#171717',accent:'#dfdfdf',ink:'#ffffff',font:'serif',motif:'frame',motion:'fade'},
 {id:'sunset',name:'Sunset Stories',description:'Warm gradients & expansive type',background:'#521e2a',accent:'#ffbb79',ink:'#fff3e9',font:'serif',motif:'glow',motion:'zoom'},
];
export const getStyle = id => styles.find(style => style.id === id) || styles[0];
export function suggestStyle(prompt='') {
 const p=prompt.toLowerCase();
 if (/research|study|education|lesson|learn|शिक्षा|शोध|पढ़ाई/.test(p)) return 'documentary';
 if (/diwali|festival|दिवाली|दीपावली|editorial/.test(p)) return 'warm-editorial';
 if (/tech|software|ai|technology|code/.test(p)) return 'tech';
 if (/product|luxury|brand|fashion/.test(p)) return 'luxury';
 if (/travel|cinematic|adventure/.test(p)) return 'cinematic';
 if (/nature|forest|garden/.test(p)) return 'nature';
 if (/fun|party|kids/.test(p)) return 'playful';
 return 'warm-editorial';
}
