import { createSignalParticles } from './signal-particles.js';
import { headlineDistance } from './signal-distance.js';
import { createSignalRibbons } from './signal-ribbons.js';
// One screen triangle with a locally generated headline distance field. The liquid
// extrudes and deforms those exact glyphs in either scroll direction.
export function createSignalStage(host) {
  const canvas=document.createElement('canvas');
  canvas.className='an-procedural-canvas';canvas.setAttribute('aria-hidden','true');
  let gl;try{gl=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'low-power'});}catch{}
  const fallback=()=>{host.dataset.gpu='fallback';return {draw(){},resize(){},update(){},dispose(){canvas.remove();}};};
  if(!gl)return fallback();
  let disposed=false,lost=false,lastDraw=-1,lastProgress=-1,scale=1,slowFrames=0,fastFrames=0,lastMotion,lastMask=null,glyphRange=.3,lastSelected=-2,lastInspection=-1;
  const abort=new AbortController();
  const vertex=`#version 300 es
  in vec2 position;out vec2 vUv;
  void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment=`#version 300 es
  precision highp float;
  in vec2 vUv;out vec4 fragColor;
  uniform vec2 uResolution;uniform vec2 uPointer;uniform vec2 uSignal;
  uniform float uProgress;uniform float uTime;uniform float uMotion;uniform float uVelocity;uniform float uGlyphRange;
  uniform sampler2D uGlyph;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
  mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
  float surface(vec3 p){
    float aspect=uResolution.x/uResolution.y;
    float fluid=smoothstep(1.02,1.7,uProgress);
    float phase=uProgress*.65+sin(uTime*.6283185)*.18*uMotion;
    float zoom=1.+.55*smoothstep(.95,1.4,uProgress)*(1.-smoothstep(1.5,2.05,uProgress));
    vec2 screen=vec2(p.x/(aspect*3.4)+.5,.5-p.y/3.4);
    screen=uSignal+(screen-uSignal)/zoom;
    vec2 glyph=screen;
    // Invert the exact forward deformation used by the glyph particles.
    for(int i=0;i<3;i++){
      glyph.x=uSignal.x+(screen.x-uSignal.x)/(1.+fluid*.65)-sin(glyph.y*13.+phase)*.14*fluid;
      glyph.y=screen.y-sin(glyph.x*9.+phase)*.1*fluid;
    }
    float outside=max(max(-glyph.x,glyph.x-1.),max(-glyph.y,glyph.y-1.));
    float typeDistance=(texture(uGlyph,clamp(glyph,.001,.999)).r-.502)*2.*uGlyphRange;
    typeDistance=max(typeDistance,outside*3.4);
    float rupture=smoothstep(.72,1.25,uProgress);
    float crack=abs(sin(glyph.y*64.+glyph.x*9.+noise(glyph*10.)*.9));
    float cut=(rupture*.18-crack)*.028;
    typeDistance=max(typeDistance,cut);
    float layer=floor(glyph.y*22.);
    float depth=sin(glyph.x*11.+phase)*.17*fluid+sin(layer*2.4)*.08*rupture;
    depth+=uVelocity*.035*fluid*uMotion;
    float thickness=.025+fluid*.035;
    vec2 d=vec2(typeDistance,abs(p.z-depth)-thickness);
    return min(max(d.x,d.y),0.)+length(max(d,0.));
  }
  vec3 normalAt(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(surface(p+e.xyy)-surface(p-e.xyy),surface(p+e.yxy)-surface(p-e.yxy),surface(p+e.yyx)-surface(p-e.yyx)));}
  vec3 environment(vec3 r){
    float horizon=smoothstep(-.35,.35,r.y);
    vec3 c=mix(vec3(.045,.043,.04),vec3(.48,.46,.40),horizon);
    float strip=pow(max(0.,1.-abs(r.x*.7+r.z*.65)*1.8),15.);
    float softbox=pow(max(0.,dot(r,normalize(vec3(-.4,.7,1.6)))),9.);
    return c+strip*vec3(.8,.72,.6)+softbox*vec3(.7,.75,.75);
  }
  void main(){
    vec2 uv=vUv;float p=uProgress,aspect=uResolution.x/uResolution.y;
    float night=smoothstep(.85,1.85,p);
    vec2 origin=vec2(uSignal.x,1.-uSignal.y);float spread=smoothstep(.7,1.8,p);
    float aperture=length((uv-origin)*vec2(aspect,1.))+.07*noise(uv*8.+p);
    float ink=1.-smoothstep(spread*2.4-.08,spread*2.4+.1,aperture);
    ink*=smoothstep(.55,.85,p);
    vec3 paper=vec3(.91765,.90588,.87451),dark=vec3(.0667);
    vec3 color=mix(paper,dark,ink);
    float hero=(1.-smoothstep(.0,.6,p))*uMotion;
    float light=exp(-pow(uv.x+uv.y*.18-(.45+sin(uTime*.6283185)*.28),2.)*8.);
    color+=vec3(.016,.012,.005)*light*hero;
    float atmosphere=exp(-length((uv-vec2(.78,.58))*vec2(1.,1.5))*3.);
    color+=vec3(.09,.065,.04)*atmosphere*night*(.7+.3*sin(uTime*.1)*uMotion);
    float show=smoothstep(.82,1.08,p)*(1.-smoothstep(1.35,1.78,p));
    if(show>.002){
      vec2 xy=(uv-.5)*vec2(aspect,1.)*3.4;
      xy-=uPointer*vec2(.06,.035)*uMotion;
      vec3 ro=vec3(xy,3.5),rd=vec3(0.,0.,-1.);
      float t=0.;bool hit=false;
      for(int i=0;i<48;i++){float d=surface(ro+rd*t);if(d<.002){hit=true;break;}t+=d*.8;if(t>6.)break;}
      if(hit){
        vec3 pos=ro+rd*t,n=normalAt(pos),r=reflect(rd,n);
        float fresnel=pow(1.-max(0.,dot(n,-rd)),3.);
        float copper=smoothstep(-.12,.4,pos.y)*(.5+.5*sin(pos.x*3.+p));
        vec3 metal=environment(r)*mix(vec3(.9,.96,.95),vec3(.86,.58,.4),copper*.5);
        metal+=pow(max(0.,dot(n,normalize(vec3(-1.,2.,3.)))),34.)*vec3(1.,.86,.65);
        metal+=fresnel*vec3(.2,.17,.12);
        float movingLight=exp(-pow(pos.x+pos.y*.45-sin(uTime*.6283185)*2.,2.)*9.);
        metal+=vec3(.62,.5,.33)*movingLight*.55*uMotion;
        float seam=pow(.5+.5*sin(pos.y*5.+pos.x*2.+p*3.),28.);
        metal=mix(metal,vec3(.785,.29,.212),seam*.56);
        // The material develops pores, then releases the same band as particles.
        float erosion=noise(pos.xy*45.+p*4.);
        float keep=1.-smoothstep(1.55+erosion*.2,1.88+erosion*.2,p);
        color=mix(color,metal,show*keep);
      }
    }
    // The light settles into the same restrained charcoal as the actual console.
    color=mix(color,vec3(.045,.055,.06)+atmosphere*vec3(.025,.03,.03),smoothstep(4.25,5.,p));
    color+=(hash(gl_FragCoord.xy)-.5)*.003;
    fragColor=vec4(color,1.);
  }`;
  const shaders=[];
  function compile(type,source){const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Signal shader compilation failed');return shader;}
  let program,buffer,vao;
  try{
    program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Signal shader link failed');
    vao=gl.createVertexArray();gl.bindVertexArray(vao);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const location=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
  }catch{shaders.forEach(s=>gl.deleteShader(s));if(buffer)gl.deleteBuffer(buffer);if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);return fallback();}
  const uniforms=Object.fromEntries(['uResolution','uPointer','uSignal','uProgress','uTime','uMotion','uVelocity','uGlyphRange','uGlyph'].map(n=>[n,gl.getUniformLocation(program,n)]));
  const glyphTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,glyphTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,1,1,0,gl.RED,gl.UNSIGNED_BYTE,new Uint8Array([255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const particles=createSignalParticles(gl);
  const ribbons=createSignalRibbons(gl);
  const phone=()=>host.clientWidth<=760;
  function resize(){
    if(disposed||lost)return;
    const dpr=Math.min(devicePixelRatio||1,phone()?1:1.25)*scale;
    canvas.width=Math.max(1,Math.round(host.clientWidth*dpr));canvas.height=Math.max(1,Math.round(host.clientHeight*dpr));
    gl.viewport(0,0,canvas.width,canvas.height);host.dataset.quality=scale.toFixed(2);lastDraw=-1;
  }
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;host.dataset.gpu='fallback';},{signal:abort.signal});
  canvas.addEventListener('webglcontextrestored',()=>{if(!disposed){host.dataset.gpu='fallback';}},{signal:abort.signal});
  host.append(canvas);host.dataset.gpu='ready';resize();
  return {
    resize,
    update(data){
      particles?.update(data);
      ribbons?.update(data);
      if(data.mask&&data.mask!==lastMask){const field=headlineDistance(data.mask);gl.bindTexture(gl.TEXTURE_2D,glyphTexture);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,field.width,field.height,0,gl.RED,gl.UNSIGNED_BYTE,field.encoded);glyphRange=field.range/field.height*3.4;lastMask=data.mask;}
      lastProgress=-1;
    },
    draw({progress,time,pointerX=0,pointerY=0,signalX=.7,signalY=.49,motion=true,selectedBranch=-1,velocity=0,inspection=0}){
      if(disposed||lost)return;
      const now=performance.now(),changed=Math.abs(progress-lastProgress)>.0005||selectedBranch!==lastSelected||Math.abs(inspection-lastInspection)>.001;
      if(!changed&&lastMotion===motion&&(!motion||now-lastDraw<1000/(phone()?24:36)))return;
      const interval=lastDraw>0?now-lastDraw:0;
      if(motion&&interval>65)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
      if(motion&&interval>0&&interval<34)fastFrames++;else fastFrames=0;
      if(slowFrames>35&&scale>.65){scale=Math.max(.65,scale-.15);resize();slowFrames=0;}
      if(fastFrames>240&&scale<1){scale=Math.min(1,scale+.1);resize();fastFrames=0;}
      gl.disable(gl.BLEND);gl.useProgram(program);gl.bindVertexArray(vao);
      gl.uniform2f(uniforms.uResolution,canvas.width,canvas.height);gl.uniform2f(uniforms.uPointer,pointerX,pointerY);
      gl.uniform2f(uniforms.uSignal,signalX,signalY);
      gl.uniform1f(uniforms.uProgress,progress);gl.uniform1f(uniforms.uTime,motion?time:0);gl.uniform1f(uniforms.uMotion,motion?1:0);
      gl.uniform1f(uniforms.uVelocity,velocity);gl.uniform1f(uniforms.uGlyphRange,glyphRange);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,glyphTexture);gl.uniform1i(uniforms.uGlyph,0);
      gl.drawArrays(gl.TRIANGLES,0,3);
      ribbons?.draw({progress,time:motion?time:0,motion,pointerX,pointerY,signalX,signalY,width:canvas.width,height:canvas.height,selectedBranch});
      particles?.draw({progress,time:motion?time:0,pointerX,pointerY,signalX,signalY,motion,width:canvas.width,height:canvas.height,dpr:canvas.width/host.clientWidth,selectedBranch,inspection,velocity});
      lastDraw=now;lastProgress=progress;lastMotion=motion;lastSelected=selectedBranch;lastInspection=inspection;
    },
    dispose(){disposed=true;abort.abort();particles?.dispose();ribbons?.dispose();shaders.forEach(s=>gl.deleteShader(s));gl.deleteTexture(glyphTexture);gl.deleteBuffer(buffer);gl.deleteVertexArray(vao);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.remove();}
  };
}
