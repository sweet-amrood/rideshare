import { useId, useLayoutEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ArrowRight, Car, MousePointer2, User, X } from 'lucide-react';
import { paths } from '@/app/router/paths';
import AppButton from '@/components/common/AppButton';
import useUserMode from '@/hooks/useUserMode';
import { useAuth } from '@/hooks/useAuth';
import './experience.css';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

const SCENES = [
  { id: 0, label: 'The City' },
  { id: 1, label: 'Congestion' },
  { id: 2, label: 'The Network' },
  { id: 3, label: 'Matching' },
  { id: 4, label: 'Carpool' },
  { id: 5, label: 'Optimized' },
  { id: 6, label: 'Launch' }
];

const PALETTE = {
  brand: ['#7c8bff', '#4f46e5'],
  cyan: ['#5fe3f5', '#0ea5c4'],
  violet: ['#b69cff', '#7c3aed'],
  amber: ['#fbcf5a', '#f59e0b'],
  rose: ['#fb8aa0', '#e11d48'],
  slate: ['#8c9bb5', '#475569'],
  emerald: ['#5fe0ac', '#10b981']
};

const CAR_KEYS = Object.keys(PALETTE);

/** Scattered, road-aligned cars for the congestion scene. */
const CHAOS_CARS = Array.from({ length: 9 }).map((_, i) => ({
  color: CAR_KEYS[i % CAR_KEYS.length],
  left: 6 + (i % 5) * 19 + (i % 2 ? 3 : -2),
  top: 57 + ((i * 31) % 10)
}));

/** A few calm cars on the road after optimisation ("less chaos"). */
const AMBIENT_CARS = [
  { color: 'slate', left: 18, top: 58 },
  { color: 'cyan', left: 44, top: 63 },
  { color: 'violet', left: 72, top: 59 }
];

const BLOCKS = [
  { left: 8, w: 46, h: 150 },
  { left: 15, w: 70, h: 220 },
  { left: 24, w: 52, h: 120 },
  { left: 33, w: 84, h: 280 },
  { left: 45, w: 60, h: 180 },
  { left: 56, w: 96, h: 250 },
  { left: 70, w: 54, h: 160 },
  { left: 80, w: 78, h: 210 },
  { left: 90, w: 48, h: 130 }
];

/** Side-view car sprite, headlight forward (right) in the direction of travel. */
function CarSvg({ color = 'brand' }) {
  const uid = useId().replace(/:/g, '');
  const [c1, c2] = PALETTE[color] || PALETTE.brand;
  const gid = `xjcar-${uid}`;
  return (
    <svg viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <ellipse cx="30" cy="26.5" rx="23" ry="2.6" fill="rgba(0,0,0,0.32)" />
      <path
        d="M4 18 Q4 13 10 12 L17 7.5 Q20 5.5 26 5.5 L40 5.5 Q46 5.5 49 9.5 L54 12.5 Q57 13.5 57 17 L57 19.5 Q57 22 53.5 22 L7 22 Q4 22 4 19 Z"
        fill={`url(#${gid})`}
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="0.6"
      />
      <path d="M19 9 L25 9 L25 12.5 L15.5 12.5 Z" fill="rgba(7,11,20,0.6)" />
      <path d="M27 9 L39 9 Q43 9 45.5 12 L27 12 Z" fill="rgba(7,11,20,0.6)" />
      <circle cx="53.5" cy="15" r="1.7" fill="#fff7d6" />
      <rect x="4.5" y="14" width="2.2" height="3.2" rx="1" fill="#ff7676" />
      <circle cx="18" cy="22" r="4.7" fill="#0b0f1a" stroke="#39456a" strokeWidth="1.6" />
      <circle cx="43" cy="22" r="4.7" fill="#0b0f1a" stroke="#39456a" strokeWidth="1.6" />
    </svg>
  );
}

function Vehicle({ color, className = '', style }) {
  return (
    <div className={`xj-car ${className}`} style={style}>
      <CarSvg color={color} />
    </div>
  );
}

function SceneCaption({ index, title, sub }) {
  return (
    <div className="xj-caption">
      <span className="xj-eyebrow">{`0${index} — ${SCENES[index].label}`}</span>
      <h2 className="xj-title">{title}</h2>
      <p className="xj-sub">{sub}</p>
    </div>
  );
}

export default function HorizontalJourney({ embedded = false }) {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { setMode, USER_MODES } = useUserMode();
  const { user, token, isInitialized } = useAuth();
  const isLoggedIn = Boolean(isInitialized && (user || token));

  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const bgRef = useRef(null);
  const heroRef = useRef(null);
  const skyRef = useRef(null);
  const skylineRef = useRef(null);
  const tintRef = useRef(null);

  const openApp = () => {
    setMode(USER_MODES.APP);
    navigate(isLoggedIn ? paths.dashboard : paths.app);
  };

  const total = SCENES.length;

  useLayoutEffect(() => {
    if (reduceMotion) return undefined;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const world = worldRef.current;
      const hero = heroRef.current;
      const vw = (n) => (window.innerWidth * n) / 100;
      const distance = () => Math.max(0, world.offsetWidth - window.innerWidth);

      // ── Initial states ──
      gsap.set(hero, { x: vw(-16), autoAlpha: 0 });
      gsap.set(q('.xj-pax'), { scale: 0.3 });
      gsap.set(q('.xj-conn--a'), { rotation: -28, scaleX: 0, transformOrigin: 'left center' });
      gsap.set(q('.xj-conn--b'), { rotation: 12, scaleX: 0, transformOrigin: 'left center' });
      gsap.set(tintRef.current, { backgroundColor: 'rgba(60,80,150,0)' });

      // ── Ambient loops (scroll-independent, run continuously) ──
      q('.xj-chaos-car').forEach((car, i) => {
        gsap.to(car, {
          x: `+=${gsap.utils.random(-110, 110)}`,
          y: `+=${gsap.utils.random(-10, 10)}`,
          duration: gsap.utils.random(1.8, 3.4),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.12
        });
      });
      q('.xj-scene-2 .xj-node.is-hub').forEach((hub) => {
        gsap.to(hub, { scale: 1.18, repeat: -1, yoyo: true, duration: 1.3, ease: 'sine.inOut' });
      });
      q('.xj-amb-car').forEach((car, i) => {
        gsap.to(car, {
          x: '+=24',
          repeat: -1,
          yoyo: true,
          duration: gsap.utils.random(1.6, 2.4),
          delay: i * 0.2,
          ease: 'sine.inOut'
        });
      });

      // ── ONE master timeline drives camera + scenes + hero car together ──
      // Timeline time == scene index (scroll 0→1 maps to t 0→6).
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: viewportRef.current,
          start: 'top top',
          end: () => '+=' + distance(),
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      // Camera + multi-layer parallax span the full timeline (far → near)
      tl.to(world, { x: () => -distance(), duration: 6 }, 0);
      tl.to(skyRef.current, { x: () => -distance() * 0.04, duration: 6 }, 0);
      tl.to(skylineRef.current, { x: () => -distance() * 0.12, duration: 6 }, 0);
      tl.fromTo(bgRef.current, { x: 0 }, { x: () => distance() * 0.06, duration: 6 }, 0);

      // Ambient colour arc: chaos warms, optimisation cools, launch glows brand.
      tl.to(tintRef.current, { backgroundColor: 'rgba(150,72,58,0.34)', duration: 0.9 }, 0.6);
      tl.to(tintRef.current, { backgroundColor: 'rgba(72,82,150,0.26)', duration: 0.9 }, 1.8);
      tl.to(tintRef.current, { backgroundColor: 'rgba(56,92,142,0.22)', duration: 0.9 }, 2.9);
      tl.to(tintRef.current, { backgroundColor: 'rgba(40,120,150,0.30)', duration: 0.9 }, 4.2);
      tl.to(tintRef.current, { backgroundColor: 'rgba(64,104,214,0.30)', duration: 0.9 }, 5.4);

      // Scene reveals (placed near each scene's centre time)
      tl.from(q('.xj-scene-0 .xj-block'), { yPercent: 22, opacity: 0, stagger: 0.04, duration: 0.6 }, 0);
      tl.from(q('.xj-chaos-car'), { opacity: 0, scale: 0.4, stagger: 0.04, duration: 0.5 }, 0.5);
      tl.from(
        q('.xj-scene-2 .xj-node'),
        { scale: 0, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'back.out(1.7)' },
        1.5
      );
      tl.from(
        q('.xj-scene-2 .xj-route'),
        { scaleX: 0, opacity: 0, transformOrigin: 'left center', stagger: 0.04, duration: 0.5 },
        1.7
      );
      tl.from(q('.xj-amb-car'), { opacity: 0, x: -40, stagger: 0.1, duration: 0.5 }, 3.5);
      tl.to(q('.xj-scene-5 .xj-route--ghost'), { opacity: 0, duration: 0.6 }, 4.5);
      tl.from(
        q('.xj-scene-5 .xj-route--clean'),
        { scaleX: 0, transformOrigin: 'left center', duration: 0.6 },
        4.7
      );
      tl.from(
        q('.xj-hero > *'),
        { y: 30, opacity: 0, stagger: 0.1, duration: 0.5, ease: 'power3.out' },
        5.4
      );
      q('.xj-stat-num').forEach((el) => {
        const targetValue = parseFloat(el.dataset.value);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const suffix = el.dataset.suffix || '';
        const proxy = { v: 0 };
        tl.to(
          proxy,
          {
            v: targetValue,
            duration: 0.6,
            onUpdate: () => {
              el.textContent = proxy.v.toFixed(decimals) + suffix;
            }
          },
          5.4
        );
      });

      // ── Hero car beats (same timeline → always in sync, never rewinds) ──
      tl.to(hero, { x: () => vw(18), autoAlpha: 1, duration: 0.6, ease: 'power1.out' }, 0.4);
      tl.to(hero, { x: () => vw(46), duration: 1.2 }, 1.0);
      // riders matched: pins pop in + connectors snap with a little overshoot
      tl.to(q('.xj-pax'), { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2.2)' }, 2.2);
      tl.to(q('.xj-conn--a'), { scaleX: 1, autoAlpha: 1, duration: 0.4, ease: 'back.out(1.4)' }, 2.2);
      tl.to(q('.xj-conn--b'), { scaleX: 1, autoAlpha: 1, duration: 0.4, ease: 'back.out(1.4)' }, 2.35);
      // car slows and stops at centre
      tl.to(hero, { x: () => vw(50), duration: 0.8, ease: 'power2.out' }, 2.2);
      // rider one hops in → seat indicator pops on
      tl.to(q('.xj-pax--a'), { x: -92, y: 54, scale: 0.15, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 3.0);
      tl.to(q('.xj-conn--a'), { autoAlpha: 0, duration: 0.2 }, 3.0);
      tl.to(q('.xj-seatdot--a'), { backgroundColor: '#34d399', boxShadow: '0 0 12px #34d399', scale: 1.7, duration: 0.2, ease: 'back.out(3)' }, 3.2);
      tl.to(q('.xj-seatdot--a'), { scale: 1, duration: 0.18 }, 3.4);
      // rider two hops in (carpool formed) → seat indicator pops on
      tl.to(q('.xj-pax--b'), { x: -118, y: -26, scale: 0.15, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, 3.45);
      tl.to(q('.xj-conn--b'), { autoAlpha: 0, duration: 0.2 }, 3.45);
      tl.to(q('.xj-seatdot--b'), { backgroundColor: '#34d399', boxShadow: '0 0 12px #34d399', scale: 1.7, duration: 0.2, ease: 'back.out(3)' }, 3.65);
      tl.to(q('.xj-seatdot--b'), { scale: 1, duration: 0.18 }, 3.85);
      // carpool rolls on, then glides onto the clean route, then exits
      tl.to(hero, { x: () => vw(56), duration: 0.9 }, 3.9);
      tl.to(hero, { x: () => vw(62), duration: 1.0 }, 4.7);
      tl.to(hero, { x: () => vw(90), autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, 5.5);

      const refresh = () => ScrollTrigger.refresh();
      window.requestAnimationFrame(refresh);
      window.addEventListener('load', refresh);
      return () => window.removeEventListener('load', refresh);
    }, rootRef);

    return () => ctx.revert();
  }, [reduceMotion, total]);

  return (
    <div ref={rootRef} className={`xj-root ${reduceMotion ? 'xj-reduced' : ''}`}>
      {/* ── Overlay chrome (standalone only) ── */}
      {!embedded && (
        <div className="xj-chrome">
          <div className="xj-topbar">
            <Link to={paths.home} className="xj-logo" aria-label="Ride Share home">
              <span className="xj-logo-mark">
                <Car className="h-4 w-4 text-white" />
              </span>
              <span className="text-sm">RIDE SHARE</span>
            </Link>
            <div className="flex items-center gap-2">
              <AppButton type="button" size="sm" onClick={openApp}>
                {isLoggedIn ? 'Open dashboard' : 'Open app'}
                <ArrowRight className="h-4 w-4" />
              </AppButton>
              <Link to={paths.home} aria-label="Exit experience">
                <AppButton type="button" variant="outline" size="sm">
                  <X className="h-4 w-4" />
                </AppButton>
              </Link>
            </div>
          </div>

          {!reduceMotion && (
            <div className="xj-scroll-hint">
              <MousePointer2 className="h-4 w-4" />
              <span>Scroll to travel</span>
            </div>
          )}
        </div>
      )}

      {/* ── Pinned camera viewport ── */}
      <div ref={viewportRef} className="xj-viewport">
        {/* Parallax depth layers (screen-space, behind the world) */}
        <div ref={skyRef} className="xj-sky" />
        <div ref={skylineRef} className="xj-skyline" />

        <div ref={worldRef} className="xj-world">
          {/* Continuous environment spanning the whole world */}
          <div ref={bgRef} className="xj-bg" style={{ width: `${total * 100}vw` }}>
            <div className="xj-grid" />
            <div className="xj-road">
              <div className="xj-lane is-top" />
              <div className="xj-lane is-mid" />
              <div className="xj-lane is-bottom" />
            </div>
          </div>

          {/* Scene 0 · The City */}
          <section className="xj-scene xj-scene-0">
            <SceneCaption
              index={0}
              title={
                <>
                  Every journey <span className="xj-grad">starts alone.</span>
                </>
              }
              sub="A connected city grid — yet thousands of commuters still set out separately, on routes that quietly overlap."
            />
            <div className="xj-stage">
              {BLOCKS.map((b, i) => (
                <div
                  key={i}
                  className="xj-block"
                  style={{ left: `${b.left}%`, width: `${b.w}px`, height: `${b.h}px` }}
                />
              ))}
            </div>
          </section>

          {/* Scene 1 · Congestion */}
          <section className="xj-scene xj-scene-1">
            <SceneCaption
              index={1}
              title={
                <>
                  Too many cars. <span className="xj-grad">Too few seats.</span>
                </>
              }
              sub="Solo trips multiply traffic, cost, and emissions. The roads are full — but the cars are nearly empty."
            />
            <div className="xj-stage">
              {CHAOS_CARS.map((c, i) => (
                <Vehicle
                  key={i}
                  color={c.color}
                  className="xj-chaos-car"
                  style={{ left: `${c.left}%`, top: `${c.top}%` }}
                />
              ))}
            </div>
          </section>

          {/* Scene 2 · The Network */}
          <section className="xj-scene xj-scene-2">
            <SceneCaption
              index={2}
              title={
                <>
                  Ride Share maps <span className="xj-grad">every route.</span>
                </>
              }
              sub="Our engine reads the city in real time — predicting paths and surfacing commuters already heading the same way."
            />
            <div className="xj-stage">
              <div className="xj-node is-hub" style={{ left: '48%', top: '56%' }} />
              {[
                [20, 50],
                [32, 64],
                [40, 44],
                [58, 66],
                [64, 50],
                [74, 60],
                [84, 52],
                [28, 56],
                [54, 46]
              ].map(([l, t], i) => (
                <div key={i} className="xj-node" style={{ left: `${l}%`, top: `${t}%` }} />
              ))}
              {[
                { left: 20, top: 50, w: 300 },
                { left: 32, top: 64, w: 260 },
                { left: 54, top: 46, w: 220 },
                { left: 58, top: 66, w: 240 },
                { left: 64, top: 50, w: 200 }
              ].map((r, i) => (
                <div
                  key={i}
                  className="xj-route xj-route--ghost"
                  style={{ left: `${r.left}%`, top: `${r.top}%`, width: `${r.w}px` }}
                />
              ))}
            </div>
          </section>

          {/* Scene 3 · Matching (hero car + riders connect here) */}
          <section className="xj-scene xj-scene-3">
            <SceneCaption
              index={3}
              title={
                <>
                  Riders matched <span className="xj-grad">in real time.</span>
                </>
              }
              sub="We pair people by route, direction, and timing — then connect them to a driver already on the way."
            />
          </section>

          {/* Scene 4 · Carpool */}
          <section className="xj-scene xj-scene-4">
            <SceneCaption
              index={4}
              title={
                <>
                  Seats fill. <span className="xj-grad">Trips combine.</span>
                </>
              }
              sub="Matched riders share a single vehicle. Fewer cars on the road, fuller seats, lower cost for everyone."
            />
            <div className="xj-stage">
              {AMBIENT_CARS.map((c, i) => (
                <Vehicle
                  key={i}
                  color={c.color}
                  className="xj-amb-car"
                  style={{ left: `${c.left}%`, top: `${c.top}%` }}
                />
              ))}
            </div>
          </section>

          {/* Scene 5 · Optimized */}
          <section className="xj-scene xj-scene-5">
            <SceneCaption
              index={5}
              title={
                <>
                  One efficient, <span className="xj-grad">shared route.</span>
                </>
              }
              sub="Redundant trips disappear. What remains is a clean, optimized journey that keeps the city moving."
            />
            <div className="xj-stage">
              {[
                { left: 18, top: 48, w: 180 },
                { left: 40, top: 70, w: 160 },
                { left: 66, top: 44, w: 200 }
              ].map((r, i) => (
                <div
                  key={i}
                  className="xj-route xj-route--ghost"
                  style={{ left: `${r.left}%`, top: `${r.top}%`, width: `${r.w}px` }}
                />
              ))}
              <div
                className="xj-route xj-route--clean"
                style={{ left: '16%', top: '61%', width: '64%' }}
              />
            </div>
          </section>

          {/* Scene 6 · Hero Outcome */}
          <section className="xj-scene xj-scene-6">
            <div className="xj-hero">
              <span className="xj-eyebrow">06 — Launch</span>
              <h2 className="xj-title" style={{ maxWidth: '14ch' }}>
                Move the city <span className="xj-grad">together.</span>
              </h2>
              <div className="xj-stats">
                <div className="xj-stat">
                  <div className="xj-stat-num" data-value="40" data-suffix="%">
                    0%
                  </div>
                  <div className="xj-stat-label">Less traffic per route</div>
                </div>
                <div className="xj-stat">
                  <div className="xj-stat-num" data-value="12" data-suffix="k+">
                    0k+
                  </div>
                  <div className="xj-stat-label">Trips completed</div>
                </div>
                <div className="xj-stat">
                  <div className="xj-stat-num" data-value="2.4" data-decimals="1" data-suffix="k">
                    0k
                  </div>
                  <div className="xj-stat-label">Verified commuters</div>
                </div>
                <div className="xj-stat">
                  <div className="xj-stat-num" data-value="98" data-suffix="%">
                    0%
                  </div>
                  <div className="xj-stat-label">On-time arrivals</div>
                </div>
              </div>
              <p className="xj-sub" style={{ maxWidth: '46ch' }}>
                Verified carpools and on-demand rides, matched in real time. Save money, cut
                traffic, and commute smarter — together.
              </p>
              <span className="xj-hero-cue">Keep scrolling to get started</span>
            </div>
          </section>
        </div>

        {/* Ambient mood tint (shifts colour across the narrative) */}
        <div ref={tintRef} className="xj-tint" />
        {/* Edge vignette — melts the pinned scene into the page above/below */}
        <div className="xj-vignette" />

        {/* ── Continuous hero car overlay (screen-fixed on the road) ── */}
        <div className="xj-herolayer">
          <div ref={heroRef} className="xj-herocar">
            <Vehicle color="brand" />
            <span className="xj-seatdot xj-seatdot--a" />
            <span className="xj-seatdot xj-seatdot--b" />
            <span className="xj-conn xj-conn--a" />
            <span className="xj-conn xj-conn--b" />
            <span className="xj-pax xj-pax--a">
              <User className="h-3.5 w-3.5" />
            </span>
            <span className="xj-pax xj-pax--b">
              <User className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
