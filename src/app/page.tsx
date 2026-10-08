"use client";

import { useEffect, useMemo, useState } from "react";
import { marketProfiles, sectors, type Sector } from "@/data/skillData";
import {
  isApiErrorResponse,
  isNcsCareerCatalog,
  isOnetResponse,
  type OnetResponse,
} from "@/lib/externalApiTypes";
import {
  calculateSkillGaps,
  compareMarkets,
  describeSkillGap,
  getMarketId,
  recommendPrograms,
  summarizeSkills,
  type ProgramRecommendation,
  type SkillAssessment,
} from "@/lib/skillGapEngine";
import { buildLearningRoadmap, compareCareerSkills, enrichNcsCareerSkills } from "@/lib/ncs/skillGap";
import type { NcsCareerSearchResponse } from "@/lib/ncs/types";

const stages = [{ label: "Discover", id: "discover" }, { label: "Diagnose", id: "diagnose" }, { label: "Recommend", id: "recommend" }, { label: "Measure", id: "measure" }];

type RemoteState<T> =
  | { status: "idle" | "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };

export default function Home() {
  const [activeStage, setActiveStage] = useState("Discover");
  const [city, setCity] = useState("Bengaluru");
  const [sector, setSector] = useState("All sectors");
  const [search, setSearch] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState<SkillAssessment["id"] | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<ProgramRecommendation["id"] | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<Sector | null>(null);
  const [careersState, setCareersState] = useState<RemoteState<NcsCareerSearchResponse>>({ status: "idle" });
  const [selectedCareerId, setSelectedCareerId] = useState<string | null>(null);
  const [userSkillsInput, setUserSkillsInput] = useState("");
  const [onetState, setOnetState] = useState<RemoteState<OnetResponse>>({ status: "idle" });
  const selectedSector = sector === "All sectors" ? null : sector as Sector;
  const apiSector = selectedSector ?? selectedIndustry;

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

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setCareersState({ status: "loading" });
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (apiSector) params.set("sector", apiSector);
      if (city) params.set("location", city);
      try {
        const response = await fetch(`/api/careers?${params.toString()}`, { signal: controller.signal });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message = isApiErrorResponse(payload) ? payload.error.message : "NCS career data could not be loaded.";
          throw new Error(message);
        }
        if (!isNcsCareerCatalog(payload)) throw new Error("NCS career catalog format is invalid.");
        setCareersState({ status: "success", data: payload });
        setSelectedCareerId((currentId) => payload.careers.some((career) => career.id === currentId) ? currentId : null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setCareersState({ status: "error", message: error instanceof Error ? error.message : "NCS career data could not be loaded." });
      }
    }, 300);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search, apiSector, city]);

  const userSkills = useMemo(() => userSkillsInput
    .split(/[\n,;]/)
    .map((skill) => skill.trim())
    .filter(Boolean), [userSkillsInput]);
  const currentCareerCatalog = careersState.status === "success" &&
    careersState.data.query.toLocaleLowerCase() === search.trim().toLocaleLowerCase() &&
    careersState.data.sector.toLocaleLowerCase() === (apiSector ?? "").toLocaleLowerCase() &&
    careersState.data.location.toLocaleLowerCase() === city.toLocaleLowerCase()
    ? careersState.data
    : null;
  const sourceCareers = currentCareerCatalog?.careers ?? [];
  const selectedCareer = sourceCareers.find((career) => career.id === selectedCareerId) ?? null;
  const onetKeyword = selectedCareer?.title ?? "";

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      if (onetKeyword.length < 2) {
        setOnetState({ status: "idle" });
        return;
      }
      setOnetState({ status: "loading" });
      const params = new URLSearchParams({ keyword: onetKeyword });

      try {
        const response = await fetch(`/api/onet?${params.toString()}`, { signal: controller.signal });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message = isApiErrorResponse(payload) ? payload.error.message : "Occupation intelligence is temporarily unavailable.";
          throw new Error(message);
        }
        if (!isOnetResponse(payload)) throw new Error("Occupation intelligence is temporarily unavailable.");
        setOnetState({ status: "success", data: payload });
      } catch (error) {
        if (controller.signal.aborted) return;
        setOnetState({ status: "error", message: error instanceof Error ? error.message : "Occupation intelligence is temporarily unavailable." });
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [onetKeyword]);

  const marketId = getMarketId(city) ?? marketProfiles[0].id;
  const demonstrationSkills = useMemo(() => calculateSkillGaps({
    marketId,
    sector: selectedSector,
    industry: selectedIndustry,
    search,
  }), [marketId, selectedSector, selectedIndustry, search]);
  const currentOnetResponse = onetState.status === "success" && onetState.data.keyword === onetKeyword
    ? onetState.data
    : null;
  const currentOnetOccupation = currentOnetResponse
    ? currentOnetResponse.occupations[0] ?? null
    : null;
  const enrichedCareer = selectedCareer ? enrichNcsCareerSkills(selectedCareer, currentOnetOccupation) : null;
  const ncsSkillMatch = enrichedCareer ? compareCareerSkills(enrichedCareer, userSkills) : null;
  const roadmap = enrichedCareer && ncsSkillMatch
    ? buildLearningRoadmap(enrichedCareer, ncsSkillMatch.missing)
    : [];
  const filteredSkills = demonstrationSkills;
  const summary = useMemo(() => summarizeSkills(filteredSkills), [filteredSkills]);
  const averageDemand = summary.meanDemand;
  const averageTalent = summary.meanTalent;
  const averageGap = summary.meanGap;
  const selectedSkill = filteredSkills.find((skill) => skill.id === selectedSkillId) ?? null;
  const prioritySkills = useMemo(() => filteredSkills
    .filter((skill) => skill.priority !== "Medium")
    .sort((left, right) => right.gap - left.gap || (right.growth ?? -1) - (left.growth ?? -1)), [filteredSkills]);
  const recommendedPrograms = useMemo(
    () => recommendPrograms(selectedSkill, selectedSector ?? selectedIndustry),
    [selectedSkill, selectedSector, selectedIndustry]
  );
  const selectedProgram = recommendedPrograms.find((program) => program.id === selectedProgramId) ?? null;
  const regionalScenarios = useMemo(() => compareMarkets({
    sector: selectedSector,
    industry: selectedIndustry,
    search,
  }), [selectedSector, selectedIndustry, search]);

  const scrollTo = (id: string, stage: string) => {
    setActiveStage(stage);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const updateSearch = (value: string) => {
    setSearch(value);
    setSelectedCareerId(null);
    setOnetState({ status: "idle" });
    if (selectedSkill && !selectedSkill.name.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase())) {
      setSelectedSkillId(null);
    }
  };
  const updateSector = (value: string) => {
    setSector(value);
    setSelectedIndustry(null);
    setSelectedCareerId(null);
    if (selectedSkill && value !== "All sectors" && !selectedSkill.sectors.includes(value as Sector)) {
      setSelectedSkillId(null);
    }
  };
  const updateIndustry = (value: Sector) => {
    const nextIndustry = selectedIndustry === value ? null : value;
    setSelectedIndustry(nextIndustry);
    setSector("All sectors");
    setSelectedCareerId(null);
    if (selectedSkill && nextIndustry && !selectedSkill.sectors.includes(nextIndustry)) {
      setSelectedSkillId(null);
    }
  };
  const resetFilters = () => {
    setSearch("");
    setCity("Bengaluru");
    setSector("All sectors");
    setSelectedIndustry(null);
    setSelectedSkillId(null);
    setSelectedCareerId(null);
    setOnetState({ status: "idle" });
  };
  const updateMarket = (value: string) => {
    setCity(value);
    setSelectedCareerId(null);
  };

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <a className="brand-lockup" href="#discover" onClick={() => setActiveStage("Discover")}>
          <span className="brand-mark" aria-hidden="true">SB</span><span className="brand-copy"><strong>SkillBridge</strong><span>Workforce intelligence</span></span>
        </a>
        <div className="topbar-context"><span className="program-label">SMART INDIA HACKATHON 2026</span><span className="dataset-state"><i /> NCS local career catalog</span></div>
        <nav className="stage-nav" aria-label="Dashboard workflow">
          {stages.map((stage, index) => <button key={stage.id} className={activeStage === stage.label ? "stage-link is-active" : "stage-link"} onClick={() => scrollTo(stage.id, stage.label)}><span className="stage-number">0{index + 1}</span>{stage.label}</button>)}
        </nav>
      </header>

      <div className="filter-band"><div className="filter-inner">
        <label className="filter-control search-control"><span>Skill</span><input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Search skills" aria-label="Search skills" /></label>
        <label className="filter-control"><span>Market</span><select value={city} onChange={(event) => updateMarket(event.target.value)}>{marketProfiles.map((location) => <option key={location.id}>{location.name}</option>)}</select></label>
        <label className="filter-control"><span>Sector</span><select value={sector} onChange={(event) => updateSector(event.target.value)}>{sectors.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button className="text-button reset-button" onClick={resetFilters}>Reset filters</button>
        <span className="filter-summary">Viewing <strong>{city}</strong><span aria-hidden="true"> / </span>{sector}</span>
      </div></div>

      <div className="content-wrap">
        <section id="discover" className="section-block discover-section">
          <div className="page-heading"><div><p className="eyebrow">01 / Discover</p><h1>Workforce intelligence</h1><p className="heading-summary">Compare your current skills with NCS career requirements; O*NET provides optional occupation enrichment.</p></div>
            <div className="heading-meta"><span className="meta-label">CURRENT MARKET</span><strong>{city}</strong><span>{selectedIndustry ?? sector} · {filteredSkills.length} skills in view</span></div>
          </div>
          <div className="overview-strip" aria-label="Current market summary">
            <Metric label="Demo mean demand index" value={`${averageDemand}`} context="Legacy SkillBridge estimate; not an NCS demand statistic." />
            <Metric label="Demo mean talent index" value={`${averageTalent}`} context="Legacy estimate, not an NCS or O*NET talent-supply measure." />
            <Metric label="Demo mean gap" value={`${averageGap}`} context="Legacy estimate: mean demand less talent, floored at zero." />
            <Metric label="Demo skills assessed" value={`${filteredSkills.length}`} context="Legacy demonstration skills after filters; not an NCS career count." />
          </div>
          <div className="sector-lens">
            <span className="meta-label">INDUSTRY LENS</span>
            {sectors.filter((item): item is Sector => item !== "All sectors").map((item) => <button key={item} className={selectedIndustry === item ? "sector-chip is-selected" : "sector-chip"} onClick={() => updateIndustry(item)}>{item}</button>)}
            {selectedIndustry && <button className="text-button" onClick={() => setSelectedIndustry(null)}>Clear lens</button>}
          </div>
          <div className="discovery-grid">
            <section className="panel skill-panel" aria-labelledby="skill-chart-title">
              <div className="panel-heading"><div><p className="panel-kicker">Legacy demonstration metrics</p><h2 id="skill-chart-title">Skills in focus</h2></div><span className="unit-note">Demo index · 0–100</span></div>
              <div className="chart-legend"><span><i className="legend-demand" /> Demo employer demand</span><span><i className="legend-talent" /> Demo talent availability</span></div>
              <div className="skill-chart">{filteredSkills.map((skill) => {
                const gap = skill.gap;
                return <button className="skill-row" key={skill.id} onClick={() => setSelectedSkillId(skill.id)}>
                  <span className="skill-name-cell"><strong>{skill.name}</strong><small>{skill.category}</small></span>
                  <span className="bar-pair" aria-label={`Demand ${skill.demand}, talent ${skill.talent}`}><span className="bar-track"><i className="bar-fill demand-fill" style={{ width: `${skill.demand}%` }} /></span><span className="bar-track"><i className="bar-fill talent-fill" style={{ width: `${skill.talent}%` }} /></span></span>
                  <span className="gap-cell"><strong>{gap}</strong><small>gap</small></span><span className={`priority-tag priority-${skill.priority.toLowerCase()}`}>{skill.priority}</span>
                </button>;
              })}{filteredSkills.length === 0 && <p className="empty-state">No skills match the current filters.</p>}</div>
              <div className="api-intelligence" aria-live="polite">
                <div className="api-intelligence-heading"><strong>NCS career and skill requirements</strong><span>{currentCareerCatalog ? `${currentCareerCatalog.careers.length} records` : "NCS source"}</span></div>
                <p className="api-state-text">NCS is the primary career-requirements source. Your current skills are compared with the selected NCS career&apos;s required skills; O*NET is optional enrichment only. Requirements come from the local NCS catalog; user searches do not scrape the NCS portal.</p>
                <a className="api-provider-link" href="https://www.ncs.gov.in/" target="_blank" rel="noreferrer">Source: National Career Service (NCS) Portal</a>
                <a className="api-provider-link" href="https://www.ncs.gov.in/job-listing" target="_blank" rel="noreferrer">Source: NCS Job Listing Directory</a>
                {(careersState.status === "idle" || careersState.status === "loading" || (careersState.status === "success" && !currentCareerCatalog)) && <p className="api-state-text">Loading available NCS career records...</p>}
                {careersState.status === "error" && <p className="api-state-text api-state-error">NCS career data could not be loaded. {careersState.message}</p>}
                {currentCareerCatalog && currentCareerCatalog.careers.length === 0 && <p className="api-state-text">No NCS careers are currently available.</p>}
                {currentCareerCatalog?.updatedAt && <p className="api-methodology">Catalog last updated {new Date(currentCareerCatalog.updatedAt).toLocaleDateString()}.</p>}
                <label className="ncs-field"><span>Your current skills · session only</span><textarea value={userSkillsInput} onChange={(event) => setUserSkillsInput(event.target.value)} placeholder="Enter skills separated by commas or new lines" rows={3} /></label>
                <label className="ncs-field"><span>Career from NCS catalog</span><select value={selectedCareerId ?? ""} onChange={(event) => setSelectedCareerId(event.target.value || null)} disabled={!currentCareerCatalog || currentCareerCatalog.careers.length === 0}><option value="">{!currentCareerCatalog ? "Loading NCS careers..." : currentCareerCatalog.careers.length === 0 ? "No NCS careers available" : "Select an NCS career"}</option>{currentCareerCatalog?.careers.map((career) => <option key={career.id} value={career.id}>{career.title}{career.sector ? ` · ${career.sector}` : ""}</option>)}</select></label>
                {enrichedCareer && <div className="selected-career-details">
                  <div className="api-intelligence-heading"><strong>{enrichedCareer.title}</strong><span>NCS career</span></div>
                  {enrichedCareer.description && <p className="ncs-career-description">{enrichedCareer.description}</p>}
                  <p className="api-state-text"><a className="api-provider-link" href={enrichedCareer.sourceUrl} target="_blank" rel="noreferrer">Open source record</a>{enrichedCareer.company ? ` · ${enrichedCareer.company}` : ""}{enrichedCareer.locations?.length ? ` · ${enrichedCareer.locations.join(", ")}` : enrichedCareer.location ? ` · ${enrichedCareer.location}` : ""}</p>
                  {enrichedCareer.experience && <p className="api-state-text"><strong>Experience:</strong> {enrichedCareer.experience.minimumYears !== undefined && enrichedCareer.experience.maximumYears !== undefined ? (enrichedCareer.experience.minimumYears === enrichedCareer.experience.maximumYears ? `${enrichedCareer.experience.minimumYears} years` : `${enrichedCareer.experience.minimumYears}–${enrichedCareer.experience.maximumYears} years`) : enrichedCareer.experience.minimumYears !== undefined ? `${enrichedCareer.experience.minimumYears}+ years` : enrichedCareer.experience.maximumYears !== undefined ? `Up to ${enrichedCareer.experience.maximumYears} years` : "Not specified"}</p>}
                  {ncsSkillMatch && <>
                    <p className="api-state-text"><strong>Matched ({ncsSkillMatch.matched.length}):</strong> {ncsSkillMatch.matched.map((match) => match.careerSkill.name).join(", ") || "None yet"}</p>
                    <p className="api-state-text"><strong>Missing ({ncsSkillMatch.missing.length}):</strong> {ncsSkillMatch.missing.map((skill) => skill.name).join(", ") || "None"}</p>
                    {ncsSkillMatch.optional.length > 0 && <p className="api-state-text"><strong>Optional:</strong> {ncsSkillMatch.optional.map((skill) => skill.name).join(", ")}</p>}
                  </>}
                </div>}
                <div className="onet-intelligence">
                  <div className="api-intelligence-heading"><strong>O*NET optional occupation enrichment</strong><span>{onetKeyword || "Select an NCS career"}</span></div>
                  {(onetState.status === "loading" || (onetKeyword.length >= 2 && !currentOnetResponse && onetState.status !== "error")) && <p className="api-state-text">Matching occupation and retrieving O*NET skills...</p>}
                  {onetState.status === "error" && <p className="api-state-text api-state-error">Occupation intelligence is temporarily unavailable. {onetState.message}</p>}
                  {currentOnetResponse && currentOnetResponse.occupations.length === 0 && <p className="api-state-text">No matching O*NET occupation found for “{currentOnetResponse.keyword}”.</p>}
                  {currentOnetResponse?.occupations[0] && <>
                    <p className="onet-occupation-title">{currentOnetResponse.occupations[0].title} <span>{currentOnetResponse.occupations[0].code}</span></p>
                    {currentOnetResponse.occupations[0].skills.length > 0
                      ? <ul className="onet-skill-list">{currentOnetResponse.occupations[0].skills.slice(0, 6).map((skill) => <li key={skill.id}>{skill.name}{skill.importance !== undefined && <span>Importance {skill.importance}</span>}</li>)}</ul>
                      : <p className="api-state-text">O*NET returned no skill importance values for this occupation.</p>}
                    <a className="onet-attribution" href="https://www.onetcenter.org/" target="_blank" rel="noreferrer">{currentOnetResponse.attribution}</a>
                  </>}
                </div>
                <p className="api-talent-note">O*NET provides optional approximate occupation mapping to enrich matching NCS required skills with importance scores; it never alters NCS requirements or measures Indian talent supply.</p>
              </div>
            </section>
            <section className="panel region-panel" aria-labelledby="regional-title">
              <div className="panel-heading"><div><p className="panel-kicker">Legacy demo regional scenario</p><h2 id="regional-title">Market coverage</h2></div><span className="unit-note">6 city markets</span></div>
              <p className="region-intro">Select a market to scope the skills assessment.</p>
              <div className="region-list">{regionalScenarios.map((location) => <button className={city === location.name ? "region-row is-selected" : "region-row"} key={location.name} onClick={() => setCity(location.name)}>
                <span className="region-name"><strong>{location.name}</strong><small>{location.region} region</small></span><span className="region-track"><i style={{ width: `${location.demand}%` }} /></span><span className="region-score">{location.demand}</span>
              </button>)}</div>
              <p className="panel-footnote scenario-note">Regional comparison remains a demonstration scenario until authorized NCS records with verified locations are loaded.</p>
            </section>
          </div>
        </section>

        <section id="diagnose" className="section-block diagnose-section"><SectionHeading number="02" title="Diagnose skill gaps" description="Review legacy demonstration estimates; these are not NCS-wide demand or talent statistics." />
          <div className="diagnose-layout"><div className="panel table-panel">
            <div className="table-heading"><div><strong>Legacy demo priority assessment</strong><span>Ranked by demo demand–talent difference</span></div><span className="unit-note">{prioritySkills.length} demo priority skills</span></div>
            <div className="table-scroll"><table><thead><tr><th scope="col">Skill</th><th scope="col">Demo demand</th><th scope="col">Demo talent</th><th scope="col">Demo gap</th><th scope="col">Demo growth</th><th scope="col">Demo priority</th></tr></thead><tbody>
              {prioritySkills.map((skill) => <tr key={skill.id} onClick={() => setSelectedSkillId(skill.id)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") setSelectedSkillId(skill.id); }}>
                <th scope="row"><button className="table-skill-button" onClick={(event) => { event.stopPropagation(); setSelectedSkillId(skill.id); }}>{skill.name}<small>{skill.category}</small></button></th><td>{skill.demand}</td><td>{skill.talent}</td><td><strong className="gap-number">{skill.gap}</strong></td><td className="growth-cell">{skill.growth === null ? "N/A" : `+${skill.growth}%`}</td><td><span className={`priority-tag priority-${skill.priority.toLowerCase()}`}>{skill.priority}</span></td>
              </tr>)}{prioritySkills.length === 0 && <tr><td colSpan={6} className="empty-state">No priority skills match the current filters.</td></tr>}
            </tbody></table></div><p className="panel-footnote">This retained demonstration baseline is separate from NCS. NCS career-specific matched/missing requirements are calculated in Recommend from the selected NCS record.</p>
          </div><aside className="diagnosis-note"><p className="panel-kicker">Legacy demo interpretation</p><h3>{averageGap > 25 ? "Training capacity needs attention" : "Monitor emerging mismatches"}</h3><p>The legacy demo view shows a mean gap of <strong>{averageGap} index points</strong> across {summary.skillCount} skills, with {summary.priorityCount} rated high or critical. These are not NCS statistics. Use the selected NCS career comparison to review actual listed requirements.</p><button className="text-button" onClick={() => scrollTo("recommend", "Recommend")}>Review interventions <span aria-hidden="true">→</span></button></aside></div>
        </section>

        <section id="recommend" className="section-block recommend-section"><SectionHeading number="03" title="Recommend interventions" description="Sample training options use the legacy demo skill profile; NCS career requirements are compared separately above." />
          {selectedCareer && ncsSkillMatch && <div className="ncs-gap-summary">
            <div className="table-heading"><div><strong>NCS career skill comparison · {selectedCareer.title}</strong><span>Exact normalized name/alias matches; no fuzzy matches.</span></div><span className="unit-note">{ncsSkillMatch.matched.length} matched · {ncsSkillMatch.missing.length} missing</span></div>
            <div className="ncs-gap-columns">
              <div><strong>Matched skills</strong><p>{ncsSkillMatch.matched.map((match) => match.careerSkill.name).join(", ") || "No required skills matched yet."}</p></div>
              <div><strong>Missing skills</strong><p>{ncsSkillMatch.missing.map((skill) => skill.name).join(", ") || "No missing required skills."}</p></div>
            </div>
            {roadmap.length > 0 && <ol className="ncs-roadmap">{roadmap.map((step) => <li key={step.skill.id}><span>{step.order}</span><div><strong>{step.skill.name}</strong><small>{step.reason}</small></div>{step.skill.onetImportance !== undefined && <span className="ncs-importance">O*NET importance {step.skill.onetImportance}</span>}</li>)}</ol>}
            {roadmap.length === 0 && <p className="panel-footnote">Add an NCS career record with required skills and enter your current skills to create a personalized learning sequence.</p>}
          </div>}
          <div className="recommend-toolbar"><span>{selectedSkill ? <>Selected skill: <strong>{selectedSkill.name}</strong> · Scores reflect {city} and {selectedIndustry ?? sector}.</> : "Select a skill in Discover or Diagnose to focus program matching."}</span>{selectedSkill && <button className="text-button" onClick={() => setSelectedSkillId(null)}>Clear selection</button>}</div>
          <div className="program-table-wrap"><table className="program-table"><thead><tr><th scope="col">Program</th><th scope="col">Mapped competencies</th><th scope="col">Duration</th><th scope="col">Level</th><th scope="col">Match</th><th scope="col">Details</th></tr></thead><tbody>
            {recommendedPrograms.map((program) => <tr key={program.id}><th scope="row"><strong>{program.title}</strong><small>{program.provider}</small></th><td><span className="competency-list">{program.competencies.join(" · ")}</span></td><td>{program.duration}</td><td>{program.level}</td><td><span className="match-score">{program.matchScore}%</span></td><td><button className="table-action" onClick={() => setSelectedProgramId(program.id)}>View details <span aria-hidden="true">→</span></button></td></tr>)}
          </tbody></table></div><p className="panel-footnote">Program mappings and match scores are sample recommendations, not verified course endorsements.</p>
        </section>

        <section id="measure" className="section-block measure-section"><SectionHeading number="04" title="Measure progress" description="Track progress against NCS-listed requirements for the selected career." />
          <div className="measure-grid"><div className="measure-summary"><p className="panel-kicker">NCS skill baseline</p><h3>{selectedCareer?.title ?? "No career selected"}</h3><p>{selectedCareer && ncsSkillMatch ? `${ncsSkillMatch.matched.length} of ${selectedCareer.requiredSkills.length} required skills matched. ${ncsSkillMatch.missing.length} remain to learn.` : "Select a loaded NCS career and enter your current skills to calculate a personal baseline."}</p><div className="baseline-date"><span>CATALOG STATUS</span><strong>{careersState.status === "success" && careersState.data.careers.length > 0 ? `NCS records · ${selectedCareer ? "Career selected" : "No career selected"}` : "No NCS records loaded"}</strong></div></div>
            <div className="measure-indicators"><MeasureLine label="Demo employer demand" value={averageDemand} detail="Mean demonstration index across visible skills" tone="demand" /><MeasureLine label="Demo talent availability" value={averageTalent} detail="Mean demonstration index across visible skills" tone="talent" /><MeasureLine label="Demo unmet demand" value={averageGap} detail="Mean demonstration demand–talent difference" tone="gap" /><div className="measurement-rule"><strong>Measurement rule</strong><span>These retained market indicators use demonstration records. Career progress above uses only NCS-listed required skills and your session skill list.</span></div></div>
          </div>
        </section>
        <footer className="workspace-footer"><span><strong>SkillBridge</strong> · Smart India Hackathon 2026</span><span>NCS local catalog = career requirements · O*NET = optional enrichment · Dashboard market metrics = legacy demo estimates.</span></footer>
      </div>

      {selectedSkill && <Dialog title={selectedSkill.name} eyebrow={selectedSkill.category} onClose={() => setSelectedSkillId(null)}>
        <p className="dialog-description">{describeSkillGap(selectedSkill)}</p><p className="dialog-description">{selectedSkill.description}</p><div className="dialog-metrics"><Metric label="Demo demand index" value={`${selectedSkill.demand}`} context={selectedSkill.demandSource} /><Metric label="Demo talent index" value={`${selectedSkill.talent}`} context="Demonstration estimate; not an API-measured India talent supply." /><Metric label="Demo skill gap" value={`${selectedSkill.gap}`} context="Legacy demonstration demand less talent availability." /><Metric label="Demo demand growth" value={selectedSkill.growth === null ? "N/A" : `${selectedSkill.growth}%`} context={selectedSkill.growth === null ? "Not supplied for this API-derived skill." : "Legacy demonstration growth estimate."} /><Metric label="Demo priority" value={selectedSkill.priority} context="Derived from the legacy demonstration gap and growth signal." /><Metric label={selectedSkill.importance !== undefined ? "O*NET importance" : "Relevant sectors"} value={selectedSkill.importance !== undefined ? `${selectedSkill.importance}` : selectedSkill.sectors.join(", ") || "Not mapped"} context={selectedSkill.importance !== undefined ? "Importance returned by O*NET." : "Legacy SkillBridge sector mapping; not from NCS."} /></div>
        <div className="recommendation-note"><strong>Suggested response</strong><p>{selectedSkill.priority === "Critical" ? `Consider targeted training and employer-aligned practice for ${selectedSkill.name}. Validate this priority against local placement and vacancy data.` : selectedSkill.priority === "High" ? `Build practical training capacity for ${selectedSkill.name} and review the gap as verified local data becomes available.` : `Maintain practical industry exposure for ${selectedSkill.name} and monitor its ${selectedSkill.growth !== null ? `${selectedSkill.growth}% demonstration growth signal.` : "demonstration signal."}`}</p></div><button className="primary-action" onClick={() => { setSelectedSkillId(null); scrollTo("recommend", "Recommend"); }}>View matched programs <span aria-hidden="true">→</span></button>
      </Dialog>}
      {selectedProgram && <Dialog title={selectedProgram.title} eyebrow="Program recommendation" onClose={() => setSelectedProgramId(null)}>
        <p className="dialog-description">{selectedProgram.provider}. This demonstration program is mapped to {selectedProgram.category} and scored for {city} / {selectedIndustry ?? sector}.</p><dl className="program-details"><div><dt>Duration</dt><dd>{selectedProgram.duration}</dd></div><div><dt>Level</dt><dd>{selectedProgram.level}</dd></div><div><dt>Calculated match</dt><dd>{selectedProgram.matchScore}%</dd></div></dl><div className="recommendation-note"><strong>Mapped competencies</strong><p>{selectedProgram.competencies.join(" · ")}</p></div>
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