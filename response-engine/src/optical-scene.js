import * as THREE from 'three';
const TAU=Math.PI*2;
function annulus(inner,outer,depth,material){
 const bevel=.045,p=[[inner,-depth/2+bevel],[inner+bevel,-depth/2],[outer-bevel,-depth/2],[outer,-depth/2+bevel],[outer,depth/2-bevel],[outer-bevel,depth/2],[inner+bevel,depth/2],[inner,depth/2-bevel],[inner,-depth/2+bevel]].map(([r,z])=>new THREE.Vector2(r,z));
 const geometry=new THREE.LatheGeometry(p,192);geometry.rotateX(Math.PI/2);return new THREE.Mesh(geometry,material);
}
export function createLens(glow){
 const root=new THREE.Group(),face=new THREE.Group();root.add(face);
 const titanium=new THREE.MeshPhysicalMaterial({color:0x788079,metalness:1,roughness:.19,clearcoat:.5,envMapIntensity:1.1});
 const bright=new THREE.MeshStandardMaterial({color:0xe3ddca,metalness:1,roughness:.11,envMapIntensity:1.25});
 const black=new THREE.MeshPhysicalMaterial({color:0x282d2b,metalness:.95,roughness:.27,clearcoat:.8,envMapIntensity:1});
 const brass=new THREE.MeshStandardMaterial({color:0x99876c,metalness:1,roughness:.25,envMapIntensity:1});
 const rim=(r,tube,material)=>new THREE.Mesh(new THREE.TorusGeometry(r,tube,10,192),material);
 const shell=annulus(1.69,2.13,.42,titanium);face.add(shell);
 const back=annulus(1.65,2.06,.48,black);back.position.z=-.18;face.add(back);
 for(const [radius,z,tube,material]of [[2.1,.19,.012,bright],[1.73,.22,.014,bright],[2.08,-.35,.018,brass],[1.66,.05,.022,black],[1.79,.225,.006,brass],[2.025,.225,.004,black]]){const part=rim(radius,tube,material);part.position.z=z;face.add(part);}
 const ticks=new THREE.InstancedMesh(new THREE.BoxGeometry(.006,.04,.006),black,180),dummy=new THREE.Object3D();
 for(let i=0;i<180;i++){const a=i/180*TAU;dummy.position.set(Math.cos(a)*1.955,Math.sin(a)*1.955,.222);dummy.rotation.z=a-Math.PI/2;dummy.scale.set(1,i%15===0?2.3:i%5===0?1.5:.65,1);dummy.updateMatrix();ticks.setMatrixAt(i,dummy.matrix);}face.add(ticks);
 const bolts=new THREE.InstancedMesh(new THREE.CylinderGeometry(.018,.018,.012,12),black,12);
 for(let i=0;i<12;i++){const a=(i+.5)/12*TAU;dummy.position.set(Math.cos(a)*2.065,Math.sin(a)*2.065,.211);dummy.rotation.set(Math.PI/2,0,a);dummy.scale.set(1,1,1);dummy.updateMatrix();bolts.setMatrixAt(i,dummy.matrix);}face.add(bolts);
 const glassMaterial=new THREE.MeshPhysicalMaterial({color:0x78928b,metalness:.45,roughness:.09,clearcoat:1,clearcoatRoughness:.04,transparent:true,opacity:.08,depthWrite:false,side:THREE.FrontSide,envMapIntensity:1.1});
 const glass=new THREE.Mesh(new THREE.SphereGeometry(1.67,80,48),glassMaterial);glass.scale.z=.095;glass.position.z=.21;glass.renderOrder=4;face.add(glass);
 const darkFace=new THREE.Mesh(new THREE.CircleGeometry(1.68,128),new THREE.MeshStandardMaterial({color:0x030706,metalness:.2,roughness:.38,envMapIntensity:.3}));darkFace.position.z=-.19;face.add(darkFace);
 const tracks=[];
 for(let i=0;i<4;i++){const radius=1.755+i*.065,material=new THREE.MeshBasicMaterial({color:0xc09b69,transparent:true,opacity:0,depthWrite:false,toneMapped:false});const trace=rim(radius,.009,material);trace.position.z=.235;trace.rotation.z=-Math.PI/2;face.add(trace);tracks.push(trace);}
 const stand=annulus(.06,.38,.6,black);stand.rotation.x=Math.PI/2;stand.position.set(0,-2.19,-.12);root.add(stand);
 const foot=new THREE.Mesh(new THREE.CylinderGeometry(.77,.82,.12,96),black);foot.position.set(0,-2.52,-.12);root.add(foot);
 const edge=new THREE.Mesh(new THREE.TorusGeometry(.78,.009,8,96),brass);edge.rotation.x=Math.PI/2;edge.position.set(0,-2.46,-.12);root.add(edge);
 const network=new THREE.Group();network.position.z=-.08;face.add(network);
 const lines=[],curves=[],nodes=[],movingPositions=new Float32Array(64*3),temp=new THREE.Vector3();
 const center=new THREE.Vector3(.18,-.12,.1);
 const locations=Array.from({length:36},(_,i)=>{const a=i*2.39996,r=.30+Math.sqrt((Math.sin(i*31.7+4)*437.2)%1*.5+.5)*1.18;return new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,Math.sin(i*3.7)*.22);});
 const source=new THREE.Vector3(-1.28,.82,.04);
 for(let i=0;i<36;i++){
  const point=locations[i],destination=i%4===0?center:locations[(i+7)%locations.length];
  const middle=point.clone().lerp(destination,.5);middle.z=.12+Math.sin(i)*.24;
  const curve=new THREE.QuadraticBezierCurve3(point,middle,destination),material=new THREE.LineBasicMaterial({color:i%4?0x9cae9e:0xe2bd83,transparent:true,opacity:.35});
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),material);network.add(line);lines.push(line);curves.push(curve);
  const node=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:i%4?0xd6e6d7:0xf4c590,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));node.position.copy(point);node.scale.setScalar(.075);network.add(node);nodes.push(node);
 }
 const movementGeometry=new THREE.BufferGeometry();movementGeometry.setAttribute('position',new THREE.BufferAttribute(movingPositions,3));
 const normalFlow=new THREE.Points(movementGeometry,new THREE.PointsMaterial({map:glow,color:0xf2dfb3,size:.065,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));normalFlow.frustumCulled=false;network.add(normalFlow);
 const suspectCurve=new THREE.CubicBezierCurve3(source,new THREE.Vector3(-1.04,.3,.35),new THREE.Vector3(-.35,-.2,.35),center);
 const suspectLine=new THREE.Mesh(new THREE.TubeGeometry(suspectCurve,80,.003,6,false),new THREE.MeshBasicMaterial({color:0xe28665,transparent:true,opacity:0,toneMapped:false}));network.add(suspectLine);
 const eventPositions=new Float32Array(80*3),eventsGeometry=new THREE.BufferGeometry();eventsGeometry.setAttribute('position',new THREE.BufferAttribute(eventPositions,3));
 const events=new THREE.Points(eventsGeometry,new THREE.PointsMaterial({map:glow,color:0xff856c,size:.095,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));events.frustumCulled=false;network.add(events);
 const host=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,color:0xffd7a1,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));host.position.copy(center);host.scale.setScalar(.24);network.add(host);
 const sourceGlow=new THREE.Sprite(host.material.clone());sourceGlow.position.copy(source);sourceGlow.scale.setScalar(.15);network.add(sourceGlow);
 const iris=new THREE.Group();iris.position.set(center.x,center.y,.42);face.add(iris);
 const shape=new THREE.Shape();shape.moveTo(.10,-.04);shape.lineTo(.58,-.21);shape.quadraticCurveTo(.86,-.02,.72,.32);shape.lineTo(.43,.39);shape.quadraticCurveTo(.52,.09,.10,-.04);
 const bladeGeometry=new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelThickness:.008,bevelSize:.007,bevelSegments:3,steps:1}),blades=[];
 for(let i=0;i<9;i++){const blade=new THREE.Mesh(bladeGeometry,black);blade.scale.setScalar(.82);blade.rotation.z=i/9*TAU;blade.position.z=i*.002;iris.add(blade);blades.push(blade);}const housing=annulus(.58,.70,.055,black);housing.position.z=-.02;iris.add(housing);iris.visible=false;
 const boundary=rim(.66,.006,new THREE.MeshBasicMaterial({color:0xb2d9bc,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));boundary.position.set(center.x,center.y,.46);face.add(boundary);
 return {root,face,glassMaterial,tracks,network,iris,blades,boundary,
  update({time,phase,count,detected,risk,inspection,closure,paper}){
   const inside=THREE.MathUtils.smoothstep(phase,.8,2)*(1-THREE.MathUtils.smoothstep(phase,2.35,3));
   const focus=(detected?THREE.MathUtils.smoothstep(phase,.55,1.6):.1),scan=inspection?Math.max(0,1-Math.abs(phase-2)):0;
   glassMaterial.opacity=(.08-inside*.065)*(1-scan);darkFace.material.color.set(paper>.5?0x172019:0x030706);
   network.scale.setScalar(1+inside*.6);network.rotation.z=Math.sin(time*.08)*.012;
   lines.forEach((line,i)=>line.material.opacity=(.24+inside*.18)*(1-scan*.8));
   nodes.forEach((node,i)=>node.material.opacity=(.55+Math.sin(time*.8+i)*.12)*(1-scan*.65));
   for(let i=0;i<64;i++){curves[i%curves.length].getPoint((i*.137+time*.12)%1,temp);movingPositions.set([temp.x,temp.y,temp.z],i*3);}movementGeometry.attributes.position.needsUpdate=true;
   normalFlow.material.opacity=(.45+inside*.3)*(1-scan*.75);
   eventsGeometry.setDrawRange(0,count);for(let i=0;i<count;i++){suspectCurve.getPoint(((i/count+time*.2)%1)*(1-closure*.38),temp);eventPositions.set([temp.x,temp.y,temp.z],i*3);}eventsGeometry.attributes.position.needsUpdate=true;
   events.material.opacity=focus*(1-closure*.95);suspectLine.material.opacity=focus*(1-closure*.8)*.65;events.material.color.set(detected?0xf28b6d:0xe9c99b);
   sourceGlow.material.color.copy(events.material.color);sourceGlow.material.opacity=focus*(1-closure*.5);host.material.color.set(closure>.5?0xb4dfc1:detected&&phase>1.4?0xffa48c:0xffd7a1);host.material.opacity=.8*(1-closure*.8);
   iris.visible=closure>.01;iris.scale.setScalar(.7+closure*.15);blades.forEach((blade,i)=>blade.rotation.z=i/9*TAU+closure*.52);
   boundary.material.opacity=closure*.8;boundary.scale.setScalar(1+Math.sin(time*.6)*.015);
   tracks.forEach((trace,i)=>{trace.material.opacity=Math.max(0,1-Math.abs(phase-3)*1.6)*.85;trace.material.color.set(paper>.5?0x75522d:0xd5a876);});
  }
 };
}
