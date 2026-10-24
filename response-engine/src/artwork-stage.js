// Animate the supplied material imagery at pixel level. The only geometry is a
// full-screen triangle; no polygonal scene replaces the reference artwork.
export async function createArtworkStage(host){
  const canvas=document.createElement('canvas');canvas.className='an-artwork-canvas';canvas.setAttribute('aria-hidden','true');
  let gl;try{gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false});}catch{}
  if(!gl){host.dataset.gpu='fallback';return{draw(){},resize(){},dispose(){}};}
  const abort=new AbortController(),textures=[];
  let disposed=false,lost=false,width=1,height=1,lastDraw=-1,lastProgress=-1,lastInput=null,textureSize=[1672,940],ratio=1,lastMotion=null;
  const vertex=`#version 300 es
  in vec2 position;out vec2 vUv;void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment=`#version 300 es
  precision highp float;
  in vec2 vUv;out vec4 fragColor;
  uniform sampler2D uHero;uniform sampler2D uMetal;uniform sampler2D uNetwork;uniform sampler2D uResponse;
  uniform vec2 uResolution;uniform vec2 uHeroSize;uniform vec2 uPointer;
  uniform float uProgress;uniform float uTime;uniform float uMotion;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*noise(p);p=p*2.03+vec2(4.7,1.3);a*=.5;}return v;}
  float segment(float p,float a,float b){return smoothstep(a,b,p);}
  vec2 cover(vec2 uv,vec2 size){float a=uResolution.x/uResolution.y,b=size.x/size.y;return (uv-.5)*vec2(min(1.,a/b),min(1.,b/a))+.5;}
  vec3 hero(vec2 uv){
    vec2 q=cover(uv,uHeroSize);vec2 depth=uPointer*vec2(.008,.004)*uMotion;
    q+=depth*(.35+uv.y*.65);
    q.y+=sin(q.x*24.+uTime*.25)*.00065*uMotion;
    vec3 c=texture(uHero,clamp(q,.001,.999)).rgb;
    float shaft=pow(max(0.,1.-abs(uv.x-.67+uv.y*.035)*2.),18.);
    c+=vec3(.07,.045,.02)*shaft*(.45+.55*sin(uTime*.7+uv.y*3.))*uMotion;
    vec2 dustGrid=uv*vec2(150.,90.)+vec2(uTime*.25,-uTime*.55)*uMotion;
    vec2 cell=floor(dustGrid);float dust=step(.996,hash(cell))*pow(max(0.,1.-length(fract(dustGrid)-.5)*2.),5.);
    c+=vec3(1.,.74,.42)*dust*.25*uMotion*shaft;
    return c;
  }
  vec3 metal(vec2 uv){
    vec2 q=cover(uv,vec2(1672.,940.));float mask=smoothstep(.22,.78,uv.x);
    vec2 flow=vec2(sin(q.y*8.+uTime*.24)+cos(q.x*6.-uTime*.16),cos(q.x*9.-uTime*.21)+sin(q.y*5.+uTime*.2));
    q+=flow*.006*mask*uMotion+uPointer*.005*uMotion;
    vec3 c=texture(uMetal,clamp(q,.001,.999)).rgb;
    float glint=pow(.5+.5*sin(q.y*31.+q.x*19.-uTime*1.1),18.);
    float bright=smoothstep(.4,.95,dot(c,vec3(.25,.6,.15)));
    c+=vec3(.12,.085,.04)*glint*bright*mask*uMotion;
    return c;
  }
  vec3 network(vec2 uv){
    vec2 q=cover(uv,vec2(1672.,940.));vec2 center=vec2(.69,.58),d=q-center;
    float r=length(d),pulse=exp(-pow((r-fract(uTime*.12))/.015,2.));
    q+=d*sin(r*32.-uTime*1.4)*.004*uMotion+uPointer*.004*uMotion;
    vec3 c=texture(uNetwork,clamp(q,.001,.999)).rgb;
    float filaments=smoothstep(.12,.65,dot(c,vec3(.25,.6,.15)));
    c+=vec3(.2,.07,.025)*pulse*filaments*uMotion;
    float core=exp(-dot(d,d)*700.);c+=vec3(.3,.025,.008)*core*(.5+.5*sin(uTime*1.8))*uMotion;
    return c;
  }
  vec3 response(vec2 uv){
    vec2 q=cover(uv,vec2(1672.,940.));q+=uPointer*vec2(.005,.003)*uMotion;
    q.x+=sin(q.y*17.+uTime*.3)*.0015*uMotion*smoothstep(.25,.8,q.y);
    vec3 c=texture(uResponse,clamp(q,.001,.999)).rgb;
    float red=max(0.,c.r-max(c.g,c.b));float sweep=pow(.5+.5*sin(q.y*29.-uTime*1.7),8.);
    c+=vec3(.23,.015,.005)*red*sweep*uMotion;
    float floorMask=1.-smoothstep(.03,.35,uv.y);c+=vec3(.035,.022,.01)*sin(q.x*100.+uTime*.7)*floorMask*smoothstep(.4,.8,c.r)*uMotion;
    return c;
  }
  vec3 scene(int index,vec2 uv){if(index==0)return hero(uv);if(index==1||index==3)return metal(uv);if(index==2)return network(uv);return response(uv);}
  void main(){
    float p=clamp(uProgress,0.,5.);int a=int(floor(p));int b=min(a+1,5);float local=fract(p);
    // Each transition has a spatially coherent origin at the same anomaly.
    float t=smoothstep(.15,.88,local);vec2 center=vec2(.67,.51),d=vUv-center;
    float field=fbm(vUv*5.+vec2(float(a)*1.7));
    float radius=length(d*vec2(uResolution.x/uResolution.y,1.));
    float edge=t*2.3-radius+field*.23;
    float blend=smoothstep(-.09,.09,edge-.1);
    blend=mix(blend,0.,1.-step(.001,t));blend=mix(blend,1.,step(.999,t));
    float transition=sin(t*3.14159265)*uMotion;
    vec2 curl=vec2(sin(vUv.y*10.+field*6.),cos(vUv.x*8.+field*6.));
    vec2 shift=curl*.035*transition;
    if(a==0){shift.x+=sin(vUv.y*65.)*.009*transition;}
    if(a==1){shift+=normalize(d+vec2(.001))*.035*transition;}
    if(a==2){shift-=d*.12*transition;}
    if(a==3){shift.y+=sin(vUv.x*5.)*.045*transition;}
    vec3 oldColor=scene(a,clamp(vUv+shift*(1.-blend),.001,.999));
    vec3 newColor=scene(b,clamp(vUv-shift*blend,.001,.999));
    vec3 color=mix(oldColor,newColor,blend);
    float meshLight=fbm(vUv*2.3+vec2(uTime*.025,-uTime*.016));
    color+=vec3(.018,.013,.007)*meshLight*uMotion*smoothstep(.5,1.,p);
    float seam=exp(-pow(edge-.1,2.)*1600.)*transition;
    color+=vec3(.15,.025,.008)*seam;
    fragColor=vec4(color,1.);
  }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw new Error('Artwork shader compilation failed');}return s;}
  let program,vs,fs,buffer;
  try{
    vs=shader(gl.VERTEX_SHADER,vertex);fs=shader(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Artwork shader linking failed');
    gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const location=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
  }catch{host.dataset.gpu='fallback';gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);return{draw(){},resize(){},dispose(){gl.getExtension('WEBGL_lose_context')?.loseContext();}};}
  const uniforms=Object.fromEntries(['uResolution','uHeroSize','uPointer','uProgress','uTime','uMotion'].map(key=>[key,gl.getUniformLocation(program,key)]));
  const images=[...host.querySelectorAll('.an-art img')];
  try{await Promise.all(images.map(img=>img.decode()));}catch{host.dataset.gpu='fallback';}
  if(disposed)return{draw(){},resize(){},dispose(){}};
  function upload(index,img){
    let texture=textures[index];if(!texture){texture=gl.createTexture();textures[index]=texture;}
    gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program,['uHero','uMetal','uNetwork','uResponse'][index]),index);
    if(!index)textureSize=[img.naturalWidth,img.naturalHeight];
  }
  images.forEach((img,i)=>{upload(i,img);img.addEventListener('load',()=>{if(!disposed&&!lost){gl.useProgram(program);upload(i,img);if(lastInput)draw({...lastInput,force:true});}},{signal:abort.signal});});
  host.append(canvas);host.dataset.gpu='ready';
  function resize(){if(disposed||lost)return;width=host.clientWidth;height=host.clientHeight;ratio=Math.min(devicePixelRatio||1,width<761?1:1.35);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);gl.viewport(0,0,canvas.width,canvas.height);lastDraw=-1;}
  function draw(input){
    if(disposed||lost)return;lastInput=input;const{progress,time=0,pointerX=0,pointerY=0,motion=true,force=false}=input;
    if(!force&&motion===lastMotion&&Math.abs(progress-lastProgress)<.001&&time-lastDraw<1/(width<761?25:40))return;
    lastDraw=time;lastProgress=progress;lastMotion=motion;gl.useProgram(program);
    gl.uniform2f(uniforms.uResolution,width,height);gl.uniform2f(uniforms.uHeroSize,...textureSize);gl.uniform2f(uniforms.uPointer,motion?pointerX:0,motion?pointerY:0);
    gl.uniform1f(uniforms.uProgress,progress);gl.uniform1f(uniforms.uTime,motion?time:0);gl.uniform1f(uniforms.uMotion,motion?1:0);gl.drawArrays(gl.TRIANGLES,0,3);
    host.dataset.gpuTime=(motion?time:0).toFixed(3);host.dataset.gpuPhase=progress.toFixed(3);
  }
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.style.opacity='0';host.dataset.gpu='fallback';},{signal:abort.signal});
  resize();
  return{draw,resize,dispose(){if(disposed)return;disposed=true;abort.abort();textures.forEach(t=>gl.deleteTexture(t));gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.remove();}};
}
