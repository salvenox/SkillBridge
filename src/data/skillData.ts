export const sectors = [
  "All sectors",
  "Technology",
  "FinTech",
  "Healthcare",
  "Manufacturing",
] as const;

export type Sector = Exclude<(typeof sectors)[number], "All sectors">;

export type SkillDefinition = {
  id: string;
  name: string;
  category: string;
  demand: number;
  talent: number;
  growth: number;
  description: string;
  sectors: readonly Sector[];
  competencies: readonly string[];
};

export const skillDefinitions = [
  {
    id: "artificial-intelligence",
    name: "Artificial Intelligence",
    category: "Emerging technology",
    demand: 87,
    talent: 61,
    growth: 38,
    description:
      "Strong demand across AI engineering, automation, generative AI and intelligent systems.",
    sectors: ["Technology", "FinTech", "Healthcare", "Manufacturing"],
    competencies: ["Python", "Machine Learning", "Deep Learning", "Model Deployment"],
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity",
    category: "Security",
    demand: 82,
    talent: 58,
    growth: 31,
    description:
      "Growing requirement for security analysts, SOC engineers, cloud security and threat detection.",
    sectors: ["Technology", "FinTech", "Healthcare"],
    competencies: ["Network Security", "SOC", "SIEM", "Threat Detection"],
  },
  {
    id: "cloud-computing",
    name: "Cloud Computing",
    category: "Infrastructure",
    demand: 80,
    talent: 64,
    growth: 27,
    description:
      "Cloud infrastructure, DevOps and scalable systems remain relevant across industries.",
    sectors: ["Technology", "FinTech", "Healthcare", "Manufacturing"],
    competencies: ["AWS", "Docker", "Kubernetes", "Cloud Architecture"],
  },
  {
    id: "data-science",
    name: "Data Science",
    category: "Data",
    demand: 78,
    talent: 59,
    growth: 24,
    description:
      "Data analysis, machine learning and decision intelligence are increasingly important.",
    sectors: ["Technology", "FinTech", "Healthcare", "Manufacturing"],
    competencies: ["Python", "SQL", "Analytics", "Machine Learning"],
  },
  {
    id: "full-stack-development",
    name: "Full Stack Development",
    category: "Software",
    demand: 76,
    talent: 72,
    growth: 19,
    description:
      "Full-stack engineers remain important for building scalable digital products.",
    sectors: ["Technology", "FinTech", "Healthcare"],
    competencies: ["JavaScript", "React", "APIs", "Database Design"],
  },
  {
    id: "iot-automation",
    name: "IoT & Automation",
    category: "Emerging technology",
    demand: 70,
    talent: 49,
    growth: 29,
    description:
      "Industrial automation and connected systems are creating new technical requirements.",
    sectors: ["Manufacturing", "Healthcare"],
    competencies: ["IoT", "PLC", "Industrial Automation", "Sensors"],
  },
] as const satisfies readonly SkillDefinition[];

export type SkillId = (typeof skillDefinitions)[number]["id"];

export type SkillAdjustment = {
  demand?: number;
  talent?: number;
  growth?: number;
};

export type MarketProfile = {
  id: string;
  name: string;
  region: string;
  adjustments: Partial<Record<SkillId, SkillAdjustment>>;
};

export const marketProfiles = [
  {
    id: "bengaluru",
    name: "Bengaluru",
    region: "South",
    adjustments: {
      "artificial-intelligence": { demand: 7, growth: 3 },
      cybersecurity: { demand: 5, growth: 2 },
      "cloud-computing": { demand: 6 },
      "data-science": { demand: 4 },
      "full-stack-development": { demand: 4 },
    },
  },
  {
    id: "delhi-ncr",
    name: "Delhi NCR",
    region: "North",
    adjustments: {
      "artificial-intelligence": { demand: 2 },
      cybersecurity: { demand: 7, growth: 2 },
      "cloud-computing": { demand: 1 },
      "data-science": { demand: 6, growth: 2 },
      "full-stack-development": { demand: 5 },
      "iot-automation": { demand: 1 },
    },
  },
  {
    id: "mumbai",
    name: "Mumbai",
    region: "West",
    adjustments: {
      "artificial-intelligence": { demand: 3 },
      cybersecurity: { demand: 5 },
      "cloud-computing": { demand: 3 },
      "data-science": { demand: 8, growth: 2 },
      "full-stack-development": { demand: 3 },
    },
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    region: "South",
    adjustments: {
      "artificial-intelligence": { demand: 6, growth: 2 },
      cybersecurity: { demand: 2 },
      "cloud-computing": { demand: 7, growth: 2 },
      "data-science": { demand: 4 },
      "full-stack-development": { demand: 2 },
    },
  },
  {
    id: "pune",
    name: "Pune",
    region: "West",
    adjustments: {
      "artificial-intelligence": { demand: 2 },
      cybersecurity: { demand: 2 },
      "cloud-computing": { demand: 3 },
      "data-science": { demand: 2 },
      "full-stack-development": { demand: 3 },
      "iot-automation": { demand: 10, talent: -2, growth: 4 },
    },
  },
  {
    id: "chennai",
    name: "Chennai",
    region: "South",
    adjustments: {
      "artificial-intelligence": { demand: 2 },
      cybersecurity: { demand: 2 },
      "cloud-computing": { demand: 5 },
      "data-science": { demand: 2 },
      "full-stack-development": { demand: 2 },
      "iot-automation": { demand: 8, talent: -1, growth: 3 },
    },
  },
] as const satisfies readonly MarketProfile[];

export type MarketId = (typeof marketProfiles)[number]["id"];

export type SectorProfile = {
  sector: Sector;
  adjustments: Partial<Record<SkillId, SkillAdjustment>>;
};

export const sectorProfiles = [
  {
    sector: "Technology",
    adjustments: {
      "artificial-intelligence": { demand: 4, growth: 2 },
      cybersecurity: { demand: 3 },
      "cloud-computing": { demand: 4 },
      "data-science": { demand: 3 },
      "full-stack-development": { demand: 4, growth: 1 },
    },
  },
  {
    sector: "FinTech",
    adjustments: {
      "artificial-intelligence": { demand: 3, growth: 2 },
      cybersecurity: { demand: 7, growth: 2 },
      "cloud-computing": { demand: 3 },
      "data-science": { demand: 8, growth: 3 },
      "full-stack-development": { demand: 3 },
    },
  },
  {
    sector: "Healthcare",
    adjustments: {
      "artificial-intelligence": { demand: 4, growth: 2 },
      cybersecurity: { demand: 3 },
      "cloud-computing": { demand: 2 },
      "data-science": { demand: 4, growth: 1 },
      "iot-automation": { demand: 3, talent: 1, growth: 1 },
    },
  },
  {
    sector: "Manufacturing",
    adjustments: {
      "artificial-intelligence": { demand: 2 },
      "cloud-computing": { demand: 2 },
      "data-science": { demand: 2 },
      "iot-automation": { demand: 10, talent: -1, growth: 4 },
    },
  },
] as const satisfies readonly SectorProfile[];

export type ProgramDefinition = {
  id: string;
  title: string;
  provider: string;
  competencies: readonly string[];
  duration: string;
  level: string;
  category: string;
  skillIds: readonly SkillId[];
  sectors: readonly Sector[];
  demonstrationScore: number;
};

export const programDefinitions = [
  {
    id: "ai-machine-learning",
    title: "AI & Machine Learning",
    provider: "Industry Aligned Program",
    competencies: ["Python", "Machine Learning", "Deep Learning"],
    duration: "16 weeks",
    level: "Advanced",
    category: "Emerging technology",
    skillIds: ["artificial-intelligence", "data-science"],
    sectors: ["Technology", "FinTech", "Healthcare", "Manufacturing"],
    demonstrationScore: 96,
  },
  {
    id: "cybersecurity-foundations",
    title: "Cybersecurity Foundations",
    provider: "Industry Aligned Program",
    competencies: ["Network Security", "SOC", "SIEM"],
    duration: "12 weeks",
    level: "Intermediate",
    category: "Security",
    skillIds: ["cybersecurity"],
    sectors: ["Technology", "FinTech", "Healthcare"],
    demonstrationScore: 94,
  },
  {
    id: "cloud-engineering",
    title: "Cloud Engineering",
    provider: "Industry Aligned Program",
    competencies: ["AWS", "Docker", "Kubernetes"],
    duration: "14 weeks",
    level: "Intermediate",
    category: "Infrastructure",
    skillIds: ["cloud-computing"],
    sectors: ["Technology", "FinTech", "Healthcare", "Manufacturing"],
    demonstrationScore: 91,
  },
  {
    id: "data-intelligence",
    title: "Data Intelligence",
    provider: "Industry Aligned Program",
    competencies: ["Python", "SQL", "Analytics"],
    duration: "10 weeks",
    level: "Intermediate",
    category: "Data",
    skillIds: ["data-science", "artificial-intelligence"],
    sectors: ["Technology", "FinTech", "Healthcare", "Manufacturing"],
    demonstrationScore: 89,
  },
] as const satisfies readonly ProgramDefinition[];
