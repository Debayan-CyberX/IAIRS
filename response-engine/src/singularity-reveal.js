import * as THREE from 'three';

// The final chapter remains a scene around a physical monitor, with the same
// studio lighting and Earth surface used by the rest of the experience.
export function createRevealEnvironment(scene,earth){
  const group=new THREE.Group(),viewHeight={value:900};scene.add(group);
  const planetMaterial=earth.material.clone();planetMaterial.color.set(0x9b9788);planetMaterial.metalness=.02;planetMaterial.roughness=.95;planetMaterial.depthWrite=false;
  planetMaterial.envMapIntensity=.10;
  planetMaterial.onBeforeCompile=shader=>{earth.material.onBeforeCompile(shader);shader.uniforms.uRevealHeight=viewHeight;shader.fragmentShader='uniform float uRevealHeight;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\n gl_FragColor.a*=smoothstep(.20,.48,gl_FragCoord.y/uRevealHeight);');};
  const planet=new THREE.Mesh(new THREE.SphereGeometry(5.8,112,80),planetMaterial);planet.position.set(.8,-2.15,-7);planet.rotation.set(.12,-.3,-.18);group.add(planet);
  const air=new THREE.Mesh(new THREE.SphereGeometry(5.86,96,64),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,uniforms:{uAlpha:{value:0},uRevealHeight:viewHeight},
    vertexShader:`varying vec3 vNormal,vView;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform float uAlpha,uRevealHeight;varying vec3 vNormal,vView;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),4.);gl_FragColor=vec4(vec3(.78,.74,.58),rim*uAlpha*.42*smoothstep(.20,.48,gl_FragCoord.y/uRevealHeight));}`
  }));air.position.copy(planet.position);group.add(air);
  const uniforms={uRevealTime:{value:0}},strips=[];
  for(let band=0;band<3;band++){
    const positions=[],uvs=[],indices=[],rows=200,cross=8;
    for(let i=0;i<=rows;i++)for(let j=0;j<=cross;j++){positions.push(0,0,0);uvs.push(i/rows,j/cross);if(i<rows&&j<cross){const a=i*(cross+1)+j,b=a+cross+1;indices.push(a,b,a+1,a+1,b,b+1);}}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=new THREE.MeshPhysicalMaterial({color:band===1?0xb8afa0:0x929a97,metalness:.97,roughness:.20,clearcoat:.3,clearcoatRoughness:.2,envMapIntensity:1.05,side:THREE.DoubleSide,transparent:true});material.forceSinglePass=true;
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      const code=`uniform float uRevealTime;
        vec3 revealSurface(vec2 uv){
          float u=uv.x,b=${band.toFixed(1)};
          float angle=u*4.15+b*.38;
          vec3 p=vec3(-8.+u*16.,1.8+sin(angle)*1.25+b*.22,-2.+cos(angle+b*.65)*1.4);
          p.y+=sin(u*5.+uRevealTime*.20+b)*.06;
          vec3 side=normalize(vec3(.16,sin(angle+b*.8)*.65,cos(angle+b*.8)));
          float width=(.55+b*.19)*(.35+.65*sin(u*3.14159));
          p+=side*(uv.y-.5)*width;p+=normalize(cross(side,vec3(1.,0.,0.)))*sin(uv.y*3.14159)*width*.13;
          return p;
        }`;
      shader.vertexShader=code+'\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
        vec3 along=revealSurface(vec2(uv.x+.001,uv.y))-revealSurface(vec2(uv.x-.001,uv.y));
        vec3 across=revealSurface(vec2(uv.x,uv.y+.001))-revealSurface(vec2(uv.x,uv.y-.001));objectNormal=normalize(cross(along,across));`);
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=revealSurface(uv);');
    };
    const strip=new THREE.Mesh(geometry,material);strip.frustumCulled=false;group.add(strip);strips.push(strip);
  }
  return {update(p,time,phone,pixelHeight=900){
    const alpha=THREE.MathUtils.smoothstep(p,3.22,3.9);group.visible=alpha>.001;uniforms.uRevealTime.value=time;
    if(planetMaterial.map!==earth.material.map){planetMaterial.map=earth.material.map;planetMaterial.needsUpdate=true;}
    planetMaterial.opacity=alpha*.82;air.material.uniforms.uAlpha.value=alpha;
    viewHeight.value=pixelHeight;planet.rotation.y=-.3+time*.014;planet.position.x=phone?.25:.8;planet.position.y=phone?-2.5:-2.15;air.position.copy(planet.position);
    strips.forEach((strip,i)=>{strip.material.opacity=alpha*(i===1?.92:.75);strip.position.y=phone?.45:.12;strip.rotation.z=Math.sin(time*.07+i)*.012;});
  }};
}
