// @ts-nocheck -- portado da demo; tipar na Fase 1
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, decal } from '../textures';
import { lerp, rnd, rr } from '../../engine/math';
const T=THREE;
/* Personagens de blocos: Aventureiros, Diretora Sol, Pedrito e Tico (docs/CHARACTERS.md). */
/* ---------- personagens de blocos ---------- */
const MC={};export const mat=(c,r=.7)=>MC[c+'_'+r]||(MC[c+'_'+r]=new T.MeshStandardMaterial({color:c,roughness:r}));
const RG={};export const rg=(w,h,d,r=.08)=>{const k=[w,h,d,r].join();return RG[k]||(RG[k]=new RoundedBoxGeometry(w,h,d,2,Math.min(r,Math.min(w,h,d)/2-.01)))};
export function part(p,w,h,d,c,x,y,z,r,rough){const m=new T.Mesh(rg(w,h,d,r),mat(c,rough));m.position.set(x,y,z);m.castShadow=true;p.add(m);return m}
export function piv(p,x,y,z){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g}
const FACES={};
export function faceTex(o,mode){const k=[o.hair,o.skin,o.eye||0,mode,o.glasses?1:0,o.animal?1:0].join();if(FACES[k])return FACES[k];
 return FACES[k]=canvasTex(256,256,(g)=>{const hx='#'+new T.Color(o.brow??o.hair).getHexString(),eye=o.eye||'#3b2416';
  [[-1,1],[1,1]].forEach(([s])=>{const cx=128+s*52,cy=128;
   if(mode==='blink'){g.strokeStyle='#2a1a12';g.lineWidth=9;g.lineCap='round';g.beginPath();g.arc(cx,cy+4,22,Math.PI*1.1,Math.PI*1.9,false);g.stroke()}
   else{g.fillStyle='#fff';g.beginPath();g.ellipse(cx,cy,28,34,0,0,Math.PI*2);g.fill();g.fillStyle=eye;g.beginPath();g.ellipse(cx+s*3,cy+5,19,24,0,0,Math.PI*2);g.fill();g.fillStyle='#120a06';g.beginPath();g.ellipse(cx+s*3,cy+7,10,13,0,0,Math.PI*2);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(cx+s*3+8,cy-5,7.5,0,Math.PI*2);g.fill();g.beginPath();g.arc(cx+s*3-6,cy+14,3.6,0,Math.PI*2);g.fill()}
   if(!o.animal){g.strokeStyle=hx;g.lineWidth=9;g.lineCap='round';g.beginPath();g.moveTo(cx-20,cy-48+(mode==='wow'?-8:0));g.quadraticCurveTo(cx,cy-60+(mode==='wow'?-8:0),cx+20,cy-50+(mode==='wow'?-8:0));g.stroke()}
   g.fillStyle='rgba(255,120,130,.45)';g.beginPath();g.ellipse(cx+s*20,cy+50,19,11,0,0,Math.PI*2);g.fill()});
  if(o.glasses){g.strokeStyle='#1f2a44';g.lineWidth=8;[-52,52].forEach(dx=>{g.beginPath();g.arc(128+dx,128,40,0,Math.PI*2);g.stroke()});g.beginPath();g.moveTo(116,124);g.lineTo(140,124);g.stroke()}
  g.fillStyle='#7a2a2a';g.strokeStyle='#7a2a2a';g.lineCap='round';
  if(mode==='wow'){g.beginPath();g.ellipse(128,198,14,17,0,0,Math.PI*2);g.fill()}
  else{g.beginPath();g.moveTo(98,186);g.quadraticCurveTo(128,222,158,186);g.quadraticCurveTo(128,200,98,186);g.fill();g.fillStyle='#e86a7a';g.beginPath();g.ellipse(128,202,11,6,0,0,Math.PI*2);g.fill()}})}
export function makeKid(o){const root=new T.Group(),body=piv(root,0,0,0),NV=0x1f3352,sk=o.skin,sh=o.shirt??0xfafafa,pt=o.pants??NV,legs=[],arms=[];
 [-1,1].forEach(s=>{const l=piv(body,s*.24,1.02,0);if(o.skirt){part(l,.34,.42,.36,sk,0,-.32,0)}else part(l,.38,.62,.4,pt,0,-.3,0);part(l,.36,.26,.38,0xffffff,0,-.7,0);part(l,.4,.22,.56,0x1d1d26,0,-.88,.06,.08,.4);legs.push(l)});
 if(!o.skirt)part(body,.9,.32,.54,pt,0,1.1,0,.08);
 if(o.skirt){const sg=new T.CylinderGeometry(.5,.66,.52,8);const m=new T.Mesh(sg,mat(pt));m.position.y=1.0;m.rotation.y=Math.PI/8;m.castShadow=true;body.add(m)}
 const torso=piv(body,0,1.25,0);part(torso,.98,.82,.58,sh,0,.38,0,.12);part(torso,1.0,.14,.6,0x1a1a22,0,.03,0,.05,.4);part(torso,.18,.12,.05,0xd4d8de,0,.03,.31,.02,.3);
 if(!o.bare){part(torso,.26,.11,.03,0x172D49,-.28,.52,.3,.02);}
 if(o.pack)part(torso,.76,.86,.32,0x7a5434,0,.4,-.42,.1);
 [-1,1].forEach(s=>{const a=piv(torso,s*.62,.7,0);part(a,.3,.36,.32,sh,0,-.16,0,.08);part(a,.26,.34,.28,sk,0,-.48,0,.08);part(a,.3,.24,.3,sk,0,-.72,0,.1);arms.push(a)});
 const head=piv(torso,0,1.2,0);part(head,1.04,.98,.96,sk,0,0,0,.2,.6);[-1,1].forEach(s=>part(head,.14,.26,.2,sk,s*.55,-.02,0,.06));
 const fm=new T.MeshStandardMaterial({map:faceTex(o,'open'),transparent:true,roughness:.6,polygonOffset:true,polygonOffsetFactor:-2});const face=new T.Mesh(new T.PlaneGeometry(.94,.9),fm);face.position.set(0,-.04,.485);head.add(face);
 const h=o.hair;part(head,1.1,.34,1.04,h,0,.42,-.01,.14);part(head,1.1,.24,.16,h,0,.28,.46,.07);
 if(o.style==='long'){part(head,1.1,1.25,.32,h,0,-.18,-.44,.12);[-1,1].forEach(s=>part(head,.16,.9,.62,h,s*.55,-.08,-.12,.06))}
 else if(o.style==='curly'){[[-.36,.6,0],[0,.66,.05],[.36,.6,0],[-.2,.58,-.38],[.2,.6,-.38],[-.48,.4,-.2],[.48,.4,-.2]].forEach(([x,y,z])=>part(head,.4,.36,.4,h,x,y,z,.16));part(head,1.06,.6,.3,h,0,.1,-.42,.12)}
 else if(o.style==='afro'){part(head,1.16,.46,1.08,h,0,.44,-.03,.22);part(head,1.14,.5,.3,h,0,.12,-.42,.12)}
 else if(o.style==='pony'){part(head,1.06,.6,.3,h,0,.12,-.42,.12);const pn=piv(head,0,.4,-.62);part(pn,.62,.56,.5,h,0,.12,0,.24);part(pn,.36,.62,.34,h,0,-.36,-.06,.14);if(o.bow){part(pn,.56,.24,.14,0x6E2638,0,-.04,.26,.06)}}
 else part(head,1.06,.5,.24,h,0,.18,-.44,.08);
 let scarf=null;if(!o.bare){const ln=o.la1?0x6E2638:0x6E2638;part(torso,1.0,.16,.6,ln,0,.8,0,.06);
  const tri=new T.Mesh(new T.CylinderGeometry(.42,.42,.06,3,1),mat(ln));tri.rotation.set(Math.PI/2,0,0);tri.scale.set(1,1,1.15);tri.position.set(0,.55,.31);tri.castShadow=true;torso.add(tri);
  if(o.la1){const tb=new T.Mesh(new T.CylinderGeometry(.48,.48,.05,3,1),mat(0xffffff));tb.rotation.copy(tri.rotation);tb.position.set(0,.53,.29);torso.add(tb)}
  part(torso,.2,.2,.1,0xD7A64D,0,.62,.36,.05,.4);scarf=decal(o.la1?'la1':'a1',o.la1?.24:.26,0,.64,.42,0,torso);scarf.material.alphaTest=.1}
 if(o.scale)root.scale.setScalar(o.scale);
 return {root,body,torso,head,face,fm,legs,arms,o,ph:rnd()*9,blink:rr(1,4),mode:'open'}}
export function makeTico(){const root=new T.Group(),body=piv(root,0,0,0),fur=0x8a6a4e,dark=0x4a3a2e,light=0xe9c99b,legs=[],arms=[];
 [-1,1].forEach(s=>{const l=piv(body,s*.18,.42,0);part(l,.2,.42,.22,fur,0,-.2,0,.08);legs.push(l)});
 const torso=piv(body,0,.45,0);part(torso,.62,.62,.5,fur,0,.3,0,.2);part(torso,.42,.42,.08,light,0,.26,.24,.1);
 [-1,1].forEach(s=>{const a=piv(torso,s*.38,.5,0);part(a,.16,.42,.16,fur,0,-.2,0,.06);arms.push(a)});
 const head=piv(torso,0,.88,0);part(head,.72,.64,.62,fur,0,0,0,.24);part(head,.56,.44,.1,light,0,-.06,.3,.12);
 [-1,1].forEach(s=>{const e=part(head,.16,.36,.34,0xffffff,s*.46,.12,-.02,.08);e.rotation.z=s*-.4});
 const fm=new T.MeshStandardMaterial({map:faceTex({hair:0x4a3a2e,skin:0,eye:'#2a1a12',animal:1},'open'),transparent:true,roughness:.6,polygonOffset:true,polygonOffsetFactor:-2});const face=new T.Mesh(new T.PlaneGeometry(.56,.52),fm);face.position.set(0,-.02,.36);head.add(face);
 part(torso,.66,.12,.54,0x6E2638,0,.6,0,.05);const tri=new T.Mesh(new T.CylinderGeometry(.22,.22,.04,3),mat(0x6E2638));tri.rotation.set(Math.PI/2,0,0);tri.position.set(0,.46,.27);torso.add(tri);
 const tail=[];let p=piv(torso,0,.08,-.26);for(let i=0;i<8;i++){const sg=part(p,.14,.14,.3,i%2?light:dark,0,0,-.15,.06);tail.push(p);p=piv(p,0,0,-.28)}
 root.scale.setScalar(.82);return {root,body,torso,head,face,fm,legs,arms,tail,o:{hair:0x4a3a2e,skin:0,animal:1},ph:0,blink:2,mode:'open'}}
export const AV=[
 {n:'Aventureiro 1',skin:0xf0c8a0,hair:0x5a3a22,style:'short'},
 {n:'Aventureiro 2',skin:0x8d5a3b,hair:0x1b1b1b,style:'afro'},
 {n:'Aventureiro 3',skin:0xf2cfb0,hair:0xC4501B,style:'curly',glasses:1,eye:'#3a6aa0'},
 {n:'Aventureira 1',skin:0xeab98f,hair:0x4a2a1a,style:'long',skirt:1},
 {n:'Aventureira 2',skin:0x8d5a3b,hair:0x1b1b1b,style:'pony',skirt:1,bow:1},
 {n:'Aventureira 3',skin:0xf2cfb0,hair:0xE3B85A,style:'long',skirt:1,eye:'#4a7a3a',brow:0xb8862e}];
export function animate(c,dt,s){c.ph+=dt*(s.walk?9+s.speed*1.2:2);const w=s.walk?Math.sin(c.ph)*Math.min(.85,.25+s.speed*.1):0;
 c.legs[0].rotation.x=lerp(c.legs[0].rotation.x,s.air?-.5:s.swim?Math.sin(c.ph*1.3)*.6:w,.3);c.legs[1].rotation.x=lerp(c.legs[1].rotation.x,s.air?.3:s.swim?-Math.sin(c.ph*1.3)*.6:-w,.3);
 const ar=s.air?-2.6:s.swim?-1.6+Math.sin(c.ph*1.3)*.9:s.wave?-2.6+Math.sin(c.ph*6)*.3:-w*.9;c.arms[0].rotation.x=lerp(c.arms[0].rotation.x,s.wave?0:ar,.25);c.arms[1].rotation.x=lerp(c.arms[1].rotation.x,s.swim?-1.6-Math.sin(c.ph*1.3)*.9:s.air?-2.6:w*.9,.25);
 c.arms[0].rotation.z=lerp(c.arms[0].rotation.z,s.wave?-2.5:s.air?-.3:-.06,.2);c.arms[1].rotation.z=lerp(c.arms[1].rotation.z,s.air?.3:.06,.2);
 c.body.position.y=s.walk&&!s.air?Math.abs(Math.sin(c.ph))*.09:Math.sin(c.ph)*.015;c.torso.scale.y=1+(s.walk?0:Math.sin(c.ph)*.012);
 c.blink-=dt;let m=s.mode||'open';if(c.blink<0){m='blink';if(c.blink<-.12)c.blink=rr(2,5)}if(m!==c.mode){c.mode=m;c.fm.map=faceTex(c.o,m);c.fm.needsUpdate=true}
 if(c.tail)c.tail.forEach((t,i)=>{t.rotation.x=i?.22+Math.sin(c.ph*1.5-i*.6)*.08:-.9})}

