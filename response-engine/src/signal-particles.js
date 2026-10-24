import { ribbonShapeGLSL } from './signal-ribbon-shape.js';
// GPU morph targets share the liquid renderer's context. No extra rendering stage.
export function createSignalParticles(gl) {
  const resources=[],buffers=[];
  const vertex=`#version 300 es
  precision highp float;
  in vec2 aGlyph;in vec2 aFracture;in vec2 aScore;in vec3 aSeed;in vec2 aResponse;in vec2 aGrid;
  uniform float uProgress,uTime,uMotion,uDpr,uLine,uSelected,uInspection,uVelocity;uniform vec2 uResolution,uPointer,uSignal;uniform vec2 uBranches[256];
  out float vAlpha;out float vSignal;
  float phase(float a,float b){return smoothstep(a,b,uProgress);}
  mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
  ${ribbonShapeGLSL}
  void main(){
    float p=uProgress,u=aSeed.x,v=aSeed.y,theta=u*6.2831853;
    float mobile=step(uResolution.x/uResolution.y,1.);
    float aspect=uResolution.x/uResolution.y;
    // Liquid positions are deformed glyph strokes. There is no ring or torus target.
    float fluid=phase(1.02,1.7),liquidPhase=p*.65+sin(uTime*.6283185)*.18*uMotion;
    vec2 liquid=aFracture;
    liquid.x+=sin(aFracture.y*13.+liquidPhase)*.14*fluid;
    liquid.y+=sin(aFracture.x*9.+liquidPhase)*.1*fluid;
    liquid.x=uSignal.x+(liquid.x-uSignal.x)*(1.+fluid*.65);
    float zoom=1.+.55*phase(.95,1.4)*(1.-phase(1.5,2.05));
    liquid=uSignal+(liquid-uSignal)*zoom;
    vec2 pos=mix(aGlyph,aFracture,phase(.55,.95));
    pos=mix(pos,liquid,phase(1.,1.45));
    // Evidence lives on the same broad material ribbons, rather than a flat grid.
    float band=min(2.,floor(v*3.)),localV=fract(v*3.);
    float materialPhase=p*.22+sin(uTime*.23)*.12*uMotion;
    vec3 network=signalRibbon(vec2(u,localV),band,materialPhase);
    float dolly=phase(1.35,2.45);
    network=ribbonCamera(network,p,uPointer,uMotion);
    vec2 projected=ribbonProjection(network,p,aspect);
    vec2 fromSignal=projected-uSignal;float local=exp(-dot(fromSignal,fromSignal)*18.)*uInspection;
    projected+=fromSignal*local*.28;
    projected.x+=sin(v*9.+u)*uVelocity*.008*uMotion;
    pos=mix(pos,projected,phase(1.55,2.1));
    pos=mix(pos,aScore,phase(2.1,2.8));
    int branch=int(mod(aSeed.z,4.));if(abs(aSeed.z-19.)<.5&&uSelected>=0.)branch=int(uSelected);
    float travel=fract(u-uTime*.07*uMotion),f=travel*63.;int j=int(f);
    vec2 response=mix(uBranches[branch*64+j],uBranches[branch*64+min(j+1,63)],fract(f));
    pos=mix(pos,response,phase(3.3,3.95));
    float expand=phase(4.58,5.);float ratio=mix(.42,.73,mobile)+(1.-mix(.42,.73,mobile))*expand;
    vec2 grid=mix(vec2(.49,.25),vec2(.14,.55),mobile)*(1.-expand)+aGrid*ratio;
    grid.y+=37./uResolution.y*(1.-expand);
    pos=mix(pos,grid,phase(4.12,4.85));
    float signal=1.-step(.5,abs(aSeed.z-19.));
    float pulse=.55+.45*sin(u*32.-uTime*1.6*uMotion+aSeed.z*.13);
    float evidence=phase(1.4,1.95)*(1.-phase(2.2,2.85));
    vec2 flow=vec2(sin(theta*2.+uTime*.3),cos(theta+uTime*.3))*.0015*uMotion*evidence;
    pos+=flow;
    // Scroll-derived gathering makes the number visibly particulate before it sets.
    float assembled=phase(3.04,3.24)*(1.-phase(3.3,3.7));
    float scoreLight=phase(2.45,2.8)*(1.-phase(3.28,3.7));
    vAlpha=phase(.15,.48)*(1.-phase(4.82,5.))*(.38+.3*pulse+signal*.32);
    vAlpha=min(1.,vAlpha+scoreLight*.35)*mix(1.,.08,assembled);
    if(uLine>.5)vAlpha*=evidence*.05;
    vSignal=signal;
    vAlpha*=mix(1.,mix(.25,1.,signal),uInspection);
    vAlpha+=signal*uInspection*.35*evidence;
    float hero=1.-phase(.04,.3);
    vec2 small=uSignal+vec2(cos(theta+uTime*.6283185),sin(theta+uTime*.6283185))*(.006+v*.028);
    pos=mix(pos,small,hero);
    vAlpha+=hero*.12*signal;
    gl_Position=vec4(pos.x*2.-1.,1.-pos.y*2.,0.,1.);
    gl_PointSize=(mix(1.3,2.4,signal)+evidence*1.0+scoreLight*2.+signal*uInspection*1.8)*uDpr;
  }`;
  const fragment=`#version 300 es
  precision highp float;in float vAlpha;in float vSignal;uniform float uLine;out vec4 color;
  void main(){float a=vAlpha;if(uLine<.5){float r=length(gl_PointCoord-.5);a*=1.-smoothstep(.2,.5,r);}if(a<.005)discard;color=vec4(mix(vec3(.725,.776,.773),vec3(.785,.29,.212),vSignal),a);}`;
  let program,vao,indexBuffer,count=0,indexCount=0;
  try{
    program=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
      const shader=gl.createShader(type);resources.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Particle shader');gl.attachShader(program,shader);
    }
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Particle program');
    vao=gl.createVertexArray();gl.bindVertexArray(vao);
    for(const [name,size] of [['aGlyph',2],['aFracture',2],['aScore',2],['aSeed',3],['aResponse',2],['aGrid',2]]){
      const buffer=gl.createBuffer();buffers.push({buffer,name,size});gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      const location=gl.getAttribLocation(program,name);if(location>=0){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,0,0);}
    }
    indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
  }catch{resources.forEach(s=>gl.deleteShader(s));buffers.forEach(b=>gl.deleteBuffer(b.buffer));if(indexBuffer)gl.deleteBuffer(indexBuffer);if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);return null;}
  const uniforms=Object.fromEntries(['uProgress','uTime','uMotion','uDpr','uLine','uSelected','uInspection','uVelocity','uResolution','uPointer','uSignal'].map(n=>[n,gl.getUniformLocation(program,n)]));
  const branchUniform=gl.getUniformLocation(program,'uBranches[0]');
  return {
    update({identities,title,fracture,score,scoreBounds,width,height,responsePaths,panels=[]}){
      count=identities.length;const values={aGlyph:[],aFracture:[],aScore:[],aSeed:[],aResponse:[],aGrid:[]};
      identities.forEach(({u,v,group},i)=>{
        values.aGlyph.push(...(title[(i*29)%title.length]||[.5,.5]));
        values.aFracture.push(...(fracture[(i*31)%fracture.length]||[.5,.5]));
        const glyph=score[(i*7)%score.length]||[.5,.5];
        values.aScore.push((scoreBounds.left+glyph[0]*scoreBounds.width)/width,(scoreBounds.top+glyph[1]*scoreBounds.height)/height);
        values.aSeed.push(u,v,group);
        const path=responsePaths[group%4];const point=path?.[Math.min(path.length-1,Math.floor(u*(path.length-1)))]||[width*.5,height*.5];
        values.aResponse.push(point[0]/width,point[1]/height);
        const panel=panels[i%Math.max(1,panels.length)]||{x:.07,y:.12,w:.86,h:.78};
        const edge=(u*4)%4,t=edge%1;
        values.aGrid.push(panel.x+(edge<1?t:edge<2?1:edge<3?1-t:0)*panel.w,panel.y+(edge<1?0:edge<2?t:edge<3?1:1-t)*panel.h);
      });
      gl.bindVertexArray(vao);
      const branches=new Float32Array(512);for(let b=0;b<4;b++)for(let j=0;j<64;j++){const q=responsePaths[b]?.[j]||[width*.5,height*.5];branches[(b*64+j)*2]=q[0]/width;branches[(b*64+j)*2+1]=q[1]/height;}
      gl.useProgram(program);gl.uniform2fv(branchUniform,branches);
      buffers.forEach(({buffer,name})=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values[name]),gl.DYNAMIC_DRAW);});
      const edges=[],columns=count>1500?64:32;
      for(let i=0;i<count;i++){if(i%columns<columns-1&&i+1<count)edges.push(i,i+1);if(i+columns<count&&i%3===0)edges.push(i,i+columns);}
      indexCount=edges.length;gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(edges),gl.STATIC_DRAW);
    },
    draw({progress,time,pointerX,pointerY,signalX,signalY,motion,width,height,dpr,selectedBranch=-1,inspection=0,velocity=0}){
      if(!count||progress>=5)return;
      gl.useProgram(program);gl.bindVertexArray(vao);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(uniforms.uProgress,progress);gl.uniform1f(uniforms.uTime,time);gl.uniform1f(uniforms.uMotion,motion?1:0);gl.uniform1f(uniforms.uDpr,dpr);
      gl.uniform1f(uniforms.uSelected,selectedBranch);
      gl.uniform1f(uniforms.uInspection,inspection);gl.uniform1f(uniforms.uVelocity,velocity);
      gl.uniform2f(uniforms.uResolution,width,height);gl.uniform2f(uniforms.uPointer,pointerX,pointerY);gl.uniform2f(uniforms.uSignal,signalX,signalY);
      gl.uniform1f(uniforms.uLine,1);gl.drawElements(gl.LINES,indexCount,gl.UNSIGNED_SHORT,0);
      gl.uniform1f(uniforms.uLine,0);gl.drawArrays(gl.POINTS,0,count);gl.disable(gl.BLEND);
    },
    dispose(){resources.forEach(s=>gl.deleteShader(s));buffers.forEach(b=>gl.deleteBuffer(b.buffer));gl.deleteBuffer(indexBuffer);gl.deleteVertexArray(vao);gl.deleteProgram(program);}
  };
}
