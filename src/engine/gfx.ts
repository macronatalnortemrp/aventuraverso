import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const MOBILE = matchMedia('(pointer: coarse)').matches;
/** Há tela de toque (celular, tablet ou computador com toque)? Sem toque, o joystick e os botões A e B não aparecem. */
export const TOUCH = matchMedia('(any-pointer: coarse)').matches || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
export const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const SKY_TOP = new THREE.Color(0x3f8fdc);
export const HORIZON = new THREE.Color(0xcfe9f5);
export const FOG_COLOR = new THREE.Color(0xc4e2f0);
export const FOG = { near: 70, far: 210 };
export const SUN_DIR = new THREE.Vector3(-0.55, 0.72, 0.42).normalize();

/** Tempo compartilhado pelos shaders (água, bandeira, grama, portais). */
export const uTime = { value: 0 };

export interface Gfx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  fog: THREE.Fog;
  resize(): void;
  /** baixa a resolução quando o aparelho não aguenta (mínimo 1) */
  degrade(): boolean;
}

/** Renderizador, luz quente com uma sombra, reflexos de ambiente e céu em degradê. */
export function createGfx(canvas: HTMLCanvasElement): Gfx {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
  const fog = new THREE.Fog(FOG_COLOR, FOG.near, FOG.far);
  scene.fog = fog;

  const pm = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  scene.environment = pm.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.35;
  room.dispose();
  pm.dispose();

  const hemi = new THREE.HemisphereLight(0xd8efff, 0x6f8a4e, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d2, 2.7);
  sun.castShadow = true;
  const sm = MOBILE ? 1024 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(500, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: SKY_TOP }, hor: { value: HORIZON }, sd: { value: SUN_DIR } },
      vertexShader:
        'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}',
      fragmentShader: `uniform vec3 top,hor,sd;varying vec3 vD;
void main(){float y=max(vD.y,0.);vec3 c=mix(hor,top,pow(y,.55));float s=max(dot(normalize(vD),sd),0.);
c+=vec3(1.,.9,.7)*(pow(s,600.)*3.+pow(s,12.)*.25);if(vD.y<0.)c=mix(hor,vec3(.55,.68,.5),min(-vD.y*3.,1.));
gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);

  const resize = () => {
    // a tela pode passar de innerHeight (iPhone na Tela de Início: ver --gap no index.html)
    const c = renderer.domElement,
      w = c.clientWidth || innerWidth,
      h = c.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? 62 : 50; // retrato vê mais
    camera.updateProjectionMatrix();
  };
  const degrade = () => {
    if (pixelRatio <= 1) return false;
    pixelRatio = Math.max(1, pixelRatio - 0.25);
    renderer.setPixelRatio(pixelRatio);
    resize();
    return true;
  };
  addEventListener('resize', resize);
  resize();
  return { renderer, scene, camera, sun, hemi, fog, resize, degrade };
}
