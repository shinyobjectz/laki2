/**
 * Skills derived from KSAs - Auto-generated base
 *
 * This is a BASE that can be customized.
 * For the full SKILLS_META, see packages/primitives/agent/src/metadata.ts
 *
 * Generated at: 2026-01-15T19:02:52.046Z
 */

export interface SkillFromKSA {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  toolIds: string[];
  prompt: string;
}

export const KSA_DERIVED_SKILLS: SkillFromKSA[] = [
  {
    id: "browser",
    name: "Browser",
    description: "Browser Skills Functions for browser automation. Uses the agent-browser CLI for headless browser control.",
    icon: "mdi:web",
    category: "workflow",
    toolIds: ["browser"],
    prompt: "Use open(), screenshot(), click() from ./ksa/browser.",
  },
  {
    id: "social",
    name: "Social",
    description: "Social Media KSA - Knowledge, Skills, and Abilities Scrape and analyze social media profiles and content across platforms. Supports: TikTok, Instagram, YouTube, Twitter/X, LinkedIn, Facebook, Reddit, and more.",
    icon: "mdi:account-multiple",
    category: "workflow",
    toolIds: ["social"],
    prompt: "Use tiktokProfile(), instagramProfile(), youtubeProfile() from ./ksa/social.",
  },
  {
    id: "news",
    name: "News",
    description: "News KSA - Knowledge, Skills, and Abilities Advanced news research and monitoring via APITube. Supports entity tracking, sentiment analysis, brand monitoring.",
    icon: "mdi:newspaper",
    category: "research",
    toolIds: ["news"],
    prompt: "Use search(), trending(), breakingNews() from ./ksa/news.",
  },
  {
    id: "beads",
    name: "Beads",
    description: "Beads KSA - Knowledge, Skills, and Abilities Task planning and tracking for agent workflows. Use beads to break down work into trackable tasks, track progress, and coordinate retries.",
    icon: "mdi:format-list-checks",
    category: "workflow",
    toolIds: ["beads"],
    prompt: "Use create(), update(), close() from ./ksa/beads.",
  },
  {
    id: "pdf",
    name: "Pdf",
    description: "PDF Skills Functions for generating PDF documents from markdown.",
    icon: "mdi:file-pdf-box",
    category: "content",
    toolIds: ["pdf"],
    prompt: "Use generate() from ./ksa/pdf.",
  },
  {
    id: "web",
    name: "Web",
    description: "Web KSA - Knowledge, Skills, and Abilities Functions for web search and content extraction. Import and use these in your code.",
    icon: "mdi:magnify",
    category: "research",
    toolIds: ["web"],
    prompt: "Use search(), scrape(), news() from ./ksa/web.",
  },
  {
    id: "artifacts",
    name: "Artifacts",
    description: "Artifacts KSA - Knowledge, Skills, and Abilities Save and retrieve artifacts that persist across sandbox sessions. Use this to create outputs that will be available after the agent finishes. CATEGORY: core",
    icon: "mdi:package-variant-closed",
    category: "content",
    toolIds: ["artifacts"],
    prompt: "Use setGatewayConfig(), saveArtifact(), readArtifact() from ./ksa/artifacts.",
  },
  {
    id: "file",
    name: "File",
    description: "File Skills Functions for reading, writing, and searching files. These operate on the local filesystem in the sandbox.",
    icon: "mdi:file-document",
    category: "workflow",
    toolIds: ["file"],
    prompt: "Use read(), write(), edit() from ./ksa/file.",
  },
  {
    id: "context",
    name: "Context",
    description: "Context KSA - Knowledge, Skills, and Abilities Manage card context and variables that persist across stages. Use this to read the current context and set variables for later stages.",
    icon: "mdi:cog",
    category: "workflow",
    toolIds: ["context"],
    prompt: "Use setGatewayConfig(), getContext(), getVariable() from ./ksa/context.",
  },
  {
    id: "companies",
    name: "Companies",
    description: "Companies KSA - Knowledge, Skills, and Abilities Enrich and lookup company information including: - Domain/website enrichment - Company search - Industry classification - Employee counts, funding, tech stack",
    icon: "mdi:office-building",
    category: "research",
    toolIds: ["companies"],
    prompt: "Use enrichDomain(), enrichCompany(), bulkEnrich() from ./ksa/companies.",
  },
  {
    id: "email",
    name: "Email",
    description: "Email KSA - Knowledge, Skills, and Abilities Send emails via SendGrid. Supports: - Plain text and HTML emails - Multiple recipients (to, cc, bcc) - Attachments - Templates",
    icon: "mdi:email-send",
    category: "content",
    toolIds: ["email"],
    prompt: "Use send(), sendText(), sendHtml() from ./ksa/email.",
  }
];
