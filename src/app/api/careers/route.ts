import { NextRequest } from "next/server";
import catalogData from "@/data/ncsCareers.json";
import type { NcsCareerCatalog } from "@/lib/ncs/types";

const catalog = catalogData as NcsCareerCatalog;

export async function GET(request: NextRequest): Promise<Response> {
  const query = request.nextUrl.searchParams.get("q")?.trim().toLocaleLowerCase() ?? "";
  const sector = request.nextUrl.searchParams.get("sector")?.trim().toLocaleLowerCase() ?? "";
  const location = request.nextUrl.searchParams.get("location")?.trim().toLocaleLowerCase() ?? "";

  const careers = catalog.careers.filter((career) => {
    const queryMatch = !query || `${career.title} ${career.sector ?? ""} ${career.requiredSkills.map((skill) => skill.name).join(" ")}`
      .toLocaleLowerCase()
      .includes(query);
    const sectorMatch = !sector || career.sector?.toLocaleLowerCase().includes(sector);
    const locationMatch = !location || career.location?.toLocaleLowerCase().includes(location);
    return queryMatch && sectorMatch && locationMatch;
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
