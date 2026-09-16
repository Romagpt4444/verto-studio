import * as THREE from 'three';

const canvas = document.querySelector('[data-scene-canvas]');
const loading = document.querySelector('[data-scene-loading]');
const bar = document.querySelector('[data-scene-progress-bar]');
const loadingLabel = document.querySelector('[data-scene-loading-label]');
const label = document.querySelector('[data-scene-label]');
const number = document.querySelector('[data-scene-progress]');
if (canvas) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => innerWidth < 700;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const fallback = () => { document.body.classList.add('scene-fallback'); canvas.remove(); loading?.remove(); };
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile(), alpha: true, powerPreference: 'high-performance' });
  } catch (error) { console.warn('3D scene unavailable', error); fallback(); }
  if (renderer) {
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(66, 1, .1, 1200);
    const ambient = new THREE.HemisphereLight(0xffffff, 0x5b626b, 3.2); scene.add(ambient);
    const sunLight = new THREE.DirectionalLight(0xffd3a1, 4.5); sunLight.position.set(-45, 45, -95); scene.add(sunLight);
    const metal = new THREE.MeshStandardMaterial({ color: 0xd4d5d0, metalness: .65, roughness: .39 });
    const pale = new THREE.MeshStandardMaterial({ color: 0xf2eee5, metalness: .48, roughness: .46 });
    const graphite = new THREE.MeshStandardMaterial({ color: 0x252b31, metalness: .68, roughness: .4 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xff5a36, metalness: .32, roughness: .52, emissive: 0x5c1204, emissiveIntensity: .2 });
    const rocket = new THREE.Group(); scene.add(rocket);
    const add = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x,y,z); mesh.rotation.set(rx,ry,rz); parent.add(mesh); return mesh; };
    add(rocket, new THREE.CylinderGeometry(2.75, 2.82, 15, 24, 1, false), metal, 0, -2.95, -4.2, -Math.PI/2);
    add(rocket, new THREE.ConeGeometry(2.75, 8.4, 24), pale, 0, -2.95, -15.7, -Math.PI/2);
    for (const z of [-10.8,-4.6,1.9]) add(rocket, new THREE.TorusGeometry(2.78,.055,5,32), graphite, 0,-2.95,z);
    for (const x of [-1.75,1.75]) {
      add(rocket, new THREE.BoxGeometry(.13,.055,11.4), graphite, x,-.72,-4.4);
      add(rocket, new THREE.BoxGeometry(.055,.025,10.7), orange, x,-.66,-4.4);
      for (const z of [-8.5,-6.4,-4.3,-2.2]) add(rocket, new THREE.BoxGeometry(.9,.035,1.1), graphite, x*.76,-.47,z);
    }
    add(rocket, new THREE.BoxGeometry(.38,.07,10.8), pale, 0,-.22,-4.4);
    const panel = add(rocket, new THREE.BoxGeometry(1.15,.2,2.5), graphite, 0,-.58,1.5);
    panel.rotation.x = -.12;
    for (let i=0;i<3;i++) add(rocket,new THREE.BoxGeometry(.18,.025,.035),orange,-.35+i*.35,-.45,1.1);
    const engine = add(rocket,new THREE.ConeGeometry(1.7,7,18,1,true),new THREE.MeshBasicMaterial({color:0xff7543,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}),0,-3,6.9,Math.PI/2);
    const earthMat = new THREE.MeshStandardMaterial({ color:0x3a6471, roughness:1, emissive:0x101e29, emissiveIntensity:.35 });
    const earth = add(scene,new THREE.SphereGeometry(53,40,24),earthMat,13,-37,-147);
    const atmosphere = add(scene,new THREE.SphereGeometry(54.3,40,24),new THREE.MeshBasicMaterial({color:0x88d0db,transparent:true,opacity:.15,side:THREE.BackSide,depthWrite:false}),13,-37,-147);
    const sun = add(scene,new THREE.SphereGeometry(8,24,16),new THREE.MeshBasicMaterial({color:0xffd9a2}),37,32,-180);
    const halo = add(scene,new THREE.SphereGeometry(14,24,16),new THREE.MeshBasicMaterial({color:0xffb96c,transparent:true,opacity:.12,depthWrite:false}),37,32,-180);
    const clouds = new THREE.Group(); scene.add(clouds);
    const cloudMat = new THREE.MeshLambertMaterial({color:0xd9dce0,transparent:true,opacity:.27,depthWrite:false});
    const cloudCount = mobile()?8:15;
    for(let i=0;i<cloudCount;i++) {
      const angle=i*2.39996, radius=18+(i%5)*8;
      const x=Math.sin(angle)*radius, y=-12+Math.cos(angle*1.7)*4, z=-47-(i%8)*15;
      const puff=add(clouds,new THREE.IcosahedronGeometry(3.8+(i%3)*1.3,1),cloudMat,x,y,z);
      puff.scale.set(2.1,.38,.75);
    }
    const starCount=mobile()?340:900;
    const positions=new Float32Array(starCount*3);
    let seed=314159;
    const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    for(let i=0;i<starCount;i++){positions[i*3]=(random()-.5)*440;positions[i*3+1]=(random()-.45)*250;positions[i*3+2]=-35-random()*440;}
    const starGeo=new THREE.BufferGeometry(); starGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const starMat=new THREE.PointsMaterial({color:0xe7eeeb,size:mobile()?.65:.8,sizeAttenuation:true,transparent:true,opacity:0,depthWrite:false});
    const stars=new THREE.Points(starGeo,starMat);scene.add(stars);
    const satellite=new THREE.Group();scene.add(satellite);
    add(satellite,new THREE.SphereGeometry(1.25,16,12),graphite,0,0,0);
    add(satellite,new THREE.BoxGeometry(9,.12,2.1),metal,0,0,0);
    for(const x of [-3.1,3.1]) add(satellite,new THREE.BoxGeometry(3.1,.04,1.85),new THREE.MeshStandardMaterial({color:0x8ca5a0,metalness:.45,roughness:.43}),x,.1,0);
    const signalMat=new THREE.MeshBasicMaterial({color:0xcfff4a,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
    for(let i=0;i<3;i++)add(satellite,new THREE.TorusGeometry(2.5+i*1.4,.03,4,64),signalMat,0,0,0,0,Math.PI/2);
    const projectNodes=[];
    for(let i=0;i<4;i++){
      const node=new THREE.Group();scene.add(node);
      add(node,new THREE.IcosahedronGeometry(1.7+i*.15,1),i%2?graphite:metal,0,0,0);
      add(node,new THREE.TorusGeometry(3.3+i*.15,.035,4,48),new THREE.MeshBasicMaterial({color:i===1?0xcfff4a:0xffa27c,transparent:true,opacity:.7}),0,0,0,Math.PI/3);
      projectNodes.push(node);
    }
    const destination=new THREE.Group();scene.add(destination);
    add(destination,new THREE.TorusGeometry(9,.12,6,64),new THREE.MeshBasicMaterial({color:0xffaa73,transparent:true,opacity:.7}),0,0,0);
    add(destination,new THREE.SphereGeometry(1.5,16,12),new THREE.MeshBasicMaterial({color:0xffe0b2}),0,0,0);
    const sections=[...document.querySelectorAll('[data-scene-section]')];
    let progress=0, frame=0, lastRendered=-1, dirty=true;
    function readProgress(){
      const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
      const points=sections.map(el=>({y:Math.min(max,el.offsetTop),p:Number(el.dataset.sceneStart)}));
      points.push({y:max,p:1});
      const next=points.findIndex(point=>point.y>scrollY);
      const at=next<0?points.length-2:Math.max(0,next-1);
      const left=points[at],right=points[Math.min(at+1,points.length-1)];
      progress=clamp(left.p+(right.p-left.p)*clamp((scrollY-left.y)/Math.max(1,right.y-left.y)));dirty=true;
      const active=[...sections].reverse().find(el=>progress>=Number(el.dataset.sceneStart))||sections[0];
      if(label)label.textContent=active?.dataset.sceneLabel||'01 / ЗЕМЛЯ';
      if(number)number.textContent=`${String(Math.round(progress*100)).padStart(2,'0')}%`;
      document.documentElement.style.setProperty('--flight-progress',progress);
    }
    function resize(){
      renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile()?1.25:1.75));
      renderer.setSize(innerWidth,innerHeight,false);
      camera.aspect=innerWidth/innerHeight;camera.fov=mobile()?76:66;camera.updateProjectionMatrix();
      readProgress();
    }
    function update(p,t){
      const ascent=smooth(.12,.52,p);
      const space=smooth(.35,.59,p);
      scene.background=new THREE.Color().setRGB(
        THREE.MathUtils.lerp(.45,.016,space),
        THREE.MathUtils.lerp(.56,.021,space),
        THREE.MathUtils.lerp(.59,.034,space)
      );
      scene.fog=new THREE.FogExp2(scene.background,THREE.MathUtils.lerp(.003,.0007,space));
      camera.position.set(mobile()?1.5:0,1.15+ascent*1.45,7.5+ascent*2.2);
      camera.lookAt(0,1.15+ascent*2.3,-36);
      camera.rotation.z=reduced?0:Math.sin(p*28+t*11)*.0018*(1-space);
      rocket.position.x=mobile()?1.3:3.2;
      rocket.position.y=ascent*.25+(reduced?0:Math.sin(t*19)*.012*(1-space));
      rocket.rotation.z=Math.sin(p*6)*.018;
      engine.material.opacity=(reduced?0:.1+.5*smooth(.1,.24,p)*(1-smooth(.45,.65,p)));
      earth.position.y=-37+ascent*3;
      earth.position.z=-147-ascent*76;
      atmosphere.position.copy(earth.position);
      earth.scale.setScalar(1+space*.14);atmosphere.scale.copy(earth.scale);
      clouds.position.z=-ascent*60;clouds.position.y=-ascent*17;
      cloudMat.opacity=(.24+.24*smooth(.15,.3,p))*(1-smooth(.32,.55,p));clouds.visible=p<.57;
      starMat.opacity=smooth(.38,.67,p)*.9;
      sun.position.y=32-ascent*12;halo.position.copy(sun.position);
      satellite.position.set(22-17*smooth(.62,.75,p),4+2*Math.sin(p*8),-48+13*smooth(.65,.78,p));
      satellite.rotation.y=p*3;
      satellite.visible=p>.57&&p<.89;signalMat.opacity=smooth(.65,.72,p)*(1-smooth(.84,.9,p))*.7;
      projectNodes.forEach((node,i)=>{
        node.visible=p>.53&&p<.82;
        const phase=smooth(.55,.8,p)*Math.PI*1.15+i*1.55;
        node.position.set(Math.sin(phase)*26,Math.cos(phase)*11+4,-76+i*7+15*smooth(.6,.8,p));
        node.rotation.y=phase;
      });
      destination.position.set(0,8,-90+55*smooth(.86,1,p));destination.visible=p>.82;
      destination.scale.setScalar(.5+smooth(.85,1,p)*1.8);
      sunLight.intensity=4.5-2.8*space;ambient.intensity=3.2-1.2*space;
      renderer.render(scene,camera);
    }
    function animate(now){
      if(!document.hidden&&(dirty||(!reduced&&now-lastRendered>32))){ update(progress,reduced?0:now*.001);dirty=false;lastRendered=now; }
      frame=requestAnimationFrame(animate);
    }
    addEventListener('scroll',readProgress,{passive:true});addEventListener('resize',resize,{passive:true});
    document.addEventListener('visibilitychange',()=>{dirty=true;});
    document.addEventListener('scene:sync',readProgress);
    resize();readProgress();
    if(bar)bar.style.width='100%';if(loadingLabel)loadingLabel.textContent='100%';
    renderer.render(scene,camera);
    loading?.classList.add('is-ready');setTimeout(()=>loading?.remove(),reduced?0:450);
    animate(0);
  }
}
