import { computeKinematics, PRESETS, MODES, formatRPM } from './physics.mjs';

const state = { sun: 24, planet: 24, rpm: 900, mode: 'ring-fixed', preset: 'balanced', playing: true, playback: 1, theta: {sun: 0, ring: 0, carrier: -0.38, planet: 0} };
const $ = id => document.getElementById(id);
let k = computeKinematics(state);
let ctx, canvas, cw = 700, ch = 400, lastTime = 0;
const nfmt = (x, decimals = 0) => new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(x);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function download(name, body, mime){
  const a = document.createElement('a'); const url = URL.createObjectURL(new Blob([body], {type:mime}));
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}
function refresh(){
  k = computeKinematics(state);
  $('input-rpm').value=state.rpm; $('rpm-value').textContent=nfmt(state.rpm);
  $('sun-count').textContent=state.sun; $('planet-count').textContent=state.planet; $('ring-count').textContent=k.ring;
  $('label-sun').textContent=`${state.sun}T`; $('label-ring').textContent=`${k.ring}T`;
  $('ratio-value').textContent=k.ratio.toFixed(2); $('output-value').textContent=nfmt(k.output,1);
  $('planet-value').textContent=nfmt(k.wp,1);
  $('output-direction').textContent=k.reverse?'REVERSE ROTATION DIRECTION':'SAME ROTATION DIRECTION';
  const v=$('assembly-valid');v.innerHTML=`<span>✓</span> VALID 3-PLANET ASSEMBLY <span class="assembly-description">R = S + 2P</span>`;
  $('sun-minus').disabled=state.sun<=18; $('sun-plus').disabled=state.sun>=42;
  $('planet-minus').disabled=state.planet<=12; $('planet-plus').disabled=state.planet>=33;
  $('input-rpm').style.setProperty('--range-progress', `${(state.rpm-100)/2300*100}%`);
  $('speed').style.setProperty('--range-progress', `${(state.playback-.2)/2.8*100}%`);
  $('speed-value').textContent=state.playback.toFixed(1)+'×';
  for(const el of document.querySelectorAll('[data-preset]')){
    const on=el.dataset.preset===state.preset;el.classList.toggle('active',on);el.setAttribute('aria-pressed',String(on));
  }
  for(const el of document.querySelectorAll('[data-mode]')){
    const on=el.dataset.mode===state.mode;el.classList.toggle('active',on);el.setAttribute('aria-pressed',String(on));
  }
  const explanations={
    'ring-fixed':'With the ring locked, the sun drives the planet gears around the central axis. The carrier becomes a slower output: useful for reducing speed and increasing available ideal torque.',
    'sun-fixed':'Holding the sun still lets the driven ring carry the planets forward. The carrier follows the same direction, with a smaller reduction than ring-fixed operation.',
    'carrier-fixed':'With the carrier locked in place, the driven sun makes the ring rotate in the opposite direction. This is a reversing gear arrangement rather than a torque-multiplying reduction.'
  };
  $('insight-text').textContent=explanations[state.mode];
  drawChart();render();
}
function buildControls(){
  $('presets').replaceChildren(...PRESETS.map((p,i)=>{
    const b=document.createElement('button');b.type='button';b.className='preset';b.dataset.preset=p.id;
    b.innerHTML=`<span class="preset-symbol">${['◈','✳','⬡'][i]}</span><strong>${p.name}</strong><small>${p.sun} / ${p.planet}T</small>`;
    b.title=p.sub;b.addEventListener('click',()=>{state.sun=p.sun;state.planet=p.planet;state.preset=p.id;refresh();});return b;
  }));
  $('mode-selector').replaceChildren(...MODES.map((m)=>{
    const b=document.createElement('button');b.type='button';b.textContent=m.label;b.dataset.mode=m.id;
    b.title=`${m.input} input · ${m.fixed} fixed · ${m.output} output`;
    b.addEventListener('click',()=>{state.mode=m.id;refresh()});return b;
  }));
  $('input-rpm').addEventListener('input',e=>{state.rpm=Number(e.target.value);refresh()});
  $('speed').addEventListener('input',e=>{state.playback=Number(e.target.value);refresh()});
  function stepTeeth(prop, d){state[prop]=clamp(state[prop]+d,prop==='sun'?18:12,prop==='sun'?42:33);state.preset='custom';refresh()}
  for(const [id,prop,amt] of [['sun-minus','sun',-3],['sun-plus','sun',3],['planet-minus','planet',-3],['planet-plus','planet',3]]){$(id).addEventListener('click',()=>stepTeeth(prop,amt));}
  $('toggle-play').addEventListener('click',toggle);
  $('reset').addEventListener('click',()=>{state.theta={sun:0,ring:0,carrier:-.38,planet:0};refresh()});
  $('download-json').addEventListener('click',()=>download('torquelab-config.json',JSON.stringify({project:'TorqueLab',date:new Date().toISOString(),configuration:{sun:state.sun,planet:state.planet,ring:k.ring,mode:state.mode,inputRPM:state.rpm},results:{sunRPM:k.ws,ringRPM:k.wr,carrierRPM:k.wc,planetRPM:k.wp,outputRPM:k.output,reductionRatio:k.ratio,direction:k.reverse?'reverse':'forward'},formula:'Ns*(ws-wc)+Nr*(wr-wc)=0'},null,2)+'\n','application/json'));
  $('download-png').addEventListener('click',()=>{render();const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='torquelab-gear-render.png';a.click()});
  $('print-report').addEventListener('click',()=>window.print());
  document.addEventListener('keydown',e=>{if(['INPUT','BUTTON','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(e.code==='Space'){e.preventDefault();toggle()}if(e.key.toLowerCase()==='r'){state.theta={sun:0,ring:0,carrier:-.38,planet:0};render()}});
}
function toggle(){state.playing=!state.playing;$('play-icon').textContent=state.playing?'Ⅱ':'▶';$('play-status').textContent=state.playing?'Simulation running':'Simulation paused';$('toggle-play').setAttribute('aria-label',state.playing?'Pause simulation':'Play simulation');}
function drawChart(){
  const svg=$('bar-chart');const data=PRESETS.map(p=>({...p,value:computeKinematics({...p,mode:state.mode,rpm:state.rpm}).output}));
  const max=Math.max(...data.map(d=>Math.abs(d.value)),1);let markup='';
  const start=64, width=560, base=112;
  [0, .5, 1].forEach(f=>{const x=start+width*f;markup+=`<line x1="${x}" y1="16" x2="${x}" y2="144" stroke="#34414e" stroke-width="1" stroke-dasharray="3 5"/><text x="${x}" y="156" fill="#768a9d" font-size="10" font-family="Space Grotesk" text-anchor="middle">${Math.round(max*f)}</text>`});
  data.forEach((d,i)=>{const y=24+i*43;const barWidth=Math.max(5,Math.abs(d.value)/max*width);const color=i===0?'#6adddd':i===1?'#e5ac67':'#7994bd';markup+=`<text x="0" y="${y+11}" fill="#c0d0de" font-family="Space Grotesk" font-weight="600" font-size="11">${d.name.toUpperCase()}</text><rect x="${start}" y="${y}" width="${width}" height="15" rx="3" fill="#1d2c39"/><rect x="${start}" y="${y}" width="${barWidth}" height="15" rx="3" fill="${color}"/><text x="${Math.min(start+barWidth+8,620)}" y="${y+12}" fill="#d7e4ed" font-size="11" font-family="Space Grotesk" font-weight="600">${Math.round(d.value)}</text>`});
  svg.innerHTML=markup;
}
function circle(x,y,r,color='#aac6d9',line=1){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=line;ctx.stroke()}
function gearShape(x,y,r,teeth,a,color,isSun=false){
  const depth=Math.max(2.7,r*.11),pitch=Math.PI*2/teeth;
  ctx.save();ctx.translate(x,y);ctx.rotate(a);
  ctx.beginPath();
  for(let i=0;i<teeth;i++){
    const offsets=[-.50,-.36,-.27,-.20,.20,.27,.36,.50],radii=[r-depth,r-depth,r+depth*.52,r+depth*.52,r+depth*.52,r+depth*.52,r-depth,r-depth];
    for(let j=0;j<offsets.length;j++){
      const q=(i+offsets[j])*pitch;
      if(i===0&&j===0)ctx.moveTo(Math.cos(q)*radii[j],Math.sin(q)*radii[j]);else ctx.lineTo(Math.cos(q)*radii[j],Math.sin(q)*radii[j]);
    }
  }
  ctx.closePath();ctx.fillStyle=isSun?'#14363f':'#242c34';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.shadowColor=color;ctx.shadowBlur=7;ctx.stroke();ctx.shadowBlur=0;
  circle(0,0,r*.75,color+'77',1);circle(0,0,r*.57,color+'66',1);
  const spokeCount=isSun?6:5;
  for(let i=0;i<spokeCount;i++){
    const q=(i/spokeCount)*Math.PI*2;
    ctx.beginPath();ctx.moveTo(Math.cos(q)*r*.21,Math.sin(q)*r*.21);ctx.lineTo(Math.cos(q)*r*.62,Math.sin(q)*r*.62);ctx.lineWidth=Math.max(2.4,r*.09);ctx.strokeStyle=isSun?'#3c8a95':'#6b6a61';ctx.stroke();
  }
  circle(0,0,r*.2,color,1.5);ctx.beginPath();ctx.arc(0,0,r*.12,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.restore();
}
function ringGear(rad,teeth,angle){
  const pitch=(Math.PI*2)/teeth;
  ctx.save();ctx.rotate(angle);
  ctx.beginPath();ctx.arc(0,0,rad+22,0,Math.PI*2);
  ctx.moveTo(rad+8,0);
  for(let i=0;i<teeth;i++){
    const q=(i+.25)*pitch; const q2=(i+.55)*pitch;const q3=(i+.80)*pitch;
    ctx.lineTo((rad+7)*Math.cos(q),(rad+7)*Math.sin(q));
    ctx.lineTo((rad-3)*Math.cos(q2),(rad-3)*Math.sin(q2));
    ctx.lineTo((rad-3)*Math.cos(q3),(rad-3)*Math.sin(q3));
    ctx.lineTo((rad+7)*Math.cos((i+1)*pitch),(rad+7)*Math.sin((i+1)*pitch));
  }
  ctx.closePath();ctx.fillStyle='#23313d';ctx.fill('evenodd');
  ctx.strokeStyle='#e7a66b';ctx.lineWidth=1.8;circle(0,0,rad+21,'#b88054',1.5);circle(0,0,rad+15,'#eaa76f66',1);
  for(let i=0;i<24;i++){const q=i*Math.PI/12;ctx.beginPath();ctx.arc((rad+16)*Math.cos(q),(rad+16)*Math.sin(q),1.8,0,Math.PI*2);ctx.fillStyle='#cf9864';ctx.fill()}
  ctx.restore();
}
function render(){
  if(!ctx)return;
  ctx.clearRect(0,0,cw,ch);
  const cx=cw*.5,cy=ch*.51,fit=Math.min((cw-90)/410,(ch-26)/410,1.04);
  ctx.save();ctx.translate(cx,cy);ctx.scale(fit,fit);
  // Outer instrument graphics
  ctx.setLineDash([3,8]);circle(0,0,213,'#63839942',1);ctx.setLineDash([]);
  for(let i=0;i<48;i++){
    const q=i*Math.PI/24;const d=i%4===0?214:219;const len=i%4===0?8:3;
    ctx.beginPath();ctx.moveTo(Math.cos(q)*d,Math.sin(q)*d);ctx.lineTo(Math.cos(q)*(d+len),Math.sin(q)*(d+len));ctx.strokeStyle=i%4===0?'#65849966':'#45657844';ctx.lineWidth=i%4===0?1.5:1;ctx.stroke();
  }
  ctx.setLineDash([4,6]);ctx.beginPath();ctx.moveTo(-218,0);ctx.lineTo(218,0);ctx.moveTo(0,-218);ctx.lineTo(0,218);ctx.strokeStyle='#46607755';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
  // Equal module radii: pitch circle proportional to tooth count
  const rr=159,rs=rr*k.sun/k.ring,rp=rr*k.planet/k.ring,orbit=rs+rp;
  ringGear(rr,k.ring,state.theta.ring);
  circle(0,0,orbit,'#4b849c55',.9);
  const centers=[0,1,2].map(i=>{const a=state.theta.carrier-Math.PI/2+i*Math.PI*2/3;return {x:Math.cos(a)*orbit,y:Math.sin(a)*orbit,a}});
  // Carrier back plate; arms visible beneath gears
  ctx.save();ctx.rotate(state.theta.carrier);
  for(let i=0;i<3;i++){
    const a=-Math.PI/2+i*2*Math.PI/3;
    ctx.save();ctx.rotate(a);ctx.beginPath();ctx.roundRect(-10,-6,20,orbit+6,7);ctx.fillStyle='#172b38';ctx.fill();ctx.strokeStyle='#49778a';ctx.lineWidth=1.2;ctx.stroke();ctx.restore();
  }
  ctx.restore();
  centers.forEach((p,i)=>gearShape(p.x,p.y,rp,k.planet,state.theta.planet + i*.22,'#efcb87'));
  gearShape(0,0,rs,k.sun,state.theta.sun,'#6adddd',true);
  ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fillStyle='#182a36';ctx.fill();circle(0,0,11,'#d5e9ec',1.3);circle(0,0,4,'#b2d7df',1);
  // Two marked assembly callouts, always linked to positions
  ctx.lineWidth=.9;ctx.strokeStyle='#94b8c177';
  ctx.beginPath();ctx.moveTo(-rr-1,-42);ctx.lineTo(-rr-32,-60);ctx.lineTo(-rr-49,-60);ctx.stroke();
  ctx.beginPath();ctx.moveTo(rs*.7,rs*.7);ctx.lineTo(102,87);ctx.lineTo(136,87);ctx.stroke();
  ctx.restore();
}
function resize(){const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;const dpr=Math.min(window.devicePixelRatio||1,2);cw=rect.width;ch=rect.height;canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);ctx=canvas.getContext('2d',{alpha:true});ctx.setTransform(dpr,0,0,dpr,0,0);render()}
function frame(ms){const dt=Math.min(Math.max((ms-lastTime)/1000,0),.08);lastTime=ms;
  if(state.playing && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    const scale=.0075*state.playback*(Math.PI*2/60)*dt;
    state.theta.sun+=k.ws*scale;state.theta.ring+=k.wr*scale;state.theta.carrier+=k.wc*scale;state.theta.planet+=k.wp*scale;
    for(const key of Object.keys(state.theta)){if(Math.abs(state.theta[key])>10000)state.theta[key]%=2*Math.PI;}
    render();
  }
  requestAnimationFrame(frame);
}
function init(){canvas=$('gear-canvas');buildControls();window.addEventListener('resize',resize);new ResizeObserver(resize).observe($('canvas-wrap'));resize();refresh();requestAnimationFrame(frame)}
init();
