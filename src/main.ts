// @ts-nocheck -- portado da demo jogável (HTML único). Próximo passo: dividir em world/builders e tipar.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
import { clamp, lerp, sm, angLerp, rnd, rr, setSeed } from './engine/math';
import { LAKE, HILL, WY, SURF, EDGE, PATHS, pathD, H } from './world/terrain';
import { EMB, ROOT, tex, decal, canvasTex, plate, FONT } from './world/textures';
import { mat, rg, part, piv, faceTex, makeKid, makeTico, AV, animate } from './world/builders/kid';
import { sfx, setSoundEnabled } from './engine/audio';
import { createSave } from './persistence/save';
import { newGuide, guideStep, guideProgress, guideReset, guideSnooze } from './game/guidance';
import { breathStep, breathColor } from './game/breath';

try{await Promise.race([document.fonts.load('600 40px "Fredoka"'),new Promise(r=>setTimeout(r,1800))])}catch(e){}
const T=THREE,$=id=>document.getElementById(id),body=document.body;
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE=matchMedia('(pointer: coarse)').matches;
const SAVE=createSave();
$('macro').src=EMB.macro.src;
/* ---------- renderizador ---------- */
let R;
try{R=new T.WebGLRenderer({canvas:$('c'),antialias:true,powerPreference:'high-performance'})}catch(e){$('err').style.display='flex';$('err').textContent='Este aparelho não conseguiu abrir o 3D.';throw e}
let PR=Math.min(devicePixelRatio||1,MOBILE?1.5:2);R.setPixelRatio(PR);
R.toneMapping=T.NeutralToneMapping;R.toneMappingExposure=1.05;
R.shadowMap.enabled=true;R.shadowMap.type=T.PCFShadowMap;
const scene=new T.Scene();ROOT.o=scene;
const cam=new T.PerspectiveCamera(50,1,.1,700);
const SKYTOP=new T.Color(0x3f8fdc),HORIZON=new T.Color(0xcfe9f5),FOGC=new T.Color(0xc4e2f0);
scene.fog=new T.Fog(FOGC,70,210);
{const pm=new T.PMREMGenerator(R),re=new RoomEnvironment();scene.environment=pm.fromScene(re,.04).texture;scene.environmentIntensity=.35;re.dispose();pm.dispose()}
const hemi=new T.HemisphereLight(0xd8efff,0x6f8a4e,1.15);scene.add(hemi);
const sun=new T.DirectionalLight(0xfff0d2,2.7);sun.castShadow=true;const SM=MOBILE?1024:2048;sun.shadow.mapSize.set(SM,SM);
Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:120});sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;
scene.add(sun,sun.target);const SUNDIR=new T.Vector3(-.55,.72,.42).normalize();

/* céu em degradê com sol */
{const g=new T.SphereGeometry(500,32,16);const m=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:SKYTOP},hor:{value:HORIZON},sd:{value:SUNDIR}},
vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}',
fragmentShader:'uniform vec3 top,hor,sd;varying vec3 vD;void main(){float y=max(vD.y,0.);vec3 c=mix(hor,top,pow(y,.55));float s=max(dot(normalize(vD),sd),0.);c+=vec3(1.,.9,.7)*(pow(s,600.)*3.+pow(s,12.)*.25);if(vD.y<0.)c=mix(hor,vec3(.55,.68,.5),min(-vD.y*3.,1.));gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
const sky=new T.Mesh(g,m);sky.frustumCulled=false;sky.renderOrder=-1;scene.add(sky);scene.userData.sky=sky}

/* ---------- construtor de geometria agrupada ---------- */
const _o=new T.Object3D(),_c=new T.Color();
const GC={};
function geoBox(w,h,d,r){const k=[w,h,d,r].join();if(GC[k])return GC[k];let g;if(r>0)g=new RoundedBoxGeometry(w,h,d,1,Math.min(r,Math.min(w,h,d)/2-.005));else g=new T.BoxGeometry(w,h,d).toNonIndexed();return GC[k]=g}
class Batch{constructor(){this.l=[]}
 add(geo,color,x,y,z,ry=0,rx=0,rz=0,s=1,jit=.035){let g=geo.index?geo.toNonIndexed():geo.clone();for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
  _o.position.set(x,y,z);_o.rotation.set(rx,ry,rz);if(typeof s==='number')_o.scale.setScalar(s);else _o.scale.set(...s);_o.updateMatrix();g.applyMatrix4(_o.matrix);
  _c.set(color);if(jit)_c.offsetHSL(0,0,(rnd()-.5)*jit);const n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=_c.r;a[i*3+1]=_c.g;a[i*3+2]=_c.b}g.setAttribute('color',new T.BufferAttribute(a,3));this.l.push(g);return g}
 box(w,h,d,c,x,y,z,o={}){return this.add(geoBox(w,h,d,o.r||0),c,x,y,z,o.ry||0,o.rx||0,o.rz||0,1,o.j)}
 mesh(mat,shadow=true){const g=mergeGeometries(this.l,false);this.l.forEach(x=>x.dispose());this.l=[];const m=new T.Mesh(g,mat);m.castShadow=m.receiveShadow=shadow;scene.add(m);return m}}
const B=new Batch(),GLOW=new Batch(),FAR=new Batch();
const matStatic=new T.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:0});
const SEE={p:{value:new T.Vector2()},d:{value:0},r:{value:0}};
matStatic.onBeforeCompile=s=>{s.uniforms.uSeeP=SEE.p;s.uniforms.uSeeD=SEE.d;s.uniforms.uSeeR=SEE.r;
 s.fragmentShader='uniform vec2 uSeeP;uniform float uSeeD,uSeeR;\n'+s.fragmentShader.replace('void main() {','void main() {\n if(vViewPosition.z<1.8){float n0=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(n0>(vViewPosition.z-.6)/1.2)discard;}\n if(uSeeR>0.&&vViewPosition.z<uSeeD-1.1){float k=length(gl_FragCoord.xy-uSeeP)/uSeeR;if(k<1.){float n=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(n>smoothstep(.45,1.,k)*1.05)discard;}}')};
const COL=[],CIRC=[];
function solid(x,z,w,d,top,stand=false){COL.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,top,stand})}
function bx(w,h,d,c,x,y,z,o={}){B.box(w,h,d,c,x,y,z,o);if(o.col)solid(x,z,o.ry?Math.max(w,d):w,o.ry?Math.max(w,d):d,y+h/2,o.col==='top')}

/* ---------- terreno ---------- */
const terrain=(()=>{const S=96,N=MOBILE?120:168,g=new T.PlaneGeometry(S,S,N,N);g.rotateX(-Math.PI/2);const p=g.attributes.position,cl=new Float32Array(p.count*3),c=new T.Color();
 const G1=new T.Color(0x6f9a52),G2=new T.Color(0x86ad5c),SAND=new T.Color(0xe6d29a),DIRT=new T.Color(0xc9a46c),DEEP=new T.Color(0x6d8f86),HILLC=new T.Color(0x7aa85a);
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=H(x,z);p.setY(i,y);const pd=pathD(x,z),cd=Math.hypot(x,z-1),dl=Math.hypot(x-LAKE.x,(z-LAKE.z)*1.12);
  const ck=((Math.floor(x/2)+Math.floor(z/2))&1)?.025:-.025,nz=Math.sin(x*.9)*Math.cos(z*.8)*.5+.5;
  c.copy(G1).lerp(G2,nz).offsetHSL(0,0,ck);
  if(Math.hypot(x-HILL.x,z-HILL.z)<14)c.lerp(HILLC,.35);
  if(cd<7.5)c.lerp(DIRT,(1-sm(5.5,7.5,cd))*.75);
  if(pd<1.7)c.lerp(DIRT,1-sm(1.1,1.7,pd));
  if(y<WY+.45)c.lerp(SAND,1-sm(WY+.1,WY+.45,y));
  if(y<WY-.3)c.lerp(DEEP,sm(WY-.3,-2.6,y));
  if(dl<LAKE.r+2.2&&y>=WY+.45)c.lerp(SAND,(1-sm(LAKE.r+.6,LAKE.r+2.2,dl))*.6);
  cl[i*3]=c.r;cl[i*3+1]=c.g;cl[i*3+2]=c.b}
 g.setAttribute('color',new T.BufferAttribute(cl,3));g.computeVertexNormals();
 const m=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.95}));m.receiveShadow=true;scene.add(m);return m})();

/* ---------- água ---------- */
const uTime={value:0};
const water=(()=>{const S=30,N=60,g=new T.PlaneGeometry(S,S,N,N);g.rotateX(-Math.PI/2);g.translate(LAKE.x,WY,LAKE.z);const p=g.attributes.position,d=new Float32Array(p.count);
 for(let i=0;i<p.count;i++)d[i]=WY-H(p.getX(i),p.getZ(i));g.setAttribute('depth',new T.BufferAttribute(d,1));
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uT:uTime,sh:{value:new T.Color(0x5fd3d6)},dp:{value:new T.Color(0x1f6fb0)},fm:{value:new T.Color(0xffffff)},sk:{value:HORIZON},fc:{value:FOGC},fn:{value:70},ff:{value:210}},
 vertexShader:'attribute float depth;varying float vD;varying vec3 vP;uniform float uT;void main(){vD=depth;vec4 w=modelMatrix*vec4(position,1.);w.y+=sin(w.x*.9+uT*1.4)*.03+cos(w.z*.8+uT*1.1)*.03;vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
 fragmentShader:'uniform float uT,fn,ff;uniform vec3 sh,dp,fm,sk,fc;varying float vD;varying vec3 vP;void main(){if(vD<-.05)discard;vec2 q=vP.xz;float n=sin(q.x*1.3+uT)*sin(q.y*1.1-uT*.8)+.5*sin((q.x+q.y)*2.3+uT*1.7)+.35*sin(q.x*3.7-q.y*2.9-uT*2.);float d=clamp(vD/2.6,0.,1.);vec3 c=mix(sh,dp,smoothstep(0.,1.,d));float fo=1.-smoothstep(.0,.28+.07*n,vD);c=mix(c,fm,fo*.9);c+=vec3(1.)*pow(max(0.,n*.55),5.)*.6*(1.-fo);vec3 V=normalize(cameraPosition-vP);float fr=pow(1.-clamp(V.y,0.,1.),3.);c=mix(c,sk,fr*.55);float a=mix(.5,.86,d);a=max(a,fo*.95);float f=smoothstep(fn,ff,length(cameraPosition-vP));c=mix(c,fc,f);gl_FragColor=vec4(c,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 const w=new T.Mesh(g,m);w.renderOrder=2;scene.add(w);return w})();

/* ---------- interações ---------- */
const INTER=[];
const pickMat=new T.MeshBasicMaterial({visible:false});
function inter(o){const m=new T.Mesh(new T.BoxGeometry(o.w||2,o.h||3,o.w||2),pickMat);m.position.set(o.x,(o.y??H(o.x,o.z))+(o.h||3)/2,o.z);m.userData.inter=o;scene.add(m);o.mesh=m;INTER.push(o);return o}

/* ---------- elementos do cenário ---------- */
const WOOD=0x8a5a34,WOODD=0x5e3d22,STONE=0xa9a59a,LEAF=[0x4f8a45,0x5f9a4c,0x3f7a44,0x6aa652];
function tree(x,z,s=1,kind=0){const y=H(x,z);
 if(kind===1){B.box(.5*s,1.4*s,.5*s,WOODD,x,y+.7*s,z);[2.6,2.0,1.4,.8].forEach((w,i)=>B.box(w*s,.9*s,w*s,0x3d7448,x,y+(1.6+i*.75)*s,z,{ry:Math.PI/4*(i%2),r:.08}));}
 else{B.box(.62*s,2*s,.62*s,WOOD,x,y+1*s,z,{r:.06});const c=LEAF[Math.floor(rnd()*4)];B.box(2.7*s,1.8*s,2.7*s,c,x,y+2.6*s,z,{r:.25,ry:rnd()*.4});B.box(1.9*s,1.3*s,1.9*s,c,x+.15*s,y+3.8*s,z-.1*s,{r:.22,ry:rnd()});
  if(kind===2)for(let i=0;i<5;i++)B.box(.28,.28,.28,0xf08a2c,x+rr(-1.2,1.2)*s,y+rr(2,3.2)*s,z+1.36*s*(rnd()<.5?1:-1),{r:.06})}
 CIRC.push({x,z,r:.55*s,top:y+3*s})}
function rock(x,z,s=1,stand=true){const y=H(x,z);B.box(1.4*s,.9*s,1.2*s,STONE,x,y+.3*s,z,{r:.25*s,ry:rnd()*3});B.box(.8*s,.6*s,.7*s,0xbab6ab,x+.3*s,y+.7*s,z+.1,{r:.18*s,ry:rnd()*3});if(stand)solid(x,z,1.2*s,1.0*s,y+.75*s,true)}
function bush(x,z,s=1){const y=H(x,z),c=LEAF[Math.floor(rnd()*4)];B.box(1.3*s,.9*s,1.1*s,c,x,y+.4*s,z,{r:.3*s,ry:rnd()*3});B.box(.9*s,.7*s,.9*s,c,x+.4*s,y+.55*s,z+.2,{r:.25*s,ry:rnd()*3});if(rnd()<.5)for(let i=0;i<3;i++)B.box(.16,.16,.16,[0xffffff,0xf7d14c,0xf29ab0][i],x+rr(-.5,.5)*s,y+.92*s,z+rr(-.4,.4)*s)}
function lamp(x,z){const y=H(x,z);B.box(.22,2.6,.22,WOODD,x,y+1.3,z);B.box(.5,.12,.5,0x3a2a1c,x,y+2.65,z);GLOW.box(.36,.42,.36,0xffd27a,x,y+2.38,z);B.box(.5,.1,.5,0x3a2a1c,x,y+2.12,z);CIRC.push({x,z,r:.25,top:y+2.7})}
function fence(x,z,ry,len){const n=Math.round(len/2);for(let i=0;i<=n;i++){const t=i/n-.5,px=x+Math.cos(ry)*len*t,pz=z-Math.sin(ry)*len*t;B.box(.26,1.3,.26,WOOD,px,H(px,pz)+.55,pz,{r:.05})}
 const y=(H(x+Math.cos(ry)*len/2,z-Math.sin(ry)*len/2)+H(x-Math.cos(ry)*len/2,z+Math.sin(ry)*len/2))/2;B.box(len,.16,.12,0xa2724a,x,y+.95,z,{ry});B.box(len,.16,.12,0xa2724a,x,y+.5,z,{ry})}
function bunting(x1,y1,z1,x2,y2,z2,n=10){for(let i=0;i<n;i++){const t=(i+.5)/n,x=lerp(x1,x2,t),z=lerp(z1,z2,t),y=lerp(y1,y2,t)-Math.sin(t*Math.PI)*.5;const g=new T.ConeGeometry(.22,.42,3);B.add(g,i%2?0xffffff:0x6E2638,x,y-.2,z,Math.atan2(x2-x1,z2-z1)+Math.PI/2,Math.PI,0,[1,1,.25],0)}}

/* portão de entrada */
{const z=36,y=H(0,z);[-3.2,3.2].forEach(x=>{B.box(.7,4.6,.7,WOOD,x,y+2.3,z,{r:.12});B.box(1,.35,1,WOODD,x,y+4.7,z,{r:.1});solid(x,z,.8,.8,y+5)});
 B.box(7.6,.9,.5,WOODD,0,y+4.1,z,{r:.12});
 plate('aventuráVerso',5.2,.75,'#172D49','#ffe9b0',0,y+4.1,z+.27,0,{border:'#D7A64D'});plate('aventuráVerso',5.2,.75,'#172D49','#ffe9b0',0,y+4.1,z-.27,Math.PI,{border:'#D7A64D'});
 decal('a1',1.15,0,y+5.25,z+.05);B.box(1.5,1.4,.12,0xf6f0e2,0,y+5.25,z-.02,{r:.08});
 bunting(-3.2,y+3.6,z,3.2,y+3.6,z,9);fence(-8.2,z,0,9.4);fence(8.2,z,0,9.4)}
/* árvores e enfeites */
const avoid=[[0,1,10],[0,25,7],[HILL.x,HILL.z,13],[LAKE.x,LAKE.z,12],[24,-22,7],[0,36,6],[-9,-19,4],[10,-19,4]];
function free(x,z,pad=0){if(Math.hypot(x,z)>EDGE-3)return false;if(pathD(x,z)<3.2+pad)return false;for(const a of avoid)if(Math.hypot(x-a[0],z-a[1])<a[2]+pad)return false;return true}
setSeed(21);
for(let i=0,n=0;i<900&&n<50;i++){const x=rr(14,38),z=rr(-6,28);if(!free(x,z,.8))continue;if(CIRC.some(c=>Math.hypot(c.x-x,c.z-z)<4.3))continue;tree(x,z,rr(.85,1.25),rnd()<.25?1:rnd()<.12?2:0);n++}
for(let i=0,n=0;i<900&&n<46;i++){const a=rnd()*Math.PI*2,d=rr(24,EDGE-2),x=Math.cos(a)*d,z=Math.sin(a)*d;if(!free(x,z,.5)||(x>14&&z>-6&&z<28))continue;if(CIRC.some(c=>Math.hypot(c.x-x,c.z-z)<3.4))continue;tree(x,z,rr(.9,1.35),rnd()<.35?1:0);n++}
for(let i=0,n=0;i<600&&n<34;i++){const x=rr(-38,38),z=rr(-38,38);if(!free(x,z))continue;bush(x,z,rr(.8,1.3));n++}
for(let i=0,n=0;i<400&&n<14;i++){const x=rr(-36,36),z=rr(-36,36);if(!free(x,z,.5))continue;rock(x,z,rr(.7,1.3));n++}
[[-4,26],[4,20],[-4,14],[4,-10],[-3,-16],[-11,5],[11,5],[15,-14]].forEach(p=>lamp(...p));
/* cerca do limite, discreta */
for(let i=0;i<48;i++){const a=i/48*Math.PI*2,a2=(i+1)/48*Math.PI*2,r=EDGE+.5,x=(Math.cos(a)+Math.cos(a2))/2*r,z=(Math.sin(a)+Math.sin(a2))/2*r;if(Math.abs(x)<5&&z>30)continue;fence(x,z,-(a+a2)/2+Math.PI/2,2*r*Math.sin(Math.PI/48))}
/* morros ao longe */
setSeed(5);for(let i=0;i<34;i++){const a=i/34*Math.PI*2+rr(-.05,.05),d=rr(72,96),s=rr(10,22),x=Math.cos(a)*d,z=Math.sin(a)*d;FAR.add(new T.ConeGeometry(s,s*rr(.55,.9),6),[0x6f9a5c,0x5f8c58,0x7da868,0x8ab07a][i%4],x,s*.3-3,z,rnd(),0,0,1,.05)}
for(let i=0;i<40;i++){const a=rnd()*Math.PI*2,d=rr(52,66),x=Math.cos(a)*d,z=Math.sin(a)*d,s=rr(1.1,1.8);FAR.add(geoBox(2.6,2,2.6,.3),LEAF[i%4],x,H(x,z)+2.2*s,z,rnd(),0,0,s,.05);FAR.add(geoBox(.6,2,.6,0),WOOD,x,H(x,z)+.8*s,z,0,0,0,s,0)}

/* ---------- Clareira das Tendas ---------- */
const CLASSES=[{k:'abe',n:'Abelhinhas',age:6,c:0x25AAE1,d:'organização, trabalho e dedicação na causa de Deus.'},{k:'lum',n:'Luminares',age:7,c:0xF26522,d:'Jesus como direção e guia que ilumina e brilha na vida da criança.'},{k:'edi',n:'Edificadores',age:8,c:0x2E3192,d:'edificação do caráter infantil para Jesus.'},{k:'mao',n:'Mãos Ajudadoras',age:9,c:0x6B0006,d:'união, amizade e companheirismo.'}];
CLASSES.forEach((k,i)=>{const a=-.95+i*.633,x=Math.sin(a)*12.5,z=1-Math.cos(a)*12.5+1,ry=-a,y=H(x,z);
 const tg=new T.ConeGeometry(3,3.1,4,1);B.add(tg,k.c,x,y+1.55,z,ry+Math.PI/4,0,0,1,.02);
 const door=new T.ConeGeometry(1.05,1.9,3,1);B.add(door,0x2a2230,x+Math.sin(ry)*1.6,y+.95,z+Math.cos(ry)*1.6,ry,0,0,[1,1,.25],0);
 B.box(.16,3.6,.16,WOODD,x,y+1.8,z);B.box(3.6,.18,3.6,0xe8dcc0,x,y+.09,z,{ry:ry+Math.PI/4});
 solid(x,z,3.3,3.3,y+3);
 const sx=x+Math.sin(ry)*3.2,sz=z+Math.cos(ry)*3.2,sy=H(sx,sz);B.box(.2,1.7,.2,WOODD,sx-Math.cos(ry)*.7,sy+.85,sz+Math.sin(ry)*.7);B.box(.2,1.7,.2,WOODD,sx+Math.cos(ry)*.7,sy+.85,sz-Math.sin(ry)*.7);
 B.box(1.9,1.9,.14,0xf6f0e2,sx,sy+1.9,sz,{ry,r:.06});decal(k.k,1.5,sx+Math.sin(ry)*.08,sy+2.05,sz+Math.cos(ry)*.08,ry);
 plate(k.n,1.8,.36,'#'+new T.Color(k.c).getHexString(),'#fff',sx+Math.sin(ry)*.09,sy+1.06,sz+Math.cos(ry)*.09,ry);
 inter({x:sx,z:sz,w:2.4,h:3,name:'Tenda dos '+k.n,label:'Ver a tenda',who:'Clube de Aventureiros',text:`Classe para crianças de ${k.age} anos. O símbolo comunica ${k.d}`})});
/* mastro e bandeira */
const flag=(()=>{const x=9,z=8,y=H(x,z);B.box(.9,.5,.9,STONE,x,y+.25,z,{r:.12});B.box(.22,8.4,.22,0xeeeeee,x,y+4.4,z,{r:.08});B.box(.4,.4,.4,0xD7A64D,x,y+8.7,z,{r:.18});solid(x,z,.9,.9,y+8);
 const a1=new Image();a1.src=EMB.a1.src;const t=canvasTex(600,400,()=>{});const c=t.image,g=c.getContext('2d');
 const draw=()=>{g.fillStyle='#6E2638';g.fillRect(0,0,300,200);g.fillRect(300,200,300,200);g.fillStyle='#fff';g.fillRect(300,0,300,200);g.fillRect(0,200,300,200);const eh=150,ew=eh*EMB.a1.w/EMB.a1.h;g.drawImage(a1,300-ew/2,200-eh/2,ew,eh);g.fillStyle='#fff';g.font=`600 26px ${FONT}`;g.textAlign='right';g.fillText('NOME DO CLUBE',585,380);t.needsUpdate=true};
 a1.onload=draw;document.fonts&&document.fonts.ready.then(draw);
 const geo=new T.PlaneGeometry(3,2,16,1);geo.translate(1.5,0,0);const m=new T.MeshStandardMaterial({map:t,side:T.DoubleSide,roughness:.8});
 m.onBeforeCompile=s=>{s.uniforms.uT=uTime;s.vertexShader='uniform float uT;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat k=position.x/3.;transformed.z+=sin(position.x*2.2-uT*4.)*.18*k;transformed.y+=sin(position.x*1.7-uT*3.)*.05*k;')};
 const f=new T.Mesh(geo,m);f.position.set(x+.12,y+7.3,z);f.castShadow=true;scene.add(f);
 inter({x,z,w:2,h:4,name:'Bandeira do Clube',label:'Ver a bandeira',who:'Clube de Aventureiros',text:'Quatro retângulos iguais, dois vinho e dois brancos, com o emblema no centro e o nome do Clube no canto. Aqui vai aparecer o nome do seu clube.'});return f})();
/* fogueira */
const fire=(()=>{const y=H(0,1);for(let i=0;i<9;i++){const a=i/9*Math.PI*2;B.box(.55,.4,.5,0x8d8a82,Math.cos(a)*1.05,y+.2,1+Math.sin(a)*1.05,{r:.15,ry:a})}
 [0,1.05,2.1].forEach(a=>B.box(1.5,.28,.28,0x6b4226,0,y+.3,1,{ry:a,r:.08}));solid(0,1,2.2,2.2,y+.4);
 const g=new T.Group();g.position.set(0,y+.35,1);[[.55,1.2,0xff7a1a],[.38,.9,0xffb02e],[.22,.6,0xfff1a8]].forEach(([r,h,c])=>{const m=new T.Mesh(new T.ConeGeometry(r,h,5),new T.MeshBasicMaterial({color:c}));m.position.y=h/2;g.add(m)});scene.add(g);
 const L=new T.PointLight(0xffa040,6,10,1.6);L.position.set(0,y+1.4,1);scene.add(L);
 [[0,1,3.3,0],[0,1,-3.3+1.6,0],[-3.3,1,0,Math.PI/2],[3.3,1,0,Math.PI/2]].forEach(([dx,_,dz,r],i)=>{if(i===1)return;const x=dx,z=1+dz,yy=H(x,z);B.box(r?.6:2.6,.45,r?2.6:.6,0x7b4e2c,x,yy+.32,z,{r:.12});solid(x,z,r?.6:2.6,r?2.6:.6,yy+.55,true)});
 return {g,L}})();
/* Mesa da Família */
{const x=-9,z=8,y=H(x,z);B.box(4.4,.22,1.5,0xa2724a,x,y+1.05,z,{r:.06});[[-1.9,-.55],[1.9,-.55],[-1.9,.55],[1.9,.55]].forEach(([a,b])=>B.box(.18,1,.18,WOODD,x+a,y+.5,z+b));
 [-1.25,1.25].forEach(b=>{B.box(4.2,.18,.5,0x9a6a40,x,y+.6,z+b,{r:.05});solid(x,z+b,4.2,.5,y+.69,true)});solid(x,z,4.4,1.5,y+1.16,true);
 for(let i=0;i<4;i++){const px=x-1.5+i;B.box(.5,.05,.5,0xffffff,px,y+1.19,z-.35,{r:.02});B.box(.22,.28,.22,[0x6E2638,0x25AAE1,0xF26522,0x66845B][i],px+.1,y+1.3,z+.35,{r:.05})}
 B.box(.5,.4,.4,0xd9a24c,x,y+1.36,z,{r:.12});
 inter({x,z,w:4.6,h:2,name:'Mesa da Família',label:'Ver a mesa',who:'Clube de Aventureiros',text:'Na Mesa da Família acontecem as missões feitas junto com a família.'})}
/* placas das quatro trilhas */
{const x=2.4,z=11,y=H(x,z);B.box(.3,3.6,.3,WOODD,x,y+1.8,z,{r:.06});solid(x,z,.4,.4,y+3.6);
 [['MEU DEUS','#1d4f9c',3.1,.5],['MEU EU','#2f8a3e',2.55,-.6],['MINHA FAMÍLIA','#6E2638',2.0,.9],['MEU MUNDO','#c98f1f',1.45,-1.2]].forEach(([t,c,h,ry])=>{const g=new T.Group();g.position.set(x,y+h,z);g.rotation.y=ry;scene.add(g);
  const sh=new T.Shape();sh.moveTo(0,-.24);sh.lineTo(2,-.24);sh.lineTo(2.35,0);sh.lineTo(2,.24);sh.lineTo(0,.24);const eg=new T.ExtrudeGeometry(sh,{depth:.12,bevelEnabled:false});eg.translate(.1,0,-.06);
  const m=new T.Mesh(eg,new T.MeshStandardMaterial({color:0x9a6a40,roughness:.8}));m.castShadow=true;g.add(m);plate(t,1.9,.36,c,'#fff',1.15,0,.07,0,{parent:g});plate(t,1.9,.36,c,'#fff',1.15,0,-.07,Math.PI,{parent:g})});
 inter({x,z,w:2.5,h:4,name:'As quatro trilhas',label:'Ler as placas',who:'Clube de Aventureiros',text:'Meu Deus, Meu Eu, Minha Família e Meu Mundo. Cada missão do acampamento segue uma dessas trilhas.'})}
/* bandeirolas da clareira */
{const P=[[-7,-1],[-4.5,-6],[4.5,-6],[7,-1],[6,6]];P.forEach(([x,z])=>{B.box(.2,3.4,.2,WOODD,x,H(x,z)+1.7,z);CIRC.push({x,z,r:.2,top:H(x,z)+3.4})});for(let i=0;i<P.length-1;i++){const[a,b]=[P[i],P[i+1]];bunting(a[0],H(...a)+3.3,a[1],b[0],H(...b)+3.3,b[1],8)}}

/* ---------- Colina do Globo ---------- */
const HY=H(HILL.x,HILL.z);
const globe=(()=>{const x=HILL.x,z=HILL.z-1;for(let i=0;i<3;i++)B.box(3.6-i*.9,.5,3.6-i*.9,i%2?0xd9d2c0:0xbdb6a6,x,HY+.25+i*.5,z,{r:.1});solid(x,z,3.6,3.6,HY+1.5);
 const g=new T.Group();g.position.set(x,HY+3.6,z);scene.add(g);
 const core=new T.Mesh(new T.IcosahedronGeometry(.85,2),new T.MeshStandardMaterial({color:0xD7A64D,emissive:0xD7A64D,emissiveIntensity:.15,roughness:.4}));g.add(core);
 const glass=new T.Mesh(new T.SphereGeometry(1.75,40,24),new T.MeshStandardMaterial({color:0xcfe8ff,transparent:true,opacity:.28,roughness:.05,metalness:.1,envMapIntensity:2.2,depthWrite:false}));g.add(glass);
 const ring=new T.Mesh(new T.TorusGeometry(2.2,.07,8,64),new T.MeshStandardMaterial({color:0xD7A64D,roughness:.35,metalness:.6}));ring.rotation.x=Math.PI/2.4;g.add(ring);
 inter({x,z,w:3.6,h:6,y:HY,name:'Globo do Éden',label:'Ver o Globo',who:'Tico',text:'O Globo do Éden está apagado. Ele vai se acender aos poucos, a cada dia da jornada.'});return {g,core,ring}})();
/* Livro dos Sete Dias */
{const x=0,z=HILL.z+5,y=H(x,z);B.box(.5,1.1,.5,WOODD,x,y+.55,z,{r:.06});B.box(1.5,.12,1,WOOD,x,y+1.15,z,{rx:-.35,r:.04});
 [-1,1].forEach(s=>{B.box(.66,.08,.84,0xfaf6ea,x+s*.36,y+1.27,z+.02,{rx:-.35,rz:s*.1,r:.03})});B.box(.06,.1,.86,0x6E2638,x,y+1.27,z+.02,{rx:-.35});solid(x,z,.6,.6,y+1.2);
 inter({x,z,w:1.6,h:2.2,name:'Livro dos Sete Dias',label:'Ver o Livro',who:'Tico',text:'As páginas do Livro dos Sete Dias sumiram! Cada missão vai ajudar a encontrá-las de novo.'})}
/* Quadros dos Ideais */
[['Voto','Acende no Dia 2.'],['Lei','Acende no Dia 3.'],['Voto à Bíblia','Acende no Dia 7.'],['Hino','Em breve.']].forEach(([t,w],i)=>{const a=-.95+i*.63,r=6.4,x=HILL.x+Math.sin(a)*r,z=HILL.z-1-Math.cos(a)*r*.75,y=H(x,z),ry=-a*.8;
 B.box(.2,2.2,.2,WOODD,x-Math.cos(ry)*.95,y+1.1,z+Math.sin(ry)*.95);B.box(.2,2.2,.2,WOODD,x+Math.cos(ry)*.95,y+1.1,z-Math.sin(ry)*.95);B.box(2.2,1.6,.16,0x7a5634,x,y+1.9,z,{ry,r:.06});solid(x,z,2.2,.4,y+2.7);
 plate(t+'\n·  ·  ·',1.85,1.25,'#dcd3c0','#8b8170',x+Math.sin(ry)*.09,y+1.9,z+Math.cos(ry)*.09,ry,{fs:44});
 inter({x,z,w:2.4,h:2.6,name:'Quadro: '+t,label:'Ver o quadro',who:'Quadros dos Ideais',text:`Este quadro ainda está apagado. ${w} Quando acender, você poderá ler e ouvir o texto aqui.`})});

/* ---------- portais ---------- */
function portal(x,z,c1,c2,title,open){const y=H(x,z),g=new T.Group();g.position.set(x,y,z);scene.add(g);
 const st=open?0xe9e1cf:0xd8c08c;for(let i=0;i<9;i++){const a=Math.PI*i/8,px=Math.cos(a)*2.4,py=2.4+Math.sin(a)*2.4;B.box(1,1,.9,i%2?st:0xcfc4a8,x+px,y+py,z,{rz:a,r:.12})}
 [-2.4,2.4].forEach(dx=>{B.box(1.1,2.4,1,st,x+dx,y+1.2,z,{r:.12});solid(x+dx,z,1.1,1,y+2.4)});B.box(6.4,.3,2.6,0xbdb6a6,x,y+.15,z,{r:.08});
 const m=new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,uniforms:{uT:uTime,a:{value:new T.Color(c1)},b:{value:new T.Color(c2)},op:{value:open?1:.45}},
 vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform float uT,op;uniform vec3 a,b;varying vec2 vU;void main(){vec2 p=vU*2.-1.;float r=length(p);if(r>1.)discard;float an=atan(p.y,p.x);float s=sin(an*5.+r*10.-uT*3.)*.5+.5;vec3 c=mix(a,b,s*(1.-r));c+=pow(1.-r,3.)*.7;float al=(1.-smoothstep(.85,1.,r))*(.55+.35*s)*op;gl_FragColor=vec4(c,al);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 const disc=new T.Mesh(new T.CircleGeometry(1.95,48),m);disc.position.y=2.4;disc.scale.y=1.18;g.add(disc);
 plate(title,4.2,.62,open?'#172D49':'#6b5a3c','#ffe9b0',0,5.6,.47,0,{parent:g,border:'#D7A64D'});
 const sp=sparkles(x,y+2.4,z,open?0xfff1b0:0xe8c98a,open?40:16,2.2);
 if(!open){const l=new T.Group();l.position.set(0,2.4,.6);g.add(l);const lm=new T.MeshStandardMaterial({color:0xD7A64D,metalness:.6,roughness:.35});const lb=new T.Mesh(new RoundedBoxGeometry(.9,.75,.3,2,.1),lm);l.add(lb);const sh=new T.Mesh(new T.TorusGeometry(.28,.09,8,16,Math.PI),lm);sh.position.y=.38;l.add(sh)}
 return {x,z,y,g,disc,sp,open}}
const sparkTex=canvasTex(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,245,200,.9)');r.addColorStop(1,'rgba(255,220,120,0)');g.fillStyle=r;g.fillRect(0,0,64,64)});
const SPARKS=[];
function sparkles(x,y,z,color,n,rad){const g=new T.BufferGeometry(),p=new Float32Array(n*3),s=[];for(let i=0;i<n;i++){s.push([rnd()*Math.PI*2,rr(.3,1)*rad,rnd(),rr(.4,1)])}g.setAttribute('position',new T.BufferAttribute(p,3));
 const m=new T.PointsMaterial({map:sparkTex,color,size:.35,transparent:true,depthWrite:false,blending:T.AdditiveBlending});const pts=new T.Points(g,m);pts.position.set(x,y,z);pts.frustumCulled=false;scene.add(pts);const o={pts,s,n,rad,boost:1};SPARKS.push(o);return o}
function tickSparks(t){for(const o of SPARKS){const p=o.pts.geometry.attributes.position;o.s.forEach((s,i)=>{const k=(s[2]+t*.18*s[3]*o.boost)%1,a=s[0]+t*.5*s[3];p.setXYZ(i,Math.cos(a)*s[1],(k-.5)*o.rad*2.2,Math.sin(a)*s[1]*.4)});p.needsUpdate=true;o.pts.material.size=.3+.15*Math.min(o.boost,3)}}
const PORT=[portal(-9,-19,0x7fd4ff,0xfff1a8,'Missão 1: A Luz',true),portal(10,-19,0xf2c46d,0xc98a3c,'Mundo 2',false)];
/* enfeite do mundo 2: pirâmide e palmeira em miniatura */
{const x=14.2,z=-17.2,y=H(x,z);for(let i=0;i<4;i++)B.box(2.4-i*.6,.5,2.4-i*.6,0xe3c27a,x,y+.25+i*.5,z,{r:.04});solid(x,z,2.4,2.4,y+1);
 const px=6,pz=-17,py=H(px,pz);for(let i=0;i<5;i++)B.box(.32,.6,.32,0xa77a48,px+i*.05,py+.3+i*.58,pz,{r:.06});for(let i=0;i<5;i++){const a=i/5*Math.PI*2;B.box(1.6,.12,.5,0x5aa34c,px+.2+Math.cos(a)*.75,py+3,pz+Math.sin(a)*.75,{ry:-a,rz:-.35,r:.04})}CIRC.push({x:px,z:pz,r:.3,top:py+3})}

/* ---------- Lago, cais, barco, vitórias-régias ---------- */
{const z=LAKE.z+1,x0=-14.5,x1=-22.5,y=WY+.42;for(let x=x0;x>=x1;x-=.62)B.box(.56,.14,2.2,0xb4875a,x,y,z,{r:.03,j:.08});
 for(let x=x0;x>=x1-.1;x-=2){[-1,1].forEach(s=>B.box(.24,2.6,.24,0x6b4a2e,x,y-1,z+s*1.05,{r:.05}))}COL.push({x0:x1-.3,x1:x0+.3,z0:z-1.1,z1:z+1.1,top:y+.07,stand:true});
 [-1,1].forEach(s=>{for(let x=x0;x>=x1;x-=2)B.box(.14,.7,.14,0x6b4a2e,x,y+.42,z+s*1.05);B.box(Math.abs(x1-x0),.12,.1,0x8a6040,(x0+x1)/2,y+.78,z+s*1.05)});
 const boat=new T.Group();boat.position.set(-24,WY+.05,LAKE.z+4.2);boat.rotation.y=.3;scene.add(boat);const bm=new T.MeshStandardMaterial({color:0xc65a3a,roughness:.7}),bw=new T.MeshStandardMaterial({color:0xf3e6c8,roughness:.8});
 [[2.8,.35,1.3,0,0,bm],[2.6,.5,.16,0,.3,.6],[2.6,.5,.16,0,.3,-.6],[.16,.5,1.3,1.3,.3,0],[.16,.5,1.3,-1.3,.3,0],[.4,.12,1.2,0,.4,0]].forEach(([w,h,d,x,y,z])=>{const m=new T.Mesh(new RoundedBoxGeometry(w,h,d,1,.05),typeof z==='object'?z:(h===.12?bw:bm));m.position.set(x,y,typeof z==='object'?0:z);m.castShadow=true;boat.add(m)});
 scene.userData.boat=boat;
 setSeed(33);for(let i=0;i<11;i++){const a=rnd()*Math.PI*2,d=rr(3,8),x=LAKE.x+Math.cos(a)*d,z=LAKE.z+Math.sin(a)*d*.9;if(Math.abs(z-LAKE.z-1)<1.6&&x>x1-1)continue;B.add(new T.CylinderGeometry(.62,.62,.06,10),0x4f9a4a,x,WY+.04,z,rnd()*6,0,0,1,.06);if(rnd()<.4)B.box(.22,.16,.22,0xf6a9c8,x+.15,WY+.12,z,{r:.07});COL.push({x0:x-.5,x1:x+.5,z0:z-.5,z1:z+.5,top:WY+.07,stand:true})}
 for(let i=0;i<26;i++){const a=rnd()*Math.PI*2,d=rr(9.2,10.6),x=LAKE.x+Math.cos(a)*d,z=LAKE.z+Math.sin(a)*d*.9;if(Math.abs(z-LAKE.z-1)<2&&x>-23)continue;const yy=H(x,z);for(let k=0;k<3;k++)B.box(.08,rr(.8,1.4),.08,0x5c8a3a,x+rr(-.2,.2),yy+.5,z+rr(-.2,.2),{rz:rr(-.15,.15)});if(rnd()<.5)B.box(.13,.36,.13,0x6b4426,x,yy+1.1,z,{r:.05})}
 for(let i=0;i<14;i++){const a=rnd()*Math.PI*2,d=rr(1,6),x=LAKE.x+Math.cos(a)*d,z=LAKE.z+Math.sin(a)*d*.9,yy=H(x,z);for(let k=0;k<3;k++)B.box(.14,rr(.6,1.5),.1,0x3d8c5c,x+k*.15,yy+.5,z,{rz:rr(-.2,.2)})}
 rock(LAKE.x+3,LAKE.z-2.5,.8,false);rock(LAKE.x-2,LAKE.z+3,1,false)}

/* ---------- Observatório ---------- */
const OBS={x:24,z:-22},OSTEPS=[[-6,3,1],[-6,1,2],[-6,-1,3],[-3.4,0,4]];
{const {x,z}=OBS,y=H(x,z);
 OSTEPS.forEach(([dx,dz,k])=>{const t=y+k*1.0;B.box(1.6,t-y+.1,1.6,k%2?0xd2c3a0:0xc1b08a,x+dx,(t+y)/2,z+dz,{r:.1});solid(x+dx,z+dz,1.6,1.6,t+.05,true)});
 [[-1.6,-1.6],[1.6,-1.6],[-1.6,1.6],[1.6,1.6]].forEach(([a,b])=>{B.box(.4,5,.4,0x7a5634,x+a,y+2.5,z+b,{r:.06});solid(x+a,z+b,.4,.4,y+4.9)});
 B.box(4.2,.35,4.2,0x9a6a40,x,y+5.05,z,{r:.08});COL.push({x0:x-2.1,x1:x+2.1,z0:z-2.1,z1:z+2.1,top:y+5.22,stand:true});
 [[0,-2],[0,2],[2,0]].forEach(([a,b])=>{B.box(a?.12:4.2,.8,b?.12:4.2,0x7a5634,x+a,y+5.6,z+b)});
 const dome=new T.Mesh(new T.SphereGeometry(1.3,24,12,0,Math.PI*2,0,Math.PI/2),new T.MeshStandardMaterial({color:0xe9e1cf,roughness:.5,metalness:.15}));dome.position.set(x+.6,y+5.22,z+.6);dome.castShadow=true;scene.add(dome);
 const tel=new T.Mesh(new T.CylinderGeometry(.22,.3,2,12),new T.MeshStandardMaterial({color:0x172D49,roughness:.35,metalness:.5}));tel.position.set(x+.9,y+6.5,z+.9);tel.rotation.set(-.6,0,.5);tel.castShadow=true;scene.add(tel);
 plate('Observatório',2.4,.45,'#172D49','#ffe9b0',x,y+4.4,z+2.15,0,{border:'#D7A64D'});
 inter({x:x-1,z:z-1,y:y+5.2,w:2.6,h:2.5,name:'Observatório',label:'Olhar o céu',who:'Tico',text:'Daqui de cima dá para ver o acampamento inteiro! Mais tarde, à noite, este telescópio vai mostrar as estrelas.'})}

/* ---------- Mata: cogumelos, troncos, tocos dourados ---------- */
setSeed(77);for(let i=0;i<14;i++){const x=rr(16,36),z=rr(-4,26);if(!free(x,z))continue;const y=H(x,z);B.box(.18,.4,.18,0xf3ead6,x,y+.2,z);B.box(.5,.26,.5,rnd()<.5?0xd8463c:0xe8a23c,x,y+.48,z,{r:.12});B.box(.1,.1,.1,0xffffff,x+.12,y+.62,z+.1)}
[[20,14,0],[30,4,1.2],[26,22,.4]].forEach(([x,z,r])=>{const y=H(x,z);B.add(new T.CylinderGeometry(.55,.55,3.6,10),0x7b5434,x,y+.5,z,r,0,Math.PI/2,1,.04);solid(x,z,r>.6?1.4:3.6,r>.6?3.6:1.1,y+1.02,true)});
const STUMPS=[[18.5,10],[31,15],[-12,-4]].map(([x,z])=>{const y=H(x,z);B.add(new T.CylinderGeometry(.9,1,1,12),0x8a5a34,x,y+.5,z,0,0,0,1,0);B.add(new T.CylinderGeometry(.82,.82,.05,12),0xe8c27a,x,y+1.01,z,0,0,0,1,0);
 const ring=new T.Mesh(new T.TorusGeometry(.7,.07,8,24),new T.MeshBasicMaterial({color:0xffd85c}));ring.rotation.x=-Math.PI/2;ring.position.set(x,y+1.06,z);scene.add(ring);solid(x,z,1.8,1.8,y+1.02,true);return {x,z,y:y+1.02,ring,used:false}});

/* ---------- grama e flores instanciadas ---------- */
const windMat=(base)=>{base.onBeforeCompile=s=>{s.uniforms.uT=uTime;s.vertexShader='uniform float uT;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 ip=instanceMatrix*vec4(0.,0.,0.,1.);float sw=sin(uT*1.8+ip.x*.6+ip.z*.4)*.12*max(position.y,0.);transformed.x+=sw;transformed.z+=sw*.6;')};return base};
{const blade=(n,hh)=>{const p=[],nn=[];for(let i=0;i<n;i++){const a=i/n*Math.PI+rr(-.3,.3),c=Math.cos(a)*.07,s2=Math.sin(a)*.07,lx=rr(-.12,.12),lz=rr(-.12,.12),h=hh*rr(.7,1.15);p.push(-c+lx,0,-s2+lz,c+lx,0,s2+lz,lx*1.8+rr(-.08,.08),h,lz*1.8);nn.push(0,1,0,0,1,0,0,1,0)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(nn,3));return g};
 const gg=blade(5,.42);const GRASS=[0x86b85e,0x93c266,0x79ad57,0x9cc46c];
 const N=MOBILE?2200:4200,im=new T.InstancedMesh(gg,windMat(new T.MeshStandardMaterial({roughness:.9,side:T.DoubleSide})),N),c=new T.Color();let k=0;setSeed(91);
 for(let i=0;i<N*4&&k<N;i++){const x=rr(-39,39),z=rr(-39,39);if(Math.hypot(x,z)>EDGE-1||pathD(x,z)<1.6||Math.hypot(x,z-1)<7||H(x,z)<WY+.35)continue;
  _o.position.set(x,H(x,z),z);_o.rotation.set(0,rnd()*6,0);_o.scale.setScalar(rr(.7,1.5));_o.updateMatrix();im.setMatrixAt(k,_o.matrix);im.setColorAt(k,c.setHex(GRASS[k%4]).offsetHSL(rr(-.02,.02),0,rr(-.04,.05)));k++}
 im.count=k;im.receiveShadow=true;scene.add(im);
 const fg=mergeGeometries([new T.BoxGeometry(.04,.5,.04).translate(0,.25,0).toNonIndexed(),new T.OctahedronGeometry(.13,0).translate(0,.54,0).toNonIndexed()].map(g=>{g.deleteAttribute('uv');return g}));
 const FN=MOBILE?260:480,fm=new T.InstancedMesh(fg,windMat(new T.MeshStandardMaterial({roughness:.7})),FN),FC=[0xffffff,0xf7d14c,0xf29ab0,0x9ec9ff,0xff9a52];k=0;
 for(let i=0;i<FN*5&&k<FN;i++){const x=rr(-39,39),z=rr(-39,39);if(!free(x,z,-1.2)||H(x,z)<WY+.4)continue;_o.position.set(x,H(x,z),z);_o.rotation.set(0,rnd()*6,0);_o.scale.setScalar(rr(.8,1.3));_o.updateMatrix();fm.setMatrixAt(k,_o.matrix);fm.setColorAt(k,c.setHex(FC[k%5]));k++}
 fm.count=k;scene.add(fm)}

/* nuvens */
const clouds=[];setSeed(4);for(let i=0;i<11;i++){const g=new T.Group();const m=new T.MeshStandardMaterial({color:0xffffff,roughness:1,emissive:0xffffff,emissiveIntensity:.25});
 for(let k=0;k<4;k++){const b=new T.Mesh(new RoundedBoxGeometry(rr(3,6),rr(1.6,2.6),rr(3,5),2,.8),m);b.position.set(k*2.2-3,rr(-.3,.6),rr(-1,1));g.add(b)}
 const a=rnd()*Math.PI*2,d=rr(35,110);g.position.set(Math.cos(a)*d,rr(26,40),Math.sin(a)*d);g.scale.setScalar(rr(1,1.8));scene.add(g);clouds.push(g)}

/* fecha as malhas agrupadas */
B.mesh(matStatic);GLOW.mesh(new T.MeshBasicMaterial({vertexColors:true}),false);const farM=FAR.mesh(matStatic,false);

/* NPCs */
const sol=makeKid({skin:0xc68863,hair:0x3a2216,style:'long',la1:1,scale:1.22,pants:0x1f3352,skirt:1});
sol.root.position.set(6.5,H(6.5,5.5),5.5);sol.root.rotation.y=-.6;scene.add(sol.root);
const ped=makeKid({skin:0xd9a47a,hair:0x2b1a10,style:'short',shirt:0xD7A64D,pants:0x5b6b8c,bare:1});
ped.root.position.set(-21.6,WY+.49,LAKE.z+1.4);ped.root.rotation.y=-1.9;scene.add(ped.root);
const tico=makeTico();tico.root.position.set(1.5,H(1.5,22),22);scene.add(tico.root);
const NPCS=[{c:sol,name:'Diretora Sol',lines:['Bem-vinda e bem-vindo ao Acampamento do Livro Aberto!','As páginas do Livro dos Sete Dias sumiram e o Globo do Éden está apagado.','O portal da primeira missão fica na Colina do Globo, ao norte. Antes, explore o acampamento e junte as moedas!']},
 {c:ped,name:'Pedrito',lines:['Oi! Eu sou o Pedrito. Estou visitando o acampamento.','Vi umas moedas brilhando lá no fundo do lago... Nade até o meio e aperte A para mergulhar!']}];
NPCS.forEach(n=>{const p=n.c.root.position;inter({x:p.x,z:p.z,y:p.y,w:1.6,h:3.4,name:n.name,label:'Conversar',who:n.name,lines:n.lines,npc:n})});

/* ---------- moedas ---------- */
const coinGeo=mergeGeometries([new T.CylinderGeometry(.48,.48,.14,24).rotateX(Math.PI/2).toNonIndexed(),new T.TorusGeometry(.34,.05,6,24).translate(0,0,.07).toNonIndexed(),new T.TorusGeometry(.34,.05,6,24).translate(0,0,-.07).toNonIndexed()]);
const coinMat=new T.MeshStandardMaterial({color:0xffc83d,metalness:.75,roughness:.28,emissive:0x7a4a00,emissiveIntensity:.35});
const COINS=[];
function addCoin(x,y,z,id){COINS.push({x,y,z,id,got:false,vy:0,fly:false})}
(()=>{const L=[];const g=(x,z,dy=1)=>L.push([x,H(x,z)+dy,z]);
 [33,30,18,15,12.4].forEach(z=>g(0,z));for(let i=0;i<4;i++)g(-6-i*2.6,3.6+i*.6);for(let i=0;i<4;i++)g(7+i*2.6,3.6+i*.8);
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2;L.push([LAKE.x+Math.cos(a)*2.6,-2.1,LAKE.z+Math.sin(a)*2.4])}L.push([LAKE.x,-2.4,LAKE.z]);L.push([-22.3,WY+1.6,LAKE.z+1]);
 for(let i=0;i<4;i++)g(0,-8-i*3.2);g(-3.5,HILL.z+4,1.2);g(3.5,HILL.z+4,1.2);
 const {x,z}=OBS,y=H(x,z);OSTEPS.forEach(([dx,dz,k])=>L.push([x+dx,y+k+1.1,z+dz]));L.push([x,y+6.4,z]);L.push([x-1.2,y+6.4,z-1.2]);
 L.push([0,H(0,1)+3.6,1]);L.push([-9,H(-9,8)+2.4,8]);L.push([28,H(28,8)+1,8]);L.push([22,H(22,20)+1,20]);L.push([33,H(33,-2)+1,-2]);
 L.push([-14,H(-14,-14)+1,-14]);L.push([-20,H(-20,-24)+1,-24]);L.push([16,H(16,28)+1,28]);
 L.forEach((p,i)=>addCoin(p[0],p[1],p[2],i))})();
const coinIM=new T.InstancedMesh(coinGeo,coinMat,COINS.length+9);coinIM.castShadow=true;coinIM.frustumCulled=false;scene.add(coinIM);
let saved=[...SAVE.data.coins];COINS.forEach(c=>{if(saved.includes(c.id))c.got=true});

/* ---------- partículas (poeira, brilho, bolhas, confete) ---------- */
const PART=[],partGeo=new T.PlaneGeometry(1,1);
const dustTex=canvasTex(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,.95)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64)});
function puff(x,y,z,o={}){const n=o.n||6;for(let i=0;i<n;i++){const m=new T.Sprite(new T.SpriteMaterial({map:o.tex||dustTex,color:o.color??0xf3e6cc,transparent:true,depthWrite:false,opacity:o.op??.8,blending:o.add?T.AdditiveBlending:T.NormalBlending}));
 const a=rnd()*Math.PI*2,sp=rr(.6,1)*(o.sp||2.4);m.position.set(x,y,z);m.scale.setScalar(o.s||.5);scene.add(m);PART.push({m,vx:Math.cos(a)*sp,vz:Math.sin(a)*sp,vy:rr(.4,1)*(o.up??1.5),t:0,life:o.life||.6,g:o.g??0,grow:o.grow??1.6,s:o.s||.5})}}
function tickParts(dt){for(let i=PART.length-1;i>=0;i--){const p=PART[i];p.t+=dt;p.vy-=p.g*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;p.vx*=.96;p.vz*=.96;const k=p.t/p.life;p.m.scale.setScalar(p.s*(1+k*p.grow));p.m.material.opacity=(1-k)*.85;if(k>=1){scene.remove(p.m);p.m.material.dispose();PART.splice(i,1)}}}
const ringFX=[];function shock(x,y,z,c=0xffffff){const m=new T.Mesh(new T.RingGeometry(.5,.85,32).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:c,transparent:true,depthWrite:false}));m.position.set(x,y+.06,z);scene.add(m);ringFX.push({m,t:0})}

/* ---------- jogador ---------- */
let avIdx=SAVE.data.avatar;let player=makeKid(AV[avIdx]);scene.add(player.root);
const P={x:0,y:0,z:22,vx:0,vz:0,vy:0,face:Math.PI,st:'ground',jn:0,bUsed:false,pound:false,boost:null,bDown:false,bT:0,breath:1,rise:false,sq:0,stepT:0,coy:0};
P.y=H(P.x,P.z);
function groundAt(x,z,y){let g=H(x,z),solidHit=false;for(const c of COL){if(x>c.x0-.15&&x<c.x1+.15&&z>c.z0-.15&&z<c.z1+.15&&c.top<=y+.42&&c.top>g)g=c.top}return g}
function collide(){const r=.42;for(const c of COL){if(P.y>=c.top-.05)continue;const nx=clamp(P.x,c.x0,c.x1),nz=clamp(P.z,c.z0,c.z1),dx=P.x-nx,dz=P.z-nz,d=Math.hypot(dx,dz);
  if(d<r){if(d>1e-4){P.x=nx+dx/d*r;P.z=nz+dz/d*r}else{const px=Math.min(P.x-c.x0,c.x1-P.x),pz=Math.min(P.z-c.z0,c.z1-P.z);if(px<pz)P.x=P.x-c.x0<c.x1-P.x?c.x0-r:c.x1+r;else P.z=P.z-c.z0<c.z1-P.z?c.z0-r:c.z1+r}}}
 for(const c of CIRC){if(P.y>=c.top)continue;const dx=P.x-c.x,dz=P.z-c.z,d=Math.hypot(dx,dz),m=c.r+.42;if(d<m&&d>0){P.x=c.x+dx/d*m;P.z=c.z+dz/d*m}}
 for(const n of NPCS){const p=n.c.root.position,dx=P.x-p.x,dz=P.z-p.z,d=Math.hypot(dx,dz);if(d<.9&&d>0&&Math.abs(P.y-p.y)<1.5){P.x=p.x+dx/d*.9;P.z=p.z+dz/d*.9}}
 const rr2=Math.hypot(P.x,P.z),lim=EDGE-1.2;if(rr2>lim){P.x*=lim/rr2;P.z*=lim/rr2}}
const isDeep=(x,z)=>H(x,z)<SURF;

/* ---------- câmera orbital ---------- */
const CAM={yaw:0,pitch:.58,dist:13,tdist:13,tx:0,ty:0,tz:22,lastDrag:-9};
function camUpdate(dt){if(CAM.want!=null){CAM.yaw=angLerp(CAM.yaw,CAM.want,Math.min(1,dt*4));if(!talking)CAM.want=null}const port=cam.aspect<1;const want=CAM.tdist*(port?1.25:1);CAM.dist=lerp(CAM.dist,want,Math.min(1,dt*6));
 const ty=P.st==='dive'?Math.max(P.y,WY-1):P.y;CAM.tx=lerp(CAM.tx,P.x,Math.min(1,dt*7));CAM.ty=lerp(CAM.ty,ty+1.6,Math.min(1,dt*5));CAM.tz=lerp(CAM.tz,P.z,Math.min(1,dt*7));
 let cx=CAM.tx+Math.sin(CAM.yaw)*Math.cos(CAM.pitch)*CAM.dist,cz=CAM.tz+Math.cos(CAM.yaw)*Math.cos(CAM.pitch)*CAM.dist,cy=CAM.ty+Math.sin(CAM.pitch)*CAM.dist;
 let gmin=Math.max(H(cx,cz)+1.2,WY+1);for(const c of COL)if(cx>c.x0-.4&&cx<c.x1+.4&&cz>c.z0-.4&&cz<c.z1+.4&&cy<c.top+.6&&c.top-H(cx,cz)<7)gmin=Math.max(gmin,c.top+.6);if(cy<gmin)cy=gmin;
 const sh=shake>0&&!RM?shake:0;cam.position.set(cx+(rnd()-.5)*sh,cy+(rnd()-.5)*sh,cz);cam.lookAt(CAM.tx,CAM.ty,CAM.tz)}
let shake=0;

/* ---------- entrada ---------- */
const K={},joy={x:0,y:0,on:false};let ctl=SAVE.data.controls,started=false,paused=false,attract=true;
function moveInput(){let x=joy.x,z=joy.y;if(K.KeyA||K.ArrowLeft)x-=1;if(K.KeyD||K.ArrowRight)x+=1;if(K.KeyW||K.ArrowUp)z-=1;if(K.KeyS||K.ArrowDown)z+=1;let m=Math.hypot(x,z);if(m>1){x/=m;z/=m;m=1}
 const s=Math.sin(CAM.yaw),c=Math.cos(CAM.yaw);return [x*c+z*s,-x*s+z*c,m]}
let target=null,pendingInter=null;
const mark=new T.Mesh(new T.RingGeometry(.32,.5,28).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xffe08a,transparent:true,depthWrite:false}));mark.visible=false;scene.add(mark);
const ray=new T.Raycaster(),nd=new T.Vector2();
const ptrs=new Map();let pinch=0;
const cv=$('c');
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now(),drag:false,btn:e.button});if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y)}});
cv.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
 if(!p.drag&&Math.hypot(p.x-p.sx,p.y-p.sy)>9)p.drag=true;
 if(ptrs.size===2){const [a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)CAM.tdist=clamp(CAM.tdist*pinch/d,7,22);pinch=d;return}
 if(p.drag){CAM.yaw-=dx*.0065;CAM.pitch=clamp(CAM.pitch+dy*.0045,.12,1.25);CAM.lastDrag=clock}});
const endPtr=e=>{const p=ptrs.get(e.pointerId);ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=0;if(!p||p.drag||performance.now()-p.t>450||!started||paused)return;tap(e.clientX,e.clientY)};
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);pinch=0});
cv.addEventListener('wheel',e=>{e.preventDefault();CAM.tdist=clamp(CAM.tdist*(1+Math.sign(e.deltaY)*.1),7,22)},{passive:false});
cv.addEventListener('contextmenu',e=>e.preventDefault());
function tap(cx,cy){nd.set(cx/innerWidth*2-1,-(cy/innerHeight)*2+1);ray.setFromCamera(nd,cam);
 const hi=ray.intersectObjects(INTER.map(i=>i.mesh),false)[0];if(hi){const o=hi.object.userData.inter;if(dist2(o)<3.4)interact(o);else{pendingInter=o;target={x:o.x,z:o.z+(o.npc?1.4:1.8)};showMark(target.x,target.z)}sfx('ui');return}
 const hit=ray.intersectObjects([terrain,water],false)[0];if(hit){pendingInter=null;target={x:hit.point.x,z:hit.point.z};showMark(target.x,target.z)}}
function showMark(x,z){mark.position.set(x,Math.max(H(x,z),WY)+.08,z);mark.visible=true;mark.scale.setScalar(1.6)}
const dist2=o=>Math.hypot(P.x-o.x,P.z-o.z);
addEventListener('keydown',e=>{if(e.repeat)return;K[e.code]=1;if(!started)return;if(paused){if(!(document.activeElement instanceof HTMLButtonElement)&&(e.code==='Enter'||e.code==='Space'||e.code==='Escape')){e.preventDefault();dlgNext()}return}
 if(e.code==='Space'){e.preventDefault();pressA()}if(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='KeyB')pressB();
 if((e.code==='Enter'||e.code==='KeyF')&&near){e.preventDefault();interact(near)}});
addEventListener('keyup',e=>{K[e.code]=0;if(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='KeyB')releaseB()});
function bindBtn(el,d,u){el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();el.classList.add('down');d()});['pointerup','pointercancel','pointerleave'].forEach(n=>el.addEventListener(n,()=>{if(el.classList.contains('down')){el.classList.remove('down');u()}}))}
bindBtn($('A'),pressA,()=>{});bindBtn($('B'),pressB,releaseB);
{const j=$('joy'),kn=$('knob');let id=null;const R0=70;
 const mv=e=>{const r=j.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const d=Math.hypot(dx,dy),max=r.width*.36,k=Math.min(1,d/max);if(d>0){dx/=d;dy/=d}const m=k<.12?0:Math.pow((k-.12)/.88,1.15);joy.x=dx*m;joy.y=dy*m;kn.style.transform=`translate(${dx*k*max}px,${dy*k*max}px)`};
 j.addEventListener('pointerdown',e=>{e.preventDefault();id=e.pointerId;j.setPointerCapture(id);joy.on=true;mv(e)});j.addEventListener('pointermove',e=>{if(e.pointerId===id)mv(e)});
 ['pointerup','pointercancel'].forEach(n=>j.addEventListener(n,e=>{if(e.pointerId!==id)return;id=null;joy.on=false;joy.x=joy.y=0;kn.style.transform=''}))}
function setCtl(v){ctl=v;SAVE.update({controls:v});['joy','A','B'].forEach(i=>$(i).classList.toggle('show',v));$('bc').setAttribute('aria-pressed',v)}

/* ---------- ações ---------- */
function pressA(){if(!started||paused)return;
 if(P.st==='ground'||P.coy>0){P.vy=10.8;P.st='air';P.jn=1;P.bUsed=false;P.pound=false;P.sq=-.25;P.coy=0;sfx('jump');puff(P.x,P.y+.1,P.z,{n:5,sp:1.6,up:.4})}
 else if(P.st==='swim'){P.st='dive';P.rise=false;P.vy=-3.2;sfx('splash');puff(P.x,WY+.1,P.z,{n:8,color:0xffffff,sp:2,up:2,g:4})}
 else if(P.st==='dive')P.rise=!P.rise}
function pressB(){if(!started||paused)return;P.bDown=true;P.bT=0;if(near&&P.st==='ground'&&!ctlCombo())interact(near)}
const ctlCombo=()=>false;
function releaseB(){if(P.bDown&&P.st==='air'&&!P.bUsed&&P.jn===1&&P.bT<.2){P.bUsed=true;P.jn=2;const sp=Math.hypot(P.vx,P.vz);if(sp>2.5){P.vy=8.5;P.boost=[Math.sin(P.face),Math.cos(P.face)];sfx('dive')}else{P.vy=13.4;sfx('jump2')}P.sq=-.35;puff(P.x,P.y,P.z,{n:6,sp:1.2,up:-.5,color:0xffffff})}P.bDown=false;P.bT=0}

/* ---------- Tico: falas e ajuda ---------- */
let ticoTimer=0;
function say(t,ms=6000,btns){$('tt').textContent=t;const b=$('tb');b.innerHTML='';(btns||[]).forEach(([n,f,alt])=>{const k=document.createElement('button');k.className='btn'+(alt?' alt':'');k.textContent=n;k.onclick=()=>{hideTico();f()};b.append(k)});$('tico').classList.add('show');clearTimeout(ticoTimer);if(ms)ticoTimer=setTimeout(hideTico,ms)}
function hideTico(){$('tico').classList.remove('show')}
const GUIDE=newGuide();
const OBJ=PORT[0];
function helpLevel(l){GUIDE.lvl=Math.max(GUIDE.lvl,l);if(l===1){OBJ.sp.boost=3;say('O portal da missão fica na Colina do Globo, ao norte. Está vendo as faíscas?',6500)}
 if(l===2){OBJ.sp.boost=3;$('cmp').classList.add('show');trail.visible=true;say('Siga a bússola e a trilha de faíscas até o portal!',6500)}
 if(l===3)say('Quer que eu leve você até o portal da missão?',0,[['Levar ao portal',teleport],['Agora não',()=>guideSnooze(GUIDE),1]])}
function teleport(){const f=$('fade');f.style.opacity=1;setTimeout(()=>{P.x=OBJ.x;P.z=OBJ.z+4.2;P.y=groundAt(P.x,P.z,99);P.vx=P.vz=P.vy=0;P.st='ground';P.boost=null;P.face=Math.PI;target=null;mark.visible=false;CAM.yaw=0;CAM.tx=P.x;CAM.tz=P.z;CAM.ty=P.y+1.6;
 tico.root.position.set(P.x+1.2,P.y,P.z+1);guideReset(GUIDE);$('cmp').classList.remove('show');trail.visible=false;OBJ.sp.boost=1;f.style.opacity=0;say('Chegamos! É só entrar no portal quando quiser.',4500)},RM?0:480)}
$('bh').onclick=()=>{if(!started)return;sfx('ui');helpLevel(Math.min(3,GUIDE.lvl+1))};
const trail=(()=>{const n=24,g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(n*3),3));const m=new T.PointsMaterial({map:sparkTex,color:0xfff1b0,size:.55,transparent:true,depthWrite:false,blending:T.AdditiveBlending});const p=new T.Points(g,m);p.frustumCulled=false;p.visible=false;scene.add(p);return p})();
function tickTrail(t){if(!trail.visible)return;const a=trail.geometry.attributes.position,n=a.count,dx=OBJ.x-P.x,dz=OBJ.z+3-P.z,L=Math.hypot(dx,dz),N=Math.max(1,Math.min(L,22));for(let i=0;i<n;i++){const k=((i/n)+t*.25)%1,d=k*N,x=P.x+dx/L*d,z=P.z+dz/L*d;a.setXYZ(i,x,Math.max(H(x,z),WY)+.5+Math.sin(k*20+t*4)*.12,z)}a.needsUpdate=true}

/* ---------- diálogo ---------- */
let dq=null;
function dialog(who,title,lines,onEnd){paused=true;target=null;joy.x=joy.y=0;dq={who,title,lines:[].concat(lines),i:0,onEnd};$('dlg').classList.add('show');showLine()}
function showLine(){$('dw').textContent=dq.who;$('dt').textContent=dq.title===dq.who?'':dq.title;$('dt').style.display=dq.title===dq.who?'none':'';$('dx').textContent=dq.lines[dq.i];const r=$('dr');r.innerHTML='';const b=document.createElement('button');b.className='btn';b.textContent=dq.i<dq.lines.length-1?'Continuar':'Ok';b.onclick=dlgNext;r.append(b);setTimeout(()=>b.focus(),30)}
function dlgNext(){if(!dq)return;sfx('ui');dq.i++;if(dq.i<dq.lines.length)return showLine();const f=dq.onEnd;dq=null;$('dlg').classList.remove('show');paused=false;cv.focus();f&&f()}
let talking=null;
function interact(o){pendingInter=null;target=null;mark.visible=false;guideProgress(GUIDE);if(o.npc){talking=o.npc;const p=o.npc.c.root.position;o.npc.c.root.rotation.y=Math.atan2(P.x-p.x,P.z-p.z);P.face=Math.atan2(p.x-P.x,p.z-P.z);CAM.want=Math.atan2(P.x-p.x,P.z-p.z)+.75}
 dialog(o.who,o.name,o.lines||[o.text],()=>{talking=null})}
let near=null;

/* ---------- som (opcional) ---------- */
let sound=SAVE.data.sound;setSoundEnabled(sound);$('bs').setAttribute('aria-pressed',sound);
$('bs').onclick=()=>{sound=!sound;setSoundEnabled(sound);SAVE.update({sound});$('bs').setAttribute('aria-pressed',sound);if(sound)sfx('ui')};

/* ---------- telas iniciais ---------- */
function portraits(){const r=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setSize(200,250);r.toneMapping=T.NeutralToneMapping;
 const s=new T.Scene();s.add(new T.HemisphereLight(0xffffff,0xb7c9a0,1.6));const d=new T.DirectionalLight(0xfff1d6,2.4);d.position.set(2,4,5);s.add(d);
 const c=new T.PerspectiveCamera(30,.8,.1,50);c.position.set(0,2.5,7.4);c.lookAt(0,1.85,0);const out=[];
 AV.forEach(a=>{const k=makeKid(a);k.root.rotation.y=-.35;k.arms[0].rotation.z=-.15;k.arms[1].rotation.z=.15;s.add(k.root);r.render(s,c);out.push(r.domElement.toDataURL());s.remove(k.root)});r.dispose();return out}
function buildPick(){const box=$('avs');box.innerHTML='';const imgs=portraits();AV.forEach((a,i)=>{const b=document.createElement('button');b.setAttribute('aria-pressed',i===avIdx);b.innerHTML=`<img alt="" src="${imgs[i]}"><span>${a.n}</span>`;b.onclick=()=>{avIdx=i;[...box.children].forEach((x,j)=>x.setAttribute('aria-pressed',j===i));sfx('ui')};box.append(b)});$('chk').checked=ctl}
$('go').onclick=()=>{sfx('ui');$('title').classList.remove('show');buildPick();$('pick').classList.add('show');setTimeout(()=>$('avs').children[avIdx]?.focus(),50)};
$('start').onclick=()=>{SAVE.update({avatar:avIdx});scene.remove(player.root);player=makeKid(AV[avIdx]);scene.add(player.root);$('pick').classList.remove('show');body.classList.add('on');['coins','top'].forEach(i=>$(i).classList.add('show'));setCtl($('chk').checked);
 started=true;attract=false;CAM.yaw=0;CAM.pitch=.5;CAM.tx=P.x;CAM.ty=P.y+1.6;CAM.tz=P.z;cv.focus();updCoins();sfx('yay');
 say(MOBILE?'Oi! Eu sou o Tico. Toque no chão para andar e arraste a tela para olhar em volta. Vamos falar com a Diretora Sol?':'Oi! Eu sou o Tico. Clique no chão para andar e arraste para olhar em volta. Vamos falar com a Diretora Sol?',8000)};
$('bc').onclick=()=>{setCtl(!ctl);sfx('ui');if(ctl)say('A pula. A e depois B: pulo alto (andando, vira mergulho no ar). Segure B no pulo: marretada no chão!',8000)};
$('act').onclick=()=>{if(near)interact(near)};

/* ---------- moedas: coleta ---------- */
const TOTAL=COINS.length+STUMPS.length*3;let got=COINS.filter(c=>c.got).length;
function updCoins(){$('cn').textContent=got+'/'+TOTAL}
function collect(c){c.got=true;got++;guideProgress(GUIDE);updCoins();const e=$('coins');e.classList.remove('bump');void e.offsetWidth;e.classList.add('bump');sfx('coin');puff(c.x,c.y,c.z,{n:7,tex:sparkTex,color:0xffe28a,add:1,sp:2.6,up:2,s:.45,life:.5,grow:.4});
 if(c.id>=0){saved.push(c.id);SAVE.update({coins:saved})}
 if(got===TOTAL){sfx('yay');for(let i=0;i<3;i++)setTimeout(()=>puff(P.x,P.y+2,P.z,{n:24,tex:dustTex,color:[0xD7A64D,0x6E2638,0x7fd4ff][i],sp:5,up:6,g:9,s:.3,life:1.4,grow:0}),i*180);say('Uau! Você juntou todas as moedas do acampamento!',6000)}
 else if(got===1)say('Sua primeira moeda! Tem moedas no alto do Observatório e no fundo do lago também.',5500)}
let extraId=-1;
function popCoins(s){s.used=true;s.ring.visible=false;for(let i=0;i<3;i++){const a=i/3*Math.PI*2+rnd();COINS.push({x:s.x,y:s.y+.6,z:s.z,id:extraId--,got:false,fly:true,vx:Math.cos(a)*2.4,vz:Math.sin(a)*2.4,vy:7})}}

/* ---------- passo do jogo ---------- */
let clock=0;
function step(dt){
 let [ix,iz,m]=moveInput();
 if(m>.1){target=null;pendingInter=null;mark.visible=false}
 else if(target){const dx=target.x-P.x,dz=target.z-P.z,d=Math.hypot(dx,dz);if(d<.4){target=null;mark.visible=false;if(pendingInter&&dist2(pendingInter)<3.6)interact(pendingInter)}else{ix=dx/d;iz=dz/d;m=Math.min(1,d/1.2+.35)}}
 const maxS={ground:6.8,air:6.4,swim:4.2,dive:3.8}[P.st]*(P.st==='ground'&&H(P.x,P.z)<WY?0.75:1);
 const tvx=ix*maxS*m,tvz=iz*maxS*m,acc=m>0?(P.st==='air'?7:13):(P.st==='air'?2:10),k=1-Math.exp(-acc*dt);
 P.vx+=(tvx-P.vx)*k;P.vz+=(tvz-P.vz)*k;const sp=Math.hypot(P.vx,P.vz);
 if(sp>.3)P.face=angLerp(P.face,Math.atan2(P.vx,P.vz),1-Math.exp(-14*dt));
 P.x+=P.vx*dt;P.z+=P.vz*dt;if(P.boost){P.x+=P.boost[0]*9*dt;P.z+=P.boost[1]*9*dt}
 collide();
 const deep=isDeep(P.x,P.z);
 let g=groundAt(P.x,P.z,P.y);
 if(P.st==='ground'){if(deep&&g<SURF){P.st='swim';sfx('splash');puff(P.x,WY+.1,P.z,{n:8,color:0xffffff,sp:2,up:2,g:4})}
  else if(g<P.y-.45){P.st='air';P.vy=0;P.jn=1;P.bUsed=true;P.coy=.12}else{P.y=lerp(P.y,g,Math.min(1,dt*18));if(Math.abs(P.y-g)<.02)P.y=g}
  if(sp>1.5&&P.st==='ground'){P.stepT-=dt*sp;if(P.stepT<0){P.stepT=2.2;if(H(P.x,P.z)<WY+.05)puff(P.x,WY+.05,P.z,{n:3,color:0xffffff,sp:1,up:1.2,g:3,s:.3});else puff(P.x-Math.sin(P.face)*.3,P.y+.05,P.z-Math.cos(P.face)*.3,{n:2,sp:.6,up:.5,s:.35,life:.45})}}}
 else if(P.st==='air'){P.coy=Math.max(0,P.coy-dt);
  if(P.bDown&&!P.bUsed&&P.jn===1){P.bT+=dt;if(P.bT>=.2){P.pound=true;P.bUsed=true;P.vy=-34;P.boost=null;P.vx*=.2;P.vz*=.2}}
  P.vy-=(P.vy>0?28:34)*dt;P.y+=P.vy*dt;g=groundAt(P.x,P.z,P.y+(P.vy<0?.4:0));
  if(deep&&g<SURF&&P.y<=WY-.4&&P.vy<0){shock(P.x,WY,P.z,0xdff6ff);puff(P.x,WY+.1,P.z,{n:12,color:0xffffff,sp:3,up:3.5,g:6});sfx('splash');P.st='dive';P.rise=!P.pound;P.vy=P.pound?-8:-5;P.boost=null;P.jn=0;P.bUsed=false;if(P.pound&&!RM)shake=.25;P.pound=false}
  else if(P.y<=g&&P.vy<=0){P.y=g;P.sq=.3;if(P.pound){shock(P.x,g,P.z,0xffe7a8);puff(P.x,g+.1,P.z,{n:14,sp:4.5,up:1,s:.6});sfx('pound');if(!RM)shake=.35;
    for(const s of STUMPS)if(!s.used&&Math.hypot(P.x-s.x,P.z-s.z)<1.3&&Math.abs(g-s.y)<.1)popCoins(s)}else puff(P.x,g+.05,P.z,{n:4,sp:1.4,up:.4,s:.4});
   P.st='ground';P.boost=null;P.jn=0;P.bUsed=false;P.pound=false}}
 else if(P.st==='swim'){P.y=lerp(P.y,WY-.75+Math.sin(clock*3)*.05,Math.min(1,dt*6));P.vy=0;P.breath=breathStep(P.breath,dt,false);if(!deep){P.st='ground';P.y=Math.max(P.y,H(P.x,P.z))}
  if(sp>1&&rnd()<dt*8)puff(P.x,WY+.05,P.z,{n:1,color:0xffffff,sp:.6,up:.6,g:2,s:.4})}
 else{const floor=H(P.x,P.z)+.1,want=P.rise?WY-.75:Math.max(floor,-2.9),vt=clamp((want-P.y)*3,-3.6,4.2);P.vy+=(vt-P.vy)*Math.min(1,8*dt);P.y=Math.max(floor,P.y+P.vy*dt);
  if(P.y<WY-.95){P.breath=breathStep(P.breath,dt,true);if(rnd()<dt*3)puff(P.x+rr(-.2,.2),P.y+2.2,P.z,{n:1,color:0xdff6ff,sp:.2,up:1.6,g:-1,s:.22,life:1.1,grow:.2});
   if(P.breath<=0&&!P.rise){P.rise=true;P.breath=0;say('Uma bolha de ar levou você para cima. Respire e tente de novo!',4500)}}else P.breath=breathStep(P.breath,dt,false);
  if(!deep){P.st='ground'}else if(P.rise&&P.y>=WY-.8)P.st='swim'}
 /* moedas */
 for(const c of COINS){if(c.got)continue;if(c.fly){c.vy-=20*dt;c.x+=c.vx*dt;c.z+=c.vz*dt;c.y+=c.vy*dt;const gg=groundAt(c.x,c.z,c.y)+.8;if(c.y<gg){c.y=gg;c.vy=Math.abs(c.vy)>2?-c.vy*.4:0;c.vx*=.6;c.vz*=.6;if(Math.abs(c.vy)<.1)c.fly=false}}
  if(Math.hypot(P.x-c.x,P.y+1.2-c.y,P.z-c.z)<1.45&&!(c.fly&&c.vy>0))collect(c)}
 /* portais */
 for(const p of PORT){const d=Math.hypot(P.x-p.x,P.z-p.z);if(d<1.8&&Math.abs(P.y-p.y)<2&&!paused){P.z=p.z+3.2;P.vx=P.vz=0;target=null;
  if(p.open)dialog('Tico','Missão 1: A Luz no Acampamento',['Este é o portal da primeira missão do Éden!','Nesta demonstração a missão ainda está em construção. Em breve, ela começa aqui.']);
  else dialog('Tico','Portal trancado',['Este portal leva a um novo mundo, com outra história e outro cenário.','Ele vai abrir quando você terminar todas as missões do Éden.'])}}
 /* perto de algo para interagir */
 let best=null,bd=3.2;for(const o of INTER){const d=dist2(o);if(d<bd&&Math.abs(P.y-(o.y??H(o.x,o.z)))<2.5){bd=d;best=o}}
 if(best!==near){near=best;const a=$('act');if(near&&P.st==='ground'){$('actl').textContent=near.label+(near.npc?' com '+near.name.replace('Diretora ',''):'');a.classList.add('show')}else a.classList.remove('show')}
 /* ajuda de orientação */
 const dObj=Math.hypot(OBJ.x-P.x,OBJ.z-P.z),gs=guideStep(GUIDE,dt,dObj);gs.levels.forEach(helpLevel);
 if(gs.arrived){$('cmp').classList.remove('show');trail.visible=false;OBJ.sp.boost=1;hideTico()}
 if($('cmp').classList.contains('show')){const ang=Math.atan2(OBJ.x-P.x,OBJ.z-P.z)-CAM.yaw;$('needle').style.transform=`rotate(${Math.PI-ang}rad)`}
 /* fôlego */
 const e=1-P.breath,br=$('breath');if(P.st==='dive'||P.breath<1){br.classList.add('show');br.style.setProperty('--p',(P.breath*100).toFixed(1));br.style.setProperty('--c',breathColor(P.breath));br.classList.toggle('low',e>.8)}else br.classList.remove('show');
}

/* ---------- visual do jogador e do mundo ---------- */
function drawPlayer(dt){const r=player.root;r.position.set(P.x,P.y,P.z);r.rotation.y=P.face;
 const tilt=P.boost?1.2:P.st==='dive'?1.25:P.st==='swim'?.9:0;player.body.rotation.x=lerp(player.body.rotation.x,tilt,Math.min(1,dt*10));
 if(P.pound)player.body.rotation.y+=dt*22;else player.body.rotation.y=lerp(player.body.rotation.y,0,.3);
 P.sq=lerp(P.sq,0,Math.min(1,dt*10));const q=P.sq;r.scale.set(1+q*.3,1-q*.6,1+q*.3);
 const spd=Math.hypot(P.vx,P.vz);animate(player,dt,{walk:spd>.4&&P.st==='ground',speed:spd,air:P.st==='air',swim:P.st==='swim'||P.st==='dive',mode:P.pound?'wow':P.st==='dive'&&P.breath<.3?'wow':'open'});
 shadowBlob.position.set(P.x,Math.max(groundAt(P.x,P.z,P.y),WY)+.04,P.z);shadowBlob.visible=P.st!=='dive';const hgt=P.y-shadowBlob.position.y;shadowBlob.scale.setScalar(clamp(1-hgt*.08,.4,1));shadowBlob.material.opacity=.28*clamp(1-hgt*.1,.2,1)}
const shadowBlob=new T.Mesh(new T.CircleGeometry(.6,20).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0x223322,transparent:true,opacity:.22,depthWrite:false}));scene.add(shadowBlob);
const TICO={x:1.5,z:22,y:H(1.5,22),hop:0,wait:0};
function drawTico(dt){const off=1.6,bx=P.x-Math.sin(P.face+.8)*off,bz=P.z-Math.cos(P.face+.8)*off;let tx=bx,tz=bz;
 if(isDeep(tx,tz)||H(tx,tz)<WY-.2){tx=TICO.x;tz=TICO.z}
 const dx=tx-TICO.x,dz=tz-TICO.z,d=Math.hypot(dx,dz);if(d>.3){const s=Math.min(d*3,9)*dt;TICO.x+=dx/d*Math.min(s,d);TICO.z+=dz/d*Math.min(s,d);TICO.hop+=dt*12;tico.root.rotation.y=angLerp(tico.root.rotation.y,Math.atan2(dx,dz),.2)}
 else{tico.root.rotation.y=angLerp(tico.root.rotation.y,Math.atan2(P.x-TICO.x,P.z-TICO.z),.05)}
 if(d>18){TICO.x=P.x;TICO.z=P.z+1}
 const gy=groundAt(TICO.x,TICO.z,TICO.y+.5);TICO.y=lerp(TICO.y,gy,.3);tico.root.position.set(TICO.x,TICO.y+(d>.3?Math.abs(Math.sin(TICO.hop))*.35:0),TICO.z);
 animate(tico,dt,{walk:d>.3,speed:2,wave:GUIDE.lvl>=1&&d<.5,mode:'open'})}
function drawWorld(dt,t){uTime.value=t;
 globe.core.material.emissiveIntensity=.12+Math.sin(t*1.5)*.06;globe.ring.rotation.z+=dt*.3;globe.g.rotation.y+=dt*.15;
 fire.g.children.forEach((f,i)=>{f.scale.set(1+Math.sin(t*9+i)*.08,1+Math.sin(t*11+i*2)*.15,1+Math.cos(t*8+i)*.08)});fire.L.intensity=5.5+Math.sin(t*13)*.8+Math.sin(t*7.3)*.6;
 const boat=scene.userData.boat;boat.position.y=WY+.02+Math.sin(t*1.3)*.05;boat.rotation.z=Math.sin(t*1.1)*.04;
 clouds.forEach((c,i)=>{c.position.x+=dt*(.4+i%3*.15);if(c.position.x>130)c.position.x=-130});
 STUMPS.forEach(s=>{if(!s.used){s.ring.material.opacity=1;s.ring.scale.setScalar(1+Math.sin(t*4)*.08)}});
 COINS.forEach((c,i)=>{_o.position.set(c.x,c.y+(c.fly?0:Math.sin(t*2+i)*.12),c.z);_o.rotation.set(0,t*2.4+i,0);_o.scale.setScalar(c.got?0:1);_o.updateMatrix();coinIM.setMatrixAt(i,_o.matrix)});coinIM.count=COINS.length;coinIM.instanceMatrix.needsUpdate=true;
 if(mark.visible){mark.scale.setScalar(lerp(mark.scale.x,1,.15));mark.material.opacity=.6+Math.sin(t*6)*.3}
 for(let i=ringFX.length-1;i>=0;i--){const r=ringFX[i];r.t+=dt;r.m.scale.setScalar(1+r.t*9);r.m.material.opacity=Math.max(0,1-r.t*2.2);if(r.t>.45){scene.remove(r.m);ringFX.splice(i,1)}}
 animate(sol,dt,{wave:talking===NPCS[0]||(started&&Math.hypot(P.x-sol.root.position.x,P.z-sol.root.position.z)<6&&!talking)});animate(ped,dt,{wave:talking===NPCS[1],mode:talking===NPCS[1]?'wow':'open'});
 sun.position.set(CAM.tx+SUNDIR.x*50,CAM.ty+SUNDIR.y*50,CAM.tz+SUNDIR.z*50);sun.target.position.set(CAM.tx,CAM.ty,CAM.tz);
 const under=P.st==='dive'&&P.y<WY-.9;scene.fog.near=lerp(scene.fog.near,under?8:70,.08);scene.fog.far=lerp(scene.fog.far,under?45:210,.08);scene.fog.color.lerp(under?new T.Color(0x5aa6c8):FOGC,.08)}

/* ---------- critters: peixes, borboletas, coelhos, pássaros ---------- */
const CRIT=[];
{const fm=mat(0xff8a3c,.5);for(let i=0;i<5;i++){const f=new T.Group();const b=new T.Mesh(rg(.5,.28,.16,.06),fm);f.add(b);const tl=new T.Mesh(rg(.08,.24,.2,.03),mat(0xffb36b,.5));tl.position.x=-.3;f.add(tl);scene.add(f);CRIT.push({k:'fish',o:f,a:rnd()*6,r:rr(2,6),y:rr(-2.4,-1.4),s:rr(.4,.8)})}
 const bf=[0xf7d14c,0xf29ab0,0x9ec9ff,0xffffff];for(let i=0;i<9;i++){const g=new T.Group();[-1,1].forEach(s=>{const w=new T.Mesh(new T.PlaneGeometry(.26,.22),new T.MeshBasicMaterial({color:bf[i%4],side:T.DoubleSide}));w.position.x=s*.13;const p=new T.Group();p.add(w);g.add(p)});scene.add(g);const cx=rr(-30,32),cz=rr(-30,30);CRIT.push({k:'bf',o:g,cx,cz,a:rnd()*6,s:rr(.5,1)})}
 for(let i=0;i<4;i++){const g=new T.Group(),w=0xf4efe6;const b=new T.Mesh(rg(.42,.36,.6,.14),mat(w));b.position.y=.24;b.castShadow=true;g.add(b);const h=new T.Mesh(rg(.32,.3,.32,.12),mat(w));h.position.set(0,.5,.28);g.add(h);[-1,1].forEach(s=>{const e=new T.Mesh(rg(.08,.34,.1,.04),mat(w));e.position.set(s*.08,.78,.24);g.add(e)});const ey=new T.Mesh(rg(.34,.06,.06,.02),mat(0x221111));ey.position.set(0,.55,.44);g.add(ey);
  const x=rr(18,34),z=rr(0,24);g.position.set(x,H(x,z),z);scene.add(g);CRIT.push({k:'rab',o:g,x,z,tx:x,tz:z,t:rr(0,3),hop:0})}
 for(let i=0;i<6;i++){const g=new T.Group();[-1,1].forEach(s=>{const w=new T.Mesh(new T.BoxGeometry(.7,.04,.22),mat(0x3a3a48));w.position.x=s*.35;const p=new T.Group();p.add(w);g.add(p)});scene.add(g);CRIT.push({k:'bird',o:g,a:i/6*Math.PI*2,r:rr(16,26),y:rr(16,22)})}}
function tickCrit(dt,t){for(const c of CRIT){
 if(c.k==='fish'){c.a+=dt*c.s;c.o.position.set(LAKE.x+Math.cos(c.a)*c.r,c.y+Math.sin(t*2+c.r)*.1,LAKE.z+Math.sin(c.a)*c.r*.85);c.o.rotation.y=Math.atan2(-Math.cos(c.a)*.85,-Math.sin(c.a));c.o.children[1].rotation.y=Math.sin(t*10)*.4}
 else if(c.k==='bf'){c.a+=dt*c.s;const x=c.cx+Math.sin(c.a*1.3)*3,z=c.cz+Math.cos(c.a)*3;c.o.position.set(x,H(x,z)+1+Math.sin(t*3+c.cx)*.4,z);c.o.rotation.y=c.a;const f=Math.sin(t*22+c.cx)*1;c.o.children[0].rotation.z=f;c.o.children[1].rotation.z=-f}
 else if(c.k==='bird'){c.a+=dt*.25;c.o.position.set(Math.cos(c.a)*c.r,c.y+Math.sin(t+c.r)*.5,Math.sin(c.a)*c.r-4);c.o.rotation.y=-c.a;const f=Math.sin(t*8+c.r)*.5;c.o.children[0].rotation.z=f;c.o.children[1].rotation.z=-f}
 else{c.t-=dt;const dp=Math.hypot(P.x-c.x,P.z-c.z);if(dp<3.5&&c.t>.3){const a=Math.atan2(c.x-P.x,c.z-P.z);c.tx=c.x+Math.sin(a)*4;c.tz=c.z+Math.cos(a)*4;c.t=0}
  if(c.t<0){c.tx=clamp(c.x+rr(-4,4),16,36);c.tz=clamp(c.z+rr(-4,4),-2,26);c.t=rr(1.5,4)}
  const dx=c.tx-c.x,dz=c.tz-c.z,d=Math.hypot(dx,dz);if(d>.2){const s=Math.min(d,4.5*dt);c.x+=dx/d*s;c.z+=dz/d*s;c.hop+=dt*14;c.o.rotation.y=Math.atan2(dx,dz)}else c.hop=0;
  c.o.position.set(c.x,H(c.x,c.z)+Math.abs(Math.sin(c.hop))*.35,c.z)}}}

/* ---------- laço principal ---------- */
function resize(){const w=innerWidth,h=innerHeight;R.setSize(w,h,false);cam.aspect=w/h;cam.fov=cam.aspect<1?62:50;cam.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
const _v=new T.Vector3();const timer=new T.Timer();timer.connect(document);
let fpsAcc=0,fpsN=0,fpsT=0;
R.setAnimationLoop(()=>{timer.update();const dt=Math.min(Math.max(timer.getDelta(),0),.05);clock+=dt;
 if(K.KeyQ)CAM.yaw+=dt*2;if(K.KeyE)CAM.yaw-=dt*2;
 if(attract){CAM.yaw+=dt*.06;CAM.tx=lerp(CAM.tx,0,.05);CAM.tz=lerp(CAM.tz,-2,.05);CAM.ty=lerp(CAM.ty,2,.05);CAM.pitch=.62;CAM.tdist=13;CAM.dist=lerp(CAM.dist,34,.05);
  cam.position.set(CAM.tx+Math.sin(CAM.yaw)*Math.cos(CAM.pitch)*CAM.dist,CAM.ty+Math.sin(CAM.pitch)*CAM.dist,CAM.tz+Math.cos(CAM.yaw)*Math.cos(CAM.pitch)*CAM.dist);cam.lookAt(CAM.tx,CAM.ty,CAM.tz);
  sun.position.set(SUNDIR.x*50,SUNDIR.y*50+2,SUNDIR.z*50+4);sun.target.position.set(0,2,4)}
 else{if(!paused)step(dt);camUpdate(dt)}
 shake=Math.max(0,shake-dt);drawPlayer(dt);drawTico(dt);drawWorld(dt,clock);tickSparks(clock);tickTrail(clock);tickParts(dt);tickCrit(dt,clock);
 if(started){_v.set(P.x,P.y+1.2,P.z);const vz=_v.clone().applyMatrix4(cam.matrixWorldInverse).z;_v.project(cam);const W=R.domElement.width,Hh=R.domElement.height;SEE.p.value.set((_v.x+1)/2*W,(_v.y+1)/2*Hh);SEE.d.value=-vz;SEE.r.value=Hh*.17}else SEE.r.value=0;
 R.render(scene,cam);
 fpsT+=dt;fpsN++;if(fpsT>4){const fps=fpsN/fpsT;fpsT=0;fpsN=0;if(fps<40&&PR>1){PR=Math.max(1,PR-.25);R.setPixelRatio(PR);resize()}}});
if(ctl)setCtl(true);
document.fonts&&document.fonts.ready.then(()=>{});
if(import.meta.env?.DEV||new URLSearchParams(location.search).has('debug'))Object.assign(window,{R,scene,P,CAM,PORT,COINS,helpLevel,interact,INTER,step,pressA,pressB,releaseB,STUMPS,GUIDE});
