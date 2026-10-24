import { ribbonShapeGLSL } from './signal-ribbon-shape.js';

// Broad, tessellated material surfaces. Their vertices begin in headline strokes,
// carry evidence, become decision rails, and resolve into real interface edges.
export function createSignalRibbons(gl){
  const shaders=[],buffers=[];
  const vertex=`#version 300 es
  precision highp float;
  in vec2 aUv;in float aBand;in vec2 aGlyph;in vec2 aResponse;in vec2 aGrid;
  uniform float uProgress,uTime,uMotion,uSelected;uniform vec2 uResolution,uPointer,uSignal;
  out vec3 vNormal,vPosition;out vec2 vUv;out float vBand,vAlpha;
  ${ribbonShapeGLSL}
  void main(){
    float p=uProgress,aspect=uResolution.x/uResolution.y;
    float phase=p*.22+sin(uTime*.23)*.12*uMotion;
    vec3 material=signalRibbon(aUv,aBand,phase);
    vec3 du=signalRibbon(aUv+vec2(.002,0.),aBand,phase)-material;
    vec3 dv=signalRibbon(aUv+vec2(0.,.005),aBand,phase)-material;
    vNormal=normalize(cross(dv,du));vPosition=material;
    vec3 view=ribbonCamera(material,p,uPointer,uMotion);
    vec2 projected=ribbonProjection(view,p,aspect);
    vec2 pos=mix(aGlyph,projected,smoothstep(1.22,1.75,p));
    float focus=smoothstep(2.25,2.85,p);
    pos=mix(pos,uSignal+(pos-uSignal)*.15,focus);
    float response=smoothstep(3.32,3.92,p);
    float side=(aUv.y-.5)*.024;
    vec2 rail=aResponse+vec2(side*.25,side);
    pos=mix(pos,rail,response);
    float expand=smoothstep(4.58,5.,p),mobile=step(aspect,1.);
    float ratio=mix(.42,.73,mobile)+(1.-mix(.42,.73,mobile))*expand;
    vec2 grid=mix(vec2(.49,.25),vec2(.14,.55),mobile)*(1.-expand)+aGrid*ratio;
    pos=mix(pos,grid,smoothstep(4.15,4.85,p));
    float show=smoothstep(1.2,1.5,p)*(1.-smoothstep(2.45,2.85,p));
    show+=smoothstep(3.4,3.8,p)*(1.-smoothstep(4.4,4.9,p))*.65;
    float selected=1.-step(.5,abs(mod(aBand,4.)-uSelected));
    show*=mix(1.,mix(.12,1.,selected),response);
    vAlpha=show;vBand=aBand;vUv=aUv;
    gl_Position=vec4(pos.x*2.-1.,1.-pos.y*2.,view.z*.015,1.);
  }`;
  const fragment=`#version 300 es
  precision highp float;
  in vec3 vNormal,vPosition;in vec2 vUv;in float vBand,vAlpha;
  uniform float uProgress,uTime,uMotion;out vec4 color;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  vec3 room(vec3 r){
    vec3 dark=vec3(.018,.022,.024);
    float horizon=smoothstep(-.4,.7,r.y);
    vec3 base=mix(dark,vec3(.22,.25,.26),horizon);
    float stripA=pow(max(0.,1.-abs(r.x+r.y*.32-.18)*2.2),16.);
    float stripB=pow(max(0.,1.-abs(r.z*.7-r.y*.6+.1)*2.8),22.);
    float warm=pow(max(0.,dot(r,normalize(vec3(-1.,.5,1.5)))),18.);
    return base+stripA*vec3(1.1,1.14,1.12)+stripB*vec3(.68,.73,.76)+warm*vec3(.85,.5,.17);
  }
  void main(){
    if(vAlpha<.002)discard;
    vec3 n=normalize(vNormal),view=normalize(vec3(-vPosition.x*.1,-vPosition.y*.1,4.2-vPosition.z));
    if(dot(n,view)<0.)n=-n;
    vec3 r=reflect(-view,n);float fresnel=pow(1.-max(0.,dot(n,view)),4.);
    float edge=pow(abs(vUv.y-.5)*2.,12.);
    float stripe=pow(.5+.5*sin(vUv.x*21.-uTime*.25*uMotion+vBand),38.);
    vec3 reflection=room(r);
    bool glass=mod(vBand,3.)>0.5&&mod(vBand,3.)<1.5;
    vec3 tint=vBand>2.5?vec3(.92,.65,.28):vec3(.88,.94,.96);
    vec3 metal=reflection*tint+vec3(.035,.038,.038);
    metal+=edge*vec3(.85,.86,.8)*.55+stripe*vec3(.6,.38,.11)*.35;
    float alpha=glass?(.14+fresnel*.56+edge*.25):.9;
    if(glass){vec3 transmission=room(refract(-view,n,1./1.45));metal=mix(transmission*.2,reflection,.3+fresnel*.7)+edge*vec3(.75,.67,.43)*.45;}
    float scatter=pow(max(0.,sin(vUv.x*38.+vUv.y*2.-uTime*.6*uMotion)),36.);
    metal+=scatter*vec3(.75,.46,.13)*.11;
    float dissolve=smoothstep(2.23,2.78,uProgress)*(1.-smoothstep(3.35,3.8,uProgress));
    if(hash(floor(vUv*vec2(160.,14.))+vBand)<dissolve)discard;
    color=vec4(metal,alpha*vAlpha);
  }`;
  let program,vao,indexBuffer,indexCount=0;
  try{
    program=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Ribbon shader');gl.attachShader(program,s);}
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Ribbon program');
    vao=gl.createVertexArray();gl.bindVertexArray(vao);
    for(const [name,size] of [['aUv',2],['aBand',1],['aGlyph',2],['aResponse',2],['aGrid',2]]){const buffer=gl.createBuffer();buffers.push({name,size,buffer});gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const loc=gl.getAttribLocation(program,name);if(loc>=0){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);}}
    indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
  }catch{shaders.forEach(s=>gl.deleteShader(s));buffers.forEach(b=>gl.deleteBuffer(b.buffer));if(indexBuffer)gl.deleteBuffer(indexBuffer);if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);return null;}
  const uniforms=Object.fromEntries(['uProgress','uTime','uMotion','uSelected','uResolution','uPointer','uSignal'].map(n=>[n,gl.getUniformLocation(program,n)]));
  return {
    update({fracture,responsePaths,panels=[],width,height}){
      const segments=width<=760?128:240,cross=width<=760?12:20,bands=5,values={aUv:[],aBand:[],aGlyph:[],aResponse:[],aGrid:[]},indices=[];
      const lines=[[],[],[]],ys=fracture.map(p=>p[1]),top=Math.min(...ys),bottom=Math.max(...ys);
      fracture.forEach(p=>lines[Math.min(2,Math.floor((p[1]-top)/Math.max(.001,bottom-top)*3))].push(p));lines.forEach(l=>l.sort((a,b)=>a[0]-b[0]));
      for(let band=0;band<bands;band++)for(let i=0;i<=segments;i++)for(let j=0;j<=cross;j++){
        const u=i/segments,v=j/cross,line=lines[band%3],glyph=line[Math.min(line.length-1,Math.floor(u*(line.length-1)))]||[u,.5];
        values.aUv.push(u,v);values.aBand.push(band);values.aGlyph.push(glyph[0],glyph[1]+(v-.5)*.035);
        const path=responsePaths[band%4],point=path?.[Math.min(path.length-1,Math.floor(u*(path.length-1)))]||[width*.5,height*.5];values.aResponse.push(point[0]/width,point[1]/height);
        const panel=panels[band%Math.max(1,panels.length)]||{x:.07,y:.12,w:.86,h:.78},edge=u*4,t=edge%1;
        values.aGrid.push(panel.x+(edge<1?t:edge<2?1:edge<3?1-t:0)*panel.w,panel.y+(edge<1?0:edge<2?t:edge<3?1:1-t)*panel.h+(v-.5)*.001);
        if(i<segments&&j<cross){const a=band*(segments+1)*(cross+1)+i*(cross+1)+j,b=a+cross+1;indices.push(a,b,a+1,a+1,b,b+1);}
      }
      gl.bindVertexArray(vao);buffers.forEach(({name,buffer})=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values[name]),gl.DYNAMIC_DRAW);});
      indexCount=indices.length;gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    },
    draw({progress,time,motion,pointerX,pointerY,signalX,signalY,width,height,selectedBranch}){
      if(!indexCount||progress<1.18||progress>4.9||(progress>2.85&&progress<3.35))return;
      gl.useProgram(program);gl.bindVertexArray(vao);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(uniforms.uProgress,progress);gl.uniform1f(uniforms.uTime,time);gl.uniform1f(uniforms.uMotion,motion?1:0);gl.uniform1f(uniforms.uSelected,selectedBranch);
      gl.uniform2f(uniforms.uResolution,width,height);gl.uniform2f(uniforms.uPointer,pointerX,pointerY);gl.uniform2f(uniforms.uSignal,signalX,signalY);
      gl.enable(gl.DEPTH_TEST);gl.clear(gl.DEPTH_BUFFER_BIT);gl.depthMask(true);
      const part=indexCount/5;
      for(const band of [0,2,3])gl.drawElements(gl.TRIANGLES,part,gl.UNSIGNED_SHORT,band*part*2);
      gl.depthMask(false);for(const band of [1,4])gl.drawElements(gl.TRIANGLES,part,gl.UNSIGNED_SHORT,band*part*2);
      gl.depthMask(true);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
    },
    dispose(){shaders.forEach(s=>gl.deleteShader(s));buffers.forEach(b=>gl.deleteBuffer(b.buffer));gl.deleteBuffer(indexBuffer);gl.deleteVertexArray(vao);gl.deleteProgram(program);}
  };
}
