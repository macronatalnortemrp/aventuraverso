// @ts-nocheck -- portado da demo; tipar ao dividir os construtores (Fase 1)
import * as THREE from 'three';
const T=THREE;
/** Emblemas oficiais (cópias reduzidas de public/assets/official, mesma proporção). */
export const EMB:Record<string,{src:string,w:number,h:number}>={a1:{src:'assets/official/web/a1.webp',w:236,h:220},la1:{src:'assets/official/web/la1.webp',w:320,h:227},abe:{src:'assets/official/web/abe.webp',w:200,h:200},lum:{src:'assets/official/web/lum.webp',w:200,h:200},edi:{src:'assets/official/web/edi.webp',w:200,h:200},mao:{src:'assets/official/web/mao.webp',w:200,h:200},macro:{src:'assets/official/web/macro.webp',w:215,h:220}};
/** onde decalques e placas entram quando não se informa o pai */
export const ROOT:{o:THREE.Object3D}={o:new T.Object3D()};
const TL=new T.TextureLoader();const TEX:Record<string,THREE.Texture>={};
export function tex(k){if(TEX[k])return TEX[k];const t=TL.load(EMB[k].src);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return TEX[k]=t}
export function decal(k,h,x,y,z,ry=0,parent:THREE.Object3D=ROOT.o){const i=EMB[k],w=h*i.w/i.h,m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tex(k),transparent:true,alphaTest:.04,roughness:.7}));m.position.set(x,y,z);m.rotation.y=ry;parent.add(m);return m}
export function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t}
export const FONT='"Fredoka","Trebuchet MS",sans-serif';
export function plate(txt,w,h,bg,fg,x,y,z,ry=0,o={}){const px=128,t=canvasTex(Math.round(w*px),Math.round(h*px),(g,W,Hh)=>{g.fillStyle=bg;const r=Hh*.18;g.beginPath();g.roundRect(0,0,W,Hh,r);g.fill();if(o.border){g.lineWidth=Hh*.08;g.strokeStyle=o.border;g.beginPath();g.roundRect(g.lineWidth/2,g.lineWidth/2,W-g.lineWidth,Hh-g.lineWidth,r);g.stroke()}
 g.fillStyle=fg;const L=txt.split('\n');let fs=o.fs||Hh*.5/L.length*1.15;g.font=`600 ${fs}px ${FONT}`;while(L.some(l=>g.measureText(l).width>W*.9)&&fs>8){fs-=2;g.font=`600 ${fs}px ${FONT}`}g.textAlign='center';g.textBaseline='middle';L.forEach((l,i)=>g.fillText(l,W/2,Hh/2+(i-(L.length-1)/2)*fs*1.15))});
 const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:t,roughness:.75,transparent:true}));m.position.set(x,y,z);m.rotation.y=ry;(o.parent||ROOT.o).add(m);return m}

