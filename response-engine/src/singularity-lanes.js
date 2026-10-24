import * as THREE from 'three';

export const NODE_POSITIONS=[[-.74,.42,.70],[.61,.34,.76],[.20,-.63,.82],[-.78,-.48,.39],[.76,.53,.28],[-.25,.88,.38],[.18,-.88,.36],[.94,-.10,-.25],[-.86,.35,-.3],[.18,.77,-.65]].map(p=>new THREE.Vector3(...p).normalize().multiplyScalar(2.045).toArray());
export const EDGES=[[0,1],[1,2],[0,3],[3,6],[6,2],[1,4],[4,7],[7,2],[0,8],[8,5],[5,1],[5,9],[9,4],[6,7],[8,3],[9,7]];
const vec=p=>`vec3(${p.map(v=>Number(v).toFixed(3)).join(',')})`;
const starts=EDGES.map(([a],i)=>`if(b<${(i+.5).toFixed(1)})return ${vec(NODE_POSITIONS[a])};`).join('');
const ends=EDGES.map(([,b],i)=>`if(b<${(i+.5).toFixed(1)})return ${vec(NODE_POSITIONS[b])};`).join('');
const connections=EDGES.map(([a,b],i)=>`if(band<${(i+.5).toFixed(1)})return vec2(${a.toFixed(1)},${b.toFixed(1)});`).join('');

export const laneGLSL=`
  uniform float uProgress,uTime,uPhone,uRisk,uSelection;uniform vec4 uPanels[16];uniform vec2 uConsoleTL,uConsoleTR,uConsoleBL,uConsoleBR;
  float chapter(float a,float b){return smoothstep(a,b,uProgress);}
  vec3 edgeStart(float b){${starts}return vec3(0.);}
  vec3 edgeEnd(float b){${ends}return vec3(0.);}
  vec2 edgeNodes(float band){${connections}return vec2(-9.);}
  float edgeFocus(float band){vec2 nodes=edgeNodes(band);return 1.-step(.5,min(abs(nodes.x-uSelection),abs(nodes.y-uSelection)));}
  vec3 channel(float u,float b){
    float a=b/16.*6.283185+u*1.15+sin(u*3.+b)*.13+sin(u*2.6+uTime*.18+b*.7)*.06*u*(1.-u);
    float radius=.6+pow(u,.85)*4.9;
    return vec3(cos(a)*radius+sin(u*6.+b)*.28,sin(a)*radius*.72,-24.+u*30.);
  }
  vec3 topology(float u,float b){
    vec3 a=edgeStart(b),c=edgeEnd(b),mid=normalize(a+c)*(2.85+sin(b*1.7)*.12);
    return mix(mix(a,mid,u),mix(mid,c,u),u);
  }
  vec3 boundary(float u,float b){
    float a=u*3.14159265,longitude=b/16.*6.283185;
    float radius=1.28+sin(a*3.+longitude*2.)*.045+sin(uTime*.4+longitude)*.008;
    return vec3(-.45+sin(a)*cos(longitude)*radius,cos(a)*radius*.92,sin(a)*sin(longitude)*radius*.82);
  }
  vec3 lanePosition(float u,float b){
    vec3 p=mix(channel(u,b),topology(u,b),chapter(1.15,1.92));
    return mix(p,boundary(u,b),chapter(2.25,3.0));
  }
  vec2 consoleUV(vec2 position){
    return mix(mix(uConsoleTL,uConsoleTR,position.x),mix(uConsoleBL,uConsoleBR,position.x),position.y);
  }
  vec2 panelEdge(float u,float b){
    vec4 panel=uPanels[0];
    for(int i=0;i<16;i++){if(abs(float(i)-b)<.5)panel=uPanels[i];}
    float e=fract(u)*4.,t=fract(e);vec2 corner;
    if(e<1.)corner=vec2(t,0.);else if(e<2.)corner=vec2(1.,t);else if(e<3.)corner=vec2(1.-t,1.);else corner=vec2(0.,1.-t);
    return consoleUV(panel.xy+corner*panel.zw);
  }
`;

export function createLanes(root){
  const panels=Array.from({length:16},(_,i)=>new THREE.Vector4(.1+(i%4)*.21,.18+Math.floor(i/4)*.17,.19,.15));
  const uniforms={uProgress:{value:0},uTime:{value:0},uPhone:{value:0},uRisk:{value:.84},uSelection:{value:-1},uPanels:{value:panels},uConsoleTL:{value:new THREE.Vector2(.3,.24)},uConsoleTR:{value:new THREE.Vector2(.9,.24)},uConsoleBL:{value:new THREE.Vector2(.3,.75)},uConsoleBR:{value:new THREE.Vector2(.9,.75)}};
  const segments=180,cross=6,positions=[],uvs=[],bands=[],indices=[];
  for(let band=0;band<16;band++)for(let i=0;i<=segments;i++)for(let j=0;j<=cross;j++){
    positions.push(0,0,0);uvs.push(i/segments,j/cross);bands.push(band);
    if(i<segments&&j<cross){const k=band*(segments+1)*(cross+1)+i*(cross+1)+j,l=k+cross+1;indices.push(k,l,k+1,k+1,l,l+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('aBand',new THREE.Float32BufferAttribute(bands,1));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshPhysicalMaterial({color:0x8d938e,metalness:.97,roughness:.22,clearcoat:.12,clearcoatRoughness:.25,envMapIntensity:.85,transparent:true,side:THREE.DoubleSide});
  material.forceSinglePass=true;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    const header=`attribute float aBand;varying vec2 vLaneUV;varying float vLaneBand;${laneGLSL}
      vec3 ribbonPoint(vec2 uv,float b){
        vec3 point=lanePosition(uv.x,b),forward=normalize(lanePosition(min(1.,uv.x+.002),b)-lanePosition(max(0.,uv.x-.002),b));
        vec3 side=normalize(cross(forward,vec3(.02,1.,.1)));
        float twist=sin(uv.x*5.+b)*.65;side=normalize(side*cos(twist)+cross(forward,side)*sin(twist));
        float width=(.10+sin(b*2.1)*.065)*(.45+.55*sin(uv.x*3.14159));
        width=mix(width,b<2.?.025:.012,chapter(1.2,1.95));
        width=mix(width,.006,chapter(2.25,3.));
        return point+side*(uv.y-.5)*width+cross(side,forward)*sin(uv.y*3.14159)*width*.27;
      }
    `;
    shader.vertexShader=header+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
      vec3 along=ribbonPoint(vec2(min(1.,uv.x+.001),uv.y),aBand)-ribbonPoint(vec2(max(0.,uv.x-.001),uv.y),aBand);
      vec3 across=ribbonPoint(vec2(uv.x,min(1.,uv.y+.01)),aBand)-ribbonPoint(vec2(uv.x,max(0.,uv.y-.01)),aBand);
      objectNormal=normalize(cross(along,across));`);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed=ribbonPoint(uv,aBand);vLaneUV=uv;vLaneBand=aBand;`);
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vec2 target=panelEdge(uv.x,aBand);vec4 ui=vec4(target.x*2.-1.,1.-target.y*2.,0.,1.);
      gl_Position=mix(gl_Position,ui*gl_Position.w,chapter(3.22,3.83));`);
    shader.fragmentShader=`varying vec2 vLaneUV;varying float vLaneBand;uniform float uProgress,uTime,uRisk,uSelection;
      vec2 focusedEdgeNodes(float band){${connections}return vec2(-9.);}
      float focusedEdge(float band){vec2 nodes=focusedEdgeNodes(band);return 1.-step(.5,min(abs(nodes.x-uSelection),abs(nodes.y-uSelection)));}\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float network=smoothstep(1.25,1.95,uProgress),containment=smoothstep(2.25,3.,uProgress);
      float selectedLane=1.-step(1.5,vLaneBand);float edge=pow(abs(vLaneUV.y-.5)*2.,4.);
      diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.11,.14,.15),vec3(.5,.025,.012),selectedLane),network);
      diffuseColor.a*=mix(1.,.22+selectedLane*.75,network)*(1.-smoothstep(3.72,3.98,uProgress));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
      diffuseColor.a*=clamp(1.-smoothstep(2.72,3.02,uProgress)+smoothstep(3.2,3.65,uProgress),0.,1.);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float inspecting=step(-.5,uSelection)*network,connected=focusedEdge(vLaneBand);
      diffuseColor.a*=mix(1.,.09+connected*.91,inspecting);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.70,.34,.18),inspecting*connected*.38);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float pulse=pow(max(0.,1.-abs(fract(vLaneUV.x-uTime*.08+vLaneBand*.13)-.5)*12.),4.);
      vec3 emission=mix(vec3(.45,.43,.35),vec3(.85,.035,.008),selectedLane);
      totalEmissiveRadiance+=emission*(pulse*.55+selectedLane*.13)*network;
      totalEmissiveRadiance+=vec3(.22,.20,.15)*pulse*(1.-network)*.7;
      totalEmissiveRadiance+=vec3(.5,.012,.003)*containment*uRisk*(.08+pulse*.3);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`float grazing=pow(1.-abs(dot(normal,normalize(vViewPosition))),4.);
      roughnessFactor*=1.-grazing*.16;
      #include <lights_physical_fragment>`);
  };
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;root.add(mesh);
  return {uniforms,setQuad(quad){if(quad)['uConsoleTL','uConsoleTR','uConsoleBL','uConsoleBR'].forEach((key,i)=>uniforms[key].value.set(quad[i].x,quad[i].y));},setPanels(values){for(let i=0;i<16;i++){const p=values[i%Math.max(1,values.length)];if(p)panels[i].set(p.x,p.y,p.w,p.h);}},update({progress,time,phone,risk,inspection}){uniforms.uProgress.value=progress;uniforms.uTime.value=time;uniforms.uPhone.value=phone?1:0;uniforms.uRisk.value=risk/100;uniforms.uSelection.value=['source','rule','host'].indexOf(inspection);material.envMapIntensity=1.1;material.opacity=THREE.MathUtils.smoothstep(progress,.48,.94)*(1-THREE.MathUtils.smoothstep(progress,3.9,4));mesh.visible=material.opacity>.001;}};
}

export function channelPoint(u,band,time,out=new THREE.Vector3()){
  const a=band/16*Math.PI*2+u*1.15+Math.sin(u*3+band)*.13+Math.sin(u*2.6+time*.18+band*.7)*.06*u*(1-u),r=.6+Math.pow(u,.85)*4.9;
  return out.set(Math.cos(a)*r+Math.sin(u*6+band)*.28,Math.sin(a)*r*.72,-24+u*30);
}
export function topologyPoint(u,band,out=new THREE.Vector3()){
    const [start,end]=EDGES[band],a=NODE_POSITIONS[start],c=NODE_POSITIONS[end],mid=new THREE.Vector3(...a).add(new THREE.Vector3(...c)).normalize().multiplyScalar(2.85+Math.sin(band*1.7)*.12).toArray();
  return out.set(...a.map((v,i)=>(1-u)*(1-u)*v+2*(1-u)*u*mid[i]+u*u*c[i]));
}
