import type { NcsCareer } from "./types";

const cityStateMap: Readonly<Record<string, readonly string[]>> = {
  bengaluru: ["karnataka", "bengaluru", "bangalore"],
  bangalore: ["karnataka", "bengaluru", "bangalore"],
  "delhi ncr": ["delhi", "ncr", "haryana", "uttar pradesh", "noida", "gurugram", "gurgaon"],
  "delhi-ncr": ["delhi", "ncr", "haryana", "uttar pradesh", "noida", "gurugram", "gurgaon"],
  delhi: ["delhi", "ncr", "haryana", "uttar pradesh", "noida", "gurugram", "gurgaon"],
  mumbai: ["maharashtra", "mumbai"],
  hyderabad: ["telangana", "hyderabad", "andhra pradesh"],
  pune: ["maharashtra", "pune"],
  chennai: ["tamil nadu", "chennai", "madras"],
  madras: ["tamil nadu", "chennai", "madras"],
};

const nationalLocationLabels = new Set(["pan india", "all india", "national", "india"]);

function normalizeLocation(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function matchesNcsCareerLocation(career: NcsCareer, locationFilter: string): boolean {
  const requestedLocation = normalizeLocation(locationFilter);
  if (!requestedLocation || requestedLocation === "all") return true;

  const sourceLocations = career.locations?.length
    ? career.locations
    : career.location
      ? [career.location]
      : [];
  const normalizedLocations = new Set(sourceLocations.map(normalizeLocation));

  if ([...normalizedLocations].some((location) => nationalLocationLabels.has(location))) return true;

  const aliases = cityStateMap[requestedLocation] ?? [requestedLocation];
  return aliases.some((alias) => normalizedLocations.has(normalizeLocation(alias)));
}
