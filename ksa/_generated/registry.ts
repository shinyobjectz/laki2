/**
 * KSA Registry - Auto-generated
 *
 * DO NOT EDIT MANUALLY - run `bun packages/lakitu/scripts/index-ksas.ts --generate-registry`
 *
 * Generated at: 2026-01-15T19:02:52.045Z
 */

export interface KSAInfo {
  name: string;
  description: string;
  category: "system" | "research" | "data" | "create" | "ai";
  functions: string[];
  importPath: string;
  /** Convex service paths this KSA calls via gateway */
  servicePaths: string[];
  /** Whether this KSA is local-only (no gateway calls) */
  isLocal: boolean;
}

export const KSA_REGISTRY: KSAInfo[] = [
  {
    name: "browser",
    description: "Browser Skills Functions for browser automation. Uses the agent-browser CLI for headless browser control.",
    category: "system",
    functions: ["open", "screenshot", "click", "type", "getHtml", "getText", "closeBrowser"],
    importPath: "./ksa/browser",
    servicePaths: [],
    isLocal: true,
  },
  {
    name: "social",
    description: "Social Media KSA - Knowledge, Skills, and Abilities Scrape and analyze social media profiles and content across platforms. Supports: TikTok, Instagram, YouTube, Twitter/X, LinkedIn, Facebook, Reddit, and more.",
    category: "system",
    functions: ["tiktokProfile", "instagramProfile", "youtubeProfile", "twitterProfile", "linkedinProfile", "tiktokPosts", "instagramPosts", "twitterPosts", "searchSocial"],
    importPath: "./ksa/social",
    servicePaths: ["services.ScrapeCreators.internal.call"],
    isLocal: false,
  },
  {
    name: "news",
    description: "News KSA - Knowledge, Skills, and Abilities Advanced news research and monitoring via APITube. Supports entity tracking, sentiment analysis, brand monitoring.",
    category: "research",
    functions: ["search", "trending", "breakingNews", "monitorBrand", "monitorOrganization", "analyzeSentiment", "compareTopics"],
    importPath: "./ksa/news",
    servicePaths: ["services.APITube.internal.call"],
    isLocal: false,
  },
  {
    name: "beads",
    description: "Beads KSA - Knowledge, Skills, and Abilities Task planning and tracking for agent workflows. Use beads to break down work into trackable tasks, track progress, and coordinate retries.",
    category: "system",
    functions: ["create", "update", "close", "list", "getReady", "get"],
    importPath: "./ksa/beads",
    servicePaths: ["planning.beads.create", "planning.beads.update", "planning.beads.close", "planning.beads.list", "planning.beads.getReady", "planning.beads.get"],
    isLocal: false,
  },
  {
    name: "pdf",
    description: "PDF Skills Functions for generating PDF documents from markdown.",
    category: "create",
    functions: ["generate"],
    importPath: "./ksa/pdf",
    servicePaths: [],
    isLocal: true,
  },
  {
    name: "web",
    description: "Web KSA - Knowledge, Skills, and Abilities Functions for web search and content extraction. Import and use these in your code.",
    category: "research",
    functions: ["search", "scrape", "news", "brandNews", "webResearch"],
    importPath: "./ksa/web",
    servicePaths: ["services.Valyu.internal.search", "services.Valyu.internal.contents", "services.APITube.internal.call"],
    isLocal: false,
  },
  {
    name: "artifacts",
    description: "Artifacts KSA - Knowledge, Skills, and Abilities Save and retrieve artifacts that persist across sandbox sessions. Use this to create outputs that will be available after the agent finishes. CATEGORY: core",
    category: "create",
    functions: ["setGatewayConfig", "saveArtifact", "readArtifact", "listArtifacts"],
    importPath: "./ksa/artifacts",
    servicePaths: ["features.kanban.artifacts.saveArtifactWithBackup", "features.kanban.artifacts.getArtifact", "features.kanban.artifacts.listCardArtifacts"],
    isLocal: false,
  },
  {
    name: "file",
    description: "File Skills Functions for reading, writing, and searching files. These operate on the local filesystem in the sandbox.",
    category: "system",
    functions: ["read", "write", "edit", "glob", "grep", "ls"],
    importPath: "./ksa/file",
    servicePaths: [],
    isLocal: true,
  },
  {
    name: "context",
    description: "Context KSA - Knowledge, Skills, and Abilities Manage card context and variables that persist across stages. Use this to read the current context and set variables for later stages.",
    category: "system",
    functions: ["setGatewayConfig", "getContext", "getVariable", "setVariable"],
    importPath: "./ksa/context",
    servicePaths: ["features.kanban.executor.getCardContext", "features.kanban.executor.setVariable"],
    isLocal: false,
  },
  {
    name: "companies",
    description: "Companies KSA - Knowledge, Skills, and Abilities Enrich and lookup company information including: - Domain/website enrichment - Company search - Industry classification - Employee counts, funding, tech stack",
    category: "research",
    functions: ["enrichDomain", "enrichCompany", "bulkEnrich", "searchCompanies", "findSimilar", "companiesByTech", "getTechStack"],
    importPath: "./ksa/companies",
    servicePaths: ["services.TheCompanies.internal.call"],
    isLocal: false,
  },
  {
    name: "email",
    description: "Email KSA - Knowledge, Skills, and Abilities Send emails via SendGrid. Supports: - Plain text and HTML emails - Multiple recipients (to, cc, bcc) - Attachments - Templates",
    category: "create",
    functions: ["send", "sendText", "sendHtml", "sendWithAttachment", "sendTemplate", "sendBulk"],
    importPath: "./ksa/email",
    servicePaths: ["services.SendGrid.internal.send"],
    isLocal: false,
  }
];

// Discovery functions
export const getAllKSAs = () => KSA_REGISTRY;
export const getKSAsByCategory = (category: KSAInfo["category"]) =>
  KSA_REGISTRY.filter((k) => k.category === category);
export const getKSA = (name: string) =>
  KSA_REGISTRY.find((k) => k.name === name);
export const searchKSAs = (keyword: string) => {
  const lower = keyword.toLowerCase();
  return KSA_REGISTRY.filter(
    (k) =>
      k.name.toLowerCase().includes(lower) ||
      k.description.toLowerCase().includes(lower) ||
      k.functions.some((f) => f.toLowerCase().includes(lower))
  );
};

// ============================================================================
// Policy Functions
// ============================================================================

/**
 * Get allowed service paths for a set of KSA names.
 * Used by gateway to enforce access control.
 *
 * @param ksaNames - Array of KSA names (e.g., ["web", "pdf", "artifacts"])
 * @returns Array of allowed service paths
 */
export function getServicePathsForKSAs(ksaNames: string[]): string[] {
  const paths = new Set<string>();
  for (const name of ksaNames) {
    const ksa = getKSA(name);
    if (ksa) {
      for (const path of ksa.servicePaths) {
        paths.add(path);
      }
    }
  }
  return Array.from(paths);
}

/**
 * Check if a service path is allowed for the given KSAs.
 */
export function isServicePathAllowed(path: string, allowedKSAs: string[]): boolean {
  const allowedPaths = getServicePathsForKSAs(allowedKSAs);
  return allowedPaths.includes(path);
}
