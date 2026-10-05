"use client";

import { useEffect, useMemo, useState } from "react";

type Priority = "Critical" | "High" | "Medium";
type Skill = {
  name: string; category: string; demand: number; talent: number; growth: number;
  priority: Priority; description: string; sectors: string[];
};
type Program = {
  title: string; provider: string; skills: string[]; duration: string;
  relevance: number; level: string; category: string;
};

const skills: Skill[] = [
  { name: "Artificial Intelligence", category: "Emerging technology", demand: 92, talent: 61, growth: 38, priority: "Critical", description: "Strong demand across AI engineering, automation, generative AI and intelligent systems.", sectors: ["Technology", "FinTech", "Healthcare", "Manufacturing"] },
  { name: "Cybersecurity", category: "Security", demand: 87, talent: 58, growth: 31, priority: "Critical", description: "Growing requirement for security analysts, SOC engineers, cloud security and threat detection.", sectors: ["Technology", "FinTech", "Healthcare"] },
  { name: "Cloud Computing", category: "Infrastructure", demand: 84, talent: 64, growth: 27, priority: "High", description: "Cloud infrastructure, DevOps and scalable systems remain relevant across industries.", sectors: ["Technology", "FinTech", "Healthcare", "Manufacturing"] },
  { name: "Data Science", category: "Data", demand: 81, talent: 59, growth: 24, priority: "High", description: "Data analysis, machine learning and decision intelligence are increasingly important.", sectors: ["Technology", "FinTech", "Healthcare", "Manufacturing"] },
  { name: "Full Stack Development", category: "Software", demand: 78, talent: 72, growth: 19, priority: "Medium", description: "Full-stack engineers remain important for building scalable digital products.", sectors: ["Technology", "FinTech", "Healthcare"] },
  { name: "IoT & Automation", category: "Emerging technology", demand: 74, talent: 49, growth: 29, priority: "High", description: "Industrial automation and connected systems are creating new technical requirements.", sectors: ["Manufacturing", "Healthcare"] },
];

const programs: Program[] = [
  { title: "AI & Machine Learning", provider: "Industry Aligned Program", skills: ["Python", "Machine Learning", "Deep Learning"], duration: "16 weeks", relevance: 96, level: "Advanced", category: "Artificial Intelligence" },
  { title: "Cybersecurity Foundations", provider: "Industry Aligned Program", skills: ["Network Security", "SOC", "SIEM"], duration: "12 weeks", relevance: 94, level: "Intermediate", category: "Cybersecurity" },
  { title: "Cloud Engineering", provider: "Industry Aligned Program", skills: ["AWS", "Docker", "Kubernetes"], duration: "14 weeks", relevance: 91, level: "Intermediate", category: "Cloud Computing" },
  { title: "Data Intelligence", provider: "Industry Aligned Program", skills: ["Python", "SQL", "Analytics"], duration: "10 weeks", relevance: 89, level: "Intermediate", category: "Data Science" },
];

const sectors = ["All sectors", "Technology", "FinTech", "Healthcare", "Manufacturing"];
const locations = [
  { name: "Bengaluru", modifier: 1, region: "South" }, { name: "Delhi NCR", modifier: -2, region: "North" },
  { name: "Mumbai", modifier: 0, region: "West" }, { name: "Hyderabad", modifier: 2, region: "South" },
  { name: "Pune", modifier: -1, region: "West" }, { name: "Chennai", modifier: 1, region: "South" },
];
const stages = [{ label: "Discover", id: "discover" }, { label: "Diagnose", id: "diagnose" }, { label: "Recommend", id: "recommend" }, { label: "Measure", id: "measure" }];

export default function Home() {
  const [activeStage, setActiveStage] = useState("Discover");
  const [city, setCity] = useState("Bengaluru");
  const [sector, setSector] = useState("All sectors");
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const cityModifier = locations.find((location) => location.name === city)?.modifier ?? 0;

  useEffect(() => {
    const updateActiveStage = () => {
      let visibleStage = stages[0].label;
      for (const stage of stages) {
        const section = document.getElementById(stage.id);
        if (section && section.getBoundingClientRect().top <= 150) visibleStage = stage.label;
      }
      setActiveStage(visibleStage);
    };
    updateActiveStage();
    window.addEventListener("scroll", updateActiveStage, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveStage);
  }, []);

  const filteredSkills = useMemo(() => skills
    .filter((skill) => skill.name.toLowerCase().includes(search.toLowerCase()) &&
      (sector === "All sectors" || skill.sectors.includes(sector)) &&
      (!selectedIndustry || skill.sectors.includes(selectedIndustry)))
    .map((skill) => ({ ...skill, demand: Math.min(99, Math.max(45, skill.demand + cityModifier)), talent: Math.min(95, Math.max(35, skill.talent + cityModifier)) })),
  [search, sector, selectedIndustry, cityModifier]);

  const averageDemand = filteredSkills.length ? Math.round(filteredSkills.reduce((sum, skill) => sum + skill.demand, 0) / filteredSkills.length) : 0;
  const averageTalent = filteredSkills.length ? Math.round(filteredSkills.reduce((sum, skill) => sum + skill.talent, 0) / filteredSkills.length) : 0;
  const averageGap = Math.max(0, averageDemand - averageTalent);
  const prioritySkills = filteredSkills.filter((skill) => skill.priority !== "Medium").sort((a, b) => (b.demand - b.talent) - (a.demand - a.talent));
  const recommendedPrograms = useMemo(() => {
    if (!selectedSkill) return programs;
    return programs.map((program) => ({ ...program, relevance: program.category === selectedSkill.name ? Math.min(99, program.relevance + 3) : program.relevance })).sort((a, b) => b.relevance - a.relevance);
  }, [selectedSkill]);
  const regionalScenarios = locations.map((location) => ({ ...location, demand: Math.min(99, Math.max(45, averageDemand + location.modifier - cityModifier)) }));

  const scrollTo = (id: string, stage: string) => {
    setActiveStage(stage);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const resetFilters = () => { setSearch(""); setCity("Bengaluru"); setSector("All sectors"); setSelectedIndustry(null); };

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <a className="brand-lockup" href="#discover" onClick={() => setActiveStage("Discover")}>
          <span className="brand-mark" aria-hidden="true">SB</span><span className="brand-copy"><strong>SkillBridge</strong><span>Workforce intelligence</span></span>
        </a>
        <div className="topbar-context"><span className="program-label">SMART INDIA HACKATHON 2026</span><span className="dataset-state"><i /> Demonstration dataset</span></div>
        <nav className="stage-nav" aria-label="Dashboard workflow">
          {stages.map((stage, index) => <button key={stage.id} className={activeStage === stage.label ? "stage-link is-active" : "stage-link"} onClick={() => scrollTo(stage.id, stage.label)}><span className="stage-number">0{index + 1}</span>{stage.label}</button>)}
        </nav>
      </header>

      <div className="filter-band"><div className="filter-inner">
        <label className="filter-control search-control"><span>Skill</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search skills" aria-label="Search skills" /></label>
        <label className="filter-control"><span>Market</span><select value={city} onChange={(event) => setCity(event.target.value)}>{locations.map((location) => <option key={location.name}>{location.name}</option>)}</select></label>
        <label className="filter-control"><span>Sector</span><select value={sector} onChange={(event) => { setSector(event.target.value); setSelectedIndustry(null); }}>{sectors.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button className="text-button reset-button" onClick={resetFilters}>Reset filters</button>
        <span className="filter-summary">Viewing <strong>{city}</strong><span aria-hidden="true"> / </span>{sector}</span>
      </div></div>

      <div className="content-wrap">
        <section id="discover" className="section-block discover-section">
          <div className="page-heading"><div><p className="eyebrow">01 / Discover</p><h1>Workforce intelligence</h1><p className="heading-summary">A decision workspace for aligning institutional training with employer skill demand.</p></div>
            <div className="heading-meta"><span className="meta-label">CURRENT MARKET</span><strong>{city}</strong><span>{selectedIndustry ?? sector} · {filteredSkills.length} skills in view</span></div>
          </div>
          <div className="overview-strip" aria-label="Current market summary">
            <Metric label="Mean demand index" value={`${averageDemand}`} context="Average employer demand across visible skills; 0–100 index." />
            <Metric label="Mean talent index" value={`${averageTalent}`} context="Average available talent index for the same skill set." />
            <Metric label="Mean gap" value={`${averageGap}`} context="Demand less talent; larger values indicate training priority." />
            <Metric label="Skills assessed" value={`${filteredSkills.length}`} context="Skills remaining after market, sector and search filters." />
          </div>
          <div className="sector-lens">
            <span className="meta-label">INDUSTRY LENS</span>
            {sectors.slice(1).map((item) => <button key={item} className={selectedIndustry === item ? "sector-chip is-selected" : "sector-chip"} onClick={() => { setSelectedIndustry(selectedIndustry === item ? null : item); setSector("All sectors"); }}>{item}</button>)}
            {selectedIndustry && <button className="text-button" onClick={() => setSelectedIndustry(null)}>Clear lens</button>}
          </div>
          <div className="discovery-grid">
            <section className="panel skill-panel" aria-labelledby="skill-chart-title">
              <div className="panel-heading"><div><p className="panel-kicker">Demand and supply</p><h2 id="skill-chart-title">Skills in focus</h2></div><span className="unit-note">Index · 0–100</span></div>
              <div className="chart-legend"><span><i className="legend-demand" /> Employer demand</span><span><i className="legend-talent" /> Talent availability</span></div>
              <div className="skill-chart">{filteredSkills.map((skill) => {
                const gap = Math.max(0, skill.demand - skill.talent);
                return <button className="skill-row" key={skill.name} onClick={() => setSelectedSkill(skill)}>
                  <span className="skill-name-cell"><strong>{skill.name}</strong><small>{skill.category}</small></span>
                  <span className="bar-pair" aria-label={`Demand ${skill.demand}, talent ${skill.talent}`}><span className="bar-track"><i className="bar-fill demand-fill" style={{ width: `${skill.demand}%` }} /></span><span className="bar-track"><i className="bar-fill talent-fill" style={{ width: `${skill.talent}%` }} /></span></span>
                  <span className="gap-cell"><strong>{gap}</strong><small>gap</small></span><span className={`priority-tag priority-${skill.priority.toLowerCase()}`}>{skill.priority}</span>
                </button>;
              })}{filteredSkills.length === 0 && <p className="empty-state">No skills match the current filters.</p>}</div>
              <p className="panel-footnote">Select a skill to inspect its profile and matching training programs. Demand growth is shown in the profile.</p>
            </section>
            <section className="panel region-panel" aria-labelledby="regional-title">
              <div className="panel-heading"><div><p className="panel-kicker">Regional intelligence</p><h2 id="regional-title">Market coverage</h2></div><span className="unit-note">6 city markets</span></div>
              <p className="region-intro">Select a market to scope the skills assessment.</p>
              <div className="region-list">{regionalScenarios.map((location) => <button className={city === location.name ? "region-row is-selected" : "region-row"} key={location.name} onClick={() => setCity(location.name)}>
                <span className="region-name"><strong>{location.name}</strong><small>{location.region} region</small></span><span className="region-track"><i style={{ width: `${location.demand}%` }} /></span><span className="region-score">{location.demand}</span>
              </button>)}</div>
              <p className="panel-footnote scenario-note">Scenario index only. City adjustments are illustrative demo values applied to a shared baseline, not observed local hiring data.</p>
            </section>
          </div>
        </section>

        <section id="diagnose" className="section-block diagnose-section"><SectionHeading number="02" title="Diagnose skill gaps" description="Prioritise skills where employer demand most exceeds estimated talent availability." />
          <div className="diagnose-layout"><div className="panel table-panel">
            <div className="table-heading"><div><strong>Priority assessment</strong><span>Ranked by demand–talent difference</span></div><span className="unit-note">{prioritySkills.length} priority skills</span></div>
            <div className="table-scroll"><table><thead><tr><th scope="col">Skill</th><th scope="col">Demand</th><th scope="col">Talent</th><th scope="col">Gap</th><th scope="col">Demand growth</th><th scope="col">Priority</th></tr></thead><tbody>
              {prioritySkills.map((skill) => <tr key={skill.name} onClick={() => setSelectedSkill(skill)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") setSelectedSkill(skill); }}>
                <th scope="row"><button className="table-skill-button" onClick={() => setSelectedSkill(skill)}>{skill.name}<small>{skill.category}</small></button></th><td>{skill.demand}</td><td>{skill.talent}</td><td><strong className="gap-number">{Math.max(0, skill.demand - skill.talent)}</strong></td><td className="growth-cell">+{skill.growth}%</td><td><span className={`priority-tag priority-${skill.priority.toLowerCase()}`}>{skill.priority}</span></td>
              </tr>)}{prioritySkills.length === 0 && <tr><td colSpan={6} className="empty-state">No priority skills match the current filters.</td></tr>}
            </tbody></table></div><p className="panel-footnote">Index values are illustrative sample data. Gap = demand index − talent index; growth is an input in the demo dataset.</p>
          </div><aside className="diagnosis-note"><p className="panel-kicker">Interpretation</p><h3>{averageGap > 25 ? "Training capacity needs attention" : "Monitor emerging mismatches"}</h3><p>The current view shows a mean gap of <strong>{averageGap} index points</strong> across {filteredSkills.length} skills. Use the ranked list to identify where curriculum updates or employer-led training could have the greatest effect.</p><button className="text-button" onClick={() => scrollTo("recommend", "Recommend")}>Review interventions <span aria-hidden="true">→</span></button></aside></div>
        </section>

        <section id="recommend" className="section-block recommend-section"><SectionHeading number="03" title="Recommend interventions" description="Training options are ordered by their match to the selected skill profile." />
          <div className="recommend-toolbar"><span>{selectedSkill ? <>Selected skill: <strong>{selectedSkill.name}</strong></> : "Select a skill in Discover or Diagnose to focus program matching."}</span>{selectedSkill && <button className="text-button" onClick={() => setSelectedSkill(null)}>Clear selection</button>}</div>
          <div className="program-table-wrap"><table className="program-table"><thead><tr><th scope="col">Program</th><th scope="col">Mapped competencies</th><th scope="col">Duration</th><th scope="col">Level</th><th scope="col">Match</th><th scope="col">Details</th></tr></thead><tbody>
            {recommendedPrograms.map((program) => <tr key={program.title}><th scope="row"><strong>{program.title}</strong><small>{program.provider}</small></th><td><span className="competency-list">{program.skills.join(" · ")}</span></td><td>{program.duration}</td><td>{program.level}</td><td><span className="match-score">{program.relevance}%</span></td><td><button className="table-action" onClick={() => setSelectedProgram(program)}>View details <span aria-hidden="true">→</span></button></td></tr>)}
          </tbody></table></div><p className="panel-footnote">Program mappings and match scores are sample recommendations, not verified course endorsements.</p>
        </section>

        <section id="measure" className="section-block measure-section"><SectionHeading number="04" title="Measure progress" description="Use a consistent baseline to assess whether training is closing priority gaps." />
          <div className="measure-grid"><div className="measure-summary"><p className="panel-kicker">Current baseline</p><h3>{city} · {sector}</h3><p>Summary values are recalculated from visible skills whenever filters change. Compare future verified snapshots against this baseline to measure movement.</p><div className="baseline-date"><span>BASELINE STATUS</span><strong>Demonstration only</strong></div></div>
            <div className="measure-indicators"><MeasureLine label="Employer demand" value={averageDemand} detail="Mean index across visible skills" tone="demand" /><MeasureLine label="Talent availability" value={averageTalent} detail="Mean index across visible skills" tone="talent" /><MeasureLine label="Unmet skill demand" value={averageGap} detail="Mean demand–talent difference" tone="gap" /><div className="measurement-rule"><strong>Measurement rule</strong><span>Unweighted means; each visible skill contributes equally. Indices are not employment or placement rates.</span></div></div>
          </div>
        </section>
        <footer className="workspace-footer"><span><strong>SkillBridge</strong> · Smart India Hackathon 2026</span><span>Demonstration dataset · Replace with validated institutional and employer data before operational use.</span></footer>
      </div>

      {selectedSkill && <Dialog title={selectedSkill.name} eyebrow={selectedSkill.category} onClose={() => setSelectedSkill(null)}>
        <p className="dialog-description">{selectedSkill.description}</p><div className="dialog-metrics"><Metric label="Demand index" value={`${selectedSkill.demand}`} context="Sample employer demand estimate." /><Metric label="Talent index" value={`${selectedSkill.talent}`} context="Sample talent availability estimate." /><Metric label="Gap" value={`${Math.max(0, selectedSkill.demand - selectedSkill.talent)}`} context="Demand less talent availability." /></div>
        <div className="recommendation-note"><strong>Suggested response</strong><p>{selectedSkill.demand - selectedSkill.talent > 25 ? `Consider targeted training and employer-aligned practice for ${selectedSkill.name}. Validate this priority against local placement and vacancy data.` : `Maintain practical industry exposure for ${selectedSkill.name} and monitor whether demand growth changes the current gap.`}</p></div><button className="primary-action" onClick={() => { setSelectedSkill(null); scrollTo("recommend", "Recommend"); }}>View matched programs <span aria-hidden="true">→</span></button>
      </Dialog>}
      {selectedProgram && <Dialog title={selectedProgram.title} eyebrow="Program recommendation" onClose={() => setSelectedProgram(null)}>
        <p className="dialog-description">{selectedProgram.provider}. This demonstration program is mapped to {selectedProgram.category}.</p><dl className="program-details"><div><dt>Duration</dt><dd>{selectedProgram.duration}</dd></div><div><dt>Level</dt><dd>{selectedProgram.level}</dd></div><div><dt>Demo match</dt><dd>{selectedProgram.relevance}%</dd></div></dl><div className="recommendation-note"><strong>Mapped competencies</strong><p>{selectedProgram.skills.join(" · ")}</p></div>
      </Dialog>}
    </main>
  );
}

function Metric({ label, value, context }: { label: string; value: string; context: string }) {
  return <div className="metric-cell"><span>{label}</span><strong>{value}</strong><small>{context}</small></div>;
}

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="section-heading"><p className="eyebrow">{number} / {title.split(" ")[0]}</p><h2>{title}</h2><p>{description}</p></div>;
}

function MeasureLine({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "demand" | "talent" | "gap" }) {
  return <div className="measure-line"><div className="measure-line-heading"><span>{label}</span><strong>{value}<small> / 100</small></strong></div><div className="measure-track"><i className={`measure-fill fill-${tone}`} style={{ width: `${value}%` }} /></div><small>{detail}</small></div>;
}

function Dialog({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="dialog-panel" role="dialog" aria-modal="true" aria-label={title}><div className="dialog-heading"><div><p className="panel-kicker">{eyebrow}</p><h2>{title}</h2></div><button className="dialog-close" onClick={onClose} aria-label="Close dialog">×</button></div>{children}</section></div>;
}