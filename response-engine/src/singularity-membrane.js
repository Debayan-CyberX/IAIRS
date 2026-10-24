import * as THREE from 'three';

// The observation surface folds out of the channel volume, then closes around
// the selected anomaly. Its grid is attached to the surface, not a screen overlay.
export function createObservationSurface(root,uniforms){
  const geometry=new THREE.PlaneGeometry(1,1,120,64);
  const material=new THREE.MeshPhysicalMaterial({color:0x677472,metalness:.86,roughness:.25,clearcoat:.15,envMapIntensity:1.05,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  material.forceSinglePass=true;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    const header=`uniform float uProgress,uTime,uRisk;varying vec2 vObservationUV;
      vec3 observation(vec2 uv){
        float u=uv.x,v=uv.y;
        vec3 sheet=vec3((u-.5)*9.,(v-.5)*3.3+sin(u*6.283+v*2.)*.65,-2.3+sin(u*6.+v*1.6)*1.25+cos(v*3.14159)*.6);
        float a=u*6.283185,b=v*3.14159265,r=1.28+sin(a*3.+b*2.)*.035;
        vec3 shell=vec3(-.45+sin(b)*cos(a)*r,cos(b)*r*.92,sin(b)*sin(a)*r*.82);
        return mix(sheet,shell,smoothstep(2.25,3.,uProgress));
      }`;
    shader.vertexShader=header+'\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
      vec3 du=observation(uv+vec2(.001,0.))-observation(uv-vec2(.001,0.));vec3 dv=observation(uv+vec2(0.,.001))-observation(uv-vec2(0.,.001));objectNormal=normalize(cross(du,dv));`);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=observation(uv);vObservationUV=uv;');
    shader.fragmentShader='uniform float uProgress,uTime,uRisk;varying vec2 vObservationUV;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec2 grid=abs(fract(vObservationUV*vec2(72.,28.))-.5);
      float lines=1.-smoothstep(.018,.035,min(grid.x,grid.y));
      float fresnel=pow(1.-abs(dot(normal,normalize(vViewPosition))),3.);
      float rim=pow(abs(vObservationUV.y-.5)*2.,15.);
      diffuseColor.a*=.10+fresnel*.7+lines*.1+rim*.3;
      float containment=smoothstep(2.25,3.,uProgress);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.20,.035,.02),containment*uRisk*.65);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      vec2 cell=abs(fract(vObservationUV*vec2(72.,28.))-.5);
      float gridLine=1.-smoothstep(.018,.035,min(cell.x,cell.y));
      float scan=pow(max(0.,1.-abs(fract(vObservationUV.x-uTime*.022)-.5)*12.),7.);
      totalEmissiveRadiance+=vec3(.07,.10,.10)*gridLine*(.15+scan*.6);
      totalEmissiveRadiance+=vec3(.16,.004,.001)*smoothstep(2.25,3.,uProgress)*uRisk*scan;`);
  };
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;root.add(mesh);
  return {update(p){material.opacity=THREE.MathUtils.smoothstep(p,1.25,1.65)*(1-THREE.MathUtils.smoothstep(p,1.65,2.0))*.5;mesh.visible=material.opacity>.001;}};
}
