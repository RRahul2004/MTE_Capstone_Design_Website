import { BrandMark } from "../../lib/BrandLogo";
import { Icon } from "../../lib/icons";
import { SiteFooter, SiteNav } from "../../lib/SiteChrome";
import { teamRoster as teamMembers } from "../../lib/team";

export default function Team() {
  return (
    <main className="nr-page nr-team">
      <SiteNav active="team" cta={{ href: "/login", label: "Team sign in" }} />

      <section className="nr-team-hero nr-shell">
        <div>
          <span className="nr-pill"><span className="nr-pulse" /> The crew · MTE Capstone 2026</span>
          <h1>The people <mark>behind the robot.</mark></h1>
          <p>Five Mechatronics Engineering students designing, building, and testing Nudge, and writing all of it down.</p>
        </div>
        <div className="nr-team-badge" aria-hidden="true">
          <BrandMark />
          <span>notify robots</span>
        </div>
      </section>

      <section className="nr-shell nr-roster">
        <div className="nr-roster-grid">
          {teamMembers.map((member, index) => (
            <article className="nr-member" key={member.name}>
              <div className={`nr-avatar ${member.tone}`}>
                <span>{member.initials}</span>
              </div>
              <div className="nr-member-info">
                <small>0{index + 1}</small>
                <h2>{member.name}</h2>
                <p>{member.expertise || "Design & build team"}</p>
              </div>
            </article>
          ))}
          <a className="nr-member nr-member-cta" href="/activity">
            <span className="nr-attr-icon"><Icon name="bell" /></span>
            <h2>See what we&apos;re working on</h2>
            <p>Open the design log <Icon name="arrow" size={16} /></p>
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
