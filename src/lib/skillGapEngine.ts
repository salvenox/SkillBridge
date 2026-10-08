import {
  marketProfiles,
  programDefinitions,
  sectorProfiles,
  skillDefinitions,
  type MarketId,
  type ProgramDefinition,
  type Sector,
  type SkillAdjustment,
  type SkillDefinition,
  type SkillId,
} from "@/data/skillData";

export type SkillAssessment = Omit<SkillDefinition, "id" | "growth"> & {
  id: string;
  demand: number;
  demandSource: "SkillBridge demonstration estimate";
  talent: number;
  talentSource: "Demonstration estimate";
  growth: number | null;
  importance?: number;
  gap: number;
  priority: "Critical" | "High" | "Medium";
};

export type SkillGapQuery = {
  marketId: MarketId;
  sector?: Sector | null;
  industry?: Sector | null;
  search?: string;
};

export type SkillSummary = {
  meanDemand: number;
  meanTalent: number;
  meanGap: number;
  skillCount: number;
  priorityCount: number;
};

export type ProgramRecommendation = ProgramDefinition & {
  matchScore: number;
};

const clampIndex = (value: number): number => Math.min(100, Math.max(0, value));
const mean = (values: readonly number[]): number =>
  values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : 0;


export function getPriority(gap: number, growth: number | null): SkillAssessment["priority"] {
  if (gap >= 25) return "Critical";
  if (gap >= 15 || (gap >= 10 && growth !== null && growth >= 30)) return "High";
  return "Medium";
}

function matchesSector(skill: SkillDefinition, sector: Sector | null): boolean {
  return !sector || skill.sectors.includes(sector);
}

export function calculateSkillGaps({
  marketId,
  sector = null,
  industry = null,
  search = "",
}: SkillGapQuery): SkillAssessment[] {
  const market = marketProfiles.find((profile) => profile.id === marketId);
  if (!market) return [];

  const activeSector = sector ?? industry;
  const sectorProfile = activeSector
    ? sectorProfiles.find((profile) => profile.sector === activeSector)
    : undefined;
  const normalizedSearch = search.trim().toLocaleLowerCase();

  return skillDefinitions
    .filter((skill) =>
      skill.name.toLocaleLowerCase().includes(normalizedSearch) &&
      matchesSector(skill, sector) &&
      matchesSector(skill, industry)
    )
    .map((skill) => {
      const marketAdjustments = market.adjustments as Partial<Record<SkillId, SkillAdjustment>>;
      const sectorAdjustments = sectorProfile?.adjustments as Partial<Record<SkillId, SkillAdjustment>> | undefined;
      const marketAdjustment = marketAdjustments[skill.id as SkillId] ?? {};
      const sectorAdjustment = sectorAdjustments?.[skill.id as SkillId] ?? {};
      const demand = clampIndex(skill.demand + (marketAdjustment.demand ?? 0) + (sectorAdjustment.demand ?? 0));
      const talent = clampIndex(skill.talent + (marketAdjustment.talent ?? 0) + (sectorAdjustment.talent ?? 0));
      const growth = clampIndex(skill.growth + (marketAdjustment.growth ?? 0) + (sectorAdjustment.growth ?? 0));
      const gap = Math.max(0, demand - talent);

      return {
        ...skill,
        demand,
        demandSource: "SkillBridge demonstration estimate",
        talent,
        talentSource: "Demonstration estimate",
        growth,
        gap,
        priority: getPriority(gap, growth),
      };
    });
}

export function summarizeSkills(skills: readonly SkillAssessment[]): SkillSummary {
  return {
    meanDemand: mean(skills.map((skill) => skill.demand)),
    meanTalent: mean(skills.map((skill) => skill.talent)),
    meanGap: mean(skills.map((skill) => skill.gap)),
    skillCount: skills.length,
    priorityCount: skills.filter((skill) => skill.priority !== "Medium").length,
  };
}

export function describeSkillGap(skill: SkillAssessment): string {
  const sectorContext = skill.sectors.length > 0
    ? ` Relevant sectors include ${skill.sectors.join(", ")}.`
    : "";

  if (skill.gap === 0) {
    const growthNote = skill.growth === null
      ? "continue monitoring this skill."
      : `Demonstration demand growth is ${skill.growth}%, so continue monitoring this skill.`;
    return `Estimated talent availability currently meets or exceeds demand. ${growthNote}${sectorContext}`;
  }

  const growthSignal = skill.growth === null
    ? skill.importance !== undefined
      ? ` O*NET reports importance ${skill.importance} for this skill; demand growth is not available from this data.`
      : " Demand growth is not available for this API-derived skill."
    : skill.growth >= 30
      ? ` Demand growth of ${skill.growth}% reinforces the need to expand practical training.`
      : ` Demand growth is ${skill.growth}% in this demonstration dataset.`;

  return `Demand exceeds estimated talent availability by ${skill.gap} index points. This is a ${skill.priority.toLowerCase()} training priority.${growthSignal}${sectorContext}`;
}

function sectorCoverage(program: ProgramDefinition, skill: SkillAssessment, sector: Sector | null): number {
  if (sector) return program.sectors.includes(sector) ? 15 : 0;
  const applicableSectors = skill.sectors;
  if (applicableSectors.length === 0) return 0;
  const overlaps = applicableSectors.filter((item) => program.sectors.includes(item)).length;
  return (overlaps / applicableSectors.length) * 15;
}

function scoreProgram(program: ProgramDefinition, skill: SkillAssessment, sector: Sector | null): number {
  const skillMatch = program.skillIds.includes(skill.id as SkillId) ? 30 : 0;
  const categoryMatch = program.category === skill.category ? 15 : 0;
  const sectorMatch = sectorCoverage(program, skill, sector);
  const gapSeverity = Math.min(skill.gap / 40, 1) * 15;
  const growthSignal = skill.growth === null ? 0 : Math.min(skill.growth / 40, 1) * 10;
  const competencyMatches = program.competencies.filter((competency) =>
    skill.competencies.some((skillCompetency) => skillCompetency.toLocaleLowerCase() === competency.toLocaleLowerCase())
  ).length;
  const competencyOverlap = skill.competencies.length
    ? (competencyMatches / skill.competencies.length) * 15
    : 0;

  return Math.round(Math.min(100, skillMatch + categoryMatch + sectorMatch + gapSeverity + growthSignal + competencyOverlap));
}

export function recommendPrograms(
  skill: SkillAssessment | null,
  sector: Sector | null = null,
): ProgramRecommendation[] {
  if (!skill) {
    return programDefinitions.map((program) => ({ ...program, matchScore: program.demonstrationScore }));
  }

  return programDefinitions
    .map((program) => ({ ...program, matchScore: scoreProgram(program, skill, sector) }))
    .sort((left, right) => right.matchScore - left.matchScore || left.title.localeCompare(right.title));
}

export function compareMarkets(query: Omit<SkillGapQuery, "marketId">): Array<{
  id: MarketId;
  name: string;
  region: string;
  demand: number;
}> {
  return marketProfiles.map((market) => {
    const assessments = calculateSkillGaps({ ...query, marketId: market.id });
    return {
      id: market.id,
      name: market.name,
      region: market.region,
      demand: summarizeSkills(assessments).meanDemand,
    };
  });
}

export function getMarketId(name: string): MarketId | undefined {
  const normalized = name.trim().toLocaleLowerCase();
  return marketProfiles.find(
    (market) =>
      market.name.toLocaleLowerCase() === normalized ||
      market.id.toLocaleLowerCase() === normalized
  )?.id;
}

export function getMarketName(id: MarketId): string {
  return marketProfiles.find((market) => market.id === id)?.name ?? id;
}
