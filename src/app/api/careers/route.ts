import { NextRequest } from "next/server";
import catalogData from "@/data/ncsCareers.json";
import { matchesNcsCareerLocation } from "@/lib/ncs/locationMatching";
import { normalizeSkillName } from "@/lib/ncs/skillNormalization";
import type { NcsCareer, NcsCareerCatalog } from "@/lib/ncs/types";

const catalog = catalogData as NcsCareerCatalog;

const sectorAliases: Readonly<Record<string, readonly string[]>> = {
  technology: ["technology", "it", "information technology", "software", "communication", "it & communication"],
  fintech: ["fintech", "finance", "financial", "banking", "bfsi"],
  healthcare: ["healthcare", "health", "medical", "life sciences", "healthtech"],
  manufacturing: ["manufacturing", "production", "industrial", "automotive", "automation"],
};

function matchesSector(careerSector: string | undefined, sectorFilter: string): boolean {
  if (!sectorFilter || sectorFilter === "all sectors" || sectorFilter === "all") return true;
  if (!careerSector) return true;
  const sec = careerSector.toLocaleLowerCase();
  const aliases = sectorAliases[sectorFilter] ?? [sectorFilter];
  return aliases.some((alias) => sec.includes(alias)) || sec.includes(sectorFilter);
}

function matchesQuery(career: NcsCareer, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = normalizeSkillName(query);
  const skillNames = career.requiredSkills.map((skill) => `${skill.name} ${skill.normalizedName}`).join(" ");
  const searchableText = `${career.title} ${career.sector ?? ""} ${career.company ?? ""} ${career.description ?? ""} ${skillNames}`.toLocaleLowerCase();
  return searchableText.includes(query) || (normalizedQuery.length > 0 && searchableText.includes(normalizedQuery));
}

export async function GET(request: NextRequest): Promise<Response> {
  const query = request.nextUrl.searchParams.get("q")?.trim().toLocaleLowerCase() ?? "";
  const sector = request.nextUrl.searchParams.get("sector")?.trim().toLocaleLowerCase() ?? "";
  const location = request.nextUrl.searchParams.get("location")?.trim().toLocaleLowerCase() ?? "";

  const careers = catalog.careers.filter((career) => {
    return matchesQuery(career, query) && matchesSector(career.sector, sector) && matchesNcsCareerLocation(career, location);
  });

  return Response.json({
    source: "NCS",
    status: careers.length ? "ready" : "empty",
    updatedAt: catalog.updatedAt,
    careers,
    query,
    sector,
    location,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
