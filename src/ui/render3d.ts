import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Look, Rig, makeKid, makeTico } from '../world/builders/kid';
import { coinGeometry, coinMaterial } from '../world/coins';
import { makeMarina } from '../world/builders/marina';
import { makeEstrelino, makeFlora, makeZe } from '../world/builders/npcs';

/**
 * Ícones renderizados com os mesmos modelos 3D do jogo (como os jogos de plataforma fazem):
 * a moeda do contador e os rostos de quem fala nos balões. Gerados uma vez, viram imagens.
 */
export interface Portraits {
  coin: string;
  tico: string;
  sol: string;
  pedrito: string;
  camper: string;
  marina: string;
  flora: string;
  estrelino: string;
  ze: string;
  /** Pedrito com a farda (depois do Dia 7) */
  pedritoUniform: string;
}

/** farda oficial dos Aventureiros (camisa branca, calça azul, lenço e plaqueta), como a dos outros personagens do Clube */
export const uniform = (l: Look): Look => ({ ...l, shirt: undefined, pants: undefined, bare: false });

function headShot(r: THREE.WebGLRenderer, scene: THREE.Scene, rig: Rig, camY: number, dist: number) {
  rig.root.rotation.y = -0.3;
  scene.add(rig.root);
  rig.root.updateMatrixWorld(true);
  const p = new THREE.Vector3();
  rig.head.getWorldPosition(p);
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  cam.position.set(p.x + 0.5, p.y + camY, p.z + dist);
  cam.lookAt(p.x, p.y - 0.05, p.z);
  r.render(scene, cam);
  scene.remove(rig.root);
  return r.domElement.toDataURL();
}

export function renderPortraits(looks: { sol: Look; pedrito: Look; camper: Look }): Portraits {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(192, 192);
  r.toneMapping = THREE.NeutralToneMapping;
  const s = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r),
    room = new RoomEnvironment();
  s.environment = pm.fromScene(room, 0.04).texture;
  s.environmentIntensity = 0.6;
  s.add(new THREE.HemisphereLight(0xffffff, 0xc9b48a, 1.7));
  const d = new THREE.DirectionalLight(0xfff1d6, 2.6);
  d.position.set(3, 5, 6);
  s.add(d);
  const rim = new THREE.DirectionalLight(0xbfe3ff, 1.4);
  rim.position.set(-4, 2, -3);
  s.add(rim);

  // moeda em ângulo, com brilho metálico
  const coin = new THREE.Mesh(coinGeometry(), coinMaterial());
  coin.rotation.set(0.15, -0.55, 0.12);
  s.add(coin);
  const cc = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  cc.position.set(0, 0, 2.3);
  r.render(s, cc);
  const coinUrl = r.domElement.toDataURL();
  s.remove(coin);

  const out: Portraits = {
    coin: coinUrl,
    tico: headShot(r, s, makeTico(), 0.15, 2.4),
    sol: headShot(r, s, makeKid(looks.sol), 0.1, 3.4),
    pedrito: headShot(r, s, makeKid(looks.pedrito), 0.1, 3.0),
    camper: headShot(r, s, makeKid(looks.camper), 0.1, 3.0),
    marina: headShot(r, s, makeMarina(), 0.15, 3.6),
    flora: headShot(r, s, makeFlora(), 0.2, 3.7),
    estrelino: headShot(r, s, makeEstrelino(), 0.15, 3.7),
    ze: headShot(r, s, makeZe(), 0.2, 3.8),
    pedritoUniform: headShot(r, s, makeKid(uniform(looks.pedrito)), 0.1, 3.0),
  };
  room.dispose();
  pm.dispose();
  r.dispose();
  r.forceContextLoss(); // libera o contexto já (o Safari tem limite de contextos abertos)
  return out;
}
