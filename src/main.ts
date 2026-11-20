import * as THREE from 'three';
import './style.css';
import { createGfx, MOBILE, REDUCED_MOTION, FOG, FOG_COLOR, uTime } from './engine/gfx';
import { OrbitCamera } from './engine/camera';
import { Input } from './engine/input';
import { sfx, setSoundEnabled } from './engine/audio';
import { stopSpeaking } from './engine/speech';
import { angLerp, clamp, lerp } from './engine/math';
import { H, WY, isDeep } from './world/terrain';
import { EMB, ROOT } from './world/textures';
import { SEE } from './world/batch';
import { Fx, sparkTex, dustTex } from './world/fx';
import { buildCamp } from './world/camp';
import { Coins, Coin } from './world/coins';
import { createCritters } from './world/critters';
import { Interactable } from './world/interactables';
import { AV, Rig, animate, makeKid, makeTico } from './world/builders/kid';
import { createPlayer, pressA as playerA, pressB as playerB, releaseB as playerRelease, stepPlayer, PlayerEvents } from './game/player';
import { newGuide, guideStep, guideProgress, guideReset, guideSnooze } from './game/guidance';
import { createSave } from './persistence/save';
import { Hud, $ } from './ui/hud';
import { askNick, pickAvatar } from './ui/screens';
import { Task } from './ui/task';
import { Daylight } from './world/daylight';
import { Ambient } from './engine/ambient';
import { Day01Mission, loadDay01 } from './game/day01/mission';
import { journey, worldProgress } from './game/journey';
import { renderPortraits } from './ui/render3d';
import { Intro, loadIntro, landmarks } from './game/intro';
import { Assembly } from './world/assemble';
import { Music } from './engine/music';

/* aventuráVerso: Mundo 1, o Acampamento do Livro Aberto. */

try {
  await Promise.race([Promise.all([document.fonts.load('40px "Lilita One"'), document.fonts.load('800 20px Nunito')]), new Promise((r) => setTimeout(r, 2000))]);
} catch {
  /* segue com a fonte reserva */
}

const SAVE = createSave();
$<HTMLImageElement>('macro').src = EMB.macro.src;

let gfx: ReturnType<typeof createGfx>;
try {
  gfx = createGfx($<HTMLCanvasElement>('c'));
} catch (e) {
  const err = $('err');
  err.style.display = 'flex';
  err.textContent = 'Este aparelho não conseguiu abrir o 3D.';
  throw e;
}
const { renderer, scene, camera, sun, fog } = gfx;
ROOT.o = scene;

const fx = new Fx(scene);
const beforeCamp = new Set(scene.children);
const camp = buildCamp(scene, fx);
/* peças soltas do cenário, para a montagem da abertura */
const assembly = new Assembly(
  scene.children.filter((o) => !beforeCamp.has(o)),
  landmarks(),
);
const music = new Music();
const { col, inter, portals, stumps } = camp;
const coins = new Coins(scene, stumps.length, SAVE.data.coins);
const critters = createCritters(scene);
const hud = new Hud(() => {
  talking = null;
  $('c').focus();
});
const orbit = new OrbitCamera(camera);
const daylight = new Daylight(gfx, camp);
const ambient = new Ambient();
const task = new Task();

/* ---------- personagens ---------- */
interface Npc {
  id: string;
  name: string;
  rig: Rig;
  lines: string[];
}
const SOL_LOOK = { skin: 0xc68863, hair: 0x3a2216, style: 'long', la1: true, skirt: true } as const;
const PED_LOOK = { skin: 0xd9a47a, hair: 0x2b1a10, style: 'short', shirt: 0xd7a64d, pants: 0x5b6b8c, bare: true } as const;
const sol = makeKid({ ...SOL_LOOK, scale: 1.22 });
sol.root.position.set(6.5, H(6.5, 5.5), 5.5);
sol.root.rotation.y = -0.6;
const ped = makeKid(PED_LOOK);
const PED_HOME = { x: -21.6, y: WY + 0.49, z: 7.4, ry: -1.9 };
ped.root.position.set(PED_HOME.x, PED_HOME.y, PED_HOME.z);
ped.root.rotation.y = PED_HOME.ry;
scene.add(sol.root, ped.root);
const NPCS: Npc[] = [
  {
    id: 'sol',
    name: 'Diretora Sol',
    rig: sol,
    lines: [
      'Bem-vinda e bem-vindo ao Acampamento do Livro Aberto!',
      'As páginas do Livro dos Sete Dias sumiram e o Globo do Éden está apagado.',
      'O portal da primeira missão fica na Colina do Globo, ao norte. Antes, explore o acampamento e junte as moedas!',
    ],
  },
  {
    id: 'pedrito',
    name: 'Pedrito',
    rig: ped,
    lines: ['Oi! Eu sou o Pedrito. Estou visitando o acampamento.', 'Vi umas moedas brilhando lá no fundo do lago... Nade até o meio e aperte A para mergulhar!'],
  },
];
for (const n of NPCS) {
  const p = n.rig.root.position;
  inter.add({ id: n.id + '-npc', x: p.x, z: p.z, y: p.y, w: 1.6, h: 3.4, name: n.name, label: 'Conversar', who: n.name, lines: n.lines, npc: n.id });
}
let talking: Npc | null = null;

/* retratos 3D para o HUD e os balões (mesmos modelos do jogo) */
let portraitMap: Record<string, string> = {};
try {
  const pics = renderPortraits({ sol: SOL_LOOK, pedrito: PED_LOOK, camper: AV[1] });
  $<HTMLImageElement>('coinimg').src = pics.coin;
  $<HTMLImageElement>('ticoav').src = pics.tico;
  const map = { Tico: pics.tico, 'Diretora Sol': pics.sol, Pedrito: pics.pedrito, Acampante: pics.camper };
  portraitMap = map;
  hud.portraits = map;
  task.portraits = map;
} catch {
  /* sem retratos: a interface funciona só com texto */
}

const tico = makeTico();
scene.add(tico.root);
const TICO = { x: 1.5, z: 22, y: H(1.5, 22), hop: 0 };

let avatar = SAVE.data.avatar;
let player = makeKid(AV[avatar]);
scene.add(player.root);
const P = createPlayer(0, 22);

const shadowBlob = new THREE.Mesh(
  new THREE.CircleGeometry(0.6, 20).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x223322, transparent: true, opacity: 0.22, depthWrite: false }),
);
scene.add(shadowBlob);
const mark = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.5, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, depthWrite: false }));
mark.visible = false;
scene.add(mark);

/* ---------- estado do jogo ---------- */
let started = false;
let target: { x: number; z: number } | null = null;
let pendingInter: Interactable | null = null;
let near: Interactable | null = null;
let clock = 0;
let saved = [...SAVE.data.coins];
const GUIDE = newGuide();
const OBJ = portals[0];
let mission: Day01Mission | null = null;

/** Para onde a ajuda aponta: o objetivo da missão ou, fora dela, o portal da Missão 1. */
function objective(): { x: number; z: number; hint: string } | null {
  if (mission?.active) return mission.objective();
  if (mission?.done) return null;
  return { x: OBJ.x, z: OBJ.z, hint: 'O portal da missão fica na Colina do Globo, ao norte. Está vendo as faíscas?' };
}

const dist = (o: { x: number; z: number }) => Math.hypot(P.x - o.x, P.z - o.z);
const paused = () => hud.paused || task.open || !!mission?.busy;

/* ---------- interação ---------- */
function interact(o: Interactable) {
  pendingInter = null;
  target = null;
  mark.visible = false;
  guideProgress(GUIDE);
  const npc = NPCS.find((n) => n.id === o.npc);
  if (npc) {
    talking = npc;
    const p = npc.rig.root.position;
    npc.rig.root.rotation.y = Math.atan2(P.x - p.x, P.z - p.z);
    P.face = Math.atan2(p.x - P.x, p.z - P.z);
    orbit.want = Math.atan2(P.x - p.x, P.z - p.z) + 0.75; // mostra os dois rostos
  }
  input.clearMove();
  if (mission?.onInteract(o)) return;
  hud.dialog(o.who, o.name, o.lines || [o.text ?? '']);
}

function showMark(x: number, z: number) {
  mark.position.set(x, Math.max(H(x, z), WY) + 0.08, z);
  mark.visible = true;
  mark.scale.setScalar(1.6);
}

const ray = new THREE.Raycaster(),
  ndc = new THREE.Vector2();
function tap(cx: number, cy: number) {
  if (paused()) return;
  ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(inter.meshes(), false)[0];
  if (hit) {
    const o = hit.object.userData.inter as Interactable;
    sfx('ui');
    if (dist(o) < 3.4) interact(o);
    else {
      pendingInter = o;
      target = { x: o.x, z: o.z + (o.npc ? 1.4 : 1.8) };
      showMark(target.x, target.z);
    }
    return;
  }
  const g = ray.intersectObjects([camp.terrain, camp.water], false)[0];
  if (g) {
    pendingInter = null;
    target = { x: g.point.x, z: g.point.z };
    showMark(target.x, target.z);
  }
}

/* ---------- ações dos botões ---------- */
function pressA() {
  if (!started || paused()) return;
  const r = playerA(P);
  if (r === 'jump') {
    sfx('jump');
    fx.puff(P.x, P.y + 0.1, P.z, { n: 5, sp: 1.6, up: 0.4 });
  } else if (r === 'dive') {
    sfx('splash');
    fx.puff(P.x, WY + 0.1, P.z, { n: 8, color: 0xffffff, sp: 2, up: 2, g: 4 });
  }
}
function pressB() {
  if (!started || paused()) return;
  playerB(P);
  if (near && P.st === 'ground') interact(near); // no chão, B é "Ação"
}
function releaseB() {
  const r = playerRelease(P);
  if (!r) return;
  sfx(r === 'high' ? 'jump2' : 'dive');
  fx.puff(P.x, P.y, P.z, { n: 6, sp: 1.2, up: -0.5, color: 0xffffff });
}

const input = new Input($('c'), $('joy'), $('knob'), $('A'), $('B'), {
  tap,
  drag: (dx, dy) => orbit.rotate(dx, dy),
  zoom: (f) => orbit.setZoom(orbit.zoom * f),
  a: pressA,
  bDown: pressB,
  bUp: releaseB,
  act: () => near && !paused() && interact(near),
});

/* ---------- ajuda de orientação ---------- */
const trail = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: sparkTex, color: 0xfff1b0, size: 0.55, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  p.frustumCulled = false;
  p.visible = false;
  scene.add(p);
  return p;
})();

function helpLevel(l: number) {
  GUIDE.lvl = Math.max(GUIDE.lvl, l);
  const o = objective();
  if (!o) return hud.say('Você já concluiu a missão! Explore o acampamento à vontade.', 5000);
  const inMission = !!mission?.active;
  if (!inMission) OBJ.sp.boost = 3;
  if (l === 1) hud.say(o.hint, 6500);
  if (l === 2) {
    trail.visible = true;
    hud.compass(0);
    hud.say(inMission ? 'Siga a bússola e a trilha de faíscas!' : 'Siga a bússola e a trilha de faíscas até o portal!', 6500);
  }
  if (l === 3)
    hud.say(inMission ? 'Quer que eu leve você até lá?' : 'Quer que eu leve você até o portal da missão?', 0, [
      [inMission ? 'Me leve até lá' : 'Levar ao portal', teleport],
      ['Agora não', () => guideSnooze(GUIDE), true],
    ]);
}
function clearHelp() {
  hud.compass(null);
  trail.visible = false;
  OBJ.sp.boost = 1;
}
function teleport() {
  hud.fade(true);
  setTimeout(
    () => {
      const o = objective() ?? { x: OBJ.x, z: OBJ.z };
      Object.assign(P, { x: o.x, z: o.z + 3.2, vx: 0, vz: 0, vy: 0, st: 'ground', boost: null, face: Math.PI });
      P.y = col.groundAt(P.x, P.z, 99);
      target = null;
      mark.visible = false;
      orbit.yaw = 0;
      orbit.snap(P.x, P.y, P.z);
      Object.assign(TICO, { x: P.x + 1.2, z: P.z + 1 });
      guideReset(GUIDE);
      clearHelp();
      hud.fade(false);
      hud.say(mission?.active ? 'Chegamos! Olhe em volta.' : 'Chegamos! É só entrar no portal quando quiser.', 4500);
    },
    REDUCED_MOTION ? 0 : 480,
  );
}
$('bh').onclick = () => {
  if (!started) return;
  sfx('ui');
  helpLevel(Math.min(3, GUIDE.lvl + 1));
};

/* ---------- moedas ---------- */
function onCollect(c: Coin) {
  guideProgress(GUIDE);
  const got = coins.collected;
  hud.coins(got, coins.total, true);
  sfx('coin');
  fx.puff(c.x, c.y, c.z, { n: 7, tex: sparkTex, color: 0xffe28a, add: true, sp: 2.6, up: 2, s: 0.45, life: 0.5, grow: 0.4 });
  if (c.id >= 0) {
    saved.push(c.id);
    SAVE.update({ coins: saved });
  }
  if (got === coins.total) {
    sfx('yay');
    [0xd7a64d, 0x6e2638, 0x7fd4ff].forEach((color, i) =>
      setTimeout(() => fx.puff(P.x, P.y + 2, P.z, { n: 24, tex: dustTex, color, sp: 5, up: 6, g: 9, s: 0.3, life: 1.4, grow: 0 }), i * 180),
    );
    hud.say('Uau! Você juntou todas as moedas do acampamento!', 6000);
  } else if (got === 1) hud.say('Sua primeira moeda! Tem moedas no alto do Observatório e no fundo do lago também.', 5500);
}

/* ---------- eventos da física ---------- */
const events: PlayerEvents = {
  splash(x, z, big) {
    sfx('splash');
    if (big) {
      fx.shock(x, WY, z, 0xdff6ff);
      fx.puff(x, WY + 0.1, z, { n: 12, color: 0xffffff, sp: 3, up: 3.5, g: 6 });
      if (P.pound) orbit.shake = 0.25;
    } else fx.puff(x, WY + 0.1, z, { n: 8, color: 0xffffff, sp: 2, up: 2, g: 4 });
  },
  land(x, y, z, pound) {
    if (!pound) return fx.puff(x, y + 0.05, z, { n: 4, sp: 1.4, up: 0.4, s: 0.4 });
    fx.shock(x, y, z, 0xffe7a8);
    fx.puff(x, y + 0.1, z, { n: 14, sp: 4.5, up: 1, s: 0.6 });
    sfx('pound');
    orbit.shake = 0.35;
    for (const s of stumps) if (!s.used && Math.hypot(x - s.x, z - s.z) < 1.3 && Math.abs(y - s.y) < 0.1) coins.popFrom(s);
  },
  step(x, y, z, wet) {
    if (wet) fx.puff(x, WY + 0.05, z, { n: 3, color: 0xffffff, sp: 1, up: 1.2, g: 3, s: 0.3 });
    else fx.puff(x, y + 0.05, z, { n: 2, sp: 0.6, up: 0.5, s: 0.35, life: 0.45 });
  },
  wake(x, z) {
    fx.puff(x, WY + 0.05, z, { n: 1, color: 0xffffff, sp: 0.6, up: 0.6, g: 2, s: 0.4 });
  },
  bubble(x, y, z) {
    fx.puff(x, y, z, { n: 1, color: 0xdff6ff, sp: 0.2, up: 1.6, g: -1, s: 0.22, life: 1.1, grow: 0.2 });
  },
  outOfBreath() {
    hud.say('Uma bolha de ar levou você para cima. Respire e tente de novo!', 4500);
  },
};

/* ---------- Missão 1 ---------- */
async function enterPortal() {
  if (!mission) return hud.dialog('Tico', 'Missão 1: A Luz no Acampamento', ['A missão ainda está carregando. Tente de novo em um instante!']);
  if (mission.active) return;
  await openJourney();
}
/** Mostra os sete dias do Éden e começa o escolhido, de onde a criança parou. */
async function openJourney() {
  const m = mission;
  if (!m || m.active) return;
  const prog = { day01: SAVE.data.day01 };
  const pick = await task.journey(journey(prog), worldProgress(prog));
  if (!pick || pick.day !== 1) return;
  hud.fade(true);
  await new Promise((r) => setTimeout(r, REDUCED_MOTION ? 0 : 450));
  m.start(pick.replay);
  guideReset(GUIDE);
  clearHelp();
  hud.fade(false);
}
$('goal').onclick = async () => {
  if (!mission?.active || mission.busy || paused()) return;
  const leave = await task.confirm('Tico', 'Sair da missão?', 'Seu progresso fica salvo. Para voltar, é só entrar no portal de novo.', 'Sair', 'Continuar');
  if (leave) mission.exit();
};
const missionReady = loadDay01()
  .then(({ content, bible }) => {
    mission = new Day01Mission(
      {
        scene,
        camp,
        fx,
        hud,
        task,
        daylight,
        ambient,
        orbit,
        save: SAVE,
        player: P,
        ped,
        sol,
        place(x, z, face) {
          Object.assign(P, { x, z, vx: 0, vz: 0, vy: 0, st: 'ground', boost: null, face });
          P.y = col.groundAt(x, z, 99);
          Object.assign(TICO, { x: x + 1.2, z: z + 1 });
          target = null;
          mark.visible = false;
          orbit.yaw = face + Math.PI;
          orbit.snap(P.x, P.y, P.z);
        },
        onExit(done, wantsNext) {
          ped.root.position.set(PED_HOME.x, PED_HOME.y, PED_HOME.z);
          ped.root.rotation.y = PED_HOME.ry;
          ped.body.scale.y = 1;
          const pi = inter.byId('pedrito-npc');
          if (pi) {
            Object.assign(pi, { x: PED_HOME.x, z: PED_HOME.z, y: PED_HOME.y, off: false });
            pi.mesh?.position.set(PED_HOME.x, PED_HOME.y + 1.7, PED_HOME.z);
          }
          guideReset(GUIDE);
          clearHelp();
          if (done && wantsNext) setTimeout(() => void openJourney(), REDUCED_MOTION ? 0 : 700);
          else hud.say(done ? 'Parabéns! O Globo do Éden está aceso. Quando quiser continuar, é só voltar ao portal da missão.' : 'Tudo bem! Seu progresso ficou salvo. Volte ao portal quando quiser.', 7000);
        },
      },
      content,
      bible,
    );
  })
  .catch(() => {
    /* sem a missão, o acampamento continua jogável */
  });

/* ---------- passo do jogo ---------- */
function step(dt: number) {
  let [ix, iz, m] = input.move(orbit.yaw);
  if (m > 0.1) {
    target = null;
    pendingInter = null;
    mark.visible = false;
  } else if (target) {
    const dx = target.x - P.x,
      dz = target.z - P.z,
      d = Math.hypot(dx, dz);
    if (d < 0.4) {
      target = null;
      mark.visible = false;
      if (pendingInter && dist(pendingInter) < 3.6) interact(pendingInter);
    } else {
      ix = dx / d;
      iz = dz / d;
      m = Math.min(1, d / 1.2 + 0.35); // chega devagar
    }
  }
  stepPlayer(P, ix, iz, m, dt, clock, col, events);
  // ninguém atravessa as pessoas
  for (const n of NPCS) {
    const p = n.rig.root.position,
      dx = P.x - p.x,
      dz = P.z - p.z,
      d = Math.hypot(dx, dz);
    if (d < 0.9 && d > 0 && Math.abs(P.y - p.y) < 1.5) {
      P.x = p.x + (dx / d) * 0.9;
      P.z = p.z + (dz / d) * 0.9;
    }
  }
  coins.step(dt, col, P.x, P.y, P.z, onCollect);

  for (const p of portals) {
    if (paused() || dist(p) >= 1.8 || Math.abs(P.y - p.y) >= 2) continue;
    P.z = p.z + 3.2;
    P.vx = P.vz = 0;
    target = null;
    if (p.open) void enterPortal();
    else {
      const w = worldProgress({ day01: SAVE.data.day01 });
      hud.dialog('Tico', 'Portal trancado', ['Este portal leva a um novo mundo, com outra história e outro cenário.', `Ele abre quando você terminar os ${w.total} dias do Éden. Você já concluiu ${w.done}!`]);
    }
  }

  const best = inter.nearest(P.x, P.y, P.z);
  if (best !== near) {
    near = best;
    hud.action(near && P.st === 'ground' ? near.label + (near.npc ? ' com ' + near.name.replace('Diretora ', '') : '') : null);
  }

  const obj = objective();
  if (obj) {
    const gs = guideStep(GUIDE, dt, dist(obj));
    gs.levels.forEach(helpLevel);
    if (gs.arrived) {
      clearHelp();
      hud.hideTico();
    }
    if (hud.compassOn) hud.compass(Math.PI - (Math.atan2(obj.x - P.x, obj.z - P.z) - orbit.yaw));
  } else if (hud.compassOn) clearHelp();
  hud.breath(P.breath, P.st === 'dive' || P.breath < 1);
}

/* ---------- desenho ---------- */
const UNDER_FOG = new THREE.Color(0x5aa6c8);
function draw(dt: number, t: number) {
  const r = player.root;
  r.position.set(P.x, P.y, P.z);
  r.rotation.y = P.face;
  const tilt = P.boost ? 1.2 : P.st === 'dive' ? 1.25 : P.st === 'swim' ? 0.9 : 0;
  player.body.rotation.x = lerp(player.body.rotation.x, tilt, Math.min(1, dt * 10));
  if (P.pound) player.body.rotation.y += dt * 22;
  else player.body.rotation.y = lerp(player.body.rotation.y, 0, 0.3);
  P.sq = lerp(P.sq, 0, Math.min(1, dt * 10));
  r.scale.set(1 + P.sq * 0.3, 1 - P.sq * 0.6, 1 + P.sq * 0.3);
  const spd = Math.hypot(P.vx, P.vz);
  animate(player, dt, {
    walk: spd > 0.4 && P.st === 'ground',
    speed: spd,
    air: P.st === 'air',
    swim: P.st === 'swim' || P.st === 'dive',
    mode: P.pound || (P.st === 'dive' && P.breath < 0.3) ? 'wow' : 'open',
  });
  const gy = Math.max(col.groundAt(P.x, P.z, P.y), WY);
  shadowBlob.position.set(P.x, gy + 0.04, P.z);
  shadowBlob.visible = P.st !== 'dive';
  shadowBlob.scale.setScalar(clamp(1 - (P.y - gy) * 0.08, 0.4, 1));

  // Tico segue o jogador, mas espera na margem
  let tx = P.x - Math.sin(P.face + 0.8) * 1.6,
    tz = P.z - Math.cos(P.face + 0.8) * 1.6;
  if (isDeep(tx, tz) || H(tx, tz) < WY - 0.2) {
    tx = TICO.x;
    tz = TICO.z;
  }
  const dx = tx - TICO.x,
    dz = tz - TICO.z,
    d = Math.hypot(dx, dz);
  if (d > 0.3) {
    const s = Math.min(Math.min(d * 3, 9) * dt, d);
    TICO.x += (dx / d) * s;
    TICO.z += (dz / d) * s;
    TICO.hop += dt * 12;
    tico.root.rotation.y = angLerp(tico.root.rotation.y, Math.atan2(dx, dz), 0.2);
  } else tico.root.rotation.y = angLerp(tico.root.rotation.y, Math.atan2(P.x - TICO.x, P.z - TICO.z), 0.05);
  if (d > 18) Object.assign(TICO, { x: P.x, z: P.z + 1 });
  TICO.y = lerp(TICO.y, col.groundAt(TICO.x, TICO.z, TICO.y + 0.5), 0.3);
  tico.root.position.set(TICO.x, TICO.y + (d > 0.3 ? Math.abs(Math.sin(TICO.hop)) * 0.35 : 0), TICO.z);
  animate(tico, dt, { walk: d > 0.3, speed: 2, wave: GUIDE.lvl >= 1 && d < 0.5 });

  const nearSol = started && !talking && Math.hypot(P.x - sol.root.position.x, P.z - sol.root.position.z) < 6;
  animate(sol, dt, { wave: talking?.id === 'sol' || nearSol });
  if (!mission?.drivesPedrito) animate(ped, dt, { wave: talking?.id === 'pedrito', mode: talking?.id === 'pedrito' ? 'wow' : 'open' });
  mission?.update(dt, t);
  daylight.update(dt, P.x, P.y, P.z, P.face);
  ambient.enabled = sound;
  ambient.update(P.x, P.z, orbit.yaw);

  uTime.value = t;
  camp.update(dt, t);
  coins.draw(t);
  fx.update(dt, t);
  critters(dt, t, P.x, P.z);
  if (mark.visible) {
    mark.scale.setScalar(lerp(mark.scale.x, 1, 0.15));
    mark.material.opacity = 0.6 + Math.sin(t * 6) * 0.3;
  }
  const obj = objective();
  if (trail.visible && obj) {
    const a = trail.geometry.attributes.position as THREE.BufferAttribute,
      ox = obj.x - P.x,
      oz = obj.z + 3 - P.z,
      L = Math.hypot(ox, oz) || 1,
      N = Math.max(1, Math.min(L, 22));
    for (let i = 0; i < a.count; i++) {
      const k = (i / a.count + t * 0.25) % 1,
        x = P.x + (ox / L) * k * N,
        z = P.z + (oz / L) * k * N;
      a.setXYZ(i, x, Math.max(H(x, z), WY) + 0.5 + Math.sin(k * 20 + t * 4) * 0.12, z);
    }
    a.needsUpdate = true;
  }
  // debaixo d'água: névoa azul curta
  const under = P.st === 'dive' && P.y < WY - 0.9;
  fog.near = lerp(fog.near, under ? 8 : FOG.near, 0.08);
  fog.far = lerp(fog.far, under ? 45 : FOG.far, 0.08);
  fog.color.lerp(under ? UNDER_FOG : FOG_COLOR, 0.08);
}

/* ---------- telas ---------- */
task.voice = () => sound;
hud.voice = () => sound;
let sound = SAVE.data.sound;
setSoundEnabled(sound);
music.setEnabled(sound);
$('bs').setAttribute('aria-pressed', String(sound));
$('bs').onclick = () => {
  sound = !sound;
  setSoundEnabled(sound);
  music.setEnabled(sound);
  SAVE.update({ sound });
  $('bs').setAttribute('aria-pressed', String(sound));
  if (sound) sfx('ui');
  else stopSpeaking();
};
function setControls(on: boolean) {
  SAVE.update({ controls: on });
  for (const id of ['joy', 'A', 'B']) hud.show(id, on);
  $('bc').setAttribute('aria-pressed', String(on));
}
$('bc').onclick = () => {
  const on = !SAVE.data.controls;
  setControls(on);
  sfx('ui');
  if (on) hud.say('A pula. A e depois B: pulo alto (andando, vira mergulho no ar). Segure B no pulo: marretada no chão!', 8000);
};
$('act').onclick = () => near && interact(near);
/* ---------- abertura (docs/INTRO_SEQUENCE.md) ---------- */
let intro: Intro | null = null;
const introReady = loadIntro()
  .then((text) => {
    intro = new Intro(
      {
        scene,
        camera,
        camp,
        daylight,
        fx,
        assembly,
        music,
        player: () => player,
        tico,
        sol,
        ground: (x, z) => H(x, z),
        portraits: () => portraitMap,
        sound: () => sound,
        hidden: [coins.im],
      },
      text,
    );
  })
  .catch(() => {
    /* sem os textos da abertura, o jogo começa direto no acampamento */
  });
$<HTMLButtonElement>('rewatch').hidden = !SAVE.data.introSeen;

/** Escolha do boneco, apelido e, na primeira vez (ou quando pedida), a abertura. */
async function enter(forceIntro: boolean) {
  sfx('ui');
  $('title').classList.remove('show');
  const choice = await pickAvatar(avatar, SAVE.data.controls);
  avatar = choice.avatar;
  SAVE.update({ avatar });
  scene.remove(player.root);
  player = makeKid(AV[avatar]);
  scene.add(player.root);
  const girl = !!AV[avatar].skirt;
  const nick = await askNick(SAVE.data.nick, girl);
  SAVE.update({ nick });
  setControls(choice.controls);
  await introReady;
  if (intro && (forceIntro || !SAVE.data.introSeen)) {
    for (const id of ['joy', 'A', 'B']) hud.show(id, false);
    await intro.play(nick, girl);
    SAVE.update({ introSeen: true });
    $<HTMLButtonElement>('rewatch').hidden = false;
    setControls(choice.controls);
    begin(true);
  } else begin(false);
}

const controlsTip = () =>
  MOBILE
    ? 'Toque no chão para andar e arraste a tela para olhar em volta.'
    : 'Clique no chão para andar e arraste para olhar em volta.';

/** Começa a jogar. Depois da abertura, vai direto para o Dia 1 (etapa 1: a lanterna). */
function begin(fromIntro: boolean) {
  document.body.classList.add('on');
  hud.show('coins');
  hud.show('top');
  started = true;
  input.enabled = true;
  orbit.yaw = 0;
  orbit.pitch = 0.5;
  orbit.snap(P.x, P.y, P.z);
  $('c').focus();
  hud.coins(coins.collected, coins.total);
  if (!fromIntro) {
    sfx('yay');
    hud.say(`Oi! Eu sou o Tico. ${controlsTip()} Vamos falar com a Diretora Sol?`, 8000);
    return;
  }
  void missionReady.then(() => {
    if (mission && !mission.done) return mission.start(false);
    // Dia 1 já concluído: volta ao acampamento de dia, com o Globo aceso
    daylight.set(0, REDUCED_MOTION ? 0 : 1.2);
    camp.setGlobe(mission?.done ? 1 : 0);
    hud.say(`Bem-vindo de volta ao acampamento! ${controlsTip()}`, 7000);
  });
}
$('go').onclick = () => void enter(false);
$('rewatch').onclick = () => void enter(true);

/** Cenário vivo durante a abertura (a câmera e os personagens ficam com a abertura). */
function tickWorld(dt: number, t: number) {
  uTime.value = t;
  camp.update(dt, t);
  fx.update(dt, t);
  critters(dt, t, camera.position.x, camera.position.z);
  fog.near = FOG.near;
  fog.far = FOG.far;
  fog.color.copy(FOG_COLOR);
  sun.position.set(camera.position.x - 27.5, 38, camera.position.z + 11);
  sun.target.position.set(camera.position.x, 0, camera.position.z - 12);
}

/* ---------- laço ---------- */
const timer = new THREE.Timer();
timer.connect(document);
const _v = new THREE.Vector3();
let fpsT = 0,
  fpsN = 0;
renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(Math.max(timer.getDelta(), 0), 0.05);
  clock += dt;
  if (intro?.active) {
    intro.update(dt);
    tickWorld(dt, clock);
    SEE.r.value = 0;
    renderer.render(scene, camera);
    return;
  }
  orbit.yaw += input.turn() * dt * 2;
  if (!started) {
    orbit.attract(dt);
    sun.position.set(-27.5, 38, 25);
    sun.target.position.set(0, 2, 4);
  } else {
    if (!paused()) step(dt);
    else if (near) {
      near = null;
      hud.action(null);
    }
    orbit.follow(dt, P.x, P.st === 'dive' ? Math.max(P.y, WY - 1) : P.y, P.z, col);
    sun.position.set(orbit.tx - 27.5, orbit.ty + 36, orbit.tz + 21);
    sun.target.position.set(orbit.tx, orbit.ty, orbit.tz);
  }
  draw(dt, clock);
  if (started) {
    // furo de visão: o que estiver entre a câmera e o personagem fica vazado
    _v.set(P.x, P.y + 1.2, P.z);
    const depth = -_v.clone().applyMatrix4(camera.matrixWorldInverse).z;
    _v.project(camera);
    const W = renderer.domElement.width,
      Hh = renderer.domElement.height;
    SEE.p.value.set(((_v.x + 1) / 2) * W, ((_v.y + 1) / 2) * Hh);
    SEE.d.value = depth;
    SEE.r.value = Hh * 0.17;
  } else SEE.r.value = 0;
  renderer.render(scene, camera);
  // qualidade automática: abaixa a resolução se ficar abaixo de 40 quadros por segundo
  fpsT += dt;
  fpsN++;
  if (fpsT > 4) {
    if (fpsN / fpsT < 40) gfx.degrade();
    fpsT = fpsN = 0;
  }
});
if (SAVE.data.controls) setControls(true);

/* ---------- depuração: ?debug expõe o estado para testes ---------- */
if (import.meta.env?.DEV || new URLSearchParams(location.search).has('debug')) {
  Object.assign(window, {
    R: renderer,
    scene,
    P,
    CAM: orbit,
    PORT: portals,
    COINS: coins.list,
    STUMPS: stumps,
    GUIDE,
    INTER: inter.list,
    helpLevel,
    interact,
    task,
    daylight,
    step,
    pressA,
    pressB,
    releaseB,
  });
  Object.defineProperty(window, 'mission', { get: () => mission });
  Object.defineProperty(window, 'intro', { get: () => intro });
}
