import { normalizeSkillList } from "./skillNormalization.ts";
import type { NcsCareer, NcsCareerCatalog, NcsImportReport } from "./types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalExperience(value: unknown): { minimumYears?: number; maximumYears?: number } | undefined {
  if (!isRecord(value)) return undefined;
  const minimumYears = typeof value.minExperience === "number" && Number.isFinite(value.minExperience)
    ? value.minExperience
    : undefined;
  const maximumYears = typeof value.maxExperience === "number" && Number.isFinite(value.maxExperience)
    ? value.maxExperience
    : undefined;
  return minimumYears !== undefined || maximumYears !== undefined
    ? { ...(minimumYears !== undefined ? { minimumYears } : {}), ...(maximumYears !== undefined ? { maximumYears } : {}) }
    : undefined;
}

function optionalLocation(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const firstLocation = value.find(isRecord);
  if (!firstLocation) return undefined;
  const state = optionalString(firstLocation, "state");
  return state;
}

function normalizePublishedAt(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    const parsed = new Date(milliseconds);
    return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
  }
  return undefined;
}

export function normalizeNcsJob(value: unknown, collectedAt = new Date()): NcsCareer {
  if (!isRecord(value)) throw new Error("Record must be a JSON object.");

  const rawId = value.id;
  const id = typeof rawId === "string" || typeof rawId === "number" ? String(rawId).trim() : "";
  const title = optionalString(value, "jobTitle");
  if (!id || !title) throw new Error("Record must include the NCS job id and jobTitle.");

  const requiredSkillNames = Array.isArray(value.requiredSkills)
    ? value.requiredSkills.filter((skill): skill is string => typeof skill === "string")
    : [];
  const publishedAt = normalizePublishedAt(value.createdAt);
  const sourceUrl = `https://www.ncs.gov.in/job-listing/applying/${encodeURIComponent(id)}`;

  return {
    id,
    title,
    source: "NCS",
    sourceUrl,
    collectedAt: collectedAt.toISOString(),
    requiredSkills: normalizeSkillList(requiredSkillNames),
    ...(optionalString(value, "industry") ? { sector: optionalString(value, "industry") } : {}),
    ...(optionalString(value, "organizationName") ? { company: optionalString(value, "organizationName") } : {}),
    ...(optionalString(value, "description") ? { description: optionalString(value, "description") } : {}),
    ...(optionalExperience(value) ? { experience: optionalExperience(value) } : {}),
    ...(optionalLocation(value.jobLocations) ? { location: optionalLocation(value.jobLocations) } : {}),
    ...(publishedAt ? { publishedAt } : {}),
  };
}

export function importNcsRecords(input: unknown, collectedAt = new Date()): NcsImportReport {
  const rows = Array.isArray(input)
    ? input
    : isRecord(input) && Array.isArray(input.jobs)
      ? input.jobs
      : null;
  if (!rows) throw new Error("Import must be an array of NCS job records or an object with a jobs array.");

  const seenIds = new Set<string>();
  const careers: NcsCareer[] = [];
  const errors: string[] = [];
  let duplicateCount = 0;
  let rejectedCount = 0;

  rows.forEach((row, index) => {
    try {
      const career = normalizeNcsJob(row, collectedAt);
      if (seenIds.has(career.id)) {
        duplicateCount += 1;
        return;
      }
      seenIds.add(career.id);
      careers.push(career);
    } catch (error) {
      rejectedCount += 1;
      errors.push(`Record ${index + 1}: ${error instanceof Error ? error.message : "Invalid record."}`);
    }
  });

  const catalog: NcsCareerCatalog = {
    source: "NCS",
    updatedAt: careers.length ? collectedAt.toISOString() : null,
    careers,
  };

  return { catalog, importedCount: careers.length, duplicateCount, rejectedCount, errors };
}
