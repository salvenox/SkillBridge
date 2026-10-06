import type { NcsSkill } from "./types.ts";

const aliases: Readonly<Record<string, string>> = {
  js: "javascript",
  javascript: "javascript",
  "java script": "javascript",
};

export function normalizeSkillName(value: string): string {
  const normalized = value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/[^\p{L}\p{N}+\s]/gu, " ")
    .replace(/\s+/g, " ");

  return aliases[normalized] ?? normalized;
}

export function normalizeSkillList(names: readonly string[]): NcsSkill[] {
  const seen = new Set<string>();
  const skills: NcsSkill[] = [];

  for (const originalName of names) {
    const name = originalName.trim();
    const normalizedName = normalizeSkillName(name);
    if (!normalizedName || seen.has(normalizedName)) continue;
    seen.add(normalizedName);
    skills.push({
      id: `ncs-skill:${normalizedName.replace(/\s+/g, "-")}`,
      name,
      normalizedName,
    });
  }

  return skills;
}
