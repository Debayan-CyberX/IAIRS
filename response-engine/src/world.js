import * as THREE from 'three';
import {gsap} from 'gsap';
import {EffectComposer,RenderPass,EffectPass,BloomEffect,SMAAEffect,SMAAPreset,ToneMappingEffect,ToneMappingMode} from 'postprocessing';
import {glowTexture,disposeScene} from './visuals.js';
import {createLens} from './optical-scene.js';
const clamp=THREE.MathUtils.clamp,mix=THREE.MathUtils.lerp;
function environment(renderer,backplate){
  const room=new THREE.Scene();room.background=new THREE.Color(.18,.165,.145);
  if(backplate){const canyon=new THREE.Mesh(new THREE.SphereGeometry(18,48,24),new THREE.MeshBasicMaterial({map:backplate,side:THREE.BackSide,color:0xc9c5ba}));canyon.rotation.y=-.8;room.add(canyon);}
  const values=[[-4,5,3,4,.65,5,9,8.4,7.2],[4,2,4,.7,7,3,5,5.5,6],[-4,1,-3,.6,5,4,3.5,4,4.5],[1,-4,3,6,.5,3,3.5,2.7,1.8],[0,5,-4,7,.6,3,5,5,4.8],[0,0,7,5,6,.3,1.8,1.65,1.4]];
  values.forEach(([x,y,z,w,h,d,r,g,b])=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:new THREE.Color(r,g,b)}));mesh.position.set(x,y,z);mesh.lookAt(0,0,0);room.add(mesh);});
  const generator=new THREE.PMREMGenerator(renderer),target=generator.fromScene(room,.025,.1,40);generator.dispose();
  room.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});return target;
}

export function createWorld(stage){
 let renderer;
 try{renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,powerPreference:'high-performance'});}catch{stage.dataset.fallback='true';return{draw(){},resize(){},dispose(){}};}
 let mobile=innerWidth<761,disposed=false,lost=false,ready=false,width=1,height=1,lastInput=null,ratio=mobile?1.5:2,slowFrames=0;
 const abort=new AbortController(),textures=[],scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.08,60);
 const canvas=renderer.domElement;canvas.className='world-canvas';canvas.setAttribute('aria-hidden','true');stage.querySelector('.hero-art').append(canvas);
 renderer.setPixelRatio(ratio);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
 let reflection=environment(renderer);scene.environment=reflection.texture;
 const glow=glowTexture();textures.push(glow);const lens=createLens(glow);scene.add(lens.root);
 const reflectionRoot=new THREE.Group();for(const original of [lens.face.children[0],lens.root.children[2]]){if(!original?.isMesh)continue;const copy=original.clone();copy.material=original.material.clone();copy.material.transparent=true;copy.material.opacity=.18;copy.material.depthWrite=false;reflectionRoot.add(copy);}scene.add(reflectionRoot);
 scene.add(new THREE.HemisphereLight(0xe8dfcd,0x3a3730,1.1));
 const key=new THREE.DirectionalLight(0xffe6bd,3);key.position.set(-4,5,5);scene.add(key);
 const fill=new THREE.DirectionalLight(0xc4d0ce,2);fill.position.set(4,2,4);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xe9c898,2.2);rim.position.set(2,5,-3);scene.add(rim);
 const contact=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0x000000,transparent:true,opacity:.75,depthWrite:false}));contact.scale.set(3.2,.35,1);scene.add(contact);
 const backdropUniforms={uImage:{value:null},uViewport:{value:new THREE.Vector2(1,1)},uTime:{value:0},uPhase:{value:0},uPointer:{value:new THREE.Vector2()}};
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({depthWrite:false,depthTest:false,uniforms:backdropUniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.999,1.);}',fragmentShader:
  'varying vec2 vUv;uniform sampler2D uImage;uniform vec2 uViewport;uniform vec2 uPointer;uniform float uTime;uniform float uPhase;'+
  'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}'+
  'void main(){float aspect=uViewport.x/uViewport.y;vec2 uv=(vUv-.5)*vec2(min(1.,aspect/1.5),min(1.,1.5/aspect))+.5;float approach=smoothstep(0.,2.,uPhase);uv=(uv-.5)/(1.+approach*.17)+.5+uPointer*.002;vec3 image=texture2D(uImage,uv).rgb;float mist=noise(vUv*5.+vec2(uTime*.008,-uTime*.004));float shaft=pow(max(0.,1.-abs(vUv.x-.7+vUv.y*.1+sin(uTime*.06)*.008)*2.5),16.);image+=vec3(.04,.027,.014)*mist*shaft;float interior=smoothstep(.85,1.95,uPhase)*(1.-smoothstep(2.2,2.8,uPhase));vec3 dark=image*.12+vec3(.009,.017,.015)+mist*.014;float paper=max(clamp((.53-abs(uPhase-3.))/.25,0.,1.),clamp((uPhase-4.5)/.35,0.,1.));vec3 ivory=vec3(3.05,2.91,2.6)*(1.-noise(vUv*180.)*.008);vec3 color=mix(image,dark,interior);color=mix(color,ivory,paper);gl_FragColor=vec4(color,1.);}'
 }));backdrop.frustumCulled=false;backdrop.renderOrder=-1000;scene.add(backdrop);
 let composer=null;
 try{composer=new EffectComposer(renderer,{frameBufferType:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,multisampling:0});composer.addPass(new RenderPass(scene,camera));composer.addPass(new EffectPass(camera,new BloomEffect({intensity:.28,luminanceThreshold:1.1,luminanceSmoothing:.3,mipmapBlur:false,resolutionScale:.35}),new ToneMappingEffect({mode:ToneMappingMode.ACES_FILMIC}),new SMAAEffect({preset:SMAAPreset.ULTRA})));}catch{composer?.dispose();composer=null;renderer.toneMapping=THREE.ACESFilmicToneMapping;}
 const rig={x:1.65,y:.3,scale:1.1,cameraX:0,cameraY:.1,cameraZ:10,lookX:0,lookY:.1,yaw:-.3};let choreography=null;
 function makeChoreography(){
  choreography?.kill();
  const frames=mobile?[
   {x:.45,y:1.65,scale:.52,cameraX:0,cameraY:0,cameraZ:10,lookX:0,lookY:0,yaw:-.28},
   {x:.45,y:1.85,scale:.48,cameraX:0,cameraY:0,cameraZ:9.4,lookX:0,lookY:0,yaw:-.18},
   {x:.5,y:1.8,scale:.85,cameraX:.15,cameraY:0,cameraZ:6.1,lookX:.15,lookY:0,yaw:-.05},
   {x:.45,y:2.1,scale:.4,cameraX:0,cameraY:0,cameraZ:9,lookX:0,lookY:0,yaw:.42},
   {x:.45,y:2,scale:.46,cameraX:0,cameraY:0,cameraZ:9.2,lookX:0,lookY:0,yaw:-.12},
   {x:1.4,y:-.8,scale:.5,cameraX:0,cameraY:0,cameraZ:11,lookX:0,lookY:0,yaw:-.2}
  ]:[
   {x:1.65,y:.3,scale:1.1,cameraX:0,cameraY:.1,cameraZ:innerWidth<1151?10.8:10,lookX:0,lookY:.1,yaw:-.3},
   {x:1.65,y:.3,scale:1.1,cameraX:-.8,cameraY:.1,cameraZ:8.4,lookX:-.8,lookY:.1,yaw:-.2},
   {x:1.65,y:.3,scale:1.1,cameraX:1.45,cameraY:.35,cameraZ:2.65,lookX:1.3,lookY:.3,yaw:-.02},
   {x:2.1,y:.15,scale:.98,cameraX:0,cameraY:.1,cameraZ:8.8,lookX:0,lookY:.1,yaw:.55},
   {x:2.1,y:.15,scale:1,cameraX:0,cameraY:.1,cameraZ:9.4,lookX:0,lookY:.1,yaw:-.12},
   {x:2.7,y:-.1,scale:.62,cameraX:0,cameraY:.1,cameraZ:11.5,lookX:0,lookY:.1,yaw:-.3}
  ];Object.assign(rig,frames[0]);choreography=gsap.timeline({paused:true});frames.slice(1).forEach((frame,i)=>choreography.to(rig,{...frame,duration:1,ease:'sine.inOut'},i));
 }
 makeChoreography();
 function resize(){if(disposed)return;width=stage.clientWidth||innerWidth;height=stage.clientHeight||innerHeight;mobile=innerWidth<761;makeChoreography();camera.aspect=width/height;camera.fov=mobile?39:36;camera.updateProjectionMatrix();ratio=mobile?1.5:2;renderer.setPixelRatio(ratio);renderer.setSize(width,height);composer?.setSize(width,height);backdropUniforms.uViewport.value.set(width,height);stage.dataset.pixelRatio=String(ratio);stage.dataset.renderResolution=Math.round(width*ratio)+'x'+Math.round(height*ratio);}
 const center=new THREE.Vector3(),edge=new THREE.Vector3();
 function draw(input,delta){
  if(disposed||lost)return;lastInput=input;const p=clamp(input.progress,0,5),t=input.elapsed||0;choreography.time(p);
  const paper=Math.max(clamp((.53-Math.abs(p-3))/.25,0,1),clamp((p-4.5)/.35,0,1));
  const closure=THREE.MathUtils.smoothstep(p,3.45,3.98)*(1-THREE.MathUtils.smoothstep(p,4.6,5))*(input.detected?1:0)*(input.risk>=80?1:.6);
  camera.position.set(rig.cameraX+(input.pointerX||0)*.12,rig.cameraY-(input.pointerY||0)*.07,rig.cameraZ);camera.lookAt(rig.lookX,rig.lookY,0);camera.updateMatrixWorld();
  lens.root.position.set(rig.x,rig.y,0);lens.root.scale.setScalar(rig.scale);lens.root.rotation.set(.02+(input.dragY||0)*.4,rig.yaw+Math.sin(t*.15)*.025+(input.dragX||0),0);
  lens.update({time:t,phase:p,count:input.eventCount||40,detected:input.detected,risk:input.risk,inspection:input.inspection,closure,paper});
  lens.tracks.forEach((trace,i)=>trace.geometry.setDrawRange(0,Math.floor(trace.geometry.index.count*clamp((input.factors?.[i]||0)/[40,30,20,10][i],0,1)/3)*3));
  reflectionRoot.visible=!mobile&&paper<.5&&(p<1.4||p>3.6);reflectionRoot.position.set(rig.x,rig.y-5.1*rig.scale,0);reflectionRoot.scale.set(rig.scale,-rig.scale,rig.scale);reflectionRoot.rotation.y=-lens.root.rotation.y;
  contact.position.set(rig.x,rig.y-rig.scale*2.55,.15);contact.scale.set(2.4*rig.scale,.2*rig.scale,1);contact.material.opacity=.7*(1-paper)*(1-THREE.MathUtils.smoothstep(p,1.4,1.95));
  backdropUniforms.uTime.value=t;backdropUniforms.uPhase.value=p;backdropUniforms.uPointer.value.set(input.pointerX||0,input.pointerY||0);
  if(ready){if(composer)composer.render(delta);else renderer.render(scene,camera);}
  center.set(rig.x,rig.y,0).project(camera);edge.set(rig.x+rig.scale*2.13,rig.y,0).project(camera);const lensX=(center.x*.5+.5)*width,lensY=(-center.y*.5+.5)*height,lensR=Math.abs(edge.x-center.x)*width*.5;
  stage.parentElement.style.setProperty('--lens-x',lensX.toFixed(1)+'px');stage.parentElement.style.setProperty('--lens-y',lensY.toFixed(1)+'px');stage.parentElement.style.setProperty('--lens-r',Math.max(0,lensR-10).toFixed(1)+'px');
  const art=stage.querySelector('.hero-art');Object.assign(art.dataset,{liveScene:'optical-lens-3d',sceneTime:t.toFixed(2),orbRotation:lens.root.rotation.y.toFixed(3),sceneTriangles:String(renderer.info.render.triangles)});
  Object.assign(stage.dataset,{phase:p.toFixed(3),progress:p.toFixed(3),sceneTime:t.toFixed(2),cameraZ:rig.cameraZ.toFixed(3),cameraOrbit:rig.yaw.toFixed(3),engineX:rig.x.toFixed(2),caseEvents:String(input.eventCount||40),irisClosure:closure.toFixed(3),riskTrace:(input.factors||[]).join(','),inspection:input.inspection?'1':'0'});
  if(delta>.055)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);if(slowFrames>90&&ratio>1.5){ratio=Math.max(1.5,ratio-.1);renderer.setPixelRatio(ratio);composer?.setSize(width,height);slowFrames=0;stage.dataset.pixelRatio=ratio.toFixed(1);}
 }
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(disposed)return;lost=true;stage.dataset.fallback='true';delete stage.dataset.ready;},{signal:abort.signal});
 new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/moment-chamber.png`,texture=>{if(disposed){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);backdropUniforms.uImage.value=texture;const previous=reflection;reflection=environment(renderer,texture);scene.environment=reflection.texture;previous.dispose();ready=true;stage.dataset.ready='true';if(lastInput)draw(lastInput,0);},undefined,()=>stage.dataset.fallback='true');
 resize();
 return{draw,resize,dispose(){if(disposed)return;disposed=true;abort.abort();choreography?.kill();composer?.dispose();reflection.dispose();disposeScene(scene,renderer,textures);delete stage.dataset.ready;}};
}
