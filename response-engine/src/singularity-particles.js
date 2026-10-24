import * as THREE from 'three';
import {laneGLSL} from './singularity-lanes.js';

const random=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};

export function createSignalParticles(root,laneUniforms){
  const geometry=new THREE.BufferGeometry();
  const uniforms={...laneUniforms,uDpr:{value:1},uAspect:{value:1},uVelocity:{value:0},uInspect:{value:0},uRiskRect:{value:new THREE.Vector4()},uScoreTarget:{value:new THREE.Vector4()},uHasScore:{value:0}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:false,
    vertexShader:`attribute vec2 aGlyph,aRisk;attribute vec3 aSeed;uniform float uDpr,uAspect,uVelocity,uInspect,uHasScore;uniform vec4 uRiskRect,uScoreTarget;${laneGLSL}
      varying float vAlpha,vSignal;
      mat2 turn(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
      void main(){
        float band=floor(aSeed.z*16.);float u=fract(aSeed.x+uTime*.055);
        vec3 position3D=lanePosition(u,band);
        vec4 projected=projectionMatrix*modelViewMatrix*vec4(position3D,1.);float inFront=step(.15,projected.w);projected/=max(.001,projected.w);
        float pull=chapter(.08,.73);vec2 center=mix(vec2(.735,.515),vec2(.5,.51),pull);center=mix(center,vec2(.53,.54),uPhone);
        vec2 delta=(aGlyph-center)*vec2(uAspect,1.);delta=turn(pull*1.7*(.3+aSeed.y))*delta;
        vec2 sucked=center+delta/vec2(uAspect,1.)*(1.-pull)*(.98+aSeed.x*.04);
        vec4 glyph=vec4(sucked.x*2.-1.,1.-sucked.y*2.,0.,1.);
        vec4 point=mix(glyph,projected,chapter(.62,1.05));
        point=mix(point,vec4(aRisk.x*2.-1.,1.-aRisk.y*2.,0.,1.),chapter(2.28,2.96));
        vec2 unit=(aRisk-uRiskRect.xy)/max(uRiskRect.zw,vec2(.00001));
        vec2 scoreUI=consoleUV(uScoreTarget.xy+unit*uScoreTarget.zw);
        vec2 ui=mix(panelEdge(aSeed.x,band),scoreUI,(1.-step(8.,band))*uHasScore);point=mix(point,vec4(ui.x*2.-1.,1.-ui.y*2.,0.,1.),chapter(3.12,3.86));
        vSignal=1.-step(1.5,band);
        vAlpha=chapter(.035,.18)*(1.-chapter(3.8,4.))*(.2+aSeed.y*.65);
        vAlpha*=mix(1.,.2+.8*vSignal,chapter(1.5,2.));vAlpha*=mix(1.,inFront,chapter(.62,1.05)*(1.-chapter(2.28,2.96)));
        vAlpha*=mix(1.,.06,chapter(2.96,3.12));
        vAlpha=max(vAlpha,chapter(3.2,3.5)*(1.-chapter(3.75,4.))*.5);
        vAlpha*=mix(1.,.09+.91*edgeFocus(band),uInspect);
        gl_Position=point;gl_PointSize=(1.15+vSignal*.85+aSeed.y*.4)*uDpr;
      }`,
    fragmentShader:`uniform float uProgress;varying float vAlpha,vSignal;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;vec3 color=mix(vec3(.75,.74,.68),vec3(.8,.12,.065),vSignal);gl_FragColor=vec4(color,vAlpha*(1.-smoothstep(.18,.5,d)));}`});
  const mesh=new THREE.Points(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=20;root.add(mesh);
  return {setTargets({glyph=[],risk=[],riskBounds,handoff={}},width,height,phone){
    if(!riskBounds)return;
    uniforms.uRiskRect.value.set(riskBounds.left/width,riskBounds.top/height,riskBounds.width/width,riskBounds.height/height);
    uniforms.uHasScore.value=handoff.score?1:0;if(handoff.score)uniforms.uScoreTarget.value.set(handoff.score.x,handoff.score.y,handoff.score.w,handoff.score.h);
    const count=phone?2500:7600,aGlyph=[],aRisk=[],seeds=[];
    for(let i=0;i<count;i++){
      const point=glyph[(i*29)%Math.max(1,glyph.length)]||[.5,.5],number=risk[(i*7)%Math.max(1,risk.length)]||[.5,.5];
      aGlyph.push(...point);aRisk.push((riskBounds.left+number[0]*riskBounds.width)/width,(riskBounds.top+number[1]*riskBounds.height)/height);seeds.push(random(i+1),random(i+931),random(i+2191));
    }
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(count*3),3));geometry.setAttribute('aGlyph',new THREE.Float32BufferAttribute(aGlyph,2));geometry.setAttribute('aRisk',new THREE.Float32BufferAttribute(aRisk,2));geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,3));geometry.setDrawRange(0,count);
  },update({dpr,aspect,inspection,velocity}){uniforms.uDpr.value=dpr;uniforms.uAspect.value=aspect;uniforms.uInspect.value=inspection?1:0;uniforms.uVelocity.value=velocity;mesh.visible=Boolean(geometry.attributes.aSeed);}};
}

export function createAmbientDust(scene){
  const geometry=new THREE.BufferGeometry(),positions=[],seeds=[];
  for(let i=0;i<600;i++){positions.push((random(i+1)-.5)*24,(random(i+832)-.5)*13,-15+random(i+912)*18);seeds.push(random(i+1992),random(i+2992));}
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,2));
  const uniforms={uTime:{value:0},uNight:{value:0},uAlpha:{value:1},uDpr:{value:1}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
    vertexShader:`attribute vec2 aSeed;uniform float uTime,uDpr;varying float vAlpha,vSignal;void main(){vec3 p=position;p.x+=sin(uTime*.05+aSeed.x*6.28)*.3;p.y=mod(p.y+6.5+uTime*(.018+aSeed.y*.018),13.)-6.5;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((5.+pow(aSeed.x,14.)*26.)/-mv.z,.7,3.)*uDpr;vAlpha=.15+aSeed.y*.3;vSignal=step(.985,aSeed.x);}`,
    fragmentShader:`uniform float uNight,uAlpha;varying float vAlpha,vSignal;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;vec3 color=mix(vec3(.12,.11,.08),vec3(.62,.61,.54),uNight);color=mix(color,vec3(.85,.11,.04),vSignal);gl_FragColor=vec4(color,vAlpha*uAlpha*(1.-smoothstep(.12,.5,d)));}`});
  const mesh=new THREE.Points(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
  return {update(time,night,dpr,alpha){uniforms.uTime.value=time;uniforms.uNight.value=night;uniforms.uDpr.value=dpr;uniforms.uAlpha.value=alpha;}};
}
