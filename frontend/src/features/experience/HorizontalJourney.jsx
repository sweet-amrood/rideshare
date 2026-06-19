import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ArrowRight, Car, MousePointer2, X } from 'lucide-react';
import { paths } from '@/app/router/paths';
import AppButton from '@/components/common/AppButton';
import useUserMode from '@/hooks/useUserMode';
import { useAuth } from '@/hooks/useAuth';
import './experience.css';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

const SCENES = [
  { id: 0, label: 'City' },
  { id: 1, label: 'Chaos' },
  { id: 2, label: 'Activate' },
  { id: 3, label: 'Match' },
  { id: 4, label: 'Carpool' },
  { id: 5, label: 'Optimize' },
  { id: 6, label: 'Launch' }
];

const CAR_COLORS = ['brand', 'cyan', 'violet', 'amber', 'rose', 'slate', 'emerald'];

/** Scattered cars for the chaos scene. */
const CHAOS_CARS = Array.from({ length: 9 }).map((_, i) => ({
  color: CAR_COLORS[i % CAR_COLORS.length],
  left: 6 + (i % 5) * 19 + (i % 2 ? 4 : -3),
  top: 44 + ((i * 37) % 28),
  scale: 0.82 + ((i * 13) % 5) / 10
}));

/** City skyline blocks shared across the opening scenes. */
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

function SceneCaption({ index, title, sub, accent }) {
  return (
    <div className="xj-caption">
      <span className="xj-eyebrow">{`0${index} — ${SCENES[index].label}`}</span>
      <h2 className="xj-title">{title}</h2>
      <p className="xj-sub">{sub}</p>
      {accent}
    </div>
  );
}

export default function HorizontalJourney() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { setMode, USER_MODES } = useUserMode();
  const { user, token, isInitialized } = useAuth();
  const isLoggedIn = Boolean(isInitialized && (user || token));

  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const bgRef = useRef(null);
  const progressRef = useRef(null);
  const [active, setActive] = useState(0);

  const openApp = () => {
    setMode(USER_MODES.APP);
    navigate(isLoggedIn ? paths.dashboard : paths.app);
  };

  const total = SCENES.length;

  useLayoutEffect(() => {
    if (reduceMotion) return undefined;
    const lastIdx = { value: -1 };

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const world = worldRef.current;
      const distance = () => Math.max(0, world.offsetWidth - window.innerWidth);

      // ── The camera: scroll drives horizontal travel ──
      const horizontal = gsap.to(world, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: viewportRef.current,
          start: 'top top',
          end: () => '+=' + distance(),
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (st) => {
            if (progressRef.current) gsap.set(progressRef.current, { scaleX: st.progress });
            const idx = Math.round(st.progress * (total - 1));
            if (idx !== lastIdx.value) {
              lastIdx.value = idx;
              setActive(idx);
            }
          }
        }
      });

      // Subtle parallax: background drifts a touch slower than scenes.
      gsap.to(bgRef.current, {
        x: () => distance() * 0.06,
        ease: 'none',
        scrollTrigger: {
          trigger: viewportRef.current,
          start: 'top top',
          end: () => '+=' + distance(),
          scrub: true,
          invalidateOnRefresh: true
        }
      });

      const inScene = (sel, opts = {}) => ({
        trigger: q(sel)[0],
        containerAnimation: horizontal,
        start: opts.start || 'left 82%',
        end: opts.end || 'left 28%',
        scrub: opts.scrub ?? true,
        toggleActions: opts.toggleActions
      });

      // ── Scene 0 · Empty City — skyline rises gently ──
      gsap.from(q('.xj-scene-0 .xj-block'), {
        yPercent: 22,
        opacity: 0,
        stagger: 0.04,
        scrollTrigger: inScene('.xj-scene-0')
      });

      // ── Scene 1 · Chaos — ambient random wandering ──
      q('.xj-chaos-car').forEach((car, i) => {
        gsap.to(car, {
          x: `+=${gsap.utils.random(-140, 140)}`,
          y: `+=${gsap.utils.random(-46, 46)}`,
          rotation: gsap.utils.random(-4, 4),
          duration: gsap.utils.random(1.8, 3.6),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.12
        });
      });
      gsap.from(q('.xj-chaos-car'), {
        opacity: 0,
        scale: 0.4,
        stagger: 0.05,
        scrollTrigger: inScene('.xj-scene-1', { end: 'left 45%' })
      });

      // ── Scene 2 · System Activation — nodes + predicted routes ──
      gsap.from(q('.xj-scene-2 .xj-node'), {
        scale: 0,
        opacity: 0,
        stagger: 0.06,
        scrollTrigger: inScene('.xj-scene-2')
      });
      gsap.from(q('.xj-scene-2 .xj-route'), {
        scaleX: 0,
        opacity: 0,
        stagger: 0.05,
        scrollTrigger: inScene('.xj-scene-2', { start: 'left 70%', end: 'left 24%' })
      });
      q('.xj-scene-2 .xj-node.is-hub').forEach((hub) => {
        gsap.to(hub, { scale: 1.18, repeat: -1, yoyo: true, duration: 1.3, ease: 'sine.inOut' });
      });

      // ── Scene 3 · Ride Matching — connectors pulse, cars hold lanes ──
      gsap.from(q('.xj-scene-3 .xj-route--match'), {
        scaleX: 0,
        opacity: 0,
        stagger: 0.08,
        scrollTrigger: inScene('.xj-scene-3')
      });
      q('.xj-scene-3 .xj-route--match').forEach((r, i) => {
        gsap.to(r, {
          opacity: 0.35,
          repeat: -1,
          yoyo: true,
          duration: 0.9,
          delay: i * 0.15,
          ease: 'sine.inOut'
        });
      });
      q('.xj-scene-3 .xj-car').forEach((car, i) => {
        gsap.to(car, {
          x: '+=22',
          repeat: -1,
          yoyo: true,
          duration: gsap.utils.random(1.4, 2.2),
          delay: i * 0.1,
          ease: 'sine.inOut'
        });
      });

      // ── Scene 4 · Carpool Formation — cars converge into pods ──
      q('.xj-converge').forEach((car) => {
        gsap.to(car, {
          x: parseFloat(car.dataset.x || '0'),
          y: parseFloat(car.dataset.y || '0'),
          scrollTrigger: inScene('.xj-scene-4', { start: 'left 78%', end: 'center center' })
        });
      });
      gsap.to(q('.xj-redundant'), {
        opacity: 0,
        scale: 0.5,
        scrollTrigger: inScene('.xj-scene-4', { start: 'left 60%', end: 'center 40%' })
      });
      gsap.from(q('.xj-scene-4 .xj-pod-ring'), {
        scale: 0,
        opacity: 0,
        stagger: 0.1,
        scrollTrigger: inScene('.xj-scene-4', { start: 'left 55%', end: 'center 35%' })
      });

      // ── Scene 5 · Optimization — noise fades, one clean route remains ──
      gsap.to(q('.xj-scene-5 .xj-route--ghost'), {
        opacity: 0,
        scrollTrigger: inScene('.xj-scene-5', { start: 'left 80%', end: 'center center' })
      });
      gsap.from(q('.xj-scene-5 .xj-route--clean'), {
        scaleX: 0,
        scrollTrigger: inScene('.xj-scene-5', { start: 'left 70%', end: 'center 35%' })
      });
      q('.xj-glide').forEach((car, i) => {
        gsap.to(car, {
          x: '+=46',
          repeat: -1,
          yoyo: true,
          duration: 2.2,
          delay: i * 0.18,
          ease: 'sine.inOut'
        });
      });

      // ── Scene 6 · Hero Outcome — reveal + count up ──
      gsap.from(q('.xj-hero > *'), {
        y: 30,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: q('.xj-scene-6')[0],
          containerAnimation: horizontal,
          start: 'left 55%',
          toggleActions: 'play none none reverse'
        }
      });
      q('.xj-stat-num').forEach((el) => {
        const targetValue = parseFloat(el.dataset.value);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const suffix = el.dataset.suffix || '';
        const proxy = { v: 0 };
        gsap.to(proxy, {
          v: targetValue,
          duration: 1.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: q('.xj-scene-6')[0],
            containerAnimation: horizontal,
            start: 'left 50%',
            toggleActions: 'play none none reverse'
          },
          onUpdate: () => {
            el.textContent = proxy.v.toFixed(decimals) + suffix;
          }
        });
      });

      // Layout settles (fonts/images) → recalc trigger positions.
      const refresh = () => ScrollTrigger.refresh();
      window.requestAnimationFrame(refresh);
      window.addEventListener('load', refresh);
      return () => window.removeEventListener('load', refresh);
    }, rootRef);

    return () => ctx.revert();
  }, [reduceMotion, total]);

  return (
    <div ref={rootRef} className={`xj-root ${reduceMotion ? 'xj-reduced' : ''}`}>
      {/* ── Overlay chrome ── */}
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

        <div className="xj-progress-wrap">
          <div className="xj-progress-track">
            <div ref={progressRef} className="xj-progress-bar" />
          </div>
          <div className="xj-progress-dots">
            {SCENES.map((s) => (
              <span key={s.id} className={`xj-dot ${active >= s.id ? 'is-active' : ''}`}>
                <span className="xj-dot-label">{s.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pinned camera viewport ── */}
      <div ref={viewportRef} className="xj-viewport">
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

          {/* Scene 0 · Empty City */}
          <section className="xj-scene xj-scene-0">
            <SceneCaption
              index={0}
              title={
                <>
                  An ordinary <span className="xj-grad">commute.</span>
                </>
              }
              sub="A quiet city grid. Roads laid out, destinations set — but no one is moving together yet."
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

          {/* Scene 1 · Chaos Travel */}
          <section className="xj-scene xj-scene-1">
            <SceneCaption
              index={1}
              title={
                <>
                  Everyone drives <span className="xj-grad">alone.</span>
                </>
              }
              sub="Thousands of overlapping trips. Empty seats everywhere. Traffic, cost, and emissions pile up."
            />
            <div className="xj-stage">
              {CHAOS_CARS.map((c, i) => (
                <div
                  key={i}
                  className={`xj-car xj-chaos-car xj-car--${c.color}`}
                  style={{ left: `${c.left}%`, top: `${c.top}%`, scale: c.scale }}
                />
              ))}
            </div>
          </section>

          {/* Scene 2 · System Activation */}
          <section className="xj-scene xj-scene-2">
            <SceneCaption
              index={2}
              title={
                <>
                  The network <span className="xj-grad">wakes up.</span>
                </>
              }
              sub="Ride Share maps the grid in real time — predicting routes and surfacing every shared path."
            />
            <div className="xj-stage">
              <div className="xj-node is-hub" style={{ left: '48%', top: '58%' }} />
              {[
                [20, 46],
                [32, 64],
                [40, 40],
                [58, 70],
                [64, 48],
                [74, 62],
                [84, 52],
                [28, 54],
                [54, 44]
              ].map(([l, t], i) => (
                <div key={i} className="xj-node" style={{ left: `${l}%`, top: `${t}%` }} />
              ))}
              {[
                { left: 20, top: 46, w: 300 },
                { left: 32, top: 64, w: 260 },
                { left: 54, top: 44, w: 220 },
                { left: 58, top: 70, w: 240 },
                { left: 64, top: 48, w: 200 }
              ].map((r, i) => (
                <div
                  key={i}
                  className="xj-route xj-route--ghost"
                  style={{ left: `${r.left}%`, top: `${r.top}%`, width: `${r.w}px` }}
                />
              ))}
            </div>
          </section>

          {/* Scene 3 · Ride Matching */}
          <section className="xj-scene xj-scene-3">
            <SceneCaption
              index={3}
              title={
                <>
                  Riders <span className="xj-grad">matched</span> live.
                </>
              }
              sub="People heading the same way are paired instantly — by route, timing, and direction."
            />
            <div className="xj-stage">
              {[
                { left: 22, top: 50, color: 'cyan' },
                { left: 30, top: 50, color: 'brand' },
                { left: 52, top: 62, color: 'violet' },
                { left: 60, top: 62, color: 'amber' },
                { left: 74, top: 46, color: 'emerald' },
                { left: 82, top: 46, color: 'rose' }
              ].map((c, i) => (
                <div
                  key={i}
                  className={`xj-car xj-car--${c.color}`}
                  style={{ left: `${c.left}%`, top: `${c.top}%` }}
                />
              ))}
              {[
                { left: 24, top: 53, w: 110 },
                { left: 54, top: 65, w: 110 },
                { left: 76, top: 49, w: 110 }
              ].map((r, i) => (
                <div
                  key={i}
                  className="xj-route xj-route--match"
                  style={{ left: `${r.left}%`, top: `${r.top}%`, width: `${r.w}px` }}
                />
              ))}
            </div>
          </section>

          {/* Scene 4 · Carpool Formation */}
          <section className="xj-scene xj-scene-4">
            <SceneCaption
              index={4}
              title={
                <>
                  Carpools <span className="xj-grad">form.</span>
                </>
              }
              sub="Matched riders merge into shared trips. Redundant cars drop away as pods come together."
            />
            <div className="xj-stage">
              <div className="xj-pod-ring" style={{ left: '30%', top: '46%' }} />
              <div className="xj-pod-ring" style={{ left: '64%', top: '60%' }} />
              {/* pod A */}
              <div className="xj-car xj-converge xj-car--brand" data-x="60" data-y="0" style={{ left: '24%', top: '50%' }} />
              <div className="xj-car xj-converge xj-car--cyan" data-x="0" data-y="-6" style={{ left: '34%', top: '46%' }} />
              {/* pod B */}
              <div className="xj-car xj-converge xj-car--violet" data-x="40" data-y="4" style={{ left: '60%', top: '62%' }} />
              <div className="xj-car xj-converge xj-car--emerald" data-x="-10" data-y="0" style={{ left: '70%', top: '64%' }} />
              {/* redundant cars that fade out */}
              <div className="xj-car xj-redundant xj-car--slate" style={{ left: '46%', top: '40%' }} />
              <div className="xj-car xj-redundant xj-car--rose" style={{ left: '52%', top: '72%' }} />
              <div className="xj-car xj-redundant xj-car--amber" style={{ left: '82%', top: '44%' }} />
            </div>
          </section>

          {/* Scene 5 · Optimization */}
          <section className="xj-scene xj-scene-5">
            <SceneCaption
              index={5}
              title={
                <>
                  One <span className="xj-grad">clean</span> route.
                </>
              }
              sub="The noise resolves into an optimized path. Fewer cars, full seats, smooth flow."
            />
            <div className="xj-stage">
              {[
                { left: 18, top: 44, w: 180 },
                { left: 40, top: 70, w: 160 },
                { left: 66, top: 40, w: 200 }
              ].map((r, i) => (
                <div
                  key={i}
                  className="xj-route xj-route--ghost"
                  style={{ left: `${r.left}%`, top: `${r.top}%`, width: `${r.w}px` }}
                />
              ))}
              <div
                className="xj-route xj-route--clean"
                style={{ left: '16%', top: '57%', width: '64%' }}
              />
              <div className="xj-car xj-glide xj-car--brand" style={{ left: '22%', top: '54.5%' }} />
              <div className="xj-car xj-glide xj-car--cyan" style={{ left: '40%', top: '54.5%' }} />
              <div className="xj-car xj-glide xj-car--violet" style={{ left: '58%', top: '54.5%' }} />
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
              <div className="xj-cta">
                <AppButton type="button" size="lg" onClick={openApp}>
                  {isLoggedIn ? 'Go to dashboard' : 'Get started free'}
                  <ArrowRight className="h-4 w-4" />
                </AppButton>
                <Link to={paths.about} className="no-underline">
                  <AppButton type="button" variant="outline" size="lg">
                    Learn more
                  </AppButton>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
