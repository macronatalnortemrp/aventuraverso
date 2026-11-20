import * as THREE from 'three';
import { AV, makeKid } from '../world/builders/kid';
import { sfx } from '../engine/audio';
import { $ } from './hud';

/** Retratos dos seis avatares, gerados com o mesmo construtor do jogo. */
export function portraits() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(200, 250);
  r.toneMapping = THREE.NeutralToneMapping;
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight(0xffffff, 0xb7c9a0, 1.6));
  const d = new THREE.DirectionalLight(0xfff1d6, 2.4);
  d.position.set(2, 4, 5);
  s.add(d);
  const c = new THREE.PerspectiveCamera(30, 0.8, 0.1, 50);
  c.position.set(0, 2.5, 7.4);
  c.lookAt(0, 1.85, 0);
  const out = AV.map((a) => {
    const k = makeKid(a);
    k.root.rotation.y = -0.35;
    k.arms[0].rotation.z = -0.15;
    k.arms[1].rotation.z = 0.15;
    s.add(k.root);
    r.render(s, c);
    s.remove(k.root);
    return r.domElement.toDataURL();
  });
  r.dispose();
  return out;
}

/** Tela de escolha do avatar. Devolve o índice escolhido e se os controles ficam ligados. */
export function pickAvatar(current: number, controls: boolean): Promise<{ avatar: number; controls: boolean }> {
  return new Promise((resolve) => {
    const box = $('avs');
    box.innerHTML = '';
    let chosen = current;
    const imgs = portraits();
    AV.forEach((a, i) => {
      const b = document.createElement('button');
      b.setAttribute('aria-pressed', String(i === current));
      const img = document.createElement('img');
      img.alt = '';
      img.src = imgs[i];
      const label = document.createElement('span');
      label.textContent = a.n ?? '';
      b.append(img, label);
      b.onclick = () => {
        chosen = i;
        [...box.children].forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
        sfx('ui');
      };
      box.append(b);
    });
    const chk = $<HTMLInputElement>('chk');
    chk.checked = controls;
    $('pick').classList.add('show');
    setTimeout(() => (box.children[current] as HTMLElement | undefined)?.focus(), 50);
    $('start').onclick = () => {
      $('pick').classList.remove('show');
      resolve({ avatar: chosen, controls: chk.checked });
    };
  });
}
