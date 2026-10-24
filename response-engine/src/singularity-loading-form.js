// An independent, asset-free optical sculpture. It can render while the main
// Three.js scene and its environment are still downloading and compiling.
const letters='IAIRS';
const clamp=n=>Math.max(0,Math.min(1,n));

function glyphAtlas(){
  const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=256;
  const c=atlas.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,1024,256);
  c.fillStyle='#fff';c.font='228px "Cormorant Garamond", Georgia, serif';c.textAlign='center';c.textBaseline='alphabetic';
  [...letters].forEach((letter,i)=>c.fillText(letter,(i+.5)*1024/5,208,196));
  return atlas;
}

const surface=`
  uniform float uTime,uMorph,uExit,uPhone;
  uniform vec2 uPointer;
  const float PI=3.14159265359;
  mat2 rotate(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
  vec3 surface(vec3 cell){
    float u=cell.x,v=cell.y,b=cell.z,k=b-2.;
    vec3 letter=vec3(k*1.18+(v-.5)*1.26,(u-.5)*2.9,k*.035);
    float a=u*PI*1.62+k*.40+sin(uTime*.20)*.12;
    vec3 spine=vec3(sin(a)*1.20+k*.22,(u-.5)*3.85+sin(a*1.15+k*.55)*.42,cos(a*1.32+k*.68)*1.04);
    float fold=u*6.7+k*.73+uTime*.12;
    float cap=sqrt(max(.001,1.-pow((u-.5)*2.,12.)));
    float width=(.50+sin(u*PI)*.40)*cap;
    vec3 crossSection=vec3(cos(fold),sin(fold)*.22,sin(fold));
    vec3 foil=spine+(v-.5)*width*crossSection;
    foil.z+=pow(abs(v-.5)*2.,3.)*.075;
    vec3 p=mix(letter,foil,uMorph);
    p.xz=rotate(-.20+sin(uTime*.17)*.13+uPointer.x*.30)*p.xz;
    p.yz=rotate(-.13+uPointer.y*.16)*p.yz;
    p.xy=rotate(-.14*uMorph)*p.xy;
    float foldExit=smoothstep(0.,.48,uExit);
    vec3 blade=vec3((u-.5)*10.,(u-.5)*-5.8+(v-.5)*.035,k*.015);
    p=mix(p,blade,foldExit);
    p.xy*=1.+smoothstep(.2,.9,uExit)*1.8;
    p*=mix(.94,mix(.335,.425,uMorph)*clamp(uAspect/.462,.80,1.5),uPhone);
    return p;
  }
  vec4 project(vec3 p,float aspect){
    float z=7.25-p.z,f=2.52;
    return vec4(p.x*f/aspect,p.y*f+.08*z,(z-.1)/20.*z,z);
  }
`;

export function createLoadingForm(originalCanvas){
  let canvas=originalCanvas,gl;
  try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'default'});}catch{}
  if(!gl)return createCanvasForm(canvas);
  const resources={programs:[],buffers:[],textures:[]};
  function shader(kind,source){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(error);}return s;}
  function program(vertex,fragment){
    const v=shader(gl.VERTEX_SHADER,vertex),f=shader(gl.FRAGMENT_SHADER,fragment),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const error=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw new Error(error);}resources.programs.push(p);return p;
  }
  try{
    const foil=program(`precision highp float;attribute vec3 aCell;uniform float uAspect;varying vec3 vPosition,vNormal,vCell;${surface}
      void main(){vec3 p=surface(aCell),du=surface(aCell+vec3(.001,0.,0.))-surface(aCell-vec3(.001,0.,0.)),dv=surface(aCell+vec3(0.,.001,0.))-surface(aCell-vec3(0.,.001,0.));vNormal=normalize(cross(dv,du));vPosition=p;vCell=aCell;gl_Position=project(p,uAspect);}`,
      `precision highp float;uniform sampler2D uGlyphs;uniform float uMorph,uTime,uExit;varying vec3 vPosition,vNormal,vCell;
      vec3 studio(vec3 d){
        float angle=atan(d.x,d.z),elevation=asin(clamp(d.y,-1.,1.));
        float large=(1.-smoothstep(.20,.27,abs(angle+.78)))*(1.-smoothstep(.53,.76,abs(elevation-.24)));
        float strip=(1.-smoothstep(.023,.07,abs(angle-.73)))*(1.-smoothstep(.72,1.05,abs(elevation)));
        float ceiling=(1.-smoothstep(.065,.14,abs(elevation-.80)))*(1.-smoothstep(1.,1.6,abs(angle)));
        float warm=(1.-smoothstep(.17,.46,abs(angle-2.2)))*(1.-smoothstep(.4,.8,abs(elevation+.2)));
        float front=(1.-smoothstep(.30,.65,abs(angle+.12)))*(1.-smoothstep(.40,.80,abs(elevation-.12)));
        return vec3(.012,.018,.019)+front*vec3(.48,.51,.47)+large*vec3(1.05,.98,.83)+strip*vec3(1.8,1.91,1.9)+ceiling*vec3(.76,.82,.82)+warm*vec3(.48,.21,.09);
      }
      void main(){
        float mask=texture2D(uGlyphs,vec2((vCell.z+vCell.y)/5.,1.-vCell.x)).r;
        float materialize=smoothstep(.25,.80,uMorph);if(mix(mask,1.,materialize)<.45)discard;
        vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
        vec3 view=normalize(vec3(0.,0.,7.25)-vPosition),r=reflect(-view,n);
        float fresnel=.65+.35*pow(1.-max(0.,dot(view,n)),5.);
        vec3 color=studio(r)*fresnel;
        float edge=pow(abs(vCell.y-.5)*2.,18.);
        color+=vec3(.18,.19,.17)*edge;
        if(!gl_FrontFacing){color=mix(vec3(.11,.006,.003),studio(r)*vec3(.82,.022,.012),.78);color+=edge*vec3(.36,.018,.009);}
        color*=.76+.24*sin(vCell.x*3.14159);
        color=color/(1.+color*.38);color=pow(max(color,vec3(0.)),vec3(.4545));
        float opacity=1.-smoothstep(.65,.96,uExit);gl_FragColor=vec4(color,opacity);
      }`);
    const signals=program(`precision highp float;attribute vec3 aCell;uniform float uAspect,uDpr;varying float vAlpha,vRed;${surface}
      float hash(float n){return fract(sin(n*127.1)*43758.5453);}
      void main(){float seed=dot(aCell,vec3(15.3,94.1,7.1));vec3 p=surface(aCell);float scatter=sin(uMorph*3.14159)*.75;vec3 direction=vec3(hash(seed)-.5,hash(seed+5.)-.5,hash(seed+11.)-.5);p+=direction*scatter*2.4;p+=direction*(.04+.025*sin(uTime*.7+seed));gl_Position=project(p,uAspect);gl_PointSize=(1.+hash(seed+8.)*1.4)*uDpr;vAlpha=(.25+.6*hash(seed+9.))*(1.-smoothstep(.06,.60,uExit));vRed=step(.91,hash(seed));}`,
      `precision mediump float;varying float vAlpha,vRed;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;vec3 color=mix(vec3(.77,.78,.70),vec3(.80,.18,.10),vRed);gl_FragColor=vec4(color,vAlpha*(1.-smoothstep(.1,.5,d)));}`);
    const rows=200,columns=12,cells=[],indices=[];
    for(let b=0;b<5;b++)for(let i=0;i<=rows;i++)for(let j=0;j<=columns;j++){
      const index=cells.length/3;cells.push(i/rows,j/columns,b);
      if(i<rows&&j<columns){const next=index+columns+1;indices.push(index,index+1,next,index+1,next+1,next);}
    }
    function buffer(target,data){const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);resources.buffers.push(b);return b;}
    const vertices=buffer(gl.ARRAY_BUFFER,new Float32Array(cells)),elements=buffer(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices));
    const texture=gl.createTexture();resources.textures.push(texture);let points=null,pointCount=0;
    const uniformCache=new Map();
    function uniform(p,name){let cache=uniformCache.get(p);if(!cache){cache={};uniformCache.set(p,cache);}if(!(name in cache))cache[name]=gl.getUniformLocation(p,name);return cache[name];}
    function refresh(){
      const atlas=glyphAtlas();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      const data=atlas.getContext('2d').getImageData(0,0,1024,256).data,samples=[];
      for(let y=8;y<248;y+=7)for(let x=0;x<1024;x+=5)if(data[(y*1024+x)*4]>150){const cell=x/1024*5;samples.push(1-y/256,cell%1,Math.floor(cell));}
      if(points){gl.bindBuffer(gl.ARRAY_BUFFER,points);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(samples),gl.STATIC_DRAW);}else points=buffer(gl.ARRAY_BUFFER,new Float32Array(samples));pointCount=samples.length/3;
    }
    let width=1,height=1,dpr=1,disposed=false;
    function resize(w,h){width=w;height=h;dpr=Math.min(devicePixelRatio||1,w<=760?1.15:1.35);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);gl.viewport(0,0,canvas.width,canvas.height);}
    function bind(p,positions,state){
      gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,positions);const attribute=gl.getAttribLocation(p,'aCell');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,0,0);
      for(const [key,value] of Object.entries({uTime:state.time,uMorph:state.morph,uExit:state.exit,uAspect:width/height,uPhone:width<=760?1:0,uDpr:dpr}))gl.uniform1f(uniform(p,key),value);
      gl.uniform2f(uniform(p,'uPointer'),state.x,state.y);
    }
    refresh();canvas.dataset.renderer='optical-type';
    return {resize,refresh(){if(!disposed)refresh();},draw(state){
      if(disposed||gl.isContextLost())return;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(true);bind(foil,vertices,state);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(uniform(foil,'uGlyphs'),0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
      gl.depthMask(false);bind(signals,points,state);gl.drawArrays(gl.POINTS,0,pointCount);gl.depthMask(true);
    },dispose(){if(disposed)return;disposed=true;resources.buffers.forEach(b=>gl.deleteBuffer(b));resources.textures.forEach(t=>gl.deleteTexture(t));resources.programs.forEach(p=>gl.deleteProgram(p));gl.getExtension('WEBGL_lose_context')?.loseContext();}};
  }catch{
    resources.buffers.forEach(b=>gl.deleteBuffer(b));resources.textures.forEach(t=>gl.deleteTexture(t));resources.programs.forEach(p=>gl.deleteProgram(p));gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas=originalCanvas.cloneNode();originalCanvas.replaceWith(canvas);return createCanvasForm(canvas);
  }
}

function createCanvasForm(canvas){
  const c=canvas.getContext('2d');let w=1,h=1,dpr=1;
  canvas.dataset.renderer='kinetic-type';
  return {resize(width,height){w=width;h=height;dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=w*dpr;canvas.height=h*dpr;c?.setTransform(dpr,0,0,dpr,0,0);},refresh(){},draw({time,morph,exit,x}){
    if(!c)return;c.clearRect(0,0,w,h);c.save();c.translate(w*.5,h*.46);c.rotate(-.10*morph);const size=Math.min(w*.24,h*.42),gap=size*.6;
    c.font=`${size}px "Cormorant Garamond", Georgia, serif`;c.textAlign='center';c.textBaseline='middle';
    const gradient=c.createLinearGradient(-w*.3,-h*.2,w*.3,h*.2);gradient.addColorStop(0,'#363d3d');gradient.addColorStop(.28,'#f5eed9');gradient.addColorStop(.45,'#656c6a');gradient.addColorStop(.70,'#e8ddbd');gradient.addColorStop(1,'#9f3b29');c.fillStyle=gradient;
    for(let i=0;i<5;i++){c.save();const turn=Math.sin(time*.5+i*.8)*morph;c.translate((i-2)*gap*(1-.24*morph),turn*size*.36);c.transform(1,turn*.24,Math.sin(time*.3+i)*morph*.24,1,0,0);c.globalAlpha=1-clamp(exit*1.7);c.fillText(letters[i],x*15,0);c.restore();}
    c.restore();
  },dispose(){c?.clearRect(0,0,w,h);}};
}
