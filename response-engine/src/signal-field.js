import { projectRibbon } from './signal-ribbon-shape.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const range=(p,a,b)=>{const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};

// Every point has one identity and one sequence of targets. Scene changes never
// create a fresh cloud; reverse scrolling visits the very same coordinates.
export function drawSignalField(ctx,{p,time,width:w,height:h,phone,pointer,identities,title,fracture,score,scoreBounds,signalX,signalY,motion,responsePaths,selectedBranch,gpu}){
  ctx.clearRect(0,0,w,h);
  if(p<.12||p>5||(!motion&&Math.round(p)!==2&&Math.round(p)!==4))return;
  const depth=range(p,1.35,2.45),collapse=range(p,2.25,3.05),response=range(p,3.1,4),restore=range(p,4.15,4.95);
  const toLiquid=range(p,1.,1.45),toNetwork=range(p,1.55,2.1),toScore=range(p,2.1,2.8);
  const alpha=range(p,.12,.62)*(1-range(p,4.55,5));
  const points=[];
  for(let i=0;i<identities.length;i++){
    const {u,v,group}=identities[i];
    const glyph=title.length?title[(i*29)%title.length]:[.5,.5];
    const letter=fracture.length?fracture[(i*31)%fracture.length]:glyph,fluid=range(p,1.02,1.7),phase=p*.65+Math.sin(time*.6283185)*.18;
    let lx=(letter[0]+Math.sin(letter[1]*13+phase)*.14*fluid)*w,ly=(letter[1]+Math.sin(letter[0]*9+phase)*.1*fluid)*h;
    lx=signalX+(lx-signalX)*(1+fluid*.65);
    const zoom=1+.55*range(p,.95,1.4)*(1-range(p,1.5,2.05));lx=signalX+(lx-signalX)*zoom;ly=signalY+(ly-signalY)*zoom;
    const change=range(p,.55,.95);
    let x=mix(mix(glyph[0],letter[0],change)*w,lx,toLiquid),y=mix(mix(glyph[1],letter[1],change)*h,ly,toLiquid);
    // A folded observation surface is projected through a scroll-directed camera.
    const [nx,ny]=projectRibbon(u,v,p,time,pointer,w,h);
    x=mix(x,nx,toNetwork);y=mix(y,ny,toNetwork);
    if(scoreBounds&&score.length){
      const dest=score[(i*7)%score.length];
      x=mix(x,scoreBounds.left+dest[0]*scoreBounds.width,toScore);
      y=mix(y,scoreBounds.top+dest[1]*scoreBounds.height,toScore);
    }
    // The score splits along the four existing policy pathways. Only the selected
    // path later carries a pulse; these are visual fragments, not new incidents.
    const branch=group%4,pathU=u;
    const startX=w*(phone?.08:.47),endX=w*(phone?.82:.87);
    let pathX=mix(startX,endX,pathU);const baseY=h*(phone?.61:.5);
    const branchY=h*(phone?.49+branch*.073:.3+branch*.135);
    let pathY=mix(baseY,branchY,range(pathU,.12,.55));
    const path=responsePaths[branch];
    if(path?.length){const f=pathU*(path.length-1),a=path[Math.floor(f)],b=path[Math.min(path.length-1,Math.floor(f)+1)];pathX=mix(a[0],b[0],f%1);pathY=mix(a[1],b[1],f%1);}
    x=mix(x,pathX,response);y=mix(y,pathY,response);
    const cols=phone?10:22,col=group%cols,row=Math.floor(i/cols)%14;
    const gx=w*(phone?.14:.49)+col/cols*w*(phone?.73:.42),gy=h*(phone?.62:.28)+row/14*h*(phone?.2:.44);
    x=mix(x,gx,restore);y=mix(y,gy,restore);
    const ambient=motion?Math.sin(time*.6+i*.9)*.65*(1-collapse)*(1-response):0;
    points.push([x,y+ambient]);
    const selected=group===19;
    let opacity=alpha*(selected?.8:.23+(i%7)*.065);
    opacity*=Math.max(1-range(p,2.85,3.12),range(p,3.35,3.85));
    if(p>3.7)opacity*=selected?1:.35;
    ctx.fillStyle=selected?`rgba(200,74,54,${opacity})`:`rgba(${p<1.35?'119,115,111':'185,198,197'},${opacity})`;
    const size=selected?1.8:phone?.8:1.1;if(!gpu)ctx.fillRect(x,y+ambient,size,size);
  }
  // Stable neighboring identities form the network, so edges do not flicker.
  const netAlpha=range(p,1.35,1.95)*(1-range(p,2.25,2.9));
  if(netAlpha>.001){
    ctx.lineWidth=.5;ctx.strokeStyle=`rgba(185,198,197,${netAlpha*.05})`;ctx.beginPath();
    for(let i=0;i<points.length;i+=phone?5:3){
      const j=(i+73)%points.length,a=points[i],b=points[j];
      if(Math.hypot(a[0]-b[0],a[1]-b[1])>w*.15)continue;
      ctx.moveTo(...a);ctx.lineTo(...b);
    }ctx.stroke();
    // The same source is picked out as a chain through the observation field.
    const selected=points.filter((a,i)=>identities[i].group===19&&a[0]>w*.48&&a[1]>h*.28&&a[1]<h*.69).sort((a,b)=>a[0]-b[0]);
    ctx.beginPath();selected.forEach((a,i)=>{if(!i||Math.hypot(a[0]-selected[i-1][0],a[1]-selected[i-1][1])>h*.2)ctx.moveTo(...a);else ctx.lineTo(...a);});
    ctx.strokeStyle=`rgba(200,74,54,${netAlpha*.55})`;ctx.lineWidth=.8;ctx.stroke();
  }
  const wire=range(p,1.65,2.1)*(1-range(p,3.05,3.55));
  if(wire>.001){
    const fold=range(p,2.3,3.2),cx=w*mix(.5,.7,fold),cy=h*.47,size=Math.min(w,h)*mix(.5,.2,fold),angle=.3+(p-2)*.32+pointer.x*.1;
    const project=(x,y,z)=>{const rx=x*Math.cos(angle)+z*Math.sin(angle),rz=-x*Math.sin(angle)+z*Math.cos(angle),s=3.8/(3.8+rz*.5);return[cx+rx*size*s,cy+(y*.8-rz*.28)*size*s];};
    ctx.strokeStyle=`rgba(185,198,197,${wire*.08})`;ctx.lineWidth=.6;
    for(let j=0;j<9;j++){
      const z=j/4-1;ctx.beginPath();[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].forEach(([x,y],i)=>{const a=project(x,y,z);if(!i)ctx.moveTo(...a);else ctx.lineTo(...a);});ctx.stroke();
    }
    for(const x of [-1,1])for(const y of [-1,1]){ctx.beginPath();ctx.moveTo(...project(x,y,-1));ctx.lineTo(...project(x,y,1));ctx.stroke();}
    ctx.setLineDash([2,6]);ctx.beginPath();ctx.moveTo(cx-size*1.4,cy);ctx.lineTo(cx+size*1.4,cy);ctx.moveTo(cx,cy-size*1.3);ctx.lineTo(cx,cy+size*1.3);ctx.stroke();ctx.setLineDash([]);
    if(!phone){ctx.font='7px "IBM Plex Mono"';ctx.fillStyle=`rgba(185,198,197,${wire*.5})`;ctx.fillText('EVIDENCE VOLUME / SSH AUTHENTICATION',cx-size,cy+size*1.5);}
  }
  // Precision construction guides become the console's column boundaries.
  const blueprint=range(p,2.55,3.1);
  if(blueprint>.001){
    ctx.strokeStyle=`rgba(216,191,163,${blueprint*.18})`;ctx.lineWidth=.5;
    const ys=[.22,.39,.82];ctx.setLineDash([2,5]);
    for(const y of ys){ctx.beginPath();ctx.moveTo(w*.058,h*y);ctx.lineTo(w*(.058+.84*blueprint),h*y);ctx.stroke();}
    ctx.setLineDash([]);
    if(!phone){ctx.font='7px "IBM Plex Mono"';ctx.fillStyle=`rgba(216,191,163,${blueprint*.65})`;ctx.fillText('ASSESSMENT / 0 — 100',w*.06,h*.85);ctx.fillText('ILLUSTRATIVE CASE 001',w*.74,h*.85);}
  }
  if(p>3.6&&p<4.65&&selectedBranch>=0){
    // Parallel evidence traces gather onto the selected policy, then straighten
    // into panel boundaries. The light always follows the measured SVG paths.
    const engine=range(p,3.4,3.95)*(1-range(p,4.15,4.7));
    responsePaths.forEach((path,branch)=>{
      const selected=branch===selectedBranch;
      const centerX=w*.5,centerY=h*.52;
      for(let plane=0;plane<9;plane++){
        const z=(plane-4)/4,projection=1/(1+z*.14),lift=z*h*.12;
        ctx.beginPath();path.forEach(([x,y],i)=>{const xx=centerX+(x-centerX)*projection+pointer.x*z*14,yy=centerY+(y-centerY)*projection+lift;if(!i)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);});
        ctx.strokeStyle=selected?`rgba(216,191,163,${engine*(.065-Math.abs(z)*.025)})`:`rgba(185,198,197,${engine*.018})`;ctx.lineWidth=.6;ctx.stroke();
        if(plane===0||plane===8)for(let n=0;n<path.length;n+=16){const [x,y]=path[n];ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(centerX+(x-centerX)*projection+pointer.x*z*14,centerY+(y-centerY)*projection+lift);ctx.stroke();}
      }
      for(let lane=0;lane<(selected?11:4);lane++){
        const offset=(lane-(selected?5:1.5))*4.5*(1-range(p,4.05,4.7));
        ctx.beginPath();path.forEach(([x,y],i)=>{const xx=x+offset*.3,yy=y+offset;if(!i)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);});
        ctx.strokeStyle=selected?`rgba(216,191,163,${engine*.15})`:`rgba(185,198,197,${engine*.045})`;ctx.lineWidth=.5;ctx.stroke();
      }
    });
    const path=responsePaths[selectedBranch];
    if(path?.length)for(let pulse=0;pulse<7;pulse++){const u=((motion?time*.13:.65)+pulse/7)%1,f=u*(path.length-1),a=path[Math.floor(f)],b=path[Math.min(path.length-1,Math.floor(f)+1)];
      ctx.fillStyle=pulse===0?'#eae7df':'#c84a36';ctx.beginPath();ctx.arc(mix(a[0],b[0],f%1),mix(a[1],b[1],f%1),pulse===0?3.5:1.8,0,Math.PI*2);ctx.fill();}
  }
}
