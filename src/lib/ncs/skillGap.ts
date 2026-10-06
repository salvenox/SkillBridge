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

export function buildLearningRoadmap(career: NcsCareer, missingSkills: readonly NcsSkill[]): RoadmapStep[] {
  return missingSkills.map((skill, index) => ({
    order: index + 1,
    skill,
    reason: `Listed as a required skill for ${career.title} in this NCS record.`,
  }));
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
