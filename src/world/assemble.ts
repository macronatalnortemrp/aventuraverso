import * as THREE from 'three';
import { BUILD, buildScale } from './batch';

/**
 * Montagem do acampamento na abertura. As malhas agrupadas (Batch) crescem no shader;
 * aqui ficam as peças soltas do cenário (emblemas, placas, bandeira, Globo, portais), que seguem a mesma onda.
 */
export class Assembly {
  private items: { o: THREE.Object3D; s: THREE.Vector3; d: number; v: boolean }[] = [];
  /** marcos que tocam um "plim" quando montam (distâncias até a origem da onda) */
  private marks: { d: number; hit: boolean }[] = [];

  /** objetos acrescentados à cena ao construir o acampamento */
  constructor(objs: THREE.Object3D[], landmarks: { x: number; z: number }[]) {
    const o = BUILD.o.value;
    for (const ob of objs) {
      const p = ob.position;
      if (ob instanceof THREE.Light || p.lengthSq() < 0.01) continue; // grama, flores e malhas grandes ficam como chão
      const g = (ob as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (g?.getAttribute?.('piv')) continue; // já cresce no shader
      this.items.push({ o: ob, s: ob.scale.clone(), d: Math.hypot(p.x - o.x, p.z - o.z), v: ob.visible });
    }
    this.marks = landmarks.map((l) => ({ d: Math.hypot(l.x - o.x, l.z - o.z), hit: false })).sort((a, b) => a.d - b.d);
  }

  /** Guarda o que está visível agora (convites, chamas etc.) antes de desmontar. */
  begin() {
    for (const it of this.items) it.v = it.o.visible;
    this.marks.forEach((m) => (m.hit = false));
    this.set(0);
  }

  get radius() {
    return BUILD.r.value;
  }

  /** Raio da onda. Devolve quantos marcos acabaram de montar (para tocar o "plim"). */
  set(r: number) {
    BUILD.r.value = r;
    for (const it of this.items) {
      const k = buildScale(r, it.d);
      it.o.visible = it.v && k > 0.001;
      it.o.scale.copy(it.s).multiplyScalar(Math.max(k, 0.001));
    }
    let n = 0;
    for (const m of this.marks) {
      if (!m.hit && r >= m.d + 1) {
        m.hit = true;
        n++;
      }
      if (r < m.d) m.hit = false;
    }
    return n;
  }

  /** Acampamento inteiro, sem montagem. */
  done() {
    this.set(1e6);
  }
}
