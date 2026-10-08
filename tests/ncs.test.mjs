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

test("preserves location and matches for a one-location career", () => {
  const career = importNcsRecords([{
    id: "single-location",
    jobTitle: "DevOps Engineer",
    jobLocations: [{ state: "Telangana", city: "Hyderabad" }],
  }], collectedAt).catalog.careers[0];

  assert.equal(career.location, "Telangana");
  assert.deepEqual(career.locations, ["Telangana", "Hyderabad"]);
  assert.equal(matchesNcsCareerLocation(career, "Hyderabad"), true);
  assert.equal(matchesNcsCareerLocation(career, "Bengaluru"), false);
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

test("creates an empty roadmap when there are zero missing skills", () => {
  const career = careerFrom(["HTML", "CSS"]);
  const missing = compareCareerSkills(career, ["HTML", "CSS"]).missing;
  const roadmap = buildLearningRoadmap(career, missing);
  assert.deepEqual(roadmap, []);
});

test("creates an explainable roadmap step for one missing skill", () => {
  const career = careerFrom(["HTML", "React"]);
  const missing = compareCareerSkills(career, ["HTML"]).missing;
  const roadmap = buildLearningRoadmap(career, missing);
  assert.equal(roadmap.length, 1);
  assert.equal(roadmap[0].order, 1);
  assert.equal(roadmap[0].skill.name, "React");
  assert.match(roadmap[0].missingReason, /Frontend Developer/);
  assert.match(roadmap[0].positionReason, /Applied framework/);
});

test("deterministically sequences multiple missing skills by foundation tiers while preserving source order", () => {
  const career = careerFrom(["Kubernetes", "HTML", "React", "Linux", "Cloud Architecture"]);
  const missing = compareCareerSkills(career, []).missing;
  const roadmap = buildLearningRoadmap(career, missing);

  // Tier 1 (HTML, Linux) -> Tier 2 (React) -> Tier 3 (Kubernetes, Cloud Architecture)
  assert.deepEqual(
    roadmap.map((step) => [step.order, step.skill.name]),
    [
      [1, "HTML"],
      [2, "Linux"],
      [3, "React"],
      [4, "Kubernetes"],
      [5, "Cloud Architecture"],
    ]
  );
  assert.match(roadmap[0].positionReason, /Foundational competency/);
  assert.match(roadmap[2].positionReason, /Applied framework/);
  assert.match(roadmap[3].positionReason, /Advanced specialization/);
});

test("prioritizes skills with O*NET importance within the same competency tier", () => {
  const career = careerFrom(["React", "TypeScript", "Docker"]);
  const enriched = enrichNcsCareerSkills(career, {
    code: "15-1252.00",
    title: "Software Developers",
    skills: [
      { id: "1", name: "TypeScript", importance: 88 },
      { id: "2", name: "React", importance: 75 },
    ],
  });

  const missing = compareCareerSkills(enriched, []).missing;
  const roadmap = buildLearningRoadmap(enriched, missing);

  // TypeScript (88) -> React (75) -> Docker (undefined)
  assert.deepEqual(
    roadmap.map((step) => [step.order, step.skill.name, step.skill.onetImportance]),
    [
      [1, "TypeScript", 88],
      [2, "React", 75],
      [3, "Docker", undefined],
    ]
  );
  assert.match(roadmap[0].positionReason, /Prioritized by O\*NET occupation importance score \(88\)/);
});

test("sequences missing skills reliably when O*NET is unavailable", () => {
  const career = careerFrom(["Deep Learning", "Python", "Machine Learning"]);
  // No O*NET enrichment passed (O*NET unavailable)
  const missing = compareCareerSkills(career, []).missing;
  const roadmap = buildLearningRoadmap(career, missing);

  // Tier 1 (Python) -> Tier 2 (Machine Learning) -> Tier 3 (Deep Learning)
  assert.deepEqual(
    roadmap.map((step) => [step.order, step.skill.name, step.skill.onetImportance]),
    [
      [1, "Python", undefined],
      [2, "Machine Learning", undefined],
      [3, "Deep Learning", undefined],
    ]
  );
  assert.equal(roadmap.every((step) => step.skill.onetImportance === undefined), true);
});

test("valid O*NET enrichment attaches importance to matching NCS required skills", () => {
  const career = careerFrom(["JavaScript", "React"]);
  const enriched = enrichNcsCareerSkills(career, {
    code: "15-1252.00",
    title: "Software Developers",
    skills: [
      { id: "2.A.1.a", name: "JavaScript", importance: 73 },
      { id: "2.A.1.b", name: "React", importance: 80 },
    ],
  });
  assert.equal(enriched.requiredSkills.length, 2);
  assert.equal(enriched.requiredSkills[0].onetImportance, 73);
  assert.equal(enriched.requiredSkills[1].onetImportance, 80);
});

test("handles missing O*NET credentials or unavailable service without altering career", () => {
  const career = careerFrom(["Python", "SQL"]);
  const enriched = enrichNcsCareerSkills(career, null);
  assert.deepEqual(enriched, career);
  assert.deepEqual(enriched.requiredSkills.map((s) => s.name), ["Python", "SQL"]);
});

test("handles no matching O*NET occupation gracefully", () => {
  const career = careerFrom(["Embedded C", "IoT"]);
  const enriched = enrichNcsCareerSkills(career, null);
  assert.equal(enriched.requiredSkills.length, 2);
  assert.equal(enriched.requiredSkills[0].onetImportance, undefined);
  assert.equal(enriched.requiredSkills[1].onetImportance, undefined);
});

test("O*NET occupation with unrelated skills does not add requirements or attach false importance", () => {
  const career = careerFrom(["HTML", "CSS"]);
  const enriched = enrichNcsCareerSkills(career, {
    code: "29-1141.00",
    title: "Registered Nurses",
    skills: [
      { id: "1", name: "Active Listening", importance: 75 },
      { id: "2", name: "Patient Care", importance: 90 },
    ],
  });
  assert.equal(enriched.requiredSkills.length, 2);
  assert.deepEqual(enriched.requiredSkills.map((s) => s.name), ["HTML", "CSS"]);
  assert.equal(enriched.requiredSkills[0].onetImportance, undefined);
  assert.equal(enriched.requiredSkills[1].onetImportance, undefined);
});

test("NCS requirements remain unchanged regardless of O*NET enrichment results", () => {
  const career = careerFrom(["Java", "Spring Boot", "Docker"]);
  const initialSkillNames = career.requiredSkills.map((s) => s.name);

  const enriched = enrichNcsCareerSkills(career, {
    code: "15-1252.00",
    title: "Software Developers",
    skills: [
      { id: "1", name: "Java", importance: 85 },
      { id: "2", name: "C++", importance: 70 },
      { id: "3", name: "Kubernetes", importance: 65 },
    ],
  });

  // Requirements must be identical in count and names
  assert.deepEqual(enriched.requiredSkills.map((s) => s.name), initialSkillNames);
  assert.equal(enriched.id, career.id);
  assert.equal(enriched.title, career.title);
  assert.equal(enriched.requiredSkills[0].onetImportance, 85);
  assert.equal(enriched.requiredSkills[1].onetImportance, undefined);
  assert.equal(enriched.requiredSkills[2].onetImportance, undefined);
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

test("imports string skill list in array or delimited string format", () => {
  const fromArray = careerFrom(["HTML", "CSS", "JavaScript"]);
  assert.deepEqual(fromArray.requiredSkills.map((s) => s.name), ["HTML", "CSS", "JavaScript"]);

  const fromString = careerFrom("HTML, CSS, JavaScript");
  assert.deepEqual(fromString.requiredSkills.map((s) => s.name), ["HTML", "CSS", "JavaScript"]);
});

test("imports structured skill list when skills appear as objects with name/skillName/skill", () => {
  const career = careerFrom([
    { skillName: "Python" },
    { name: "SQL" },
    { skill: "Docker" },
    { skill_name: "Kubernetes" },
  ]);
  assert.deepEqual(career.requiredSkills.map((s) => s.name), ["Python", "SQL", "Docker", "Kubernetes"]);
  assert.deepEqual(career.requiredSkills.map((s) => s.normalizedName), ["python", "sql", "docker", "kubernetes"]);
});

test("deduplicates identical and aliased skill entries in raw import", () => {
  const career = careerFrom([
    "JavaScript",
    "JS",
    "JavaScript",
    { name: "JS" },
    "HTML",
    "HTML",
  ]);
  assert.deepEqual(career.requiredSkills.map((s) => s.name), ["JavaScript", "HTML"]);
});

test("handles empty skills gracefully across representations", () => {
  const fromEmptyArray = careerFrom([]);
  assert.deepEqual(fromEmptyArray.requiredSkills, []);

  const fromEmptyString = careerFrom("");
  assert.deepEqual(fromEmptyString.requiredSkills, []);

  const fromUndefined = careerFrom(undefined);
  assert.deepEqual(fromUndefined.requiredSkills, []);
});

test("rejects records with malformed skill entries and reports them", () => {
  const report = importNcsRecords([
    { id: "invalid-skill-number", jobTitle: "Engineer", requiredSkills: ["HTML", 42] },
    { id: "invalid-skill-empty-obj", jobTitle: "Engineer", requiredSkills: [{ invalidProp: true }] },
    { id: "invalid-skill-empty-str", jobTitle: "Engineer", requiredSkills: ["HTML", "   "] },
    { id: "invalid-skill-root-type", jobTitle: "Engineer", requiredSkills: true },
  ], collectedAt);

  assert.equal(report.importedCount, 0);
  assert.equal(report.rejectedCount, 4);
  assert.equal(report.errors.length, 4);
  assert.match(report.errors[0], /Unsupported skill entry type/);
  assert.match(report.errors[1], /Structured skill entry missing recognizable name property/);
  assert.match(report.errors[2], /Skill entry is an empty string/);
  assert.match(report.errors[3], /Invalid requiredSkills format/);
});

test("matches valid conservative skill aliases and spelling variants", () => {
  const career = careerFrom([
    "JavaScript",
    "React",
    "Node.js",
    "Kubernetes",
    "Machine Learning",
    "Deep Learning",
    "TensorFlow",
    "IoT",
    "Cybersecurity",
    "Network Security",
    "Database Design",
    "Statistics",
    "Python",
    "HTML",
    "CSS",
    "REST APIs",
    "AWS",
    "Risk Modeling",
    "SOC",
  ]);

  const userSkills = [
    "JS",
    "ReactJS",
    "NodeJS",
    "k8s",
    "ML",
    "DL",
    "TF",
    "Internet of Things",
    "Infosec",
    "NetSec",
    "DB Design",
    "Stats",
    "Python 3",
    "HTML5",
    "CSS3",
    "REST API",
    "Amazon Web Services",
    "Risk Modelling",
    "Security Operations Centre",
  ];

  const result = compareCareerSkills(career, userSkills);
  assert.equal(result.matched.length, career.requiredSkills.length);
  assert.equal(result.missing.length, 0);
});

test("matches skills across arbitrary casing differences", () => {
  const career = careerFrom(["JavaScript", "React", "Python", "SQL"]);
  const userSkills = ["jAvAsCrIpT", "REACT", "python", "Sql"];
  const result = compareCareerSkills(career, userSkills);
  assert.deepEqual(result.matched.map((m) => m.careerSkill.name), ["JavaScript", "React", "Python", "SQL"]);
  assert.equal(result.missing.length, 0);
});

test("matches skills across punctuation and separator differences", () => {
  const career = careerFrom(["Node.js", "CI/CD", "REST APIs"]);
  const userSkills = ["node-js", "ci cd", "rest-api"];
  const result = compareCareerSkills(career, userSkills);
  assert.deepEqual(result.matched.map((m) => m.careerSkill.name), ["Node.js", "CI/CD", "REST APIs"]);
  assert.equal(result.missing.length, 0);
});

test("strictly prevents unrelated skills from matching", () => {
  const career = careerFrom([
    "JavaScript",
    "Embedded C",
    "React",
    "Cloud Architecture",
    "Data Visualization",
  ]);

  const userSkills = [
    "Java",
    "C",
    "React Native",
    "Cloud Computing",
    "Data Science",
  ];

  const result = compareCareerSkills(career, userSkills);
  assert.deepEqual(result.matched, []);
  assert.equal(result.missing.length, 5);
});

test("strictly prevents partial and ambiguous terms from incorrectly matching", () => {
  const career = careerFrom([
    "JavaScript",
    "TypeScript",
    "Cybersecurity",
    "Network Security",
    "Machine Learning",
    "PLC",
  ]);

  const ambiguousUserSkills = [
    "Script",
    "Security",
    "Net",
    "Learning",
    "Logic",
  ];

  const result = compareCareerSkills(career, ambiguousUserSkills);
  assert.deepEqual(result.matched, []);
  assert.equal(result.missing.length, 6);
});

test("rejects unsupported import envelope", () => {
  assert.throws(() => importNcsRecords({ records: [] }), /jobs array/);
});
