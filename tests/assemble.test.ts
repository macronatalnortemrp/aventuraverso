import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Assembly } from '../src/world/assemble';

const loose = () => {
  const g = new THREE.Group();
  g.position.set(0, 7, -32);
  return g;
};

describe('montagem da abertura', () => {
  it('pular a abertura no meio não deixa o Globo escondido', () => {
    const globe = loose();
    const a = new Assembly([globe], []);
    a.begin(); // a abertura começa: tudo desmontado
    expect(globe.visible).toBe(false);
    a.begin(); // a criança aperta Pular (ou Repetir)
    a.done();
    expect(globe.visible).toBe(true);
    expect(globe.scale.x).toBeCloseTo(1);
  });

  it('o que estava escondido antes da abertura continua escondido', () => {
    const invite = loose();
    invite.visible = false;
    const a = new Assembly([invite], []);
    a.begin();
    a.done();
    expect(invite.visible).toBe(false);
  });
});
