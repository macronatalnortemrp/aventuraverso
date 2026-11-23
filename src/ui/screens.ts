import * as THREE from 'three';
import { AV, makeKid } from '../world/builders/kid';
import { sfx } from '../engine/audio';
import { $ } from './hud';
import { cleanNick } from '../persistence/save';

let cache: string[] | null = null;

/**
 * Retratos dos seis avatares, gerados com o mesmo construtor do jogo. Feitos uma vez só: cada
 * WebGLRenderer novo abre um contexto e compila shaders, o que no iPhone trava a tela.
 */
export function portraits() {
  if (cache) return cache;
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
  r.forceContextLoss(); // libera o contexto já (o Safari tem limite de contextos abertos)
  return (cache = out);
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
      label.textContent = a.skirt ? 'Aventureira' : 'Aventureiro';
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

/** Tela do apelido (opcional). O apelido fica só no aparelho; vazio = "Aventureiro" ou "Aventureira". */
export function askNick(current: string, girl: boolean): Promise<string> {
  return new Promise((resolve) => {
    const inp = $<HTMLInputElement>('nkin');
    inp.value = current;
    inp.placeholder = girl ? 'Aventureira' : 'Aventureiro';
    $('nktag').textContent = girl ? 'Aventureira' : 'Aventureiro';
    $('nkh').textContent = girl ? 'Como você quer ser chamada?' : 'Como você quer ser chamado?';
    $('nick').classList.add('show');
    setTimeout(() => inp.focus(), 60);
    const done = (v: string) => {
      sfx('ui');
      $('nick').classList.remove('show');
      inp.onkeydown = null;
      inp.blur();
      resolve(cleanNick(v));
    };
    inp.oninput = () => {
      const c = inp.value.replace(/[^\p{L}\p{N} '\-]/gu, '');
      if (c !== inp.value) inp.value = c;
    };
    inp.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') done(inp.value);
    };
    $('nkok').onclick = () => done(inp.value);
    $('nkskip').onclick = () => done('');
  });
}
