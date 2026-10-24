import * as THREE from 'three';

// The lens, accretion flow and atmosphere are evaluated together. The camera
// crosses the same aperture as scroll advances; there is no replacement hero.
export function createPortal(scene,onReady=()=>{}) {
  const uniforms={uTime:{value:0},uProgress:{value:0},uAspect:{value:1},uPhone:{value:0},uPointer:{value:new THREE.Vector2()},uRisk:{value:.84},uRiskCenter:{value:new THREE.Vector2(.44,.5)},uVelocity:{value:0}};
  // The portal is entirely procedural. Its surface, streams and lens remain
  // live at rest; no illustration is substituted for the simulation.
  queueMicrotask(onReady);
  const material=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:false,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`,
    fragmentShader:`
      precision highp float;varying vec2 vUv;
      uniform float uTime,uProgress,uAspect,uPhone,uRisk,uVelocity;uniform vec2 uPointer;
      uniform vec2 uRiskCenter;
      const float PI=3.14159265359;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      float fbm(vec2 p){float f=0.,a=.55;mat2 m=mat2(.8,.6,-.6,.8);for(int i=0;i<3;i++){f+=a*noise(p);p=m*p*2.1+2.4;a*=.48;}return f;}
      float phase(float a,float b){return smoothstep(a,b,uProgress);}
      mat2 rotate(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
      vec3 atmosphere(vec2 uv,float night){
        vec2 q=(uv-.5)*vec2(uAspect,1.);float t=uTime*.025;
        float cloud=fbm(q*2.4+vec2(t,-t*.35));
        float veil=fbm(q*4.8+vec2(cloud*1.7,t*.25));
        float light=exp(-length((uv-vec2(.72,.61))*vec2(1.1,1.8))*3.);
        vec3 charcoal=vec3(.0095,.0086,.0074)+vec3(.006,.0065,.007)*cloud;
        charcoal+=vec3(.025,.016,.007)*light*(.35+veil*.5);
        vec3 dark=vec3(.0025,.004,.005)+vec3(.028,.033,.034)*pow(veil,2.5);
        dark+=vec3(.028,.021,.013)*light*(.2+cloud);
        vec3 color=mix(charcoal,dark,night);
        float later=smoothstep(.82,1.18,uProgress);
        float current=pow(.5+.5*sin(q.y*3.2+cloud*5.8-uTime*.105+q.x*.65),7.);
        float current2=pow(.5+.5*sin(q.y*4.5-veil*4.+uTime*.075-q.x*.55),12.);
        float copyShade=mix(.45,1.,smoothstep(.12,.58,uv.x));
        color+=vec3(.012,.016,.017)*(current*.65+current2*.4)*later*copyShade;
        color+=vec3(.004,.0045,.0043)*pow(veil,1.6)*later;
        return color;
      }
      vec4 accretion(vec3 hit){
        float radius=length(hit.xz),inner=1.08,outer=2.65;
        if(radius<inner||radius>outer)return vec4(0.);
        float theta=atan(hit.z,hit.x)-uTime*(.38/pow(radius,.85));
        vec2 orbit=vec2(cos(theta),sin(theta));
        float turbulence=fbm(orbit*(9.+radius*2.3)+radius*vec2(12.,7.));
        float fine=fbm(orbit*(24.+radius*5.)+radius*vec2(31.,19.));
        float fibre=pow(.25+.75*noise(vec2(radius*63.+turbulence*5.,sin(theta)*13.+cos(theta)*9.)),2.);
        float rim=smoothstep(inner,inner+.11,radius)*(1.-smoothstep(1.65,outer,radius));
        float density=(.4+turbulence*.4+fine*.15+fibre*.25)*rim;
        float heat=pow(inner/radius,1.7),doppler=pow(1.+.38*sin(theta+uTime*(.38/pow(radius,.85))),2.);
        vec3 smoke=mix(vec3(.035,.041,.043),vec3(.25,.22,.17),heat);
        vec3 glow=mix(vec3(.20,.19,.16),vec3(.92,.86,.73),heat);
        vec3 color=smoke+glow*(.18+fine*.75+fibre*.55)*heat*doppler;
        return vec4(color,clamp(density*.94,0.,.96));
      }
      vec3 acceleration(vec3 p,float angularMomentum){
        float r2=dot(p,p);return -p*(.54*angularMomentum/(r2*r2*sqrt(r2)+.00001));
      }
      vec3 blackHole(vec2 q,vec3 background,out float captured){
        q=rotate(-.20+uPointer.x*.12)*q;
        float pitch=.22+uPointer.y*.18;
        vec3 ro=vec3(0.,sin(pitch)*6.,cos(pitch)*6.);
        vec3 forward=normalize(-ro),right=vec3(1.,0.,0.),up=normalize(cross(right,forward));
        vec3 velocity=normalize(forward*6.+right*q.x+up*q.y),position=ro;
        vec3 momentum=cross(ro,velocity);float h2=dot(momentum,momentum);
        vec3 radiance=vec3(0.);float transmission=1.;captured=0.;
        for(int i=0;i<100;i++){
          if(float(i)>mix(99.,75.,uPhone))break;
          float radius=length(position);
          if(radius<.359){captured=1.;break;}
          if(radius>12.)break;
          float stride=clamp(radius*.105,.026,.48)/max(1.,length(velocity));
          vec3 halfVelocity=velocity+acceleration(position,h2)*stride*.5;
          vec3 nextPosition=position+halfVelocity*stride;
          velocity=halfVelocity+acceleration(nextPosition,h2)*stride*.5;
          if(position.y*nextPosition.y<0.){
            float crossing=position.y/(position.y-nextPosition.y);
            vec3 hit=mix(position,nextPosition,crossing);vec4 disk=accretion(hit);
            radiance+=disk.rgb*disk.a*transmission;transmission*=1.-disk.a;
          }
          position=nextPosition;
          if(transmission<.025)break;
        }
        float impact=sqrt(h2),photon=exp(-abs(impact-.9353)*170.);
        vec3 base=mix(background,vec3(.0005,.0007,.001),captured);
        vec3 color=base*transmission+radiance;
        color+=vec3(.58,.49,.34)*photon*.3;
        return color;
      }
      void main(){
        float p=uProgress,t=uTime;
        float approach=phase(.08,.86),through=phase(.78,1.15),night=phase(.12,.74)*(1.-phase(3.35,3.88));
        vec2 center=mix(vec2(.735,.515),vec2(.50,.51),approach);
        center=mix(center,vec2(.53,.54),uPhone);
        center+=uPointer*vec2(.018,.012)*(1.-approach);
        float size=mix(.315,.195,uPhone)*(1.+pow(approach,3.)*8.5);
        vec2 q=(vUv-center)*vec2(uAspect,1.)/size;
        float r=length(q),angle=atan(q.y,q.x);
        vec2 warped=vUv+normalize(q+vec2(.0001))*exp(-r*1.8)*.027;
        vec3 bg=atmosphere(warped,night),color=bg;
        if(p<1.16&&r<4.8){float captured;vec3 lens=blackHole(q,bg,captured);
          float copyShade=(1.-smoothstep(mix(.45,.80,uPhone),mix(.72,.99,uPhone),vUv.x))*(1.-smoothstep(.29,.46,vUv.y));
          lens=mix(lens,bg,copyShade*.70);color=mix(bg,lens,1.-through);}
        // Fine currents are pulled into the aperture, then continue through it.
        float flow=sin(angle*19.+log(max(r,.01))*13.-t*.32+noise(q*.7)*2.);
        float stream=pow(max(0.,flow),64.)*smoothstep(1.3,2.4,r)*exp(-r*.8)*(1.-through)*.025;
        color+=vec3(.095,.084,.064)*stream;
        float interior=phase(.65,1.05)*(1.-phase(1.35,1.9));
        vec2 tunnel=(vUv-.5)*vec2(uAspect,1.);float theta=atan(tunnel.y,tunnel.x),depth=1./max(.06,length(tunnel));
        float sweep=pow(max(0.,sin(theta*11.+depth*.15-t*.15)),30.)*exp(-depth*.055);
        color+=vec3(.006,.008,.009)*sweep*interior;
        // The threat has a local effect on the same surrounding volume.
        float risk=phase(2.25,2.95)*(1.-phase(3.25,3.85));
        vec2 focal=(vUv-vec2(.49,.48))*vec2(uAspect,1.);
        color+=vec3(.11,.004,.001)*exp(-length(focal)*5.)*risk*uRisk;
        color*=1.-.12*pow(length((vUv-.5)*1.3),2.);
        color+=(hash(gl_FragCoord.xy)-.5)*.0015;
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);mesh.frustumCulled=false;mesh.renderOrder=-1000;scene.add(mesh);
  return {update({progress,time,aspect,phone,x,y,risk,velocity,riskCenter}){uniforms.uProgress.value=progress;uniforms.uTime.value=time;uniforms.uAspect.value=aspect;uniforms.uPhone.value=phone?1:0;uniforms.uPointer.value.set(x,y);uniforms.uRisk.value=risk/100;uniforms.uVelocity.value=velocity;if(riskCenter)uniforms.uRiskCenter.value.copy(riskCenter);},dispose(){}};
}
