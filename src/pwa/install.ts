/**
 * Jogo instalável (PWA): service worker para jogar sem internet e convite para instalar na tela inicial.
 * Android/Chrome: o navegador avisa que dá para instalar (beforeinstallprompt) e o botão abre o pedido nativo.
 * iPhone/iPad: o Safari não tem esse pedido; o botão abre um cartão com o passo a passo
 * (Compartilhar > Adicionar à Tela de Início). Já instalado, o botão não aparece.
 */
import { sfx } from '../engine/audio';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const $ = (id: string) => document.getElementById(id) as HTMLElement;

export function installed() {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS() {
  const ua = navigator.userAgent;
  // iPadOS se apresenta como Mac; o toque denuncia
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function registerWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const go = () =>
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
      .then((reg) => {
        // com internet de volta ou ao reabrir o app, procura versão nova do jogo
        const check = () => navigator.onLine && reg.update().catch(() => {});
        addEventListener('online', check);
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
      })
      .catch(() => {
        /* sem service worker o jogo funciona igual, só não fica guardado para jogar sem internet */
      });
  // depois da carga, para não disputar rede com o início do jogo
  if (document.readyState === 'complete') go();
  else addEventListener('load', go);
}

export function setupInstall() {
  registerWorker();
  const btn = $('inst');
  if (!btn || installed()) return;

  let deferred: InstallPrompt | null = null;
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    btn.hidden = false;
  });
  addEventListener('appinstalled', () => {
    deferred = null;
    btn.hidden = true;
  });

  if (isIOS()) btn.hidden = false;

  btn.onclick = async () => {
    sfx('ui');
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') btn.hidden = true;
      deferred = null;
      return;
    }
    $('ios').classList.add('show');
  };
  $('iosok').onclick = () => {
    sfx('ui');
    $('ios').classList.remove('show');
  };
}
