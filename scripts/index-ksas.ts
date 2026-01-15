#!/usr/bin/env bun
/**
 * KSA Indexer
 *
 * Parses KSA TypeScript files and extracts metadata:
 * - Module-level JSDoc description
 * - Exported functions with their JSDoc, parameters, and examples
 * - Type exports
 *
 * Usage:
 *   bun packages/lakitu/scripts/index-ksas.ts
 *   bun packages/lakitu/scripts/index-ksas.ts --json
 *   bun packages/lakitu/scripts/index-ksas.ts --generate-registry
 *   bun packages/lakitu/scripts/index-ksas.ts --generate-skills
 */

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Types
// ============================================================================

export interface KSAFunctionMeta {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    optional: boolean;
  }>;
  returnType: string;
  example?: string;
}

export interface KSATypeMeta {
  name: string;
  kind: "interface" | "type" | "enum";
  description?: string;
}

export interface KSAModuleMeta {
  name: string;
  description: string;
  category: "system" | "research" | "data" | "create" | "ai";
  functions: KSAFunctionMeta[];
  types: KSATypeMeta[];
  importPath: string;
  filePath: string;
  /** Convex service paths this KSA calls via gateway */
  servicePaths: string[];
  /** Whether this KSA is local-only (no gateway calls) */
  isLocal: boolean;
}

// ============================================================================
// Parser
// ============================================================================

function parseKSAFile(filePath: string): KSAModuleMeta | null {
  const sourceText = fs.readFileSync(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );

  const fileName = path.basename(filePath, ".ts");

  // Skip internal/shared files
  if (fileName.startsWith("_")) {
    return null;
  }

  let moduleDescription = "";
  let category: KSAModuleMeta["category"] = "system";
  const functions: KSAFunctionMeta[] = [];
  const types: KSATypeMeta[] = [];

  // Extract module-level JSDoc (first comment in file)
  const firstStatement = sourceFile.statements[0];
  if (firstStatement) {
    const leadingComments = ts.getLeadingCommentRanges(sourceText, 0);
    if (leadingComments && leadingComments.length > 0) {
      const firstComment = leadingComments[0];
      const commentText = sourceText.slice(firstComment.pos, firstComment.end);
      if (commentText.startsWith("/**")) {
        moduleDescription = parseJSDocDescription(commentText);
        category = inferCategory(fileName, moduleDescription);
      }
    }
  }

  // Walk the AST to extract exports
  function visit(node: ts.Node) {
    // Exported functions
    if (
      ts.isFunctionDeclaration(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      node.name
    ) {
      const funcMeta = extractFunctionMeta(node, sourceFile, sourceText);
      if (funcMeta) {
        functions.push(funcMeta);
      }
    }

    // Exported arrow functions as const
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          ts.isArrowFunction(decl.initializer)
        ) {
          const funcMeta = extractArrowFunctionMeta(
            decl,
            decl.initializer,
            sourceFile,
            sourceText
          );
          if (funcMeta) {
            functions.push(funcMeta);
          }
        }
      }
    }

    // Exported interfaces
    if (
      ts.isInterfaceDeclaration(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const jsDoc = getJSDocComment(node, sourceFile, sourceText);
      types.push({
        name: node.name.text,
        kind: "interface",
        description: jsDoc ? parseJSDocDescription(jsDoc) : undefined,
      });
    }

    // Exported type aliases
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const jsDoc = getJSDocComment(node, sourceFile, sourceText);
      types.push({
        name: node.name.text,
        kind: "type",
        description: jsDoc ? parseJSDocDescription(jsDoc) : undefined,
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Generate import path
  const importPath = `./ksa/${fileName}`;

  // Extract service paths from callGateway calls
  const servicePaths = extractServicePaths(sourceText);
  const isLocal = servicePaths.length === 0;

  return {
    name: fileName,
    description: moduleDescription,
    category,
    functions,
    types,
    importPath,
    filePath,
    servicePaths,
    isLocal,
  };
}

/**
 * Extract all gateway service paths from source text.
 * Looks for patterns like:
 *   - callGateway('services.Valyu.internal.search', ...)
 *   - callCloud('features.kanban.artifacts.saveArtifactWithBackup', ...)
 */
function extractServicePaths(sourceText: string): string[] {
  const paths = new Set<string>();

  // Match callGateway("path", ...) or callGateway('path', ...)
  const gatewayRegex = /callGateway\s*(?:<[^>]+>)?\s*\(\s*["'`]([^"'`]+)["'`]/g;
  let match;
  while ((match = gatewayRegex.exec(sourceText)) !== null) {
    paths.add(match[1]);
  }

  // Match callCloud("path", ...) or callCloud('path', ...)
  // This is used in artifacts.ts and context.ts
  const cloudRegex = /callCloud\s*\(\s*["'`]([^"'`]+)["'`]/g;
  while ((match = cloudRegex.exec(sourceText)) !== null) {
    paths.add(match[1]);
  }

  return Array.from(paths);
}

function extractFunctionMeta(
  node: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
  sourceText: string
): KSAFunctionMeta | null {
  if (!node.name) return null;

  const jsDoc = getJSDocComment(node, sourceFile, sourceText);
  const parsed = jsDoc ? parseJSDoc(jsDoc) : null;

  // Get parameters
  const parameters = node.parameters.map((param) => {
    const paramName = ts.isIdentifier(param.name)
      ? param.name.text
      : "unknown";
    const paramType = param.type
      ? sourceText.slice(param.type.pos, param.type.end).trim()
      : "any";
    const paramDoc =
      parsed?.params.find((p) => p.name === paramName)?.description || "";
    const optional = !!param.questionToken || !!param.initializer;

    return {
      name: paramName,
      type: paramType,
      description: paramDoc,
      optional,
    };
  });

  // Get return type
  const returnType = node.type
    ? sourceText.slice(node.type.pos, node.type.end).trim()
    : "void";

  return {
    name: node.name.text,
    description: parsed?.description || "",
    parameters,
    returnType,
    example: parsed?.example,
  };
}

function extractArrowFunctionMeta(
  decl: ts.VariableDeclaration,
  arrow: ts.ArrowFunction,
  sourceFile: ts.SourceFile,
  sourceText: string
): KSAFunctionMeta | null {
  if (!ts.isIdentifier(decl.name)) return null;

  // Get JSDoc from the variable statement parent
  const parent = decl.parent?.parent;
  const jsDoc = parent ? getJSDocComment(parent, sourceFile, sourceText) : null;
  const parsed = jsDoc ? parseJSDoc(jsDoc) : null;

  // Get parameters
  const parameters = arrow.parameters.map((param) => {
    const paramName = ts.isIdentifier(param.name)
      ? param.name.text
      : "unknown";
    const paramType = param.type
      ? sourceText.slice(param.type.pos, param.type.end).trim()
      : "any";
    const paramDoc =
      parsed?.params.find((p) => p.name === paramName)?.description || "";
    const optional = !!param.questionToken || !!param.initializer;

    return {
      name: paramName,
      type: paramType,
      description: paramDoc,
      optional,
    };
  });

  // Get return type
  const returnType = arrow.type
    ? sourceText.slice(arrow.type.pos, arrow.type.end).trim()
    : "void";

  return {
    name: decl.name.text,
    description: parsed?.description || "",
    parameters,
    returnType,
    example: parsed?.example,
  };
}

function getJSDocComment(
  node: ts.Node,
  _sourceFile: ts.SourceFile,
  sourceText: string
): string | null {
  const comments = ts.getLeadingCommentRanges(sourceText, node.getFullStart());
  if (!comments) return null;

  // Find JSDoc comment (starts with /**)
  for (const comment of comments) {
    const text = sourceText.slice(comment.pos, comment.end);
    if (text.startsWith("/**")) {
      return text;
    }
  }

  return null;
}

function parseJSDocDescription(jsDoc: string): string {
  // Remove /** and */ and clean up
  const lines = jsDoc
    .replace(/^\/\*\*/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter(Boolean);

  // Get description (lines before first @tag)
  const descLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("@")) break;
    descLines.push(line);
  }

  return descLines.join(" ").trim();
}

interface ParsedJSDoc {
  description: string;
  params: Array<{ name: string; description: string }>;
  returns?: string;
  example?: string;
}

function parseJSDoc(jsDoc: string): ParsedJSDoc {
  const lines = jsDoc
    .replace(/^\/\*\*/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, ""));

  const result: ParsedJSDoc = {
    description: "",
    params: [],
  };

  let currentSection = "description";
  let exampleLines: string[] = [];
  let descLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("@param")) {
      currentSection = "param";
      // Parse @param name - description or @param {type} name - description
      const match = trimmed.match(
        /@param\s+(?:\{[^}]+\}\s+)?(\w+)\s*-?\s*(.*)/
      );
      if (match) {
        result.params.push({
          name: match[1],
          description: match[2] || "",
        });
      }
    } else if (trimmed.startsWith("@returns") || trimmed.startsWith("@return")) {
      currentSection = "returns";
      result.returns = trimmed.replace(/@returns?\s*/, "").trim();
    } else if (trimmed.startsWith("@example")) {
      currentSection = "example";
    } else if (trimmed.startsWith("@")) {
      currentSection = "other";
    } else if (currentSection === "description") {
      descLines.push(trimmed);
    } else if (currentSection === "example") {
      exampleLines.push(line);
    }
  }

  result.description = descLines.filter(Boolean).join(" ").trim();

  if (exampleLines.length > 0) {
    result.example = exampleLines
      .join("\n")
      .trim()
      .replace(/^```\w*\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
  }

  return result;
}

function inferCategory(
  name: string,
  description: string
): KSAModuleMeta["category"] {
  const lower = (name + " " + description).toLowerCase();

  if (
    lower.includes("file") ||
    lower.includes("browser") ||
    lower.includes("beads") ||
    lower.includes("context")
  ) {
    return "system";
  }
  if (
    lower.includes("search") ||
    lower.includes("web") ||
    lower.includes("news") ||
    lower.includes("social")
  ) {
    return "research";
  }
  if (
    lower.includes("compan") ||
    lower.includes("enrich") ||
    lower.includes("firmograph")
  ) {
    return "data";
  }
  if (
    lower.includes("pdf") ||
    lower.includes("email") ||
    lower.includes("deliverable") ||
    lower.includes("artifact")
  ) {
    return "create";
  }

  return "system";
}

// ============================================================================
// Index all KSAs
// ============================================================================

function indexKSAs(ksaDir: string): KSAModuleMeta[] {
  const results: KSAModuleMeta[] = [];

  const files = fs.readdirSync(ksaDir).filter((f) => {
    return (
      f.endsWith(".ts") &&
      !f.startsWith("_") &&
      f !== "index.ts" // Skip index file
    );
  });

  for (const file of files) {
    const filePath = path.join(ksaDir, file);
    const meta = parseKSAFile(filePath);
    if (meta && meta.functions.length > 0) {
      results.push(meta);
    }
  }

  return results;
}

// ============================================================================
// Generators
// ============================================================================

function generateKSARegistry(modules: KSAModuleMeta[]): string {
  const entries = modules.map((m) => {
    const functions = m.functions.map((f) => `"${f.name}"`).join(", ");
    const servicePaths = m.servicePaths.map((p) => `"${p}"`).join(", ");
    return `  {
    name: "${m.name}",
    description: "${m.description.replace(/"/g, '\\"')}",
    category: "${m.category}",
    functions: [${functions}],
    importPath: "${m.importPath}",
    servicePaths: [${servicePaths}],
    isLocal: ${m.isLocal},
  }`;
  });

  return `/**
 * KSA Registry - Auto-generated
 *
 * DO NOT EDIT MANUALLY - run \`bun packages/lakitu/scripts/index-ksas.ts --generate-registry\`
 *
 * Generated at: ${new Date().toISOString()}
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
${entries.join(",\n")}
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
`;
}

function generateSkillsMapping(modules: KSAModuleMeta[]): string {
  // Map KSAs to skills with reasonable defaults
  const skillMappings: Array<{
    ksaName: string;
    skillId: string;
    skillName: string;
    description: string;
    icon: string;
    category: string;
    functions: string[];
  }> = [];

  const iconMap: Record<string, string> = {
    web: "mdi:magnify",
    file: "mdi:file-document",
    pdf: "mdi:file-pdf-box",
    email: "mdi:email-send",
    browser: "mdi:web",
    beads: "mdi:format-list-checks",
    news: "mdi:newspaper",
    social: "mdi:account-multiple",
    companies: "mdi:office-building",
    artifacts: "mdi:package-variant-closed",
    context: "mdi:cog",
  };

  const categoryMap: Record<string, string> = {
    system: "workflow",
    research: "research",
    data: "research",
    create: "content",
    ai: "research",
  };

  for (const m of modules) {
    skillMappings.push({
      ksaName: m.name,
      skillId: m.name,
      skillName: m.name.charAt(0).toUpperCase() + m.name.slice(1),
      description: m.description,
      icon: iconMap[m.name] || "mdi:puzzle",
      category: categoryMap[m.category] || "workflow",
      functions: m.functions.map((f) => f.name),
    });
  }

  const entries = skillMappings.map((s) => {
    const funcs = s.functions.slice(0, 3).join("(), ") + "()";
    const prompt = `Use ${funcs} from ./ksa/${s.ksaName}.`;
    return `  {
    id: "${s.skillId}",
    name: "${s.skillName}",
    description: "${s.description.replace(/"/g, '\\"')}",
    icon: "${s.icon}",
    category: "${s.category}",
    toolIds: ["${s.ksaName}"],
    prompt: "${prompt.replace(/"/g, '\\"')}",
  }`;
  });

  return `/**
 * Skills derived from KSAs - Auto-generated base
 *
 * This is a BASE that can be customized.
 * For the full SKILLS_META, see packages/primitives/agent/src/metadata.ts
 *
 * Generated at: ${new Date().toISOString()}
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
${entries.join(",\n")}
];
`;
}

function generateDetailedDocs(modules: KSAModuleMeta[]): string {
  const sections: string[] = [
    `# KSA Reference Documentation

> Auto-generated from KSA source files.
> Generated at: ${new Date().toISOString()}

`,
  ];

  const byCategory = new Map<string, KSAModuleMeta[]>();
  for (const m of modules) {
    if (!byCategory.has(m.category)) {
      byCategory.set(m.category, []);
    }
    byCategory.get(m.category)!.push(m);
  }

  const categoryNames: Record<string, string> = {
    system: "System Operations",
    research: "Research & Information",
    data: "Data Enrichment",
    create: "Content Creation",
    ai: "AI Capabilities",
  };

  for (const [category, mods] of byCategory) {
    sections.push(`## ${categoryNames[category] || category}\n`);

    for (const m of mods) {
      sections.push(`### ${m.name}\n`);
      sections.push(`${m.description}\n`);
      sections.push(`\`\`\`typescript\nimport { ${m.functions.map((f) => f.name).join(", ")} } from '${m.importPath}';\n\`\`\`\n`);

      for (const f of m.functions) {
        sections.push(`#### \`${f.name}()\`\n`);
        sections.push(`${f.description}\n`);

        if (f.parameters.length > 0) {
          sections.push(`**Parameters:**\n`);
          for (const p of f.parameters) {
            const opt = p.optional ? " (optional)" : "";
            sections.push(`- \`${p.name}\`: \`${p.type}\`${opt} - ${p.description}\n`);
          }
        }

        sections.push(`**Returns:** \`${f.returnType}\`\n`);

        if (f.example) {
          sections.push(`**Example:**\n\`\`\`typescript\n${f.example}\n\`\`\`\n`);
        }
        sections.push("\n");
      }
    }
  }

  return sections.join("\n");
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);
const ksaDir = path.resolve(__dirname, "../ksa");

const modules = indexKSAs(ksaDir);

if (args.includes("--json")) {
  console.log(JSON.stringify(modules, null, 2));
} else if (args.includes("--generate-registry")) {
  const output = generateKSARegistry(modules);
  const outputPath = path.resolve(ksaDir, "_generated/registry.ts");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(`Generated registry at: ${outputPath}`);
  console.log(`Found ${modules.length} KSAs with ${modules.reduce((n, m) => n + m.functions.length, 0)} functions`);
} else if (args.includes("--generate-skills")) {
  const output = generateSkillsMapping(modules);
  const outputPath = path.resolve(ksaDir, "_generated/skills.ts");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(`Generated skills mapping at: ${outputPath}`);
} else if (args.includes("--generate-docs")) {
  const output = generateDetailedDocs(modules);
  const outputPath = path.resolve(ksaDir, "_generated/REFERENCE.md");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(`Generated docs at: ${outputPath}`);
} else if (args.includes("--all")) {
  // Generate everything
  fs.mkdirSync(path.resolve(ksaDir, "_generated"), { recursive: true });

  const registry = generateKSARegistry(modules);
  fs.writeFileSync(path.resolve(ksaDir, "_generated/registry.ts"), registry);

  const skills = generateSkillsMapping(modules);
  fs.writeFileSync(path.resolve(ksaDir, "_generated/skills.ts"), skills);

  const docs = generateDetailedDocs(modules);
  fs.writeFileSync(path.resolve(ksaDir, "_generated/REFERENCE.md"), docs);

  console.log("Generated all outputs in ksa/_generated/");
  console.log(`  - registry.ts (${modules.length} KSAs)`);
  console.log(`  - skills.ts (base skill mappings)`);
  console.log(`  - REFERENCE.md (documentation)`);
} else {
  // Default: print summary
  console.log("KSA Index Summary\n");
  console.log(`Found ${modules.length} KSAs:\n`);

  for (const m of modules) {
    console.log(`  ${m.name} (${m.category})`);
    console.log(`    ${m.description}`);
    console.log(`    Functions: ${m.functions.map((f) => f.name).join(", ")}`);
    console.log("");
  }

  console.log("\nRun with:");
  console.log("  --json              Output raw JSON");
  console.log("  --generate-registry Generate KSA_REGISTRY");
  console.log("  --generate-skills   Generate skill mappings");
  console.log("  --generate-docs     Generate reference docs");
  console.log("  --all               Generate all outputs");
}
