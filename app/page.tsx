"use client";

import { motion } from "framer-motion";
import { ThemeSwitch } from "../lib/theme";

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

export default function Home() {
  return (
    <main className="hoonda-home">
      <motion.nav className="hoonda-nav shell" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
        <a className="hoonda-brand" href="/"><span className="hoonda-brand-mark">MTE</span><span>MTE CAPSTONE<span className="brand-sub">/ ROBOTICS DESIGN LAB</span></span></a>
        <div className="hoonda-links"><a className="nav-active" href="#mission">Mission</a><a href="#systems">Systems</a><a href="/activity">Design log</a><a href="/team">Team</a></div>
        <div className="hoonda-nav-tail"><ThemeSwitch /><a className="hoonda-nav-cta" href="/activity">Open design log <span>↗</span></a></div>
      </motion.nav>

      <section className="hoonda-hero shell" id="mission">
        <div className="hero-index">01 <span>/</span> AUTONOMOUS FABRICATION</div>
        <div className="hoonda-hero-copy">
          <motion.div className="hoonda-eyebrow" initial="hidden" animate="visible" variants={reveal}><span className="live-dot" /> INTELLIGENCE BUILT INTO THE MACHINE</motion.div>
          <motion.h1 initial="hidden" animate="visible" variants={reveal} transition={{ delay: 0.12 }}>Building a more<br /><span>capable</span> world.</motion.h1>
          <motion.p initial="hidden" animate="visible" variants={reveal} transition={{ delay: 0.22 }}>MTE Capstone is exploring how intelligent machines could see the physical world, learn from it, and make with intention.</motion.p>
          <motion.div className="hoonda-actions" initial="hidden" animate="visible" variants={reveal} transition={{ delay: 0.32 }}><a className="hoonda-red-button" href="/activity">Explore the system <span>↗</span></a><a className="hoonda-scroll" href="#purpose">Scroll to discover <span>↓</span></a></motion.div>
        </div>
        <motion.div className="hoonda-hero-image" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: .15 }}>
          <div className="concept-placeholder"><span className="placeholder-cross" /><span className="placeholder-cross placeholder-cross-right" /><strong>CONCEPT<br />IMAGE PENDING</strong><small>PROJECT DIRECTION / 00</small></div>
          <span className="image-caption">MTE CAPSTONE / CONCEPT / 001</span><span className="image-corner">UNCONFIRMED</span>
        </motion.div>
        <div className="hero-side-note">The next generation<br />of making <span>is adaptive.</span></div>
      </section>

      <section className="hoonda-marquee"><div className="shell marquee-inner"><span>MTE CAPSTONE / 01</span><span>VISION</span><span>THERMAL SENSE</span><span>TOOLPATH AI</span><span>UWATERLOO · MTE</span></div></section>

      <motion.section className="hoonda-purpose shell" id="purpose" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal}>
        <div className="section-number">02 <span>/</span> THE PURPOSE</div><div className="purpose-copy"><p className="purpose-lede">The purpose behind our robotics is to build intelligent machines that move naturally, understand their surroundings, and work seamlessly alongside people.</p><div className="purpose-detail"><p>Our design direction is still taking shape. This log captures the questions, experiments, and decisions that will guide the final project.</p><a href="/activity" className="hoonda-text-link">Read the design log <span>↗</span></a></div></div>
      </motion.section>

      <section className="hoonda-systems" id="systems"><div className="shell"><div className="section-number">03 <span>/</span> THE INTELLIGENCE LAYER</div><div className="systems-heading"><h2>Five systems.<br /><span>One body.</span></h2><p>Designed to turn raw signals into confident action.</p></div><div className="systems-grid"><motion.article whileHover={{ y: -6 }}><b>01</b><h3>Vision</h3><p>Read the layer as it appears.</p><span>↗</span></motion.article><motion.article whileHover={{ y: -6 }}><b>02</b><h3>Thermal</h3><p>Feel how material behaves.</p><span>↗</span></motion.article><motion.article whileHover={{ y: -6 }}><b>03</b><h3>Toolpath</h3><p>Change the plan in real time.</p><span>↗</span></motion.article><motion.article whileHover={{ y: -6 }}><b>04</b><h3>Recovery</h3><p>Keep making through uncertainty.</p><span>↗</span></motion.article><motion.article className="system-feature" whileHover={{ y: -6 }}><b>05</b><h3>Human interface</h3><p>Work alongside the machine, not around it.</p><span>↗</span></motion.article></div></div></section>

      <section className="hoonda-cta"><div className="shell hoonda-cta-inner"><div><div className="section-number">04 <span>/</span> THE DESIGN LOG</div><h2>Designed for the floor.<br /><span>Ready for the real world.</span></h2></div><a className="hoonda-red-button" href="/activity">See the design log <span>↗</span></a></div></section>
      <footer className="hoonda-footer shell"><a className="hoonda-brand" href="/"><span className="hoonda-brand-mark">MTE</span><span>MTE CAPSTONE<span className="brand-sub">/ ROBOTICS DESIGN LAB</span></span></a><span>Robotics design study · 2026</span><span>© 2026 MTE Capstone</span></footer>
    </main>
  );
}
