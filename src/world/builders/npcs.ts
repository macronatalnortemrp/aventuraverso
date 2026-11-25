import { Look, Rig, makeKid, part } from './kid';

/*
 * Personagens dos Dias 3 a 6 (docs/CHARACTERS.md). Roupa e acessório próprios, para a silhueta ser
 * reconhecível de longe. Não usam lenço (não são personagens do Clube).
 */

/** Dona Flora, a jardineira (Dia 3): chapéu de palha, avental verde e luvas. */
export const FLORA_LOOK: Look = { skin: 0xe0ac84, hair: 0x6a4a2a, style: 'long', shirt: 0xf4d35e, pants: 0x4f7a3a, skirt: true, bare: true, scale: 1.18 };
export function makeFlora(): Rig {
  const r = makeKid(FLORA_LOOK);
  part(r.head, 1.6, 0.1, 1.5, 0xe8c56a, 0, 0.56, 0, 0.04); // aba do chapéu de palha
  part(r.head, 1.0, 0.36, 0.96, 0xf0d27c, 0, 0.74, 0, 0.12);
  part(r.head, 1.02, 0.1, 0.98, 0xd9534f, 0, 0.62, 0, 0.03); // fita
  part(r.head, 0.2, 0.2, 0.1, 0xf29ab0, 0.36, 0.66, 0.48, 0.06); // florzinha
  part(r.torso, 0.84, 0.7, 0.08, 0x5f9a4c, 0, 0.32, 0.31, 0.03); // avental
  part(r.torso, 0.3, 0.22, 0.04, 0x3f7a35, 0, 0.18, 0.36, 0.02); // bolso
  for (const a of r.arms) part(a, 0.34, 0.28, 0.34, 0x9bd27a, 0, -0.74, 0, 0.1); // luvas
  return r;
}

/** Seu Estrelino, o astrônomo (Dia 4): casaco azul-noite com estrelas, óculos redondos e barba branca. */
export const ESTRELINO_LOOK: Look = { skin: 0xd9a47a, hair: 0xe8e8e8, style: 'short', shirt: 0x1f2a5c, pants: 0x2b2b3a, bare: true, glasses: true, eye: '#3a3a5a', brow: 0xdddddd, scale: 1.22 };
export function makeEstrelino(): Rig {
  const r = makeKid(ESTRELINO_LOOK);
  part(r.head, 0.9, 0.34, 0.2, 0xf2f2f2, 0, -0.42, 0.44, 0.1); // barba
  part(r.head, 0.5, 0.12, 0.08, 0xf2f2f2, 0, -0.18, 0.5, 0.04); // bigode
  part(r.torso, 1.06, 0.96, 0.66, 0x1f2a5c, 0, 0.3, 0, 0.12); // casaco
  for (const [x, y] of [[-0.28, 0.5], [0.3, 0.2], [0.05, 0.62], [-0.1, 0.1]]) part(r.torso, 0.14, 0.14, 0.04, 0xffd84a, x, y, 0.34, 0.03);
  part(r.head, 1.1, 0.12, 1.04, 0x1f2a5c, 0, 0.58, 0, 0.04); // boina
  part(r.head, 0.8, 0.22, 0.8, 0x1f2a5c, 0, 0.7, 0, 0.1);
  return r;
}

/** Tio Zé Bichos, o cuidador dos animais (Dia 6): chapéu de vaqueiro, camisa xadrez e macacão. */
export const ZE_LOOK: Look = { skin: 0x8d5a3b, hair: 0x2b1a10, style: 'short', shirt: 0xc94c3c, pants: 0x3c5f8c, bare: true, scale: 1.24 };
export function makeZe(): Rig {
  const r = makeKid(ZE_LOOK);
  part(r.head, 1.7, 0.1, 1.6, 0x8a5a34, 0, 0.56, 0, 0.04); // aba do chapéu
  part(r.head, 0.96, 0.42, 0.9, 0x8a5a34, 0, 0.78, 0, 0.12);
  part(r.head, 0.98, 0.1, 0.92, 0x3a2216, 0, 0.62, 0, 0.03);
  part(r.head, 0.9, 0.3, 0.16, 0x2b1a10, 0, -0.4, 0.46, 0.1); // barba
  part(r.torso, 0.86, 0.5, 0.62, 0x3c5f8c, 0, 0.22, 0, 0.08); // macacão
  for (const s of [-1, 1]) part(r.torso, 0.14, 0.5, 0.64, 0x3c5f8c, s * 0.26, 0.6, 0, 0.04); // alças
  for (const [x, y] of [[-0.3, 0.6], [0.3, 0.6], [0, 0.72]]) part(r.torso, 0.16, 0.06, 0.04, 0x7a2e24, x, y, 0.3, 0.02); // xadrez
  return r;
}
