import * as THREE from 'three';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import {createPortal} from './singularity-portal.js';
import {createLanes,NODE_POSITIONS} from './singularity-lanes.js';
import {createSignalParticles,createAmbientDust} from './singularity-particles.js';
import {createObservationSurface} from './singularity-membrane.js';
import {createThreatGlobe,createRiskInstrument} from './singularity-analysis.js';
import {createRevealEnvironment} from './singularity-reveal.js';

const phase=(p,a,b)=>THREE.MathUtils.smoothstep(p,a,b);
const mix=THREE.MathUtils.lerp;
function haloTexture(){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');if(!ctx)return null;const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#ffffff');g.addColorStop(.08,'#fff8ee');g.addColorStop(.22,'#ffb3a170');g.addColorStop(1,'#c83c3200');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);}

export function createStoryboardWorld(host,{onAsset=()=>{}}={}){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,powerPreference:'high-performance'});}catch{host.dataset.fallback='true';['earth','environment','shaders'].forEach(onAsset);return {ready:Promise.resolve(),draw(){return{};},resize(){},setTargets(){},setPreviewQuad(){},dispose(){}};}
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,80),root=new THREE.Group();scene.add(root);
  const lanes=createLanes(root),particles=createSignalParticles(root,lanes.uniforms),dust=createAmbientDust(scene),observation=createObservationSurface(root,lanes.uniforms);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const canvas=renderer.domElement;canvas.className='sb-world-canvas';canvas.setAttribute('aria-hidden','true');host.append(canvas);
  let width=1,height=1,phone=false,disposed=false,last=0,previous=-1,dpr=1,quality=1,slowFrames=0,environment=null,targets=null,lost=false;
  const invalidate=()=>{previous=-1;host.dispatchEvent(new Event('storyboard:invalidate'));};
  const manager=new THREE.LoadingManager();let resolveAssets;
  const assetsReady=new Promise(resolve=>{resolveAssets=resolve;});
  manager.onProgress=url=>onAsset(url.includes('earth')?'earth':'environment');manager.onLoad=()=>resolveAssets();
  const globe=createThreatGlobe(root,invalidate,manager),riskInstrument=createRiskInstrument(root),reveal=createRevealEnvironment(scene,globe);
  const portal=createPortal(scene,()=>{host.dataset.portal='procedural';invalidate();});
  new RGBELoader(manager).load('/assets/singularity-studio.hdr',texture=>{if(disposed){texture.dispose();return;}const generator=new THREE.PMREMGenerator(renderer);environment=generator.fromEquirectangular(texture);scene.environment=environment.texture;generator.dispose();texture.dispose();invalidate();},undefined,()=>{});
  scene.add(new THREE.HemisphereLight(0xe5e0d4,0x070b0d,.7));
  const key=new THREE.DirectionalLight(0xffe6bc,3.5);key.position.set(-3,5,4);scene.add(key);
  const rim=new THREE.DirectionalLight(0xdde5e3,4);rim.position.set(3,-1,-4);scene.add(rim);
  const red=new THREE.PointLight(0xc83c32,3,10,2);red.position.set(-.5,0,1);root.add(red);
  const glow=haloTexture(),nodes=[];
  NODE_POSITIONS.forEach((position,i)=>{
    const point=new THREE.Vector3(...position),primary=i<3;
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(primary?.022:.012,12,8),new THREE.MeshBasicMaterial({color:primary?0xe74c37:0x8f9a98,transparent:true}));mesh.position.copy(point);root.add(mesh);
    let halo=null;
    if(primary){halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xc83c32,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));halo.position.copy(point);halo.scale.setScalar(.28);root.add(halo);}
    nodes.push({mesh,halo,point,id:['source','rule','host'][i]});
  });
  const rigs=[
    {x:0,y:0,z:8,tx:0,ty:0,tz:0},
    {x:.05,y:.1,z:3.6,tx:0,ty:0,tz:-12},
    {x:0,y:.15,z:8.4,tx:0,ty:0,tz:0},
    {x:.15,y:0,z:7.8,tx:0,ty:0,tz:0},
    {x:0,y:0,z:9,tx:0,ty:0,tz:0}
  ];
  function resize(){if(disposed)return;width=host.clientWidth;height=host.clientHeight;phone=width<=760;dpr=Math.min(devicePixelRatio||1,phone?1.1:1.35)*quality;renderer.setPixelRatio(dpr);renderer.setSize(width,height);camera.aspect=width/height;camera.fov=phone?43:38;camera.updateProjectionMatrix();previous=-1;if(targets)particles.setTargets(targets,width,height,phone);}
  function setTargets(value){targets=value;particles.setTargets(value,width,height,phone);lanes.setPanels(value.panels||[]);lanes.setQuad(value.quad);previous=-1;}
  const projected=new THREE.Vector3(),riskCenter=new THREE.Vector2(),dockPoint=new THREE.Vector3(),dockDirection=new THREE.Vector3(),dialCenter=new THREE.Vector3(),dialEdge=new THREE.Vector3();
  function draw({progress:p,time=0,motion=true,pointerX=0,pointerY=0,risk=84,factors=[36,30,9,9],factorSelection=-1,velocity=0,inspection=null,dragX=0,dragY=0,orbitX=0,orbitY=0}){
    if(disposed||lost)return{};const now=performance.now();if(motion&&Math.abs(previous-p)<.0001&&now-last<1000/(phone?30:45))return null;
    if(last&&now-last>42)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);if(slowFrames>35&&quality>.7){quality=Math.max(.7,quality-.1);slowFrames=0;resize();}
    last=now;previous=p;const t=motion?time:0,index=Math.min(3,Math.floor(p)),f=phase(p,index,index+1),a=rigs[index],b=rigs[index+1],rig={};for(const k of Object.keys(a))rig[k]=mix(a[k],b[k],f);
    camera.position.set(rig.x+pointerX*.12,rig.y+pointerY*.08,rig.z);camera.lookAt(rig.tx,rig.ty,rig.tz);camera.updateMatrixWorld();
    const network=phase(p,1.2,1.95),riskStage=phase(p,2.25,3);
    const scale=phone?mix(1,.43,network)*(1-riskStage*.12):1;
    root.scale.setScalar(scale);root.position.set((phone?0:.95)*network*(1-riskStage)+mix(0,phone?-.45:.38,riskStage),phone?mix(0,-.55,network):0,0);root.rotation.set(pointerY*.015+(dragY+orbitY)*network*(1-riskStage),pointerX*.035+(dragX+orbitX)*network*(1-riskStage),Math.sin(t*.08)*.008);
    scene.environmentRotation.y=.2+Math.sin(t*.07)*.1;
    key.position.set(-3+Math.sin(t*.1)*1.2,4,4);red.intensity=2+riskStage*risk*.08;
    root.updateMatrixWorld(true);projected.set(-.45,0,0).applyMatrix4(root.matrixWorld).project(camera);
    riskCenter.set(projected.x*.5+.5,projected.y*.5+.5);
    portal.update({progress:p,time:t,aspect:width/height,phone,x:pointerX,y:pointerY,risk,velocity,riskCenter});
    lanes.update({progress:p,time:t,phone,risk,inspection});observation.update(p);globe.update(p,t);riskInstrument.update({progress:p,time:t,factors,selection:factorSelection});particles.update({dpr,aspect:width/height,inspection,velocity});dust.update(t,1,dpr,1+phase(p,.85,1.2)*.5);reveal.update(p,t,phone,height*dpr);
    riskInstrument.group.position.set(-.45,0,0);riskInstrument.group.scale.setScalar(phone?1:.86);
    if(targets?.handoff?.riskDial&&p>3.15){
      const rect=targets.handoff.riskDial,dock=phase(p,3.15,3.85),quad=targets.quad||[{x:.3,y:.24},{x:.9,y:.24},{x:.3,y:.75},{x:.9,y:.75}],u=rect.x+rect.w*.5,v=rect.y+rect.h*.5;
      const x=mix(mix(quad[0].x,quad[1].x,u),mix(quad[2].x,quad[3].x,u),v),y=mix(mix(quad[0].y,quad[1].y,u),mix(quad[2].y,quad[3].y,u),v),frameWidth=Math.hypot((quad[1].x-quad[0].x)*width,(quad[1].y-quad[0].y)*height);
      dockPoint.set(x*2-1,1-y*2,.5).unproject(camera);dockDirection.copy(dockPoint).sub(camera.position).normalize();dockPoint.copy(camera.position).addScaledVector(dockDirection,-camera.position.z/dockDirection.z);root.worldToLocal(dockPoint);
      dialCenter.set(-.45,0,0).applyMatrix4(root.matrixWorld).project(camera);dialEdge.set(1.20,0,0).applyMatrix4(root.matrixWorld).project(camera);
      const currentDiameter=Math.abs(dialEdge.x-dialCenter.x)*width,targetDiameter=rect.w*frameWidth;
      riskInstrument.group.position.lerp(dockPoint,dock);riskInstrument.group.scale.setScalar(mix(phone?1:.86,Math.max(.04,targetDiameter/Math.max(1,currentDiameter)),dock));
    }
    const nodeAlpha=network*(1-phase(p,2.3,2.85));nodes.forEach(({mesh,halo,id},i)=>{const selected=!inspection||inspection===id;mesh.visible=nodeAlpha>.001;mesh.material.opacity=nodeAlpha*(i<3?(selected?1:.25):.38);if(halo){halo.visible=mesh.visible;halo.material.opacity=nodeAlpha*(selected?.7:.12);halo.scale.setScalar(.24+Math.sin(t*1.2+i)*.025);}});
    root.updateMatrixWorld(true);
    renderer.render(scene,camera);
    const positions={};for(const node of nodes.slice(0,3)){projected.copy(node.point).applyMatrix4(root.matrixWorld).project(camera);positions[node.id]={x:(projected.x*.5+.5)*width,y:(.5-projected.y*.5)*height};}
    host.dataset.ready='true';host.dataset.progress=p.toFixed(3);host.dataset.time=t.toFixed(3);host.dataset.materials='ready';host.dataset.dpr=dpr.toFixed(2);host.dataset.triangles=String(renderer.info.render.triangles);
    return {nodes:positions};
  }
  resize();
  const ready=assetsReady.then(async()=>{if(disposed)return;reveal.update(0,0,phone,height*dpr);camera.position.set(0,0,8);camera.lookAt(0,0,0);camera.updateMatrixWorld();try{await renderer.compileAsync(scene,camera);}catch{ /* A first draw still handles browsers without parallel compilation. */ }if(!disposed){onAsset('shaders');invalidate();}});
  const onLost=event=>{event.preventDefault();lost=true;host.dataset.fallback='true';delete host.dataset.ready;};canvas.addEventListener('webglcontextlost',onLost);
  return {ready,resize,draw,setTargets,setPreviewQuad(quad){if(targets)targets.quad=quad;lanes.setQuad(quad);},dispose(){if(disposed)return;disposed=true;canvas.removeEventListener('webglcontextlost',onLost);const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());portal.dispose();globe.dispose();glow?.dispose();environment?.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}};
}
