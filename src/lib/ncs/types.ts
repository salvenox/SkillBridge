export type NcsSkill = {
  id: string;
  name: string;
  normalizedName: string;
  onetImportance?: number;
};

export type NcsCareer = {
  id: string;
  title: string;
  sector?: string;
  company?: string;
  description?: string;
  experience?: {
    minimumYears?: number;
    maximumYears?: number;
  };
  /** Legacy first-location field retained for existing catalogs and UI consumers. */
  location?: string;
  /** All source-derived city/state values from the NCS job's location entries. */
  locations?: string[];
  publishedAt?: string;
  source: "NCS";
  sourceUrl: string;
  collectedAt: string;
  requiredSkills: NcsSkill[];
};

export type NcsCareerCatalog = {
  source: "NCS";
  updatedAt: string | null;
  careers: NcsCareer[];
};

export type NcsCareerSearchResponse = NcsCareerCatalog & {
  query: string;
  sector: string;
  location: string;
};

export type NcsImportReport = {
  catalog: NcsCareerCatalog;
  importedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  errors: string[];
};

export type SkillMatchResult = {
  matched: Array<{ careerSkill: NcsSkill; userSkill: string }>;
  missing: NcsSkill[];
  optional: NcsSkill[];
};

export type RoadmapStep = {
  order: number;
  skill: NcsSkill;
  reason: string;
};
