import * as THREE from 'three';
import { H } from './terrain';

/** Algo que a criança pode tocar ou se aproximar para ler, ver ou conversar. */
export interface Interactable {
  x: number;
  z: number;
  /** altura do chão onde está (padrão: terreno) */
  y?: number;
  /** largura e altura da área de toque (maior que o desenho) */
  w?: number;
  h?: number;
  name: string;
  /** texto do botão de ação */
  label: string;
  /** quem fala no diálogo */
  who: string;
  text?: string;
  lines?: string[];
  /** id do personagem, quando é uma conversa */
  npc?: string;
  /** id usado pelas missões para reconhecer o objeto */
  id?: string;
  /** desligado: não aparece nem responde ao toque */
  off?: boolean;
  mesh?: THREE.Mesh;
}

const pickMat = new THREE.MeshBasicMaterial({ visible: false });

export class Interactables {
  list: Interactable[] = [];
  constructor(private scene: THREE.Scene) {}

  add(o: Interactable) {
    const w = o.w || 2,
      h = o.h || 3;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), pickMat);
    m.position.set(o.x, (o.y ?? H(o.x, o.z)) + h / 2, o.z);
    m.userData.inter = o;
    this.scene.add(m);
    o.mesh = m;
    this.list.push(o);
    return o;
  }

  meshes() {
    return this.list.flatMap((o) => (o.mesh && !o.off ? [o.mesh] : []));
  }

  byId(id: string) {
    return this.list.find((o) => o.id === id);
  }

  /** O mais próximo dentro do alcance, na mesma altura aproximada. */
  nearest(x: number, y: number, z: number, reach = 3.2) {
    let best: Interactable | null = null,
      bd = reach;
    for (const o of this.list) {
      if (o.off) continue;
      const d = Math.hypot(x - o.x, z - o.z);
      if (d < bd && Math.abs(y - (o.y ?? H(o.x, o.z))) < 2.5) {
        bd = d;
        best = o;
      }
    }
    return best;
  }
}
