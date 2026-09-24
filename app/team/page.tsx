import { teamRoster as teamMembers } from "../../lib/team";
import { ThemeSwitch } from "../../lib/theme";


export default function Team() {
  return (
    <main className="hoonda-team roster-page">
      <nav className="topbar shell">
        <a className="brand" href="/"><span className="brand-mark">MTE</span><span>MTE Capstone</span></a>
        <div className="nav-links"><a href="/">Mission</a><a href="/activity">Design log</a><a className="nav-active" href="/team">Team</a></div>
        <div className="hoonda-nav-tail"><ThemeSwitch /><a className="team-nav-link" href="/login">Sign in <span>↗</span></a></div>
      </nav>
      <section className="roster-hero shell"><span className="eyebrow"><span className="live-dot" /> MTE CAPSTONE / THE CREW</span><h1>People behind<br /><em>the possibility.</em></h1><p>Designing, testing, and questioning what this project could become.</p></section>
      <section className="roster-section shell"><div className="roster-section-label"><span>01 / TEAM ROSTER</span><span>DESIGN STUDY / 2026</span></div><div className="roster-grid">{teamMembers.map((member, index) => <article className="roster-member" key={member.name}><div className={`member-orb ${member.tone}`}><span>{member.initials}</span><b>0{index + 1}</b></div><div className="member-info"><h2>{member.name}</h2><p>{member.expertise}</p></div><span className="member-arrow">↗</span></article>)}</div></section>
      <a className="team-signin" href="/login"><span>TEAM ACCESS</span> Sign in <b>↗</b></a>
      <footer className="hoonda-footer shell"><a className="hoonda-brand" href="/"><span className="hoonda-brand-mark">MTE</span><span>MTE CAPSTONE<span className="brand-sub">/ ROBOTICS DESIGN LAB</span></span></a><span>Robotics design study · 2026</span><span>© 2026 MTE Capstone</span></footer>
    </main>
  );
}
