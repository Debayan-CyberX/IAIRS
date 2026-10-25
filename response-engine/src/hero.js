import * as THREE from 'three';
import { sceneLoop, disposeScene, glowTexture } from './visuals.js';

// The response engine is actual geometry. The original canyon remains a photo
// environment, masked around the model; no original media file is modified.
function bandGeometry(radius, width, thickness, segments=256) {
  const profile=[];
  for(let n=0;n<=20;n++){
    const angle=n/20*Math.PI*2,cos=Math.cos(angle),sin=Math.sin(angle);
    profile.push(new THREE.Vector2(radius+Math.sign(cos)*Math.pow(Math.abs(cos),.72)*width/2,Math.sign(sin)*Math.pow(Math.abs(sin),.7)*thickness/2));
  }
  const geometry=new THREE.LatheGeometry(profile,segments);geometry.rotateX(Math.PI/2);return geometry;
}
function etchedTexture(){
  const width=256,height=64,data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const value=195+Math.sin(y*1.7)*22+Math.sin(x*43.7+y*17.9)*17,index=(y*width+x)*4;
    data[index]=data[index+1]=data[index+2]=value;data[index+3]=255;
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(6,1);texture.needsUpdate=true;return texture;
}
function studioEnvironment(renderer,source){
  const studio=new THREE.Scene();studio.background=new THREE.Color(.08,.085,.09);
  if(source){const dome=new THREE.Mesh(new THREE.SphereGeometry(14,48,32),new THREE.MeshBasicMaterial({map:source,side:THREE.BackSide,color:new THREE.Color(1.5,1.5,1.5)}));dome.rotation.y=-.7;studio.add(dome);}
  const panels=[[-5,4,4,.7,7,2,5,4.3,3.4],[2,6,-1,8,.3,3,5,5,5],[5,1,5,.3,6,2,4,4.8,5.2],[-3,-3,3,5,.25,1,3,2.3,1.5],[-4,1,-5,1,4,1,2,2.3,2.6],[0,2,7,5,1.5,.1,2.4,2.2,1.8],[-2,-1,7,.8,4,.1,1,1.2,1.3]];
  panels.forEach(([x,y,z,w,h,d,r,g,b])=>{const panel=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:new THREE.Color(r,g,b)}));panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);});
  const generator=new THREE.PMREMGenerator(renderer),target=generator.fromScene(studio,.012,.1,40);generator.dispose();
  studio.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});return target;
}
function torus(radius,tube,material,segments=160){return new THREE.Mesh(new THREE.TorusGeometry(radius,tube,8,segments),material);}

export function mountHero3D(hero){
  const art=hero.querySelector('.hero-art'),mobile=innerWidth<760,media=matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch{return()=>{};}
  const sourceStyle=getComputedStyle(art),originalBackground=sourceStyle.backgroundImage;
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1:1.45));renderer.setClearColor(0,0);
  renderer.transmissionResolutionScale=mobile?.6:1;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.outputColorSpace=THREE.SRGBColorSpace;
  const canvas=renderer.domElement;canvas.className='hero-model-canvas';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;
  const environment=document.createElement('div'),haze=document.createElement('div');environment.className='hero-model-environment';haze.className='hero-model-haze';environment.style.backgroundImage=originalBackground;
  environment.setAttribute('aria-hidden','true');haze.setAttribute('aria-hidden','true');art.append(environment,haze,canvas);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,50);camera.position.z=9;
  const backdropUniforms={image:{value:null},viewport:{value:new THREE.Vector2(1,1)},imageSize:{value:new THREE.Vector2(1,1)},imageOffset:{value:new THREE.Vector2()},pointer:{value:new THREE.Vector2()},elapsed:{value:0}};
  const backdropMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:backdropUniforms,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.999,1.0);}',
    fragmentShader:`uniform sampler2D image;uniform vec2 viewport;uniform vec2 imageSize;uniform vec2 imageOffset;uniform vec2 pointer;uniform float elapsed;varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    void main(){vec2 screen=vec2(vUv.x,1.0-vUv.y)*viewport+pointer;vec2 pixel=(screen-imageOffset)/imageSize*vec2(1536.0,1024.0);vec2 uv=vec2(pixel.x/1536.0,1.0-pixel.y/1024.0);vec3 original=texture2D(image,uv).rgb;
    float distanceToCore=length((pixel-vec2(1100.0,449.0))/vec2(423.0,390.0));float outside=smoothstep(.96,1.075,distanceToCore);
    vec2 fogUV=pixel*.006+vec2(elapsed*.006,-elapsed*.009);float cloud=noise(fogUV)*.55+noise(fogUV*2.1)*.3+noise(fogUV*4.2)*.15;vec3 fog=vec3(.012,.016,.018)+vec3(.025,.027,.027)*cloud;float ray=pow(max(0.0,1.0-abs(sin(pixel.x*.0035+pixel.y*.001+elapsed*.015))),24.0)*.012;fog+=vec3(ray*.86,ray*.9,ray);
    gl_FragColor=vec4(mix(fog,original,outside),1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),backdropMaterial);backdrop.renderOrder=-100;backdrop.frustumCulled=false;backdrop.visible=false;scene.add(backdrop);
  const assembly=new THREE.Group();assembly.rotation.set(.02,-.08,-.12);scene.add(assembly);
  const roughness=etchedTexture(),glow=glowTexture();
  let reflection=studioEnvironment(renderer),sourceTexture=null,disposed=false,ready=false;
  scene.environment=reflection.texture;
  const silver=new THREE.MeshStandardMaterial({color:0xe2e3de,metalness:.94,roughness:.16,roughnessMap:roughness,envMapIntensity:1.7});
  const platinum=new THREE.MeshStandardMaterial({color:0xe6e7e2,metalness:1,roughness:.1,envMapIntensity:1.6});
  const blackChrome=new THREE.MeshStandardMaterial({color:0x0c1013,metalness:1,roughness:.1,envMapIntensity:2});
  const champagne=new THREE.MeshStandardMaterial({color:0xc6ad86,metalness:1,roughness:.15,envMapIntensity:1.35});
  const groove=new THREE.MeshStandardMaterial({color:0x101417,metalness:.9,roughness:.23,envMapIntensity:1.2});
  const glass=new THREE.MeshPhysicalMaterial({color:0xe9eef0,metalness:0,roughness:.012,transmission:.97,thickness:.045,ior:1.45,clearcoat:.8,envMapIntensity:.9});
  const bands=[];
  const definitions=[
    {r:1.84,w:.29,d:.13,x:1.12,y:.24,z:.65,material:blackChrome,speed:.07},
    {r:1.77,w:.255,d:.12,x:1.08,y:-.27,z:-.63,material:silver,speed:-.065},
    {r:1.65,w:.20,d:.085,x:.26,y:-.36,z:.12,material:silver,speed:.052},
    {r:1.5,w:.13,d:.065,x:.3,y:1.05,z:-.15,material:platinum,speed:-.08},
    {r:1.43,w:.10,d:.05,x:1.37,y:.22,z:.13,material:champagne,speed:.045}
  ];
  const dummy=new THREE.Object3D();
  definitions.forEach((definition,index)=>{
    const {r,w,d,x,y,z,material,speed}=definition,pivot=new THREE.Group(),spin=new THREE.Group();const orientation=new THREE.Group();orientation.rotation.z=z;pivot.rotation.set(x,y,0);pivot.add(spin);orientation.add(pivot);assembly.add(orientation);
    const body=new THREE.Mesh(bandGeometry(r,w,d,mobile?160:256),material);spin.add(body);
    for(const sign of [-1,1]){
      const edge=torus(r+sign*w*.43,.007,index<3?platinum:champagne);edge.position.z=d*.38;spin.add(edge);
      const seam=torus(r+sign*w*.25,.0025,groove);seam.position.z=d*.49;spin.add(seam);
    }
    const bolts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.008,.009,.005,10),groove,48);
    const slots=new THREE.InstancedMesh(new THREE.BoxGeometry(.022,.003,.0025),groove,32);
    for(let n=0;n<48;n++){const angle=n/48*Math.PI*2;dummy.position.set(Math.cos(angle)*r,Math.sin(angle)*r,d*.5+.004);dummy.rotation.set(Math.PI/2,0,angle);dummy.scale.set(1,1,1);dummy.updateMatrix();bolts.setMatrixAt(n,dummy.matrix);}spin.add(bolts);
    for(let n=0;n<32;n++){const angle=n/20*Math.PI*2;dummy.position.set(Math.cos(angle)*(r+w*.25),Math.sin(angle)*(r+w*.25),d*.5+.003);dummy.rotation.set(0,0,angle+Math.PI/2);dummy.updateMatrix();slots.setMatrixAt(n,dummy.matrix);}spin.add(slots);
    bands.push({pivot,spin,definition,index,speed});
  });

  const chamber=new THREE.Group();assembly.add(chamber);
  const outerShell=new THREE.Mesh(new THREE.SphereGeometry(1.37,64,48),glass);chamber.add(outerShell);
  const innerShell=new THREE.Mesh(new THREE.SphereGeometry(1.18,48,32),new THREE.MeshPhysicalMaterial({color:0xaabac2,metalness:.1,roughness:.03,transparent:true,opacity:.07,depthWrite:false,clearcoat:1,envMapIntensity:1.2}));chamber.add(innerShell);
  const longitudeMaterial=new THREE.MeshStandardMaterial({color:0x7f929b,metalness:1,roughness:.12,transparent:true,opacity:.7,envMapIntensity:1.8});
  for(let n=0;n<6;n++){const rib=torus(1.35,.006,n%3===0?platinum:longitudeMaterial);rib.rotation.y=n/6*Math.PI;chamber.add(rib);}
  for(let n=1;n<7;n++){
    const latitude=n/7*Math.PI,radius=Math.sin(latitude)*1.35,y=Math.cos(latitude)*1.35,latitudeRing=torus(radius,.004,longitudeMaterial);latitudeRing.rotation.x=Math.PI/2;latitudeRing.position.y=y;chamber.add(latitudeRing);
  }
  const inner=new THREE.Group();inner.rotation.set(.27,-.2,.22);assembly.add(inner);
  for(let n=0;n<6;n++){
    const radius=.40+n*.153,w=n%2?.065:.095,ring=new THREE.Mesh(bandGeometry(radius,w,.045,128),n%2?blackChrome:platinum);ring.rotation.set(.2+n*.16,n*.24,.1+n*.13);inner.add(ring);
    const lip=torus(radius+w*.32,.005,platinum,128);lip.position.z=.025;ring.add(lip);
    const teeth=new THREE.InstancedMesh(new THREE.BoxGeometry(.025,.018,.035),n%2?champagne:silver,40);
    for(let j=0;j<40;j++){const angle=j/40*Math.PI*2;dummy.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,0);dummy.rotation.set(0,0,angle);dummy.updateMatrix();teeth.setMatrixAt(j,dummy.matrix);}ring.add(teeth);
  }
  const frame=new THREE.Group();inner.add(frame);
  const clips=new THREE.InstancedMesh(new THREE.BoxGeometry(.09,.035,.04),silver,32);
  for(let n=0;n<32;n++){const angle=n/32*Math.PI*2;dummy.position.set(Math.cos(angle)*1.07,Math.sin(angle)*1.07,.08);dummy.rotation.set(0,0,angle);dummy.updateMatrix();clips.setMatrixAt(n,dummy.matrix);}frame.add(clips);
  const core=new THREE.Mesh(new THREE.OctahedronGeometry(.145,1),new THREE.MeshBasicMaterial({color:new THREE.Color(4.5,3.1,1.6)}));inner.add(core);
  const cage=torus(.26,.015,platinum);cage.rotation.set(.65,.8,.3);inner.add(cage);
  const coreGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xffd19d,transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));coreGlow.scale.setScalar(1.65);coreGlow.renderOrder=3;inner.add(coreGlow);
  const pinpoint=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xfff3d3,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));pinpoint.scale.setScalar(.45);pinpoint.renderOrder=4;inner.add(pinpoint);
  scene.add(new THREE.HemisphereLight(0xcddbe0,0x0d0906,.8));
  const key=new THREE.DirectionalLight(0xffe4b9,3);key.position.set(-3,4,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0xd8e4ed,2.6);rim.position.set(4,2,-3);scene.add(rim);
  const coreLight=new THREE.PointLight(0xffd096,3,5,2);assembly.add(coreLight);

  let width=1,height=1,centerX=0,centerY=0,pointerX=0,pointerY=0,smoothX=0,smoothY=0,dragX=0,dragY=0,dragging=false,lastX=0,lastY=0;
  const controller=new AbortController(),{signal}=controller;
  const resize=()=>{
    width=art.clientWidth;height=art.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height);const aspect=width/height;camera.left=-3*aspect;camera.right=3*aspect;camera.top=3;camera.bottom=-3;camera.updateProjectionMatrix();
    const cover=Math.max(width/1536,height/1024),position=getComputedStyle(art).backgroundPosition.split(' ').map(parseFloat);
    const pixelX=(width-1536*cover)*position[0]/100+1100*cover,pixelY=(height-1024*cover)*position[1]/100+449*cover;
    centerX=(pixelX-width/2)/height*6;centerY=(height/2-pixelY)/height*6;
    assembly.position.set(centerX,centerY,0);assembly.scale.setScalar(350*cover/height*6/1.84);
    environment.style.backgroundSize=`${1536*cover}px ${1024*cover}px`;environment.style.backgroundPosition=`${(width-1536*cover)*position[0]/100}px ${(height-1024*cover)*position[1]/100}px`;
    backdropUniforms.viewport.value.set(width,height);backdropUniforms.imageSize.value.set(1536*cover,1024*cover);backdropUniforms.imageOffset.value.set((width-1536*cover)*position[0]/100,(height-1024*cover)*position[1]/100);
    environment.style.maskImage=`radial-gradient(ellipse ${425*cover}px ${395*cover}px at ${pixelX}px ${pixelY}px,transparent 98%,#000 109%)`;
    haze.style.setProperty('--core-x',`${pixelX}px`);haze.style.setProperty('--core-y',`${pixelY}px`);
  };
  hero.addEventListener('pointermove',event=>{
    const rect=hero.getBoundingClientRect();pointerX=(event.clientX-rect.left)/rect.width-.5;pointerY=(event.clientY-rect.top)/rect.height-.5;
    if(dragging){dragX+=(event.clientX-lastX)*.007;dragY=THREE.MathUtils.clamp(dragY+(event.clientY-lastY)*.005,-1.1,1.1);lastX=event.clientX;lastY=event.clientY;}
  },{passive:true,signal});
  hero.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||event.button||event.target.closest('a,button,input,.hero-content'))return;dragging=true;lastX=event.clientX;lastY=event.clientY;hero.setPointerCapture(event.pointerId);hero.classList.add('hero-dragging');},{signal});
  const release=()=>{dragging=false;hero.classList.remove('hero-dragging');};hero.addEventListener('pointerup',release,{signal});hero.addEventListener('pointercancel',release,{signal});
  hero.addEventListener('lostpointercapture',release,{signal});window.addEventListener('blur',release,{signal});
  canvas.addEventListener('webglcontextlost',event=>{if(disposed)return;event.preventDefault();ready=false;canvas.hidden=true;art.classList.remove('hero-model-active');delete art.dataset.liveScene;},{signal});
  hero.addEventListener('pointerleave',()=>{if(!dragging)pointerX=pointerY=0;},{signal});
  art.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();if(event.key==='Home')dragX=dragY=0;else{dragX+=event.key==='ArrowLeft'?-.18:event.key==='ArrowRight'?.18:0;dragY+=event.key==='ArrowUp'?-.12:event.key==='ArrowDown'?.12:0;}if(media.matches||document.documentElement.classList.contains('motion-paused')){assembly.rotation.set(.02+dragY,-.08+dragX,-.12);renderer.render(scene,camera);}},{signal});
  const stop=sceneLoop(hero,elapsed=>{
    smoothX+=(pointerX-smoothX)*.035;smoothY+=(pointerY-smoothY)*.035;
    const progress=THREE.MathUtils.clamp(-hero.getBoundingClientRect().top/hero.offsetHeight,0,1);
    camera.position.set(smoothX*.22,-smoothY*.15,9);camera.lookAt(smoothX*.05,0,0);camera.zoom=1+progress*.05;camera.updateProjectionMatrix();
    assembly.position.set(centerX+Math.sin(elapsed*.25)*.025,centerY+Math.sin(elapsed*.48)*.035-progress*.14,0);
    assembly.rotation.set(.02+dragY+smoothY*.07,-.08+elapsed*.045+dragX+smoothX*.12,-.12+Math.sin(elapsed*.15)*.025);
    bands.forEach(({pivot,spin,definition,index,speed})=>{pivot.rotation.x=definition.x+Math.sin(elapsed*.1+index)*.035;spin.rotation.z=elapsed*speed;});
    chamber.rotation.y=-elapsed*.025;inner.rotation.y=-.2+elapsed*.06;inner.rotation.z=.22+Math.sin(elapsed*.16)*.05;frame.rotation.y=elapsed*.035;core.rotation.set(elapsed*.13,elapsed*.26,elapsed*.08);
    coreGlow.material.opacity=.67+Math.sin(elapsed*.9)*.04;environment.style.translate=`${-smoothX*5}px ${-smoothY*3}px`;haze.style.opacity=String(.8+Math.sin(elapsed*.15)*.12);
    backdropUniforms.pointer.value.set(smoothX*5,smoothY*3);backdropUniforms.elapsed.value=elapsed;
    if(ready){art.dataset.sceneTime=elapsed.toFixed(2);art.dataset.orbRotation=assembly.rotation.y.toFixed(3);renderer.render(scene,camera);art.dataset.sceneTriangles=String(renderer.info.render.triangles);}
  },resize);
  new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/response-core.webp`,texture=>{
    if(disposed){texture.dispose();return;}sourceTexture=texture;texture.colorSpace=THREE.SRGBColorSpace;backdropUniforms.image.value=texture;backdrop.visible=true;
    const next=studioEnvironment(renderer,texture);reflection.dispose();reflection=next;scene.environment=next.texture;
    ready=true;art.classList.add('hero-model-active');art.dataset.liveScene='hero-3d';art.tabIndex=0;art.setAttribute('aria-label','Interactive polished titanium response engine. Drag the orb or use arrow keys to rotate.');canvas.hidden=false;
    resize();renderer.render(scene,camera);art.dataset.sceneTime='0.00';
  },undefined,()=>{if(disposed)return;ready=true;art.classList.add('hero-model-active');art.dataset.liveScene='hero-3d';canvas.hidden=false;resize();renderer.render(scene,camera);art.dataset.sceneTime='0.00';});
  return()=>{
    disposed=true;stop();controller.abort();reflection.dispose();disposeScene(scene,renderer,[roughness,glow,...(sourceTexture?[sourceTexture]:[])]);environment.remove();haze.remove();art.classList.remove('hero-model-active');art.removeAttribute('tabindex');hero.classList.remove('hero-dragging');delete art.dataset.liveScene;delete art.dataset.sceneTime;delete art.dataset.orbRotation;delete art.dataset.sceneTriangles;
  };
}
