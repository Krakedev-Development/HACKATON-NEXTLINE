'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';

// ---------------------------------------------------------------------------
// Íconos (mismo lenguaje de línea que login/page.tsx)
// ---------------------------------------------------------------------------
function ArrowIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m13 6 6 6-6 6" />
    </svg>
  );
}
function ArrowUpRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h9v9" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M4 4l16 16M20 4 4 20" />
    </svg>
  );
}
function VerifiedIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}
function AuditIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="m9 13 2 2 4-4" />
    </svg>
  );
}
function ApiIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 2.75c2.6 2.3 4 5.8 4 9.25s-1.4 6.95-4 9.25c-2.6-2.3-4-5.8-4-9.25s1.4-6.95 4-9.25zM2.75 12h18.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Reveal de texto: línea por línea / palabra por palabra (motor propio,
// vía CSS + IntersectionObserver, igual que en el prototipo de diseño)
// ---------------------------------------------------------------------------
type RevealTag = 'h1' | 'h2' | 'h3' | 'p' | 'span';

function RevealLines({
  as: Tag = 'span',
  lines,
  className = '',
  style,
  delayStep = 120,
}: {
  as?: RevealTag;
  lines: string[];
  className?: string;
  style?: React.CSSProperties;
  delayStep?: number;
}) {
  return (
    <Tag className={`landing-reveal-lines ${className}`} style={style}>
      {lines.map((line, i) => (
        <span className="landing-line-mask" key={i}>
          <span className="landing-line-inner" style={{ transitionDelay: `${i * delayStep}ms` }}>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}

function RevealWords({
  as: Tag = 'span',
  text,
  mutedFrom,
  mutedClassName = 'text-[#8C8C8C]',
  className = '',
  style,
}: {
  as?: RevealTag;
  text: string;
  mutedFrom?: number;
  mutedClassName?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const words = text.split(' ');
  return (
    <Tag className={`landing-reveal-words ${className}`} style={style}>
      {words.map((w, i) => (
        <span key={i}>
          <span className="landing-word-mask">
            <span
              className={`landing-word-inner${mutedFrom !== undefined && i >= mutedFrom ? ` ${mutedClassName}` : ''}`}
              style={{ transitionDelay: `${i * 35}ms` }}
            >
              {w}
            </span>
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}

// ---------------------------------------------------------------------------
// Contenido
// ---------------------------------------------------------------------------
const NAV_LINKS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'funciones', label: 'Funciones' },
  { id: 'plataforma', label: 'Plataforma' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'numeros', label: 'En números' },
];

const FEATURES = [
  {
    title: 'Chat Multiagente',
    meta: 'Mensajería — 2026',
    desc: 'Bandeja compartida con IA integrada, asignación de agentes y ventana de 24h en tiempo real.',
    tags: ['Tiempo real', 'IA', 'WebSockets'],
    Icon: ChatIcon,
  },
  {
    title: 'Envíos Masivos',
    meta: 'Automatización — 2026',
    desc: 'Selecciona tu audiencia por etiqueta, lista o Excel, y lanza campañas con plantillas oficiales.',
    tags: ['Plantillas', 'Etiquetas', 'Excel'],
    Icon: SendIcon,
  },
  {
    title: 'Auditoría e Informes',
    meta: 'Analítica — 2026',
    desc: 'Cada envío queda registrado con motivo de fallo clasificado y exportes listos para tu equipo.',
    tags: ['Auditoría', 'Exportes', 'Reportes'],
    Icon: AuditIcon,
  },
  {
    title: 'Integración Meta',
    meta: 'Infraestructura — 2026',
    desc: 'Conectado directo a la WhatsApp Cloud API, con circuit breaker anti-spam y multiempresa nativo.',
    tags: ['WhatsApp API', 'Multiempresa', 'Seguridad'],
    Icon: ApiIcon,
  },
];

const SERVICES = [
  { n: '01', title: 'Envío automatizado', desc: 'Programa y automatiza campañas sin perder el control.' },
  { n: '02', title: 'Gestión de contactos', desc: 'Importa, etiqueta y segmenta tu audiencia en segundos.' },
  { n: '03', title: 'Seguridad y control', desc: 'Roles, auditoría y aislamiento total por organización.' },
  { n: '04', title: 'Soporte en tiempo real', desc: 'Chat en vivo con IA de apoyo para tu equipo.' },
];

const STATS = [
  { value: 24, suffix: 'h', label: 'Ventana de WhatsApp monitoreada en tiempo real' },
  { value: 4, suffix: '', label: 'Formas de armar audiencia: manual, CRM, etiquetas o Excel' },
  { value: 100, suffix: '%', label: 'Aislamiento por organización, multiempresa por diseño' },
  { value: 1, suffix: '', label: 'Panel único para chat, masivos y auditoría' },
];

const STACK = ['WhatsApp Cloud API', 'Meta for Developers', 'PostgreSQL', 'Supabase', 'Socket.io', 'Gemini AI'];

// ---------------------------------------------------------------------------
// Efecto liquid-reveal del hero: dos escenas dibujadas en canvas (sin fotos
// externas), la misma mecánica ya probada en el prototipo de diseño.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawBeforeScene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const rand = mulberry32(42);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#050403';
  ctx.fillRect(0, 0, w, h);
  const count = Math.floor((w * h) / 26000);
  for (let i = 0; i < count; i++) {
    const bw = (0.05 + rand() * 0.08) * w;
    const bh = bw * 0.42;
    const x = rand() * w;
    const y = rand() * h;
    const rot = (rand() - 0.5) * 0.5;
    const tone = 20 + Math.floor(rand() * 26);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = `rgb(${tone},${tone - 2},${tone - 4})`;
    ctx.globalAlpha = 0.55 + rand() * 0.3;
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, bh * 0.35);
    ctx.fill();
    if (rand() > 0.82) {
      ctx.fillStyle = 'rgba(239,68,68,.55)';
      ctx.beginPath();
      ctx.arc(bw / 2 - 4, -bh / 2 + 4, Math.max(2.5, bw * 0.03), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
function drawAfterScene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0a0a09';
  ctx.fillRect(0, 0, w, h);
  const sidebarW = w * 0.22;
  ctx.fillStyle = '#101010';
  ctx.fillRect(0, 0, sidebarW, h);
  const rowH = h * 0.09;
  for (let i = 0; i < 5; i++) {
    const y = h * 0.14 + i * rowH * 1.15;
    ctx.fillStyle = i === 0 ? 'rgba(239,68,68,.14)' : 'rgba(255,255,255,.03)';
    roundRect(ctx, sidebarW * 0.12, y, sidebarW * 0.76, rowH * 0.72, 10);
    ctx.fill();
    ctx.fillStyle = i === 0 ? '#ef4444' : 'rgba(255,255,255,.16)';
    ctx.beginPath();
    ctx.arc(sidebarW * 0.24, y + rowH * 0.36, rowH * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(sidebarW * 0.4, y + rowH * 0.2, sidebarW * 0.4, rowH * 0.1);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(sidebarW * 0.4, y + rowH * 0.42, sidebarW * 0.28, rowH * 0.08);
  }
  const chatX = sidebarW + w * 0.05;
  const chatW = w - chatX - w * 0.05;
  const bubbles: Array<{ wRatio: number; align: 'left' | 'right'; tone: 'accent' | 'light' }> = [
    { wRatio: 0.34, align: 'right', tone: 'accent' },
    { wRatio: 0.42, align: 'right', tone: 'accent' },
    { wRatio: 0.3, align: 'left', tone: 'light' },
  ];
  let by = h * 0.24;
  bubbles.forEach((b) => {
    const bw = chatW * b.wRatio;
    const bh = h * 0.075;
    const bx = b.align === 'right' ? chatX + chatW - bw : chatX;
    if (b.tone === 'accent') {
      const grad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
      grad.addColorStop(0, '#ff7a5c');
      grad.addColorStop(1, '#ef4444');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.08)';
    }
    roundRect(ctx, bx, by, bw, bh, bh * 0.4);
    ctx.fill();
    by += bh * 1.5;
  });
  ctx.fillStyle = 'rgba(74,222,128,.9)';
  ctx.beginPath();
  ctx.arc(chatX + 10, h * 0.14, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.fillRect(chatX + 24, h * 0.14 - 4, chatW * 0.25, 8);
}

function useLiquidReveal(wrapRef: React.RefObject<HTMLDivElement>) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const paintRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const baseCanvas = baseRef.current;
    const paintCanvas = paintRef.current;
    if (!wrap || !baseCanvas || !paintCanvas) return;

    const baseCtx = baseCanvas.getContext('2d');
    const paintCtx = paintCanvas.getContext('2d');
    if (!baseCtx || !paintCtx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let state: { w: number; h: number; cover?: HTMLCanvasElement } = { w: 1, h: 1 };

    function measure() {
      const rect = wrap!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      baseCanvas!.width = w;
      baseCanvas!.height = h;
      paintCanvas!.width = w;
      paintCanvas!.height = h;
      drawBeforeScene(baseCtx!, w, h);
      if (reduceMotion) {
        state = { w, h };
        return;
      }
      const cover = document.createElement('canvas');
      cover.width = w;
      cover.height = h;
      const coverCtx = cover.getContext('2d');
      if (coverCtx) drawAfterScene(coverCtx, w, h);
      state = { w, h, cover };
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);

    if (reduceMotion) return () => ro.disconnect();

    const brushRadius = 143;
    const decay = 0.016;
    let points: Array<{ x: number; y: number }> = [];
    let last: { x: number; y: number } | null = null;
    let idle = 0;
    let raf = 0;
    const brushCanvas = document.createElement('canvas');
    const brushCtx = brushCanvas.getContext('2d');

    function onPointerMove(e: PointerEvent) {
      const rect = wrap!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const x = (e.clientX - rect.left) * dpr;
      const y = (e.clientY - rect.top) * dpr;
      const radius = brushRadius * dpr;
      const { w, h } = state;
      if (x < -radius || x > w + radius || y < -radius || y > h + radius) {
        last = null;
        return;
      }
      if (last) {
        const dx = x - last.x;
        const dy = y - last.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.max(radius * 0.3, 1);
        const n = Math.min(Math.ceil(dist / step), 60);
        for (let i = 1; i <= n; i++) points.push({ x: last.x + (dx * i) / n, y: last.y + (dy * i) / n });
      } else {
        points.push({ x, y });
      }
      last = { x, y };
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    function stamp(x: number, y: number) {
      if (!state.cover || !brushCtx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const radius = brushRadius * dpr;
      const diam = Math.ceil(radius * 2);
      brushCanvas.width = diam;
      brushCanvas.height = diam;
      brushCtx.clearRect(0, 0, diam, diam);
      brushCtx.globalCompositeOperation = 'source-over';
      const grad = brushCtx.createRadialGradient(radius, radius, 0, radius, radius, radius);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.55, 'rgba(255,255,255,.82)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      brushCtx.fillStyle = grad;
      brushCtx.fillRect(0, 0, diam, diam);
      brushCtx.globalCompositeOperation = 'source-in';
      brushCtx.drawImage(state.cover, x - radius, y - radius, diam, diam, 0, 0, diam, diam);
      paintCtx!.globalCompositeOperation = 'source-over';
      paintCtx!.drawImage(brushCanvas, x - radius, y - radius);
    }

    function tick() {
      raf = requestAnimationFrame(tick);
      const { w, h } = state;
      if (points.length) idle = 0;
      else {
        idle++;
        if (idle > 120) return;
      }
      const drawing = points.length > 0;
      const fade = drawing ? decay : Math.min(decay + idle * 0.004, 0.5);
      paintCtx!.globalCompositeOperation = 'destination-out';
      paintCtx!.fillStyle = `rgba(0,0,0,${fade})`;
      paintCtx!.fillRect(0, 0, w, h);
      if (drawing) {
        points.forEach((p) => stamp(p.x, p.y));
        points = [];
      }
      if (idle === 120) paintCtx!.clearRect(0, 0, w, h);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { baseRef, paintRef };
}

// ---------------------------------------------------------------------------
// Reloj en vivo
// ---------------------------------------------------------------------------
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function useClock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  useEffect(() => {
    function tick() {
      const now = new Date();
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, '0');
      const meridiem = h >= 12 ? 'pm' : 'am';
      h = h % 12 || 12;
      setTime(`${h}:${m}${meridiem}`);
      setDate(`${now.getDate()} ${MESES[now.getMonth()]}, ${now.getFullYear()}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return { time, date };
}

// ---------------------------------------------------------------------------
// Scroll suave (Lenis), con fallback silencioso a scroll nativo
// ---------------------------------------------------------------------------
function useLenis() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ smoothWheel: true });
    lenisRef.current = lenis;
    let raf = 0;
    function loop(time: number) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return lenisRef;
}

// ---------------------------------------------------------------------------
// Stats: el número avanza/retrocede con la posición de scroll, no un
// conteo que se dispara una sola vez (mismo comportamiento que el prototipo)
// ---------------------------------------------------------------------------
function useScrubbedStats(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const els = Array.from(container.querySelectorAll<HTMLElement>('[data-count]'));
    if (!els.length) return;

    function update() {
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        let progress = (vh - rect.top) / (vh - rect.height / 2 || 1);
        progress = Math.max(0, Math.min(1, progress));
        const target = parseFloat(el.dataset.count || '0');
        const suffix = el.dataset.suffix || '';
        el.textContent = Math.round(target * progress) + suffix;
      });
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      setTimeout(() => {
        update();
        ticking = false;
      }, 30);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [containerRef]);
}

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------
const LOADER_SEEN_KEY = 'nextline-landing-seen';

export default function Landing() {
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return sessionStorage.getItem(LOADER_SEEN_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const { time, date } = useClock();

  const rootRef = useRef<HTMLDivElement>(null);
  const heroWrapRef = useRef<HTMLDivElement>(null);
  const { baseRef, paintRef } = useLiquidReveal(heroWrapRef);
  const lenisRef = useLenis();
  const statsRef = useRef<HTMLUListElement>(null);
  useScrubbedStats(statsRef);

  // Loader: cuenta 0→100 y sale
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!loading) return;
    const start = performance.now();
    const MS = 1200;
    let raf = 0;
    function ease(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function tick(now: number) {
      const t = Math.min(1, (now - start) / MS);
      setProgress(Math.round(ease(t) * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => {
        setLoading(false);
        try { sessionStorage.setItem(LOADER_SEEN_KEY, '1'); } catch {}
      }, 350);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Entrada del hero, vía GSAP (mismo patrón que /login)
  useGSAP(() => {
    if (loading) return;
    document.body.style.overflow = '';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.landing-header', { y: -14, autoAlpha: 0, duration: 0.6 })
        .to('.landing-stagger', { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08 }, '-=0.3');
    } else {
      gsap.set('.landing-stagger', { y: 0, autoAlpha: 1 });
    }

    // Reveals por sección al hacer scroll
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          gsap.to(entry.target, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out' });
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15 },
    );
    document.querySelectorAll('.landing-reveal').forEach((el) => {
      gsap.set(el, { y: 28, autoAlpha: 0 });
      io.observe(el);
    });

    // Reveal de texto (líneas/palabras): el hero queda oculto detrás del
    // loader a propósito, así que sus reveals se disparan aquí mismo en vez
    // de esperar al IntersectionObserver (que no sabe de z-index y los
    // marcaría "visibles" de una mientras el loader los tapa).
    document.querySelectorAll('#inicio .landing-reveal-lines, #inicio .landing-reveal-words').forEach((el) => {
      el.classList.add('is-visible');
    });

    const textIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          textIo.unobserve(entry.target);
        });
      },
      { threshold: 0.2 },
    );
    document.querySelectorAll('.landing-reveal-lines, .landing-reveal-words').forEach((el) => {
      if (!el.closest('#inicio')) textIo.observe(el);
    });

    return () => { io.disconnect(); textIo.disconnect(); };
  }, { scope: rootRef, dependencies: [loading] });

  useEffect(() => {
    const shouldStop = loading || menuOpen || contactOpen;
    document.body.style.overflow = shouldStop ? 'hidden' : '';
    if (shouldStop) lenisRef.current?.stop();
    else lenisRef.current?.start();
  }, [loading, menuOpen, contactOpen, lenisRef]);

  function scrollToId(id: string) {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) lenisRef.current.scrollTo(el, { offset: 0 });
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 600);
  }

  const carouselItems = [
    { caption: 'Mensajería masiva', title: 'Hecho para escalar.' },
    { caption: 'Chat en tiempo real', title: 'Diseñado para responder.' },
    { caption: 'Auditoría', title: 'Construido para confiar.' },
  ];

  return (
    <div ref={rootRef} className="relative min-h-dvh overflow-x-hidden bg-[#050403] text-[#F2F2F2]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* -------- loader -------- */}
      {loading && (
        <div className="landing-loader-bg fixed inset-0 z-[120] flex flex-col items-center justify-center gap-8 rounded-b-3xl text-white">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex items-center gap-2 text-2xl font-extrabold" style={{ fontFamily: "'Manrope', sans-serif" }}>
              <Image src="/assets/images/NOIRLINE2.png" alt="" width={30} height={30} className="h-7 w-7 object-contain" priority />
              NextLine
            </div>
            <p className="max-w-[24ch] text-sm text-white/55">Mensajes masivos. Conversaciones reales.</p>
          </div>
          <div className="flex w-[min(22rem,72vw)] flex-col gap-3">
            <div className="h-px bg-white/15">
              <div className="h-full bg-[#ff7a5c] transition-[width] duration-100" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-white/45">
              <span>Cargando</span>
              <span className="tabular-nums text-white/80">{String(progress).padStart(3, '0')}</span>
            </div>
          </div>
        </div>
      )}

      {/* -------- header -------- */}
      <header className="landing-header absolute inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <button onClick={() => scrollToId('inicio')} className="flex items-center gap-2 text-lg font-bold transition-transform hover:scale-[1.04]" style={{ fontFamily: "'Manrope', sans-serif" }}>
            <Image src="/assets/images/NOIRLINE2.png" alt="" width={24} height={24} className="h-6 w-6 object-contain" />
            NextLine
          </button>

          <nav className="hidden items-center gap-8 text-sm font-medium lg:flex">
            {NAV_LINKS.map((l) => (
              <button key={l.id} onClick={() => scrollToId(l.id)} className="opacity-80 transition-all hover:-translate-y-0.5 hover:opacity-100">
                {l.label}
              </button>
            ))}
            <button onClick={() => setContactOpen(true)} className="opacity-80 transition-all hover:-translate-y-0.5 hover:opacity-100">
              Contacto
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 backdrop-blur md:flex">
              <span className="text-white/40">Hora local</span>
              <span className="min-w-[3.5rem] tabular-nums font-medium text-white">{time || '9:41am'}</span>
              <span className="text-white/25">•</span>
              <span className="font-medium">{date || '12 marzo, 2026'}</span>
            </div>

            <Link
              href="/login"
              className="hidden items-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/80 transition-all hover:scale-[1.03] hover:border-white/30 hover:text-white sm:inline-flex"
            >
              <ArrowIcon className="mr-2 h-4 w-4" />
              Iniciar sesión
            </Link>

            <button
              onClick={() => setMenuOpen(true)}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-white/80 backdrop-blur transition-colors hover:bg-white/[0.08]"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <MenuIcon />
              <span className="hidden sm:inline">Menú</span>
            </button>
          </div>
        </div>
      </header>

      {/* -------- hero -------- */}
      <section id="inicio" className="relative isolate overflow-hidden rounded-b-3xl bg-[#050403]">
        <div ref={heroWrapRef} className="absolute inset-0 z-0 bg-[#050403]">
          <canvas ref={baseRef} className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden="true" />
          <canvas ref={paintRef} className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden="true" />
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: 'linear-gradient(to bottom, rgba(6,6,6,.5), rgba(6,6,6,.05) 35%, rgba(6,6,6,.05) 60%, rgba(6,6,6,.65))' }}
        />
        <Image
          src="/assets/images/NOIRLINE.png"
          alt=""
          width={900}
          height={900}
          className="login-hero-mark pointer-events-none absolute -right-24 top-1/2 z-[1] hidden w-[42vw] max-w-[620px] -translate-y-1/2 select-none object-contain lg:block"
        />

        <div className="landing-stagger relative z-20 mx-auto flex max-w-[88rem] flex-col gap-8 px-5 pb-16 pt-28 sm:px-8 lg:grid lg:min-h-dvh lg:grid-cols-12 lg:items-center lg:gap-10 lg:pb-20 lg:pt-36">
          <div className="flex flex-col gap-7 lg:col-span-7">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
              Plataforma de WhatsApp Business
            </p>
            <RevealLines
              as="h1"
              className="max-w-[18ch] text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl md:text-6xl"
              style={{ fontFamily: "'Manrope', sans-serif" }}
              lines={['Miles de mensajes,', 'una conversación', 'a la vez']}
            />

            <div className="flex items-center gap-3">
              <span className="text-[#4ade80]"><VerifiedIcon /></span>
              <span className="text-sm font-medium text-white/70">Integración oficial con la WhatsApp Cloud API de Meta</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setContactOpen(true)}
                className="group inline-flex items-center gap-3 rounded-full bg-[#ef4444] py-1.5 pl-6 pr-1.5 text-sm font-medium text-white transition-transform hover:scale-[1.04]"
              >
                Contáctanos
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0a0a0a] transition-transform group-hover:translate-x-1">
                  <ArrowIcon />
                </span>
              </button>
              <button
                onClick={() => scrollToId('funciones')}
                className="rounded-full border border-white/25 px-7 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.04]"
              >
                Ver funciones
              </button>
            </div>
          </div>

          <div className="flex flex-col items-start gap-8 lg:col-span-5 lg:items-end">
            <div
              onClick={() => setCarouselIndex((i) => (i + 1) % carouselItems.length)}
              className="w-full max-w-sm cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] p-2 backdrop-blur lg:max-w-[19rem]"
            >
              <div className="flex gap-2">
                <div className="grid aspect-square w-24 flex-shrink-0 place-items-center rounded-xl bg-black">
                  <Image src="/assets/images/NOIRLINE2.png" alt="" width={30} height={30} className="h-7 w-7 object-contain" />
                </div>
                <div className="flex flex-1 flex-col justify-between rounded-xl bg-white/[0.04] p-3">
                  <div>
                    <p className="text-[.65rem] font-medium uppercase tracking-wider text-white/45">{carouselItems[carouselIndex].caption}</p>
                    <p className="mt-1 max-w-[8rem] text-sm font-medium leading-snug">{carouselItems[carouselIndex].title}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1">
                      {carouselItems.map((_, i) => (
                        <span key={i} className={`h-1 rounded-full transition-all ${i === carouselIndex ? 'w-4 bg-white/75' : 'w-1.5 bg-white/20'}`} />
                      ))}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCarouselIndex((i) => (i + 1) % carouselItems.length); }}
                      className="grid h-7 w-7 place-items-center rounded-full bg-white text-black/70 ring-1 ring-white/10 transition-colors hover:text-black"
                      aria-label="Siguiente"
                    >
                      <ArrowIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm lg:max-w-[19rem]">
              <p className="mb-3 text-left text-xs font-medium text-white/45 lg:text-right">Construido sobre</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-2">
                {STACK.map((s) => (
                  <span key={s} className="flex items-center gap-1.5 text-xs text-white/70 transition-all hover:-translate-y-0.5 hover:opacity-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-20 mx-auto flex max-w-[88rem] items-center justify-between gap-3 border-t border-white/10 px-5 py-5 text-xs font-medium uppercase tracking-wide text-white/55 sm:px-8">
          <span>Construido en Ecuador</span>
          <span className="hidden sm:inline">Remote-first, multiempresa</span>
          <span className="inline-flex items-center gap-2">
            Desplázate para explorar
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
          </span>
        </div>
      </section>

      {/* -------- nosotros -------- */}
      <section id="nosotros" className="bg-[#050403]">
        <div className="mx-auto grid max-w-[88rem] grid-cols-1 items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
          <div className="landing-reveal relative flex min-h-[16rem] items-center overflow-hidden">
            <Image
              src="/assets/images/NOIRLINE.png"
              alt=""
              width={640}
              height={640}
              className="pointer-events-none absolute inset-0 m-auto h-full w-full max-w-[24rem] select-none object-contain opacity-[0.12] grayscale"
            />
            <p className="absolute left-0 top-0 inline-flex items-center gap-2 text-sm font-medium text-white/65">
              <span className="h-1.5 w-1.5 rounded-full bg-white/45" />
              La Plataforma
            </p>
          </div>
          <div className="flex flex-col gap-10">
            <RevealWords
              as="h2"
              className="max-w-[30ch] text-2xl font-medium leading-snug tracking-tight sm:text-3xl"
              style={{ fontFamily: "'Manrope', sans-serif" }}
              text="Ayudamos a organizaciones a escalar su comunicación por WhatsApp sin perder el control, la trazabilidad ni el toque humano de cada conversación."
              mutedFrom={9}
            />
            <div className="landing-reveal flex flex-wrap items-end justify-between gap-6 border-t border-white/10 pt-6">
              <div>
                <p className="mb-2 text-sm text-white/45">Encuéntranos</p>
                <div className="flex gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ef4444] text-sm"><CloseIcon /></span>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-sm text-white/70"><ApiIcon /></span>
                </div>
              </div>
              <button onClick={() => scrollToId('funciones')} className="inline-flex items-center gap-3 rounded-full border border-white/20 py-1.5 pl-6 pr-1.5 text-sm font-medium transition-transform hover:scale-[1.04]">
                Cómo funciona
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0a0a0a]"><ArrowIcon /></span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* -------- create band -------- */}
      <section className="bg-[#050403]">
        <ul className="mx-auto flex max-w-[88rem] flex-col gap-3 px-5 py-10 sm:flex-row sm:px-8">
          <li className="flex-1"><div className="landing-band-tile grid h-14 place-items-center rounded-full bg-white/[0.06] text-base font-medium sm:h-[4.5rem] sm:text-lg">Envía</div></li>
          <li className="flex-1"><div className="landing-band-tile grid h-14 place-items-center rounded-full text-base font-medium text-white sm:h-[4.5rem] sm:text-lg" style={{ background: 'linear-gradient(to bottom right, #ff7a5c, #9c1c1c)' }}>Automatiza</div></li>
          <li className="flex-1"><div className="landing-band-tile grid h-14 place-items-center rounded-full bg-black text-white sm:h-[4.5rem]"><ArrowIcon className="h-5 w-5 sm:h-6 sm:w-6" /></div></li>
          <li className="flex-1"><div className="landing-band-tile grid h-14 place-items-center rounded-full border border-white/10 text-base font-medium text-white/60 sm:h-[4.5rem] sm:text-lg">Convierte</div></li>
        </ul>
      </section>

      {/* -------- funciones -------- */}
      <section id="funciones" className="bg-[#050403]">
        <div className="mx-auto flex flex-col items-center gap-5 px-5 pt-10 text-center sm:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-sm font-medium text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-white/45" /> Funciones
          </p>
          <RevealLines as="h2" className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "'Manrope', sans-serif" }} lines={['Todo en una plataforma']} />
        </div>

        <ul className="mx-auto grid max-w-[88rem] grid-cols-1 gap-6 px-5 py-10 sm:px-8 md:grid-cols-2 lg:pb-24">
          {FEATURES.map(({ title, meta, desc, tags, Icon }) => (
            <li key={title} className="landing-reveal">
              <article className="landing-ink-card relative flex min-h-[22rem] flex-col overflow-hidden rounded-3xl p-6 text-white transition-transform duration-500 hover:-translate-y-2 sm:min-h-[24rem] sm:p-8">
                <div className="relative z-10 flex items-center justify-between text-xs uppercase tracking-wide text-white/45">
                  <span>{meta}</span>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 ring-1 ring-white/15"><ArrowUpRightIcon /></span>
                </div>
                <div className="pointer-events-none absolute inset-0 z-0 grid place-items-center opacity-90">
                  <div className="h-16 w-16 text-white"><Icon /></div>
                </div>
                <div className="relative z-10 mt-auto">
                  <h3 className="text-xl font-medium tracking-tight sm:text-2xl">{title}</h3>
                  <p className="mt-2 max-w-md text-sm text-white/60">{desc}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <span key={t} className="inline-flex rounded-full border border-white/25 px-3.5 py-2 text-sm">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="absolute right-0 top-0 h-16 w-16 flex items-center justify-center text-white/10">
                  <Icon />
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* -------- plataforma / servicios -------- */}
      <section id="plataforma" className="bg-[#050403]">
        <div className="mx-auto px-5 py-20 sm:px-8 lg:py-28">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-white/45" /> Cómo funciona
          </p>
          <RevealLines
            as="h2"
            className="mb-14 mt-5 max-w-[16ch] text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "'Manrope', sans-serif" }}
            lines={['Diseñado para escalar contigo']}
          />

          <ul>
            {SERVICES.map((s, i) => (
              <li key={s.n} className={`landing-reveal${i === 0 ? '' : ' border-t border-white/10'}`}>
                <button onClick={() => scrollToId('funciones')} className="landing-service-row flex w-full items-center gap-4 rounded-2xl py-6 text-left sm:gap-6 sm:py-8">
                  <span className="w-7 flex-shrink-0 font-mono text-sm text-white/40 sm:w-10">{s.n}</span>
                  <h3 className="flex-1 text-xl font-medium tracking-tight sm:text-2xl md:text-3xl">{s.title}</h3>
                  <span className="hidden max-w-xs text-sm text-white/55 lg:block">{s.desc}</span>
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[#ef4444] text-white transition-transform group-hover:translate-x-1 sm:h-12 sm:w-12">
                    <ArrowUpRightIcon />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------- en números -------- */}
      <section id="numeros" className="bg-[#050403]">
        <div className="mx-auto px-5 pb-20 sm:px-8 lg:pb-28">
          <div className="landing-ink-card landing-reveal relative overflow-hidden rounded-3xl p-8 text-white sm:p-12 md:px-16">
            <p className="relative z-10 inline-flex items-center gap-2 text-sm font-medium text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-white/55" /> Así está hecho
            </p>
            <RevealLines
              as="h2"
              className="relative z-10 mt-4 max-w-[20ch] text-2xl font-medium tracking-tight md:text-3xl"
              style={{ fontFamily: "'Manrope', sans-serif" }}
              lines={['Capacidades reales, no cifras de marketing.']}
            />
            <ul ref={statsRef} className="relative z-10 mt-14 grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-4">
              {STATS.map((s) => (
                <li key={s.label}>
                  <div
                    data-count={s.value}
                    data-suffix={s.suffix}
                    className="font-mono text-4xl font-bold tracking-tight tabular-nums sm:text-5xl md:text-6xl"
                  >
                    {0}
                    {s.suffix}
                  </div>
                  <p className="mt-3 text-sm text-white/55">{s.label}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* -------- footer -------- */}
      <footer className="relative overflow-hidden rounded-t-3xl bg-[#0a0a09] text-white">
        <div className="relative z-10 mx-auto px-5 pb-10 pt-20 sm:px-8 lg:pt-24">
          <div className="flex flex-col gap-8 border-b border-white/10 pb-16 lg:flex-row lg:items-end lg:justify-between">
            <RevealLines
              as="h2"
              className="max-w-[16ch] text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
              style={{ fontFamily: "'Manrope', sans-serif" }}
              lines={['¿Listo para escalar tu', 'comunicación? Hablemos.']}
            />
            <button onClick={() => setContactOpen(true)} className="group inline-flex w-fit items-center gap-3 rounded-full bg-[#F2F2F2] py-1.5 pl-6 pr-1.5 text-sm font-medium text-black transition-transform hover:scale-[1.04]">
              Contáctanos
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0a0a0a] text-white transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                <ArrowUpRightIcon />
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2 text-lg font-bold" style={{ fontFamily: "'Manrope', sans-serif" }}>
                <Image src="/assets/images/NOIRLINE2.png" alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                NextLine
              </div>
              <p className="mt-4 max-w-xs text-sm text-white/55">
                Una plataforma para escalar tu comunicación por WhatsApp sin perder el control ni la trazabilidad.
              </p>
            </div>
            <div>
              <p className="mb-4 text-xs uppercase tracking-wide text-white/40">Producto</p>
              <ul className="flex flex-col gap-3 text-sm">
                <li><button onClick={() => scrollToId('funciones')} className="opacity-65 transition-all hover:translate-x-1 hover:opacity-100">Funciones</button></li>
                <li><button onClick={() => scrollToId('plataforma')} className="opacity-65 transition-all hover:translate-x-1 hover:opacity-100">Cómo funciona</button></li>
                <li><button onClick={() => scrollToId('numeros')} className="opacity-65 transition-all hover:translate-x-1 hover:opacity-100">Seguridad</button></li>
                <li><button onClick={() => setContactOpen(true)} className="opacity-65 transition-all hover:translate-x-1 hover:opacity-100">Contacto</button></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs uppercase tracking-wide text-white/40">Plataforma</p>
              <ul className="flex flex-col gap-3 text-sm">
                <li><button onClick={() => scrollToId('funciones')} className="opacity-65 transition-all hover:translate-x-1 hover:opacity-100">Chat</button></li>
                <li><button onClick={() => scrollToId('funciones')} className="opacity-65 transition-all hover:translate-x-1 hover:opacity-100">Masivos</button></li>
                <li><button onClick={() => scrollToId('funciones')} className="opacity-65 transition-all hover:translate-x-1 hover:opacity-100">Plantillas</button></li>
                <li><button onClick={() => scrollToId('funciones')} className="opacity-65 transition-all hover:translate-x-1 hover:opacity-100">Auditoría</button></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs uppercase tracking-wide text-white/40">Acceso</p>
              <ul className="flex flex-col gap-3 text-sm">
                <li><Link href="/login" className="opacity-65 transition-all hover:translate-x-1 hover:opacity-100">Iniciar sesión</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/45 sm:flex-row">
            <span>© 2026 NextLine. Todos los derechos reservados.</span>
            <span className="flex items-center gap-1.5">
              Hecho por
              <Image src="/assets/images/krakedev_logo-ByJvfRFA.png" alt="KrakeDev" width={56} height={32} className="h-6 w-auto object-contain opacity-80" />
            </span>
          </div>
        </div>
        <div className="landing-watermark pointer-events-none absolute inset-x-0 -bottom-6 select-none text-center" style={{ fontSize: 'clamp(3rem,18vw,13rem)' }}>
          NEXTLINE
        </div>
      </footer>

      {/* -------- menú móvil -------- */}
      {menuOpen && (
        <div className="fixed inset-0 z-[115] flex flex-col bg-[#050403] text-white">
          <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between px-5 py-5 sm:px-8" style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))' }}>
            <div className="flex items-center gap-2 text-lg font-bold" style={{ fontFamily: "'Manrope', sans-serif" }}>
              <Image src="/assets/images/NOIRLINE2.png" alt="" width={24} height={24} className="h-6 w-6 object-contain" />
              NextLine
            </div>
            <button onClick={() => setMenuOpen(false)} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white/75 transition-colors hover:border-white/40 hover:text-white" aria-label="Cerrar menú">
              <CloseIcon />
            </button>
          </div>
          <nav className="mx-auto flex w-full max-w-[88rem] flex-1 flex-col justify-center px-5 sm:px-8">
            <ul className="flex flex-col gap-1">
              {[...NAV_LINKS, { id: 'contacto', label: 'Contacto' }].map((l, i) => (
                <li key={l.id}>
                  <button
                    onClick={() => (l.id === 'contacto' ? (setMenuOpen(false), setContactOpen(true)) : scrollToId(l.id))}
                    className="group flex w-full items-baseline gap-4 py-2 text-left text-4xl font-bold tracking-tight sm:text-6xl"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    <span className="font-mono text-base font-normal text-white/30 transition-colors group-hover:text-[#ff7a5c]">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-white/75 transition-colors group-hover:text-white">{l.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div
            className="mx-auto flex w-full max-w-[88rem] flex-col gap-3 border-t border-white/10 px-5 py-6 text-xs uppercase tracking-wide text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-8"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <span>Hora local — {time}</span>
            <Link href="/login" className="text-white/75 transition-colors hover:text-white hover:underline">Iniciar sesión →</Link>
          </div>
        </div>
      )}

      {/* -------- modal de contacto -------- */}
      {contactOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/55 p-4 backdrop-blur-xl sm:items-center"
          onClick={() => setContactOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="landing-ink-card relative w-full max-w-lg overflow-hidden rounded-3xl p-6 sm:p-8"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <button
              onClick={() => setContactOpen(false)}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>

            {!sent ? (
              <>
                <div className="relative z-10 mb-6 flex items-start justify-between gap-4 pr-10">
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-white/65">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" /> Contáctanos
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ fontFamily: "'Manrope', sans-serif" }}>Cuéntanos sobre tu equipo.</h2>
                  </div>
                  <Image src="/assets/images/krakedev_logo-ByJvfRFA.png" alt="Krakedev" width={72} height={42} className="mt-1 h-auto w-16 flex-shrink-0 object-contain opacity-80 sm:w-18" />
                </div>
                <form onSubmit={handleContactSubmit} className="relative z-10 flex flex-col gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-white/50">Nombre</span>
                    <input required type="text" placeholder="Tu nombre" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition-colors focus:border-white/30 focus:bg-white/[0.08]" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-white/50">Correo</span>
                    <input required type="email" placeholder="tu@empresa.com" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition-colors focus:border-white/30 focus:bg-white/[0.08]" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-white/50">Tu organización</span>
                    <textarea required rows={4} placeholder="Cuéntanos sobre tu organización y cuántas conversaciones manejas al mes." className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition-colors focus:border-white/30 focus:bg-white/[0.08]" />
                  </label>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                    <span className="text-xs text-white/45">Te respondemos en menos de 1 día hábil.</span>
                    <button type="submit" disabled={sending} className="inline-flex items-center gap-3 rounded-full bg-[#ef4444] py-1.5 pl-6 pr-1.5 text-sm font-medium text-white transition-transform hover:scale-[1.04] disabled:opacity-70">
                      {sending ? 'Enviando…' : 'Enviar solicitud'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="relative z-10 flex flex-col items-center gap-4 py-8 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-black text-[#ff7a5c]">
                  <Image src="/assets/images/NOIRLINE2.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
                </div>
                <h2 className="text-2xl font-bold" style={{ fontFamily: "'Manrope', sans-serif" }}>Solicitud recibida</h2>
                <p className="max-w-[32ch] text-sm text-white/60">Gracias por tu interés — te contactaremos pronto.</p>
                <button onClick={() => setContactOpen(false)} className="rounded-full bg-[#F2F2F2] px-7 py-3 text-sm font-medium text-black">Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
