import * as THREE from 'three';
import { DayMission, DayContent, Bible, ClubTexts } from './base';
import { SOL_SPOT, Spot, trailSpots } from './layout';

const VOTO_BIBLIA = 2;
const HINO = 3;

import type { MissionDeps } from '../day01/mission';
import { stepIndex } from './state';
import { GLOBE } from '../../world/camp';
import { H } from '../../world/terrain';
import { sparkTex } from '../../world/fx';
import { REDUCED_MOTION } from '../../engine/gfx';
import { sfx } from '../../engine/audio';

/*
 * Dia 7, O Descanso (Gn 2:1-3). Falta a última página do Livro e o Quadro do Voto à Bíblia está apagado.
 * Desafio de habilidade: uma trilha final que repete a semana (farol, observatório, mergulho no recife,
 * horta e ilha das palmeiras), com cinco pedaços de luz. O Pedrito monta o Voto à Bíblia.
 * Depois da Voz, a Diretora Sol fala do sábado como memorial da criação: o dia que Deus escolheu,
 * abençoou e santificou (Gn 2:2-3). Na cerimônia, o Pedrito recebe o lenço e a farda oficial.
 */

export class Day07Mission extends DayMission {
  readonly pieces = 5;
  private spots: THREE.Vector3[];

  constructor(d: MissionDeps, content: DayContent, bible: Bible, club: ClubTexts) {
    super(d, 'day07', 7, content, bible, club, { rig: d.sol, id: 'sol' }, SOL_SPOT);
    this.spots = trailSpots().map((v) => new THREE.Vector3(v.x, v.y, v.z));
    this.init();
  }

  /* ---------- o que fica ---------- */

  protected applyLasting() {
    const si = stepIndex(this.state.step);
    const v = this.club.ideals[this.content.pedrito.ideal ?? 'votoBiblia'];
    if (si > stepIndex('pedrito') && v) this.d.camp.setIdeal(VOTO_BIBLIA, v.text);
    const hino = this.club.ideals.hino;
    if (this.done && hino) this.d.camp.setIdeal(HINO, hino.text);
    if (this.done) {
      this.d.camp.setGlobeLayer(7, 1);
      this.d.dressPedrito();
    }
  }

  protected resetLasting() {
    this.d.camp.setIdeal(VOTO_BIBLIA, null);
    this.d.camp.setIdeal(HINO, null);
    this.d.camp.setGlobeLayer(7, 0);
    // o Pedrito continua com a farda: ele já é Aventureiro
  }

  protected enter() {
    this.d.daylight.set(0, REDUCED_MOTION ? 0 : 1);
    this.d.camp.setGlobe(1);
    this.d.place(3, 9, Math.atan2(SOL_SPOT.x - 3, SOL_SPOT.z - 9));
    this.applyLasting();
  }

  protected leave() {
    this.d.daylight.setWarm(0);
  }

  /* ---------- desafio: a trilha da semana ---------- */

  protected pieceSpot(i: number, t: number) {
    const v = this.spots[i].clone();
    v.y += Math.sin(t * 2 + i) * 0.12;
    return v;
  }

  protected skillObjective(): Spot | null {
    const p = this.d.player;
    let best: THREE.Vector3 | null = null,
      bd = Infinity;
    this.spots.forEach((s, i) => {
      if (this.state.got.includes(i)) return;
      const dd = Math.hypot(s.x - p.x, s.z - p.z);
      if (dd < bd) (bd = dd), (best = s);
    });
    const b = best as THREE.Vector3 | null;
    return b ? { x: b.x, z: b.z } : null;
  }

  /* ---------- Pedrito: o Voto à Bíblia ---------- */

  protected pedritoSpot(): Spot {
    const b = this.d.camp.idealSpot(VOTO_BIBLIA);
    return { x: b.x + Math.sin(b.ry) * 2.4, z: b.z + Math.cos(b.ry) * 2.4 };
  }

  protected pedritoChallenge() {
    return this.idealWords(VOTO_BIBLIA);
  }

  /* ---------- Globo, sábado e cerimônia ---------- */

  protected restore(k: number) {
    this.d.camp.setGlobeLayer(7, k);
  }

  protected async afterGlobe() {
    const c = this.content as DayContent & { sabbath: { intro: string[]; lines: string[] }; ceremony: { sol: string[]; pedrito: string[]; tico: string[]; hymn: string[] } };
    const sol = this.d.sol.root,
      from = sol.position.clone(),
      ry = sol.rotation.y,
      p = this.d.player;
    // a tarde fica dourada e calma: o acampamento descansa
    this.d.daylight.setWarm(0.55);
    // a Diretora Sol vem até o Globo
    const sx = GLOBE.x + 2.6,
      sz = GLOBE.z + 4.2;
    sol.position.set(sx, this.d.camp.col.groundAt(sx, sz, 9), sz);
    sol.rotation.y = Math.atan2(p.x - sx, p.z - sz);
    await this.talk('Diretora Sol', c.sabbath.intro);
    await this.readKeys('Gênesis 2:2-3', ['Gn 2:2', 'Gn 2:3']);
    this.endReview();
    await this.talk('Diretora Sol', c.sabbath.lines);
    // cerimônia: o Pedrito recebe o lenço e a farda
    const ped = this.d.ped.root;
    ped.position.set(GLOBE.x - 1.2, this.d.camp.col.groundAt(GLOBE.x - 1.2, GLOBE.z + 4.4, 9), GLOBE.z + 4.4);
    ped.rotation.y = Math.atan2(sx - ped.position.x, sz - ped.position.z);
    await this.talk('Diretora Sol', c.ceremony.sol);
    this.d.dressPedrito();
    sfx('yay');
    this.d.sting('vitoria');
    this.d.fx.puff(ped.position.x, ped.position.y + 1.4, ped.position.z, { n: 30, tex: sparkTex, color: 0xffe28a, add: true, sp: 3.5, up: 3, s: 0.6, life: 1.2 });
    this.d.banner(c.ceremony.tico[0], 2600);
    await this.wait(1.2);
    await this.talk('Pedrito', c.ceremony.pedrito);
    // o Quadro do Hino acende e todos cantam (letra só do arquivo conferido)
    const hino = this.club.ideals.hino;
    if (hino) {
      this.d.camp.setIdeal(HINO, hino.text);
      const b = this.d.camp.idealSpot(HINO);
      this.d.fx.puff(b.x, H(b.x, b.z) + 2.2, b.z, { n: 26, tex: sparkTex, color: 0xffe28a, add: true, sp: 3.5, up: 2.5, s: 0.55, life: 1 });
      await this.talk('Diretora Sol', c.ceremony.hymn);
      await this.talk('Quadros dos Ideais', hino.text.split('\n'));
    }
    sol.position.copy(from);
    sol.rotation.y = ry;
  }
}
