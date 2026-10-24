// Shared geometry: solid material and event fragments occupy the same surface.
export const ribbonShapeGLSL=`
mat2 ribbonRotation(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 signalRibbon(vec2 uv,float band,float phase){
  float u=uv.x,v=uv.y,b=band-1.;
  float x=(u-.5)*7.6;
  float y=b*.58+sin(u*5.4+b*.95+phase)*.73+sin(u*10.5+b*.4)*.13;
  float z=cos(u*6.1+b*1.1+phase)*.72+b*.17;
  float twist=sin(u*4.8+b*.7+phase)*1.05+b*.55;
  float taper=pow(max(.001,sin(u*3.14159265)),.32);
  float width=(.32+.28*sin(u*3.14159265))*taper;
  if(band>2.5)width*=.18;
  float side=(v-.5)*2.*width;
  float crown=sin(v*3.14159265)*.14*taper;
  return vec3(x,y+cos(twist)*side-sin(twist)*crown,z+sin(twist)*side+cos(twist)*crown);
}
vec3 ribbonCamera(vec3 p,float progress,vec2 pointer,float motion){
  p.xz=ribbonRotation(-.12+smoothstep(1.4,2.4,progress)*.3+pointer.x*.16*motion)*p.xz;
  p.yz=ribbonRotation(.05+pointer.y*.1*motion)*p.yz;
  return p;
}
vec2 ribbonProjection(vec3 p,float progress,float aspect){
  float distance=mix(3.65,4.2,smoothstep(1.45,2.35,progress));
  return vec2(.5,.48)+p.xy/vec2(aspect,-1.)*.9/(distance-p.z);
}`;

export function projectRibbon(u,v,p,time,pointer,width,height){
  const band=Math.min(2,Math.floor(v*3)),vv=(v*3)%1,b=band-1,phase=p*.22+Math.sin(time*.23)*.12;
  let x=(u-.5)*7.6,y=b*.58+Math.sin(u*5.4+b*.95+phase)*.73+Math.sin(u*10.5+b*.4)*.13,z=Math.cos(u*6.1+b*1.1+phase)*.72+b*.17;
  const twist=Math.sin(u*4.8+b*.7+phase)*1.05+b*.55,taper=Math.pow(Math.max(.001,Math.sin(u*Math.PI)),.32),side=(vv-.5)*2*(.32+.28*Math.sin(u*Math.PI))*taper;
  const crown=Math.sin(vv*Math.PI)*.14*taper;y+=Math.cos(twist)*side-Math.sin(twist)*crown;z+=Math.sin(twist)*side+Math.cos(twist)*crown;
  const smooth=(a,b)=>{const t=Math.max(0,Math.min(1,(p-a)/(b-a)));return t*t*(3-2*t);};
  const ay=-.12+smooth(1.4,2.4)*.3+pointer.x*.16,rx=x*Math.cos(ay)+z*Math.sin(ay),rz=-x*Math.sin(ay)+z*Math.cos(ay);x=rx;z=rz;
  const ax=.05+pointer.y*.1,ry=y*Math.cos(ax)+z*Math.sin(ax),zz=-y*Math.sin(ax)+z*Math.cos(ax);y=ry;z=zz;
  const distance=3.65+(4.2-3.65)*smooth(1.45,2.35);
  return [width*.5+x*.9*height/(distance-z),height*.48-y*.9*height/(distance-z)];
}
