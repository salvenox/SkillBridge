import type { OccupationProfile } from "@/lib/externalApiTypes";
import { normalizeSkillName } from "./skillNormalization.ts";
import type { NcsCareer, NcsSkill, RoadmapStep, SkillMatchResult } from "./types.ts";

export function compareCareerSkills(career: NcsCareer, userSkills: readonly string[]): SkillMatchResult {
  const userSkillByNormalizedName = new Map<string, string>();
  for (const skill of userSkills) {
    const normalizedName = normalizeSkillName(skill);
    if (normalizedName && !userSkillByNormalizedName.has(normalizedName)) {
      userSkillByNormalizedName.set(normalizedName, skill.trim());
    }
  }

  const matched: SkillMatchResult["matched"] = [];
  const missing: NcsSkill[] = [];
  for (const requiredSkill of career.requiredSkills) {
    const userSkill = userSkillByNormalizedName.get(requiredSkill.normalizedName);
    if (userSkill) matched.push({ careerSkill: requiredSkill, userSkill });
    else missing.push(requiredSkill);
  }

  return { matched, missing, optional: [] };
}

const skillTierMap: Readonly<Record<string, number>> = {
  // Tier 1: Core Fundamentals & Prerequisite Languages/Protocols
  html: 1,
  css: 1,
  javascript: 1,
  python: 1,
  sql: 1,
  linux: 1,
  "embedded c": 1,
  sensors: 1,
  git: 1,
  statistics: 1,

  // Tier 2: Frameworks, Core Tooling & Intermediate Practices
  react: 2,
  typescript: 2,
  "node js": 2,
  apis: 2,
  "rest apis": 2,
  "database design": 2,
  docker: 2,
  analytics: 2,
  "data visualization": 2,
  "machine learning": 2,
  "network security": 2,
  plc: 2,
  scada: 2,
  iot: 2,
  "threat detection": 2,

  // Tier 3: Advanced Systems, Cloud Infrastructure & Specialized Operations
  "deep learning": 3,
  tensorflow: 3,
  "model deployment": 3,
  kubernetes: 3,
  aws: 3,
  "cloud architecture": 3,
  "ci cd": 3,
  cybersecurity: 3,
  siem: 3,
  soc: 3,
  "incident response": 3,
  "risk modeling": 3,
  "industrial automation": 3,
  robotics: 3,
  "health informatics": 3,
};

function getPositionReason(skill: NcsSkill, tier: number, hasOnetImportance: boolean): string {
  const importanceNote = hasOnetImportance && skill.onetImportance !== undefined
    ? ` Prioritized by O*NET occupation importance score (${skill.onetImportance}).`
    : "";

  if (tier === 1) {
    return `Foundational competency: Core building block recommended for early acquisition.${importanceNote}`;
  }
  if (tier === 3) {
    return `Advanced specialization: High-level system design and production workflow practice.${importanceNote}`;
  }
  return `Applied framework/tooling: Practical application competency built upon foundational knowledge.${importanceNote}`;
}

export function buildLearningRoadmap(career: NcsCareer, missingSkills: readonly NcsSkill[]): RoadmapStep[] {
  if (missingSkills.length === 0) return [];

  const sourceIndexMap = new Map<string, number>();
  career.requiredSkills.forEach((skill, index) => {
    sourceIndexMap.set(skill.normalizedName, index);
  });

  const sortedSkills = [...missingSkills].sort((left, right) => {
    const leftTier = skillTierMap[left.normalizedName] ?? 2;
    const rightTier = skillTierMap[right.normalizedName] ?? 2;

    if (leftTier !== rightTier) {
      return leftTier - rightTier;
    }

    const leftImportance = left.onetImportance;
    const rightImportance = right.onetImportance;
    if (leftImportance !== undefined && rightImportance !== undefined && leftImportance !== rightImportance) {
      return rightImportance - leftImportance;
    }
    if (leftImportance !== undefined && rightImportance === undefined) {
      return -1;
    }
    if (leftImportance === undefined && rightImportance !== undefined) {
      return 1;
    }

    const leftSourceIndex = sourceIndexMap.get(left.normalizedName) ?? 999;
    const rightSourceIndex = sourceIndexMap.get(right.normalizedName) ?? 999;
    if (leftSourceIndex !== rightSourceIndex) {
      return leftSourceIndex - rightSourceIndex;
    }

    return left.name.localeCompare(right.name);
  });

  return sortedSkills.map((skill, index) => {
    const tier = skillTierMap[skill.normalizedName] ?? 2;
    const missingReason = `Listed as a required skill for ${career.title} in this NCS record; not found in current skill list.`;
    const positionReason = getPositionReason(skill, tier, skill.onetImportance !== undefined);
    const reason = `${missingReason} ${positionReason}`;

    return {
      order: index + 1,
      skill,
      reason,
      missingReason,
      positionReason,
    };
  });
}

export function enrichNcsCareerSkills(career: NcsCareer, occupation: OccupationProfile | null): NcsCareer {
  if (!occupation) return career;
  const onetSkills = new Map(occupation.skills.map((skill) => [normalizeSkillName(skill.name), skill]));
  return {
    ...career,
    requiredSkills: career.requiredSkills.map((skill) => {
      const enrichment = onetSkills.get(skill.normalizedName);
      return enrichment?.importance === undefined
        ? skill
        : { ...skill, onetImportance: enrichment.importance };
    }),
  };
}
