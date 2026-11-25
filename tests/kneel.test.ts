import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import { KNEEL, Rig, animate, kneelPose } from '../src/world/builders/kid';
import { approach } from '../src/engine/math';

/* Diretora Cecília abaixada com a Bíblia (abertura, Quadro 3): a pose não pode tremer quando o tempo entre quadros varia. */

function rig(): Rig {
  const g = () => new THREE.Group();
  const root = g(),
    body = g(),
    torso = g();
  root.add(body);
  body.add(torso);
  return {
    root,
    body,
    torso,
    head: g(),
    face: new THREE.Mesh(),
    fm: new THREE.MeshStandardMaterial(),
    legs: [g(), g()],
    arms: [g(), g()],
    o: { skin: 0, hair: 0 },
    ph: 0,
    blink: 1e9, // sem piscar: o teste não precisa da textura do rosto
    mode: 'open',
  };
}

describe('Diretora Cecília abaixada', () => {
  test('com quadros de durações diferentes (celular), braços e corpo ficam parados na pose final', () => {
    const r = rig();
    const dts = [1 / 60, 1 / 30, 1 / 120, 1 / 45, 0.1, 1 / 60];
    let k = 0;
    const seen: number[][] = [];
    for (let i = 0; i < 300; i++) {
      const dt = dts[i % dts.length];
      k = approach(k, 1, dt, 0.45);
      animate(r, dt, {});
      kneelPose(r, k);
      if (i > 200) seen.push([r.arms[1].rotation.x, r.arms[0].rotation.x, r.torso.rotation.x, r.legs[0].rotation.x]);
    }
    for (const [book, lamp, lean, leg] of seen) {
      expect(book).toBeCloseTo(KNEEL.book, 6);
      expect(lamp).toBeCloseTo(KNEEL.lamp, 6);
      expect(lean).toBeCloseTo(KNEEL.lean, 6);
      expect(leg).toBeCloseTo(-KNEEL.split, 6);
    }
  });

  test('desce só o que as pernas abertas permitem (os pés não afundam no chão)', () => {
    const r = rig();
    animate(r, 1 / 60, {});
    const stand = r.body.position.y;
    animate(r, 0, {});
    kneelPose(r, 1);
    const drop = stand - r.body.position.y;
    expect(drop).toBeCloseTo(KNEEL.legLen * (1 - Math.cos(KNEEL.split)), 2);
  });

  test('approach anda no mesmo ritmo em qualquer taxa de quadros', () => {
    let a = 0,
      b = 0;
    for (let i = 0; i < 60; i++) a = approach(a, 1, 1 / 120, 1);
    for (let i = 0; i < 15; i++) b = approach(b, 1, 1 / 30, 1);
    expect(a).toBeCloseTo(b, 6);
  });
});
