import * as THREE from 'three';

const land = [
  [[-168,70],[-142,71],[-128,58],[-114,51],[-96,50],[-82,58],[-60,51],[-67,44],[-81,24],[-99,18],[-112,30],[-124,43],[-153,58]],
  [[-80,12],[-60,8],[-35,-5],[-40,-23],[-56,-40],[-69,-55],[-77,-28]],
  [[-12,36],[0,48],[-9,59],[25,71],[60,70],[99,77],[153,62],[179,58],[150,44],[131,31],[121,16],[109,1],[98,5],[78,7],[69,25],[43,12],[32,30],[14,37]],
  [[-17,35],[12,37],[33,30],[52,11],[41,-15],[30,-35],[16,-32],[5,-8],[-14,6]],
  [[113,-11],[137,-11],[153,-25],[146,-39],[118,-34]],
  [[-53,60],[-22,70],[-28,83],[-60,82],[-73,70]],
  [[46,-13],[51,-16],[48,-25],[44,-24]],
  [[130,31],[142,44],[145,38],[137,32]],
];
function inside(x, y, polygon) {
  let found = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) found = !found;
  }
  return found;
}
function geo(lat, lon, radius = 1.45) {
  const phi = (90 - lat) * Math.PI / 180, theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}
export function glowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.12, '#ffffff'); gradient.addColorStop(.3, 'rgba(255,255,255,.45)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

// Each scene sleeps outside the viewport and when either motion preference is off.
export function sceneLoop(container, draw, resize) {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, visible = false, disposed = false, last = 0, elapsed = 0;
  const allowed = () => !media.matches && !document.hidden && !document.documentElement.classList.contains('motion-paused');
  const tick = now => {
    frame = 0;
    if (disposed || !visible || !allowed()) { last = 0; return; }
    const delta = last ? Math.min((now - last) / 1000, 1) : 0;
    last = now; elapsed += delta; draw(elapsed, delta);
    frame = requestAnimationFrame(tick);
  };
  const resume = () => {
    if (disposed) return;
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (visible && allowed()) frame = requestAnimationFrame(tick);
    else draw(elapsed, 0);
  };
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume(); }, { rootMargin: '60px' });
  const size = new ResizeObserver(() => { resize(); if (!frame) draw(elapsed, 0); });
  const preference = new MutationObserver(resume);
  intersection.observe(container); size.observe(container); preference.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', resume); media.addEventListener('change', resume);
  resize(); draw(0, 0);
  return () => { disposed = true; cancelAnimationFrame(frame); intersection.disconnect(); size.disconnect(); preference.disconnect(); document.removeEventListener('visibilitychange', resume); media.removeEventListener('change', resume); };
}

export function disposeScene(scene, renderer, textures = []) {
  const geometries = new Set(), materials = new Set();
  scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (Array.isArray(object.material)) object.material.forEach(material => materials.add(material)); else if (object.material) materials.add(object.material); });
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose());
  renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
}

export function mountNetwork(container, { compact = false, animate = true, overlay = false, neutral = false, pointerTarget = container } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch { container.classList.add('network-fallback'); return () => {}; }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 30); camera.position.set(0, .2, compact ? 4.6 : 4.4);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 760 ? 1.25 : 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true'); container.prepend(renderer.domElement); container.dataset.liveScene = overlay ? 'globe-overlay' : 'globe';
  const globe = new THREE.Group(); globe.rotation.set(.12, -.8, -.12); globe.position.y = overlay ? .42 : -.13; scene.add(globe);
  scene.add(new THREE.HemisphereLight(0xd8e8ef, 0x040609, 2.1));
  const key = new THREE.DirectionalLight(0xcbdde4, 3.1); key.position.set(-3, 4, 3); scene.add(key);
  const warm = new THREE.DirectionalLight(0xc9aa7f, 1.4); warm.position.set(3, -1, 2); scene.add(warm);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.435, 64, 48), overlay ? new THREE.MeshBasicMaterial({ colorWrite: false }) : new THREE.MeshPhongMaterial({ color: 0x061018, specular: 0x5c6f7a, shininess: 38 })); globe.add(sphere);
  const positions = [], colors = [];
  if (!overlay) for (let lat = -80; lat <= 80; lat += 1.25) for (let lon = -180; lon < 180; lon += 1.25) {
    if (!land.some(polygon => inside(lon, lat, polygon))) continue;
    const p = geo(lat, lon); positions.push(p.x, p.y, p.z);
    const shade = .48 + .42 * Math.abs(Math.sin(lat * lon)); colors.push(shade * .76, shade * .9, shade);
  }
  const geography = new THREE.BufferGeometry(); geography.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geography.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  globe.add(new THREE.Points(geography, new THREE.PointsMaterial({ size: .011, transparent: true, opacity: .88, vertexColors: true, sizeAttenuation: true })));
  if (!overlay) {
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.47, 48, 32), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { tint: { value: new THREE.Color(0x809aa9) } }, vertexShader: 'varying vec3 vNormal; varying vec3 vEye; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vEye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}', fragmentShader: 'uniform vec3 tint; varying vec3 vNormal; varying vec3 vEye; void main(){float rim=pow(1.0-max(dot(normalize(vNormal),normalize(vEye)),0.0),4.0);gl_FragColor=vec4(tint,rim*.3);}' }));
    globe.add(atmosphere);
  }
  if (!overlay) for (let lat = -60; lat <= 60; lat += 20) {
    const points = Array.from({ length: 121 }, (_, i) => geo(lat, i * 3 - 180, 1.451));
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x697a85, transparent: true, opacity: .14 })));
  }
  if (!overlay) for (let lon = -180; lon < 180; lon += 30) {
    const points = Array.from({ length: 91 }, (_, i) => geo(i * 2 - 90, lon, 1.451));
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x697a85, transparent: true, opacity: .12 })));
  }
  const glow = glowTexture();
  const pairs = [
    [[40,-74],[51,0],0xff535d], [[51,0],[19,73],0xff535d], [[19,73],[1,104],0xe1c39a],
    [[37,-122],[35,139],0x8aafc3], [[51,0],[-23,-46],0xff535d], [[19,73],[-33,151],0x8aafc3],
    [[40,-74],[1,104],0xe1c39a], [[51,0],[35,139],0x8aafc3], [[-23,-46],[19,73],0x829aa7],
    [[40,-74],[-26,28],0x708795], [[1,104],[35,139],0xff535d],
  ];
  const moving = [];
  pairs.forEach(([start, end, originalColor], index) => {
    const color = neutral ? (index % 3 ? 0x9eb6c5 : 0xd8c2a0) : originalColor;
    const from = geo(...start), to = geo(...end), middle = from.clone().add(to).normalize().multiplyScalar(1.85 + index % 3 * .12);
    const curve = new THREE.QuadraticBezierCurve3(from, middle, to);
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: color === 0xff535d ? .77 : .34 })));
    const trail = [];
    for (let n = 0; n < (innerWidth < 760 ? 3 : 6); n++) {
      const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, opacity: (1 - n / 7) * .9, depthWrite: false, blending: THREE.AdditiveBlending }));
      dot.scale.setScalar(n ? .045 : .11); globe.add(dot); trail.push(dot);
    }
    moving.push({ trail, curve, offset: index / pairs.length });
    if (index < 7) {
      const node = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); node.position.copy(to); node.scale.setScalar(color === 0xff535d ? .22 : .13); globe.add(node);
      const halo = new THREE.Mesh(new THREE.RingGeometry(.035, .04, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .65, side: THREE.DoubleSide })); halo.position.copy(to.clone().multiplyScalar(1.008)); halo.lookAt(to.clone().multiplyScalar(2)); halo.userData.pulse = index; globe.add(halo);
    }
  });
  const dustPositions = [];
  for (let i = 0; i < 100; i++) dustPositions.push(Math.sin(i * 71.2) * 4, Math.cos(i * 16.4) * 2.3, Math.sin(i * 11.3) * 3 - 2);
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));
  if (overlay) { dustGeo.dispose(); } else scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x9aafba, size: .012, transparent: true, opacity: .4 })));
  let pointerX = 0, pointerY = 0, smoothedX = 0, smoothedY = 0;
  const resize = () => { const width = container.clientWidth, height = container.clientHeight; if (!width || !height) return; renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); };
  const onMove = event => { const rect = pointerTarget.getBoundingClientRect(); pointerX = (event.clientX - rect.left) / rect.width - .5; pointerY = (event.clientY - rect.top) / rect.height - .5; };
  const onLeave = () => { pointerX = pointerY = 0; };
  pointerTarget.addEventListener('pointermove', onMove, { passive: true }); pointerTarget.addEventListener('pointerleave', onLeave);
  const stop = sceneLoop(container, elapsed => {
    const t = animate ? elapsed : 0;
    smoothedX += (pointerX - smoothedX) * .035; smoothedY += (pointerY - smoothedY) * .035;
    globe.rotation.y = -.8 + t * (overlay ? .035 : .07) + smoothedX * .24;
    globe.rotation.x = .12 + smoothedY * .14;
    moving.forEach(({ trail, curve, offset }) => trail.forEach((dot, n) => dot.position.copy(curve.getPoint((t * .075 + offset - n * .009 + 100) % 1))));
    globe.children.forEach(child => { if (child.userData.pulse !== undefined) { const phase = (t * .4 + child.userData.pulse * .2) % 1; child.scale.setScalar(1 + phase * 1.8); child.material.opacity = (1 - phase) * .7; } });
    container.dataset.sceneTime = t.toFixed(2);
    renderer.render(scene, camera);
  }, resize);
  return () => {
    stop(); pointerTarget.removeEventListener('pointermove', onMove); pointerTarget.removeEventListener('pointerleave', onLeave); disposeScene(scene, renderer, [glow]); delete container.dataset.liveScene; delete container.dataset.sceneTime;
  };
}

export function mountHero(element) {
  const art = element.querySelector('.hero-art');
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let x = 0, y = 0, targetX = 0, targetY = 0, raf = 0, visible = false, disposed = false;
  const allowed = () => !media.matches && !document.documentElement.classList.contains('motion-paused') && !document.hidden;
  const start = () => { if (!raf && visible && allowed() && !disposed) raf = requestAnimationFrame(tick); };
  const onMove = e => { const rect = element.getBoundingClientRect(); targetX = (e.clientX / window.innerWidth - .5) * 24; targetY = ((e.clientY - rect.top) / rect.height - .5) * 16; start(); };
  const tick = now => {
    raf = 0; if (!visible || !allowed() || disposed) return;
    x += (targetX - x) * .04; y += (targetY - y) * .04;
    const progress = Math.min(1, Math.max(0, -element.getBoundingClientRect().top / element.offsetHeight));
    art.style.setProperty('--px', `${x + Math.sin(now * .00024) * 7}px`);
    art.style.setProperty('--py', `${y + Math.cos(now * .00018) * 5 + progress * 42}px`);
    art.style.setProperty('--hero-scale', String(1.035 + progress * .05));
    element.style.setProperty('--hero-copy-x', `${-x * .24}px`);
    element.style.setProperty('--hero-copy-y', `${-y * .2 + progress * 68}px`);
    element.style.setProperty('--hero-scroll', progress.toFixed(3));
    raf = requestAnimationFrame(tick);
  };
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) start(); else { cancelAnimationFrame(raf); raf = 0; } }); observer.observe(element);
  const preference = () => { if (!allowed()) { cancelAnimationFrame(raf); raf = 0; ['--px','--py','--hero-scale'].forEach(property=>art.style.removeProperty(property)); ['--hero-copy-x','--hero-copy-y','--hero-scroll'].forEach(property=>element.style.removeProperty(property)); } else start(); };
  element.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('visibilitychange', preference); media.addEventListener('change', preference);
  return () => { disposed = true; cancelAnimationFrame(raf); observer.disconnect(); element.removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', preference); media.removeEventListener('change', preference); };
}
