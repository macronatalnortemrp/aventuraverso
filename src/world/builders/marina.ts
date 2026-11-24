import { Look, Rig, makeKid, part } from './kid';

/**
 * Capitã Marina, a moça do cais (docs/CHARACTERS.md, aparece a partir do Dia 2).
 * Roupa própria para a silhueta ser reconhecível: camisa azul-marinho de capitã, calça branca,
 * quepe branco com aba azul e colete salva-vidas laranja. Não usa lenço (não é personagem do Clube).
 */
export const MARINA_LOOK: Look = { skin: 0x9a6441, hair: 0x1b1b1b, style: 'pony', shirt: 0x24456e, pants: 0xf1ede2, bare: true, scale: 1.18 };

export function makeMarina(): Rig {
  const r = makeKid(MARINA_LOOK);
  // quepe: copa branca, faixa e aba azul-marinho, um botão dourado na frente
  part(r.head, 1.14, 0.3, 1.08, 0xfafafa, 0, 0.66, -0.02, 0.1);
  part(r.head, 1.16, 0.14, 1.1, 0x172d49, 0, 0.5, -0.02, 0.05);
  part(r.head, 0.9, 0.06, 0.42, 0x172d49, 0, 0.44, 0.64, 0.03);
  part(r.head, 0.16, 0.16, 0.05, 0xd7a64d, 0, 0.56, 0.56, 0.03);
  // colete salva-vidas por cima da camisa
  part(r.torso, 1.04, 0.64, 0.64, 0xff8a2a, 0, 0.46, 0, 0.12);
  for (const s of [-1, 1]) part(r.torso, 0.08, 0.52, 0.04, 0xffffff, s * 0.2, 0.46, 0.33, 0.02);
  return r;
}
