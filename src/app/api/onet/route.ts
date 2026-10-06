import { jsonError, ProviderError } from "@/lib/server/apiResponse";
import { parseOnetKeyword, searchOnetOccupations } from "@/lib/server/onet";

export async function GET(request: Request): Promise<Response> {
  try {
    const keyword = parseOnetKeyword(new URL(request.url));
    return Response.json(await searchOnetOccupations(keyword), {
      headers: { "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    if (error instanceof ProviderError) return jsonError(error.status, error.code, error.message);
    return jsonError(500, "ONET_ROUTE_ERROR", "Occupation intelligence could not be loaded.");
  }
}
