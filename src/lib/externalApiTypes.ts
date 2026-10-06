import type { NcsCareerSearchResponse } from "@/lib/ncs/types";

export type OccupationSkill = {
  id: string;
  name: string;
  description?: string;
  importance?: number;
};

export type OccupationProfile = {
  code: string;
  title: string;
  description?: string;
  skills: OccupationSkill[];
};

export type OnetResponse = {
  source: "O*NET Web Services";
  attribution: string;
  keyword: string;
  occupations: OccupationProfile[];
  warnings?: string[];
  error?: { code: string; message: string };
};

export type ApiErrorResponse = {
  error: { code: string; message: string };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return isRecord(value) && isRecord(value.error) &&
    typeof value.error.code === "string" && typeof value.error.message === "string";
}

export function isNcsCareerCatalog(value: unknown): value is NcsCareerSearchResponse {
  return isRecord(value) && value.source === "NCS" && Array.isArray(value.careers) &&
    typeof value.query === "string" && typeof value.sector === "string" && typeof value.location === "string" &&
    value.careers.every((career) => isRecord(career) && typeof career.id === "string" &&
      typeof career.title === "string" && career.source === "NCS" && Array.isArray(career.requiredSkills));
}

export function isOnetResponse(value: unknown): value is OnetResponse {
  return isRecord(value) && value.source === "O*NET Web Services" && typeof value.attribution === "string" &&
    typeof value.keyword === "string" && Array.isArray(value.occupations);
}
