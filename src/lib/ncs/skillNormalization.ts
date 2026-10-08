import type { NcsSkill } from "./types.ts";

const aliases: Readonly<Record<string, string>> = {
  // JavaScript variants
  js: "javascript",
  javascript: "javascript",
  "java script": "javascript",

  // TypeScript variants
  ts: "typescript",
  typescript: "typescript",
  "type script": "typescript",

  // React variants
  react: "react",
  reactjs: "react",
  "react js": "react",

  // Node.js variants
  node: "node js",
  nodejs: "node js",
  "node js": "node js",

  // HTML variants
  html: "html",
  html5: "html",
  "html 5": "html",

  // CSS variants
  css: "css",
  css3: "css",
  "css 3": "css",

  // Python variants
  python: "python",
  python3: "python",
  "python 3": "python",

  // Kubernetes variants
  k8s: "kubernetes",
  kubernetes: "kubernetes",

  // AWS variants
  aws: "aws",
  "amazon web services": "aws",

  // REST API variants
  "rest api": "rest apis",
  "rest apis": "rest apis",
  "restful api": "rest apis",
  "restful apis": "rest apis",
  rest: "rest apis",

  // API variants
  api: "apis",
  apis: "apis",

  // Machine Learning / Deep Learning
  ml: "machine learning",
  "machine learning": "machine learning",
  dl: "deep learning",
  "deep learning": "deep learning",

  // TensorFlow
  tf: "tensorflow",
  tensorflow: "tensorflow",
  "tensor flow": "tensorflow",

  // IoT
  iot: "iot",
  "internet of things": "iot",

  // Cybersecurity
  cybersecurity: "cybersecurity",
  "cyber security": "cybersecurity",
  infosec: "cybersecurity",
  "information security": "cybersecurity",

  // Network Security
  netsec: "network security",
  "network security": "network security",

  // Data Visualization
  dataviz: "data visualization",
  "data viz": "data visualization",
  "data visualization": "data visualization",

  // Database Design
  "db design": "database design",
  "database design": "database design",

  // PLC
  plc: "plc",
  "programmable logic controller": "plc",
  "programmable logic controllers": "plc",

  // SIEM
  siem: "siem",
  "security information and event management": "siem",

  // SOC
  soc: "soc",
  "security operations center": "soc",
  "security operations centre": "soc",

  // SQL
  sql: "sql",
  "structured query language": "sql",

  // Sensors
  sensor: "sensors",
  sensors: "sensors",

  // Statistics
  stats: "statistics",
  statistics: "statistics",

  // Healthcare / Health Informatics
  "healthcare informatics": "health informatics",
  "health informatics": "health informatics",

  // Risk Modeling (Indian/British English spelling)
  "risk modelling": "risk modeling",
  "risk modeling": "risk modeling",
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
