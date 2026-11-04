"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, MotionConfig, motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { BrandMark } from "../lib/BrandLogo";
import { Icon, type IconName } from "../lib/icons";
import { SiteFooter, SiteNav } from "../lib/SiteChrome";
import "./home.css";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const moods = ["helpful.", "curious.", "expressive.", "steady.", "at home."];

const abilities: { kind: string; icon: IconName; title: string; copy: string }[] = [
  { kind: "radar", icon: "eye", title: "It sees the room", copy: "Depth vision and SLAM build a live map of shared space." },
  { kind: "balance", icon: "gear", title: "It keeps its balance", copy: "Wheel-legs roll, crouch, and recover from bumps." },
  { kind: "face", icon: "robot", title: "It shows intent", copy: "A face panel tells people what Nudge is about to do." },
  { kind: "power", icon: "bolt", title: "It watches its health", copy: "Battery, cell, and thermal sensing keep it safe." },
];

const systems: { tone: string; icon: IconName; title: string; copy: string; parts: string[]; stat: string; statLabel: string }[] = [
  { tone: "core", icon: "eye", title: "Vision", copy: "Map the room and keep track of where Nudge is, using depth vision and SLAM.", parts: ["RealSense D435i", "SLAM", "Monitoring camera"], stat: "3D", statLabel: "depth mapping" },
  { tone: "slate", icon: "pin", title: "Sensing", copy: "Feel balance, distance, and touch so Nudge reacts to the world around it.", parts: ["IMU", "Time-of-flight", "Load cell"], stat: "3", statLabel: "sensing modes" },
  { tone: "sage", icon: "gear", title: "Motion", copy: "Wheel-legged movement that rolls, crouches, and recovers from disturbances.", parts: ["Hip + knee", "Wheel drive", "CAN bus"], stat: "2-in-1", statLabel: "wheels + legs" },
  { tone: "rust", icon: "robot", title: "Compute", copy: "High-level perception paired with a real-time control loop.", parts: ["Jetson / RPi 5", "STM32", "Feedback"], stat: "2", statLabel: "compute tiers" },
  { tone: "ink", icon: "bolt", title: "Power", copy: "Monitored battery power for a robot that shares your space.", parts: ["LiPo", "BMS", "Thermal + cell sense"], stat: "BMS", statLabel: "monitored pack" },
];

const journey = [
  { step: "01", title: "Ideation", copy: "Define who Nudge is for and what makes a robot welcome indoors." },
  { step: "02", title: "Research", copy: "Study wheel-legged platforms, sensors, and human-robot interaction.", now: true },
  { step: "03", title: "Prototype", copy: "Build the base, bring up control, and test the first behaviours." },
  { step: "04", title: "Integration", copy: "Join vision, sensing, motion, compute, and power into one robot." },
  { step: "05", title: "Showcase", copy: "Present Nudge, the data behind it, and everything we learned." },
];

const principles = [
  { word: "Human-centric", copy: "Helpful, expressive, and never intimidating." },
  { word: "Functional", copy: "Purpose-built, reliable, and uncluttered." },
  { word: "Modern", copy: "Clean, bold, and cohesive from shell to software." },
  { word: "Playful", copy: "Expressive enough to feel like part of the room." },
];

const ticker = ["SEE", "THINK", "MOVE", "NUDGE", "REPEAT"];

function AbilityArt({ kind }: { kind: string }) {
  if (kind === "radar") {
    return (
      <div className="hx-art hx-radar">
        <motion.span className="hx-sweep" animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
        {[0, 1, 2].map((i) => (
          <motion.i key={i} style={{ left: `${24 + i * 22}%`, top: `${30 + (i % 2) * 34}%` }} animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8 }} />
        ))}
      </div>
    );
  }
  if (kind === "balance") {
    return (
      <div className="hx-art hx-balance">
        <motion.div className="hx-bot" animate={{ rotate: [-9, 9, -9], x: [-14, 14, -14] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
          <span className="hx-bot-body" />
          <span className="hx-bot-leg" />
          <motion.span className="hx-bot-wheel" animate={{ rotate: [-180, 180, -180] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} />
        </motion.div>
        <span className="hx-floor" />
      </div>
    );
  }
  if (kind === "face") {
    return (
      <div className="hx-art hx-face">
        <div className="hx-screen">
          {[0, 1].map((i) => (
            <motion.span key={i} animate={{ scaleY: [1, 1, 0.1, 1, 1], x: [0, 6, 6, -6, 0] }} transition={{ duration: 4, repeat: Infinity, times: [0, 0.4, 0.45, 0.5, 1] }} />
          ))}
          <motion.b animate={{ width: ["18%", "34%", "18%"] }} transition={{ duration: 4, repeat: Infinity }} />
        </div>
      </div>
    );
  }
  return (
    <div className="hx-art hx-power">
      <div className="hx-battery">
        {[0, 1, 2, 3].map((i) => (
          <motion.span key={i} animate={{ opacity: [0.15, 1, 1, 0.15] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.35, times: [0, 0.2, 0.8, 1] }} />
        ))}
      </div>
      <motion.svg viewBox="0 0 120 30" className="hx-pulse-line">
        <motion.path d="M0 15h34l7-11 9 22 8-17 6 6h56" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 1], opacity: [1, 1, 0] }} transition={{ duration: 2.4, repeat: Infinity }} />
      </motion.svg>
    </div>
  );
}

export default function Home() {
  const [mood, setMood] = useState(0);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const journeyRef = useRef<HTMLElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 90, damping: 18 });
  const sy = useSpring(my, { stiffness: 90, damping: 18 });
  const photoX = useTransform(sx, (v) => v * 14);
  const photoY = useTransform(sy, (v) => v * 14);
  const cardX = useTransform(sx, (v) => v * -24);
  const cardY = useTransform(sy, (v) => v * -24);

  const { scrollYProgress } = useScroll({ target: journeyRef, offset: ["start 75%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });

  useEffect(() => {
    const id = window.setInterval(() => setMood((m) => (m + 1) % moods.length), 2400);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % systems.length), 5000);
    return () => window.clearInterval(id);
  }, [paused]);

  function onHeroMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    mx.set((event.clientX - rect.left) / rect.width - 0.5);
    my.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  const system = systems[active];

  return (
    <MotionConfig reducedMotion="user">
      <main className="nr-page hx-home">
        <SiteNav active="home" />

        {/* ---------- HERO ---------- */}
        <section className="hx-hero nr-shell">
          <motion.div className="hx-hero-copy" initial="hidden" animate="visible" variants={stagger}>
            <motion.span className="nr-pill" variants={rise}>
              <span className="nr-pulse" /> MTE Capstone · 2026 design study
            </motion.span>
            <motion.h1 variants={rise}>
              A robot that&apos;s
              <span className="hx-rotator">
                <AnimatePresence mode="wait">
                  <motion.mark key={moods[mood]} initial={{ y: "70%", opacity: 0, rotateX: -60 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} exit={{ y: "-70%", opacity: 0, rotateX: 60 }} transition={{ duration: 0.45, ease }}>
                    {moods[mood]}
                  </motion.mark>
                </AnimatePresence>
              </span>
            </motion.h1>
            <motion.p variants={rise}>
              Notify Robots designs expressive, functional robots that bridge technology and people. Meet Nudge, our
              wheel-legged companion built to feel like part of the room.
            </motion.p>
            <motion.div className="nr-actions" variants={rise}>
              <a className="nr-btn nr-btn-yellow" href="#nudge">Meet Nudge <Icon name="arrow" size={18} /></a>
              <a className="nr-btn nr-btn-ghost" href="/activity">Read the design log</a>
            </motion.div>
            <motion.a className="hx-scroll-cue" href="#nudge" variants={rise} aria-label="Scroll to learn about Nudge">
              <span><motion.i animate={{ y: [0, 12, 0], opacity: [1, 0.2, 1] }} transition={{ duration: 1.8, repeat: Infinity }} /></span>
              Scroll to explore
            </motion.a>
          </motion.div>

          <motion.div className="hx-stage" onMouseMove={onHeroMove} onMouseLeave={() => { mx.set(0); my.set(0); }} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.15, ease }}>
            <div className="hx-stage-sun" aria-hidden="true" />
            <motion.div className="hx-stage-ring" aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 36, repeat: Infinity, ease: "linear" }}>
              <i /><i /><i />
            </motion.div>
            <motion.div className="hx-photo" style={{ x: photoX, y: photoY }}>
              <Image src="/brand/robot-hero.webp" alt="Close-up of a white Notify Robots shell with a softly glowing face panel" fill priority sizes="(max-width: 1020px) 90vw, 45vw" />
              <motion.span className="hx-scan" aria-hidden="true" animate={{ top: ["-6%", "106%"] }} transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }} />
              <span className="hx-corner hx-c1" /><span className="hx-corner hx-c2" /><span className="hx-corner hx-c3" /><span className="hx-corner hx-c4" />
            </motion.div>

            <motion.div className="hx-hello" style={{ x: cardX, y: cardY }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              <motion.span animate={{ rotate: [0, 14, -8, 14, 0] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4 }}><BrandMark /></motion.span>
              <div><b>Hi, I&apos;m Nudge.</b><span>Research in progress</span></div>
            </motion.div>

            <motion.div className="hx-telemetry" style={{ x: cardX, y: cardY }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <div className="hx-tele-head"><span className="hx-live" /> LIVE · SYSTEMS</div>
              {[["VISION", 86], ["BALANCE", 72], ["POWER", 64]].map(([label, value], i) => (
                <div className="hx-tele-row" key={label}>
                  <small>{label}</small>
                  <span><motion.i initial={{ width: 0 }} animate={{ width: [`${Number(value) - 18}%`, `${value}%`, `${Number(value) - 8}%`] }} transition={{ duration: 3 + i, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 1.1 }} /></span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        <div className="hx-ticker" aria-hidden="true">
          <motion.div animate={{ x: ["0%", "-50%"] }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }}>
            {[...ticker, ...ticker, ...ticker, ...ticker].map((word, i) => <span key={i}>{word}<i>✦</i></span>)}
          </motion.div>
        </div>

        {/* ---------- ABILITIES ---------- */}
        <section className="hx-section nr-shell" id="nudge">
          <motion.div className="hx-head" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }} variants={rise}>
            <span className="nr-kicker">Meet Nudge</span>
            <h2>Small robot. <mark>Big manners.</mark></h2>
            <p>A friendly shell over a serious robotics stack. Here&apos;s what Nudge is being built to do.</p>
          </motion.div>
          <motion.div className="hx-bento" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={stagger}>
            {abilities.map((item, i) => (
              <motion.article key={item.title} className={`hx-ability hx-ability-${i + 1}`} variants={rise} whileHover={{ y: -8 }}>
                <AbilityArt kind={item.kind} />
                <div className="hx-ability-copy">
                  <span className="hx-ability-icon"><Icon name={item.icon} size={20} /></span>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </section>

        {/* ---------- SYSTEMS EXPLORER ---------- */}
        <section className="hx-systems" id="systems">
          <div className="nr-shell">
            <motion.div className="hx-head hx-head-row" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }} variants={rise}>
              <div>
                <span className="nr-kicker">Architecture</span>
                <h2>Five systems.<br />One personality.</h2>
              </div>
              <p>Pick a system to look inside. The architecture keeps evolving as we test, and every decision ends up in the design log.</p>
            </motion.div>

            <div className="hx-explorer" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
              <div className="hx-tabs" role="tablist" aria-label="Nudge systems">
                {systems.map((s, i) => (
                  <button key={s.title} role="tab" aria-selected={i === active} className={i === active ? "is-active" : ""} onClick={() => setActive(i)}>
                    {i === active && <motion.span className="hx-tab-bg" layoutId="hx-tab-bg" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                    <span className="hx-tab-num">0{i + 1}</span>
                    <span className="hx-tab-label">{s.title}</span>
                    <Icon name={s.icon} size={18} />
                    {i === active && !paused && <motion.span className="hx-tab-timer" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 5, ease: "linear" }} />}
                  </button>
                ))}
              </div>

              <div className={`hx-panel nr-tone-${system.tone}`}>
                <AnimatePresence mode="wait">
                  <motion.div key={system.title} className="hx-panel-inner" initial={{ opacity: 0, y: 24, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -18, filter: "blur(6px)" }} transition={{ duration: 0.45, ease }}>
                    <div className="hx-panel-top">
                      <motion.span className="hx-panel-icon" initial={{ rotate: -40, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}><Icon name={system.icon} size={30} /></motion.span>
                      <div className="hx-panel-stat"><b>{system.stat}</b><small>{system.statLabel}</small></div>
                    </div>
                    <h3>{system.title}</h3>
                    <p>{system.copy}</p>
                    <div className="hx-parts">
                      {system.parts.map((part, i) => (
                        <motion.span key={part} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.08 }}>{part}</motion.span>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
                <motion.div className="hx-panel-orb" aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
              </div>
            </div>
          </div>
        </section>

        {/* ---------- JOURNEY ---------- */}
        <section className="hx-section nr-shell" ref={journeyRef}>
          <motion.div className="hx-head" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }} variants={rise}>
            <span className="nr-kicker">The build</span>
            <h2>From sketch to showcase.</h2>
            <p>Where Nudge is in its journey. Follow each step as it happens in the design log.</p>
          </motion.div>
          <div className="hx-journey">
            <div className="hx-rail"><motion.span style={{ scaleY: progress }} /></div>
            {journey.map((item, i) => (
              <motion.article key={item.step} className={`hx-step${item.now ? " is-now" : ""}`} initial={{ opacity: 0, x: i % 2 ? 40 : -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.7, ease }}>
                <span className="hx-node">{item.now && <motion.i animate={{ scale: [1, 2.2], opacity: [0.6, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />}</span>
                <div className="hx-step-card">
                  <small>{item.step}{item.now && <em>We&apos;re here</em>}</small>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ---------- PRINCIPLES ---------- */}
        <section className="hx-principles" id="ethos">
          <div className="nr-shell">
            <motion.div className="hx-head" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }} variants={rise}>
              <span className="nr-kicker nr-kicker-dark">Brand ethos</span>
              <h2>Approachable robotics for everyday life.</h2>
            </motion.div>
            <div className="hx-principle-list">
              {principles.map((item, i) => (
                <motion.div key={item.word} className="hx-principle" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.6, delay: i * 0.05, ease }}>
                  <span className="hx-principle-num">0{i + 1}</span>
                  <h3>{item.word}</h3>
                  <p>{item.copy}</p>
                  <span className="hx-principle-arrow"><Icon name="arrow" size={22} /></span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="hx-cta nr-shell">
          <motion.div className="hx-cta-card" initial={{ opacity: 0, y: 40, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.8, ease }}>
            <motion.div className="hx-cta-mark" aria-hidden="true" animate={{ y: [0, -14, 0], rotate: [-4, 4, -4] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
              <BrandMark variant="reverse" className="nr-mark" />
            </motion.div>
            <span className="nr-kicker">Open design log</span>
            <h2>Built in public.<br /><mark>Improved in motion.</mark></h2>
            <p>Ideation, research, daily progress, meeting minutes, and course deliverables, all in one place.</p>
            <div className="nr-actions">
              <a className="nr-btn nr-btn-yellow" href="/activity">Open the design log <Icon name="arrow" size={18} /></a>
              <a className="nr-btn hx-btn-outline" href="/team">Meet the team</a>
            </div>
          </motion.div>
        </section>

        <SiteFooter />
      </main>
    </MotionConfig>
  );
}
