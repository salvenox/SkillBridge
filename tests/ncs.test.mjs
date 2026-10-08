import test from "node:test";
import assert from "node:assert/strict";
import { importNcsRecords } from "../src/lib/ncs/importNormalizer.ts";
import { matchesNcsCareerLocation } from "../src/lib/ncs/locationMatching.ts";
import { normalizeSkillList, normalizeSkillName } from "../src/lib/ncs/skillNormalization.ts";
import { buildLearningRoadmap, compareCareerSkills, enrichNcsCareerSkills } from "../src/lib/ncs/skillGap.ts";

const collectedAt = new Date("2026-10-06T12:00:00.000Z");

function careerFrom(requiredSkills) {
  return importNcsRecords([{
    id: 42,
    jobTitle: "Frontend Developer",
    industry: "IT & Communication",
    organizationName: "Example Org",
    description: "Build web user interfaces.",
    minExperience: 1,
    maxExperience: 4,
    jobLocations: [{ state: "Karnataka" }],
    createdAt: "2026-10-01T00:00:00.000Z",
    requiredSkills,
  }], collectedAt).catalog.careers[0];
}

test("normalizes conservative JavaScript aliases and casing", () => {
  assert.equal(normalizeSkillName(" JS "), "javascript");
  assert.equal(normalizeSkillName("JavaScript"), "javascript");
  assert.equal(normalizeSkillName("TypeScript"), "typescript");
});

test("deduplicates skill aliases while preserving the first display spelling", () => {
  const skills = normalizeSkillList(["JavaScript", "JS", " CSS ", "CSS"]);
  assert.deepEqual(skills.map((skill) => skill.name), ["JavaScript", "CSS"]);
});

test("normalizes actual NCS-shaped fields and preserves source traceability", () => {
  const career = careerFrom(["HTML", "CSS", "JavaScript", "JS", "React"]);
  assert.equal(career.id, "42");
  assert.equal(career.title, "Frontend Developer");
  assert.equal(career.sector, "IT & Communication");
  assert.equal(career.company, "Example Org");
  assert.equal(career.location, "Karnataka");
  assert.deepEqual(career.locations, ["Karnataka"]);
  assert.deepEqual(career.experience, { minimumYears: 1, maximumYears: 4 });
  assert.equal(career.source, "NCS");
  assert.equal(career.sourceUrl, "https://www.ncs.gov.in/job-listing/applying/42");
  assert.equal(career.collectedAt, collectedAt.toISOString());
  assert.deepEqual(career.requiredSkills.map((skill) => skill.name), ["HTML", "CSS", "JavaScript", "React"]);
});

test("preserves every distinct source state and city for a multi-location career", () => {
  const career = importNcsRecords([{
    id: "multi-location",
    jobTitle: "Field Engineer",
    jobLocations: [
      { state: "Karnataka", city: "Bengaluru" },
      { state: "Tamil Nadu", city: "Chennai" },
      { state: "Karnataka", city: "Bengaluru" },
    ],
  }], collectedAt).catalog.careers[0];

  assert.equal(career.location, "Karnataka");
  assert.deepEqual(career.locations, ["Karnataka", "Bengaluru", "Tamil Nadu", "Chennai"]);
});

test("matches a career against its secondary source location", () => {
  const career = importNcsRecords([{
    id: "secondary-location",
    jobTitle: "Field Engineer",
    jobLocations: [{ state: "Karnataka" }, { state: "Tamil Nadu", city: "Chennai" }],
  }], collectedAt).catalog.careers[0];

  assert.equal(matchesNcsCareerLocation(career, "Chennai"), true);
  assert.equal(matchesNcsCareerLocation(career, "ChennaiX"), false);
});

test("does not match a career without source locations to a selected market", () => {
  const career = importNcsRecords([{
    id: "no-location",
    jobTitle: "Remote Engineer",
  }], collectedAt).catalog.careers[0];

  assert.equal(career.location, undefined);
  assert.equal(career.locations, undefined);
  assert.equal(matchesNcsCareerLocation(career, "Bengaluru"), false);
  assert.equal(matchesNcsCareerLocation(career, ""), true);
});

test("matches an explicitly source-listed national location across supported markets", () => {
  const career = importNcsRecords([{
    id: "national-location",
    jobTitle: "National Support Engineer",
    jobLocations: [{ state: "Pan India" }],
  }], collectedAt).catalog.careers[0];

  assert.deepEqual(career.locations, ["Pan India"]);
  assert.equal(matchesNcsCareerLocation(career, "Bengaluru"), true);
  assert.equal(matchesNcsCareerLocation(career, "Chennai"), true);
  assert.equal(matchesNcsCareerLocation(career, "Mumbai"), true);
});

test("matches legacy catalog records through their singular location field", () => {
  const importedCareer = careerFrom([]);
  const legacyCareer = { ...importedCareer, locations: undefined };

  assert.equal(matchesNcsCareerLocation(legacyCareer, "Bengaluru"), true);
  assert.equal(matchesNcsCareerLocation(legacyCareer, "Chennai"), false);
});

test("matches normalized user skills and returns missing required skills", () => {
  const career = careerFrom(["HTML", "CSS", "JavaScript", "React", "TypeScript"]);
  const result = compareCareerSkills(career, ["HTML", "CSS", "JS", "Git"]);
  assert.deepEqual(result.matched.map((match) => match.careerSkill.name), ["HTML", "CSS", "JavaScript"]);
  assert.deepEqual(result.missing.map((skill) => skill.name), ["React", "TypeScript"]);
  assert.deepEqual(result.optional, []);
});

test("creates a deterministic roadmap from missing NCS requirements", () => {
  const career = careerFrom(["HTML", "React", "TypeScript"]);
  const missing = compareCareerSkills(career, ["HTML"]).missing;
  const roadmap = buildLearningRoadmap(career, missing);
  assert.deepEqual(roadmap.map((step) => [step.order, step.skill.name]), [[1, "React"], [2, "TypeScript"]]);
  assert.match(roadmap[0].reason, /Frontend Developer/);
});

test("O*NET enriches matching NCS skill importance without adding requirements", () => {
  const career = careerFrom(["JavaScript", "React"]);
  const enriched = enrichNcsCareerSkills(career, {
    code: "15-1252.00",
    title: "Software Developers",
    skills: [{ id: "2.A.1.a", name: "JavaScript", importance: 73 }],
  });
  assert.equal(enriched.requiredSkills.length, 2);
  assert.equal(enriched.requiredSkills[0].onetImportance, 73);
  assert.equal(enriched.requiredSkills[1].onetImportance, undefined);
});

test("deduplicates records and rejects malformed records in an import", () => {
  const report = importNcsRecords([
    { id: "job-1", jobTitle: "Support Engineer", requiredSkills: ["Troubleshooting"] },
    { id: "job-1", jobTitle: "Duplicate", requiredSkills: [] },
    { id: "missing-title", requiredSkills: ["HTML"] },
  ], collectedAt);
  assert.equal(report.importedCount, 1);
  assert.equal(report.duplicateCount, 1);
  assert.equal(report.rejectedCount, 1);
  assert.equal(report.catalog.careers.length, 1);
});

test("handles empty NCS catalog and empty skill comparison", () => {
  const empty = importNcsRecords([], collectedAt);
  assert.equal(empty.catalog.updatedAt, null);
  assert.deepEqual(empty.catalog.careers, []);
  const career = careerFrom([]);
  assert.deepEqual(compareCareerSkills(career, []), { matched: [], missing: [], optional: [] });
});

test("rejects unsupported import envelope", () => {
  assert.throws(() => importNcsRecords({ records: [] }), /jobs array/);
});
