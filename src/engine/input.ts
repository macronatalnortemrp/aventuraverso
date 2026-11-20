/** Toque, mouse e teclado. A câmera gira com um dedo enquanto o outro usa o joystick. */

export interface InputHandlers {
  /** toque curto no canvas (sem arrastar) */
  tap(x: number, y: number): void;
  drag(dx: number, dy: number): void;
  /** fator de zoom (>1 afasta) */
  zoom(f: number): void;
  a(): void;
  bDown(): void;
  bUp(): void;
  /** Enter, F: interagir */
  act(): void;
}

const B_KEYS = ['ShiftLeft', 'ShiftRight', 'KeyB'];

export class Input {
  keys: Record<string, boolean> = {};
  joy = { x: 0, y: 0 };
  enabled = false;

  constructor(canvas: HTMLElement, joyEl: HTMLElement, knob: HTMLElement, aBtn: HTMLElement, bBtn: HTMLElement, h: InputHandlers) {
    const ptrs = new Map<number, { x: number; y: number; sx: number; sy: number; t: number; drag: boolean }>();
    let pinch = 0;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), drag: false });
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = ptrs.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x,
        dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (!p.drag && Math.hypot(p.x - p.sx, p.y - p.sy) > 9) p.drag = true;
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()],
          d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch && d) h.zoom(pinch / d);
        pinch = d;
        return;
      }
      if (p.drag) h.drag(dx, dy);
    });
    canvas.addEventListener('pointerup', (e) => {
      const p = ptrs.get(e.pointerId);
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = 0;
      if (p && !p.drag && performance.now() - p.t < 450 && this.enabled) h.tap(e.clientX, e.clientY);
    });
    canvas.addEventListener('pointercancel', (e) => {
      ptrs.delete(e.pointerId);
      pinch = 0;
    });
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        h.zoom(1 + Math.sign(e.deltaY) * 0.1);
      },
      { passive: false },
    );
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (!this.enabled) return;
      if (e.code === 'Space') {
        e.preventDefault();
        h.a();
      }
      if (B_KEYS.includes(e.code)) h.bDown();
      if (e.code === 'Enter' || e.code === 'KeyF') h.act();
    });
    addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (B_KEYS.includes(e.code) && this.enabled) h.bUp();
    });
    addEventListener('blur', () => (this.keys = {}));

    const bind = (el: HTMLElement, down: () => void, up: () => void) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add('down');
        down();
      });
      for (const n of ['pointerup', 'pointercancel', 'pointerleave'])
        el.addEventListener(n, () => {
          if (!el.classList.contains('down')) return;
          el.classList.remove('down');
          up();
        });
    };
    bind(aBtn, () => this.enabled && h.a(), () => {});
    bind(bBtn, () => this.enabled && h.bDown(), () => this.enabled && h.bUp());

    // joystick com zona morta e curva suave
    let jid: number | null = null;
    const move = (e: PointerEvent) => {
      const r = joyEl.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2),
        dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy),
        max = r.width * 0.36,
        k = Math.min(1, d / max);
      if (d > 0) {
        dx /= d;
        dy /= d;
      }
      const m = k < 0.12 ? 0 : Math.pow((k - 0.12) / 0.88, 1.15);
      this.joy.x = dx * m;
      this.joy.y = dy * m;
      knob.style.transform = `translate(${dx * k * max}px,${dy * k * max}px)`;
    };
    joyEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      jid = e.pointerId;
      joyEl.setPointerCapture(jid);
      move(e);
    });
    joyEl.addEventListener('pointermove', (e) => {
      if (e.pointerId === jid) move(e);
    });
    for (const n of ['pointerup', 'pointercancel'] as const)
      joyEl.addEventListener(n, (e) => {
        if (e.pointerId !== jid) return;
        jid = null;
        this.joy.x = this.joy.y = 0;
        knob.style.transform = '';
      });
  }

  /** Direção no mundo, relativa à câmera: [x, z, intensidade]. */
  move(yaw: number): [number, number, number] {
    const K = this.keys;
    let x = this.joy.x,
      z = this.joy.y;
    if (K.KeyA || K.ArrowLeft) x -= 1;
    if (K.KeyD || K.ArrowRight) x += 1;
    if (K.KeyW || K.ArrowUp) z -= 1;
    if (K.KeyS || K.ArrowDown) z += 1;
    let m = Math.hypot(x, z);
    if (m > 1) {
      x /= m;
      z /= m;
      m = 1;
    }
    const s = Math.sin(yaw),
      c = Math.cos(yaw);
    return [x * c + z * s, -x * s + z * c, m];
  }

  /** Q e E giram a câmera pelo teclado: -1, 0 ou 1. */
  turn() {
    return (this.keys.KeyQ ? 1 : 0) - (this.keys.KeyE ? 1 : 0);
  }

  clearMove() {
    this.joy.x = this.joy.y = 0;
  }
}
