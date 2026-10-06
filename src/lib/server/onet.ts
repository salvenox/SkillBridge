import "server-only";

import type { OccupationProfile, OccupationSkill, OnetResponse } from "@/lib/externalApiTypes";
import { isRecord, ProviderError, readJson, safeUpstreamStatus } from "@/lib/server/apiResponse";

const ONET_API_ROOT = "https://api-v2.onetcenter.org";
const CACHE_SECONDS = 86_400;
const REQUEST_TIMEOUT_MS = 10_000;
const ONET_ATTRIBUTION = "O*NET® is a trademark of the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). O*NET data accessed via O*NET Web Services.";

type OccupationSearchResult = { code: string; title: string };

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseOccupation(value: unknown): OccupationSearchResult | null {
  if (!isRecord(value)) return null;
  const code = optionalString(value, "code");
  const title = optionalString(value, "title");
  return code && title ? { code, title } : null;
}

function parseOccupationSkills(payload: unknown): OccupationSkill[] {
  if (!isRecord(payload) || !Array.isArray(payload.element)) return [];
  return payload.element.flatMap((value): OccupationSkill[] => {
    if (!isRecord(value)) return [];
    const id = optionalString(value, "id");
    const name = optionalString(value, "name");
    if (!id || !name) return [];
    const importance = typeof value.importance === "number" && Number.isFinite(value.importance)
      ? value.importance
      : undefined;
    const description = optionalString(value, "description");
    return [{ id, name, ...(description ? { description } : {}), ...(importance !== undefined ? { importance } : {}) }];
  });
}

async function onetGet(url: URL, apiKey: string): Promise<Response> {
  try {
    return await fetch(url, {
      headers: { Accept: "application/json", "X-API-Key": apiKey },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ProviderError("O*NET did not respond before the request timed out.", 504, "ONET_TIMEOUT");
    }
    throw new ProviderError("Occupation intelligence is temporarily unavailable.", 502, "ONET_NETWORK_ERROR");
  }
}

async function readOnetResponse(response: Response): Promise<unknown> {
  if (!response.ok) {
    const safeError = safeUpstreamStatus(response.status);
    throw new ProviderError(safeError.message, safeError.status, safeError.code.replace("UPSTREAM", "ONET"));
  }
  try {
    return await readJson(response);
  } catch {
    throw new ProviderError("O*NET returned an unreadable response.", 502, "ONET_INVALID_RESPONSE");
  }
}

export async function searchOnetOccupations(keyword: string): Promise<OnetResponse> {
  const apiKey = process.env.ONET_API_KEY;
  if (!apiKey) {
    throw new ProviderError("O*NET credentials are not configured on the server.", 503, "ONET_NOT_CONFIGURED");
  }

  const searchUrl = new URL("/online/search", ONET_API_ROOT);
  searchUrl.searchParams.set("keyword", keyword);
  searchUrl.searchParams.set("start", "1");
  searchUrl.searchParams.set("end", "5");
  const searchPayload = await readOnetResponse(await onetGet(searchUrl, apiKey));
  if (!isRecord(searchPayload) || !Array.isArray(searchPayload.occupation)) {
    throw new ProviderError("O*NET returned an unexpected occupation-search format.", 502, "ONET_INVALID_RESPONSE");
  }

  const matches = searchPayload.occupation.map(parseOccupation).filter((item): item is OccupationSearchResult => item !== null);
  if (matches.length === 0) {
    return { source: "O*NET Web Services", attribution: ONET_ATTRIBUTION, keyword, occupations: [] };
  }

  const match = matches[0];
  const occupationUrl = new URL(`/online/occupations/${encodeURIComponent(match.code)}`, ONET_API_ROOT);
  const skillsUrl = new URL(`/online/occupations/${encodeURIComponent(match.code)}/details/skills`, ONET_API_ROOT);
  skillsUrl.searchParams.set("start", "1");
  skillsUrl.searchParams.set("end", "20");

  const [occupationResponse, skillsResponse] = await Promise.all([
    onetGet(occupationUrl, apiKey),
    onetGet(skillsUrl, apiKey),
  ]);
  const occupationPayload = await readOnetResponse(occupationResponse);
  if (!isRecord(occupationPayload)) {
    throw new ProviderError("O*NET returned an unexpected occupation profile format.", 502, "ONET_INVALID_RESPONSE");
  }

  let skills: OccupationSkill[] = [];
  const warnings: string[] = [];
  if (skillsResponse.ok) {
    skills = parseOccupationSkills(await readOnetResponse(skillsResponse));
  } else if (skillsResponse.status === 404) {
    warnings.push("O*NET has no skills detail available for this occupation.");
  } else {
    const safeError = safeUpstreamStatus(skillsResponse.status);
    throw new ProviderError(safeError.message, safeError.status, safeError.code.replace("UPSTREAM", "ONET"));
  }

  const occupation: OccupationProfile = {
    code: optionalString(occupationPayload, "code") ?? match.code,
    title: optionalString(occupationPayload, "title") ?? match.title,
    ...(optionalString(occupationPayload, "description") ? { description: optionalString(occupationPayload, "description") } : {}),
    skills,
  };

  return {
    source: "O*NET Web Services",
    attribution: ONET_ATTRIBUTION,
    keyword,
    occupations: [occupation],
    ...(warnings.length ? { warnings } : {}),
  };
}

export function parseOnetKeyword(url: URL): string {
  const keyword = url.searchParams.get("keyword")?.trim() ?? "";
  if (keyword.length < 2 || keyword.length > 100) {
    throw new ProviderError("keyword must contain between 2 and 100 characters.", 400, "INVALID_KEYWORD");
  }
  return keyword;
}
