import * as THREE from 'three';

const phase=THREE.MathUtils.smoothstep;

export function createThreatGlobe(root,invalidate,manager){
  let disposed=false,texture=null;
  const material=new THREE.MeshStandardMaterial({color:0xb8c0bf,metalness:.06,roughness:.94,transparent:true,envMapIntensity:.22});
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float terrain=dot(diffuseColor.rgb,vec3(.299,.587,.114));diffuseColor.rgb=vec3(terrain)*vec3(.84,.91,.94);`);
  };
  const globe=new THREE.Mesh(new THREE.SphereGeometry(2,112,80),material);root.add(globe);
  new THREE.TextureLoader(manager).load(`${import.meta.env.BASE_URL}assets/singularity-earth.jpg`,map=>{if(disposed){map.dispose();return;}texture=map;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;material.map=map;material.needsUpdate=true;invalidate();},undefined,()=>{});
  const rimMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,uniforms:{uOpacity:{value:0}},
    vertexShader:`varying vec3 vNormal,vView;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float uOpacity;varying vec3 vNormal,vView;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),3.5);gl_FragColor=vec4(vec3(.56,.64,.65),rim*uOpacity*.32);}`});
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(2.035,80,48),rimMaterial);root.add(atmosphere);
  return {material,update(p,time){const alpha=phase(p,1.35,1.95)*(1-phase(p,2.25,2.8)),scale=1-phase(p,2.25,2.8)*.18;globe.visible=atmosphere.visible=alpha>.001;material.opacity=alpha;rimMaterial.uniforms.uOpacity.value=alpha;globe.rotation.y=-.3+Math.sin(time*.12)*.025;globe.scale.setScalar(scale);atmosphere.scale.setScalar(scale);},dispose(){disposed=true;texture?.dispose();}};
}

export function createRiskInstrument(root){
  const group=new THREE.Group();group.position.set(-.45,0,0);group.rotation.set(-.10,.12,-.10);root.add(group);
  const materials=[],fills=[],maxima=[40,30,20,10],segments=128;
  const graphite=new THREE.MeshPhysicalMaterial({color:0x262b2b,metalness:.72,roughness:.33,clearcoat:.15,transparent:true,envMapIntensity:.8});materials.push(graphite);
  // Keep the broad face optically dark; the physical perimeter carries the HDR
  // reflections. A lit full-face dielectric washed out under the scene lights.
  const lensMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{uOpacity:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uOpacity;varying vec2 vUv;void main(){vec2 q=(vUv-.5)*2.;float radius=length(q);float edge=smoothstep(.76,1.,radius);vec3 color=mix(vec3(.0025,.004,.005),vec3(.009,.013,.015),edge);float reflection=pow(max(0.,dot(normalize(vec3(q,.45)),normalize(vec3(-.5,.7,.5)))),24.)*edge;color+=vec3(.07,.08,.075)*reflection;gl_FragColor=vec4(color,uOpacity);
      #include <colorspace_fragment>
    }`});materials.push(lensMaterial);
  const lens=new THREE.Mesh(new THREE.CircleGeometry(1.47,128),lensMaterial);lens.position.z=-.04;group.add(lens);
  const edge=new THREE.Mesh(new THREE.RingGeometry(1.455,1.47,180),graphite);edge.position.z=.025;group.add(edge);
  let start=Math.PI*.5;
  for(let i=0;i<4;i++){
    const sweep=maxima[i]/100*Math.PI*2-.045;
    const base=new THREE.Mesh(new THREE.RingGeometry(1.56,1.63,segments,1,start,sweep),graphite);group.add(base);
    const material=new THREE.MeshBasicMaterial({color:i===0?0xc83c32:0xb9332b,transparent:true,toneMapped:false});materials.push(material);
    const fill=new THREE.Mesh(new THREE.RingGeometry(1.568,1.622,segments,1,start,sweep),material);fill.position.z=.018;group.add(fill);fills.push(fill);
    const inner=new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({length:segments+1},(_,j)=>new THREE.Vector3(Math.cos(start+j/segments*sweep)*1.51,Math.sin(start+j/segments*sweep)*1.51,.03))),new THREE.LineBasicMaterial({color:0xbaad8e,transparent:true,opacity:.3}));group.add(inner);materials.push(inner.material);
    start+=sweep+.045;
  }
  const ticks=[];for(let i=0;i<100;i++){const a=i/100*Math.PI*2,r=i%10?1.72:1.75;ticks.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,0),new THREE.Vector3(Math.cos(a)*(r+(i%10?.025:.065)),Math.sin(a)*(r+(i%10?.025:.065)),0));}
  const tickMaterial=new THREE.LineBasicMaterial({color:0xbeb7a5,transparent:true,opacity:.3});materials.push(tickMaterial);group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks),tickMaterial));
  const values=[36,30,9,9];
  return {group,update({progress:p,time,factors,selection=-1}){
    const alpha=phase(p,2.30,2.96)*(1-phase(p,3.25,3.85));group.visible=alpha>.001;
    materials.forEach((m,i)=>m.opacity=alpha*(m===lensMaterial?.92:m===tickMaterial?.32:m.isLineBasicMaterial?.32:1));
    lensMaterial.uniforms.uOpacity.value=alpha*.94;
    if(factors)for(let i=0;i<4;i++)values[i]=factors[i]??0;
    fills.forEach((fill,i)=>{fill.geometry.setDrawRange(0,Math.round(THREE.MathUtils.clamp(values[i]/maxima[i],0,1)*segments)*6);fill.material.opacity=alpha*(selection<0||selection===i?1:.24);fill.position.z=selection===i?.065:.018;});
    group.rotation.y=.12+Math.sin(time*.13)*.018;group.rotation.x=-.1+Math.sin(time*.11)*.015;
  }};
}
