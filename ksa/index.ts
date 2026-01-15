/**
 * KSA Index - Knowledge, Skills, and Abilities
 *
 * Central registry and discovery for all KSAs.
 * Use this to understand what capabilities are available.
 *
 * ## Categories
 *
 * - **core**: Always available - fundamental operations every agent needs
 * - **skills**: Research & data gathering - require explicit enablement
 * - **deliverables**: Non-standard output formats (PDF, email) - require explicit enablement
 */

// ============================================================================
// Re-exports for Convenience
// ============================================================================

// Core KSAs (always available)
export * as file from "./file";
export * as context from "./context";
export * as artifacts from "./artifacts";
export * as beads from "./beads";

// Skills KSAs (research & data gathering)
export * as web from "./web";
export * as news from "./news";
export * as social from "./social";
export * as companies from "./companies";
export * as browser from "./browser";

// Deliverables KSAs (non-standard output formats)
export * as pdf from "./pdf";
export * as email from "./email";

// Legacy alias - use 'artifacts' instead
/** @deprecated Use 'artifacts' instead */
export { saveArtifact, readArtifact, listArtifacts } from "./artifacts";

// ============================================================================
// KSA Registry Types
// ============================================================================

export type KSACategory = "core" | "skills" | "deliverables";

export interface KSAInfo {
  name: string;
  description: string;
  category: KSACategory;
  functions: string[];
  importPath: string;
  /** Service paths this KSA calls (for policy enforcement) */
  servicePaths?: string[];
  /** Whether this KSA runs locally (no cloud calls) */
  isLocal?: boolean;
}

// ============================================================================
// KSA Registry - Source of Truth
// ============================================================================

/**
 * Registry of all available KSAs.
 * This is the source of truth for discovery and policy enforcement.
 */
export const KSA_REGISTRY: KSAInfo[] = [
  // =========================================================================
  // CORE KSAs - Always Available
  // =========================================================================
  {
    name: "file",
    description: "Read, write, edit, and search files in the workspace",
    category: "core",
    functions: ["read", "write", "edit", "glob", "grep", "ls"],
    importPath: "./ksa/file",
    isLocal: true,
  },
  {
    name: "context",
    description: "Access card context, variables, and stage information",
    category: "core",
    functions: ["getContext", "setVariable", "getVariable"],
    importPath: "./ksa/context",
    servicePaths: ["features.kanban.executor.getCardContext", "features.kanban.executor.setCardVariable"],
  },
  {
    name: "artifacts",
    description: "Save and retrieve artifacts (markdown, JSON, CSV, text) that persist across stages",
    category: "core",
    functions: ["saveArtifact", "readArtifact", "listArtifacts"],
    importPath: "./ksa/artifacts",
    servicePaths: [
      "features.kanban.artifacts.saveArtifactWithBackup",
      "features.kanban.artifacts.getArtifact",
      "features.kanban.artifacts.listCardArtifacts",
    ],
  },
  {
    name: "beads",
    description: "Track tasks and issues with the Beads distributed issue tracker",
    category: "core",
    functions: ["create", "update", "close", "list", "getReady", "get"],
    importPath: "./ksa/beads",
    isLocal: true,
  },

  // =========================================================================
  // SKILLS KSAs - Research & Data Gathering (Opt-in)
  // =========================================================================
  {
    name: "web",
    description: "Search the web, scrape content from URLs, get news",
    category: "skills",
    functions: ["search", "scrape", "news", "brandNews", "webResearch"],
    importPath: "./ksa/web",
    servicePaths: [
      "services.Valyu.internal.search",
      "services.APITube.internal.search",
    ],
  },
  {
    name: "news",
    description: "Advanced news research - search, monitor brands, analyze sentiment",
    category: "skills",
    functions: [
      "search",
      "trending",
      "breakingNews",
      "monitorBrand",
      "monitorOrganization",
      "analyzeSentiment",
      "compareTopics",
    ],
    importPath: "./ksa/news",
    servicePaths: ["services.APITube.internal.call"],
  },
  {
    name: "social",
    description: "Scrape social media profiles and posts (TikTok, Instagram, Twitter, YouTube, LinkedIn)",
    category: "skills",
    functions: [
      "tiktokProfile",
      "instagramProfile",
      "youtubeProfile",
      "twitterProfile",
      "linkedinProfile",
      "tiktokPosts",
      "instagramPosts",
      "twitterPosts",
      "searchSocial",
    ],
    importPath: "./ksa/social",
    servicePaths: ["services.ScrapeCreators.internal.call"],
  },
  {
    name: "companies",
    description: "Enrich company data by domain - industry, employees, tech stack, funding",
    category: "skills",
    functions: [
      "enrichDomain",
      "enrichCompany",
      "bulkEnrich",
      "searchCompanies",
      "findSimilar",
      "companiesByTech",
      "getTechStack",
    ],
    importPath: "./ksa/companies",
    servicePaths: ["services.TheCompanies.internal.call"],
  },
  {
    name: "browser",
    description: "Automate browser interactions - navigate, click, type, screenshot",
    category: "skills",
    functions: ["open", "screenshot", "click", "type", "getText", "getHtml", "closeBrowser"],
    importPath: "./ksa/browser",
    isLocal: true,
  },

  // =========================================================================
  // DELIVERABLES KSAs - Non-Standard Output Formats (Opt-in)
  // =========================================================================
  {
    name: "pdf",
    description: "Generate PDF documents from markdown content",
    category: "deliverables",
    functions: ["generate"],
    importPath: "./ksa/pdf",
    isLocal: true,
  },
  {
    name: "email",
    description: "Send emails via SendGrid - text, HTML, attachments, templates",
    category: "deliverables",
    functions: ["send", "sendText", "sendHtml", "sendWithAttachment", "sendTemplate", "sendBulk"],
    importPath: "./ksa/email",
    servicePaths: ["services.SendGrid.internal.send"],
  },
];

// ============================================================================
// Core KSAs - Always Available
// ============================================================================

/** Names of core KSAs that are always available */
export const CORE_KSAS = KSA_REGISTRY.filter(k => k.category === "core").map(k => k.name);

/** Get the core KSAs that are always available */
export function getCoreKSAs(): KSAInfo[] {
  return KSA_REGISTRY.filter(k => k.category === "core");
}

// ============================================================================
// Discovery Functions
// ============================================================================

/**
 * Get all available KSAs.
 */
export function getAllKSAs(): KSAInfo[] {
  return KSA_REGISTRY;
}

/**
 * Get KSAs by category.
 */
export function getKSAsByCategory(category: KSACategory): KSAInfo[] {
  return KSA_REGISTRY.filter((k) => k.category === category);
}

/**
 * Find a KSA by name.
 */
export function getKSA(name: string): KSAInfo | undefined {
  return KSA_REGISTRY.find((k) => k.name === name);
}

/**
 * Get multiple KSAs by names.
 */
export function getKSAsByNames(names: string[]): KSAInfo[] {
  return KSA_REGISTRY.filter((k) => names.includes(k.name));
}

/**
 * Search KSAs by keyword in name or description.
 */
export function searchKSAs(keyword: string): KSAInfo[] {
  const lower = keyword.toLowerCase();
  return KSA_REGISTRY.filter(
    (k) =>
      k.name.toLowerCase().includes(lower) ||
      k.description.toLowerCase().includes(lower) ||
      k.functions.some((f) => f.toLowerCase().includes(lower))
  );
}

/**
 * Get all service paths for a list of KSAs.
 * Used for policy enforcement.
 */
export function getServicePathsForKSAs(ksaNames: string[]): string[] {
  const paths = new Set<string>();
  for (const name of ksaNames) {
    const ksa = getKSA(name);
    if (ksa?.servicePaths) {
      ksa.servicePaths.forEach(p => paths.add(p));
    }
  }
  return Array.from(paths);
}

/**
 * Check if a service path is allowed for a set of KSAs.
 */
export function isServicePathAllowed(path: string, allowedKSANames: string[]): boolean {
  // Core KSAs are always allowed
  const allAllowed = [...CORE_KSAS, ...allowedKSANames];
  const allowedPaths = getServicePathsForKSAs(allAllowed);
  return allowedPaths.some(p => path.startsWith(p) || p.startsWith(path));
}

// ============================================================================
// Prompt Generation
// ============================================================================

const CATEGORY_LABELS: Record<KSACategory, string> = {
  core: "Core (Always Available)",
  skills: "Skills (Research & Data)",
  deliverables: "Deliverables (Output Formats)",
};

/**
 * Generate a summary of KSAs for the system prompt.
 * @param allowedKSAs - If provided, only include these KSAs (core always included)
 */
export function generateKSASummary(allowedKSAs?: string[]): string {
  const lines: string[] = ["## Available KSAs (Knowledge, Skills, Abilities)\n"];

  // If allowedKSAs provided, include core + allowed; otherwise include all
  const ksasToInclude = allowedKSAs
    ? KSA_REGISTRY.filter(k => k.category === "core" || allowedKSAs.includes(k.name))
    : KSA_REGISTRY;

  const byCategory = new Map<KSACategory, KSAInfo[]>();
  for (const ksa of ksasToInclude) {
    if (!byCategory.has(ksa.category)) {
      byCategory.set(ksa.category, []);
    }
    byCategory.get(ksa.category)!.push(ksa);
  }

  // Order: core first, then skills, then deliverables
  const categoryOrder: KSACategory[] = ["core", "skills", "deliverables"];

  for (const category of categoryOrder) {
    const ksas = byCategory.get(category);
    if (!ksas || ksas.length === 0) continue;

    lines.push(`### ${CATEGORY_LABELS[category]}\n`);
    for (const ksa of ksas) {
      lines.push(`**${ksa.name}** - ${ksa.description}`);
      lines.push(`\`import { ${ksa.functions.slice(0, 3).join(", ")}${ksa.functions.length > 3 ? ", ..." : ""} } from '${ksa.importPath}';\``);
      lines.push("");
    }
  }

  if (allowedKSAs) {
    const notAllowed = KSA_REGISTRY.filter(k => k.category !== "core" && !allowedKSAs.includes(k.name));
    if (notAllowed.length > 0) {
      lines.push(`\n> **Note:** The following KSAs are NOT available for this task: ${notAllowed.map(k => k.name).join(", ")}`);
    }
  }

  return lines.join("\n");
}

/**
 * Generate import examples for allowed KSAs.
 */
export function generateKSAImportExamples(allowedKSAs?: string[]): string {
  const ksas = allowedKSAs
    ? KSA_REGISTRY.filter(k => k.category === "core" || allowedKSAs.includes(k.name))
    : KSA_REGISTRY;

  return ksas.map(k =>
    `// ${k.description}\nimport { ${k.functions.slice(0, 2).join(", ")} } from '${k.importPath}';`
  ).join("\n\n");
}
