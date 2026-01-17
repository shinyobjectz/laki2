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
 *
 * The KSA_REGISTRY is auto-generated from KSA source files.
 * Run `bun generate:ksa` to regenerate.
 */

// ============================================================================
// Re-exports for Agent Code Execution
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
export * as ads from "./ads";
export * as companies from "./companies";
export * as browser from "./browser";

// Deliverables KSAs (non-standard output formats)
export * as pdf from "./pdf";
export * as email from "./email";

// App-wide KSAs (app services and management)
export * as boards from "./boards";
export * as boardDSL from "./boardDSL";
export * as brandscan from "./brandscan";
export * as workspaces from "./workspaces";
export * as frames from "./frames";

// Legacy alias - use 'artifacts' instead
/** @deprecated Use 'artifacts' instead */
export { saveArtifact, readArtifact, listArtifacts } from "./artifacts";

// ============================================================================
// Re-exports from Generated Registry
// ============================================================================

// Types
export type { KSAInfo, KSACategory, KSAGroup } from "./_generated/registry";

// Registry and discovery functions
export {
  KSA_REGISTRY,
  CORE_KSAS,
  getAllKSAs,
  getKSA,
  getKSAsByCategory,
  getKSAsByNames,
  searchKSAs,
} from "./_generated/registry";

// Policy functions
export {
  getServicePathsForKSAs,
  isServicePathAllowed,
} from "./_generated/registry";

// ============================================================================
// Re-exports from Config Schemas
// ============================================================================

export type { ConfigField, PresetDefinition } from "./_shared/configSchemas";

export {
  CONFIG_SCHEMAS,
  CONFIG_DEFAULTS,
  KSA_PRESETS,
  getConfigSchema,
  getConfigDefaults,
  getPreset,
  getPresetsForKSA,
  resolvePreset,
} from "./_shared/configSchemas";

// ============================================================================
// Prompt Generation
// ============================================================================

import { KSA_REGISTRY, type KSACategory, type KSAInfo } from "./_generated/registry";

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
