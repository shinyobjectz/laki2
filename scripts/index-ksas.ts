#!/usr/bin/env bun
/**
 * KSA Indexer & Registry Generator
 *
 * Generates registry files from KSA source files.
 * The source of truth is packages/lakitu/ksa/index.ts which contains
 * the manually curated KSA_REGISTRY.
 *
 * Usage:
 *   bun packages/lakitu/scripts/index-ksas.ts                # Print summary
 *   bun packages/lakitu/scripts/index-ksas.ts --json         # Output raw JSON
 *   bun packages/lakitu/scripts/index-ksas.ts --generate     # Generate Lakitu registry
 *   bun packages/lakitu/scripts/index-ksas.ts --generate-convex  # Generate Convex registry
 *   bun packages/lakitu/scripts/index-ksas.ts --generate-docs    # Generate reference docs
 *   bun packages/lakitu/scripts/index-ksas.ts --all          # Generate all outputs
 */

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Types (aligned with @ksa-types)
// ============================================================================

export type KSACategory = "core" | "skills" | "deliverables";
export type KSAGroup = "research";

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
  category: KSACategory;
  group?: KSAGroup;
  functions: KSAFunctionMeta[];
  types: KSATypeMeta[];
  importPath: string;
  filePath: string;
  servicePaths: string[];
  isLocal: boolean;
  icon?: string;
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
  let category: KSACategory = "skills";
  let group: KSAGroup | undefined;
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
        const parsed = parseJSDocTags(commentText);
        category = parsed.category || inferCategory(fileName, moduleDescription);
        group = parsed.group;
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
    group,
    functions,
    types,
    importPath,
    filePath,
    servicePaths,
    isLocal,
  };
}

/**
 * Extract @category and @group tags from JSDoc
 */
function parseJSDocTags(jsDoc: string): { category?: KSACategory; group?: KSAGroup } {
  const result: { category?: KSACategory; group?: KSAGroup } = {};

  // Look for @category tag
  const categoryMatch = jsDoc.match(/@category\s+(core|skills|deliverables)/i);
  if (categoryMatch) {
    result.category = categoryMatch[1].toLowerCase() as KSACategory;
  }

  // Look for @group tag
  const groupMatch = jsDoc.match(/@group\s+(research)/i);
  if (groupMatch) {
    result.group = groupMatch[1].toLowerCase() as KSAGroup;
  }

  return result;
}

/**
 * Extract all gateway service paths from source text.
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
): KSACategory {
  const lower = (name + " " + description).toLowerCase();

  // Core KSAs
  if (
    name === "file" ||
    name === "context" ||
    name === "artifacts" ||
    name === "beads"
  ) {
    return "core";
  }

  // Deliverables
  if (name === "pdf" || name === "email") {
    return "deliverables";
  }

  // Default to skills
  return "skills";
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
      f !== "index.ts"
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

function generateLakituRegistry(modules: KSAModuleMeta[]): string {
  const entries = modules.map((m) => {
    const functions = m.functions.map((f) => `"${f.name}"`).join(", ");
    const servicePaths = m.servicePaths.map((p) => `"${p}"`).join(", ");
    const group = m.group ? `\n    group: "${m.group}" as const,` : "";
    const icon = m.icon ? `\n    icon: "${m.icon}",` : "";
    return `  {
    name: "${m.name}",
    description: "${m.description.replace(/"/g, '\\"')}",
    category: "${m.category}" as const,${group}
    functions: [${functions}],
    importPath: "${m.importPath}",
    servicePaths: [${servicePaths}],
    isLocal: ${m.isLocal},${icon}
  }`;
  });

  return `/**
 * KSA Registry - Auto-generated for Lakitu
 *
 * DO NOT EDIT MANUALLY - run \`bun generate:ksa\`
 *
 * Generated at: ${new Date().toISOString()}
 *
 * This file is generated from the source of truth at:
 * packages/lakitu/ksa/*.ts
 */

// ============================================================================
// Types (defined inline for sandbox compatibility)
// ============================================================================

export type KSACategory = "core" | "skills" | "deliverables";
export type KSAGroup = "research";

export interface KSAInfo {
  name: string;
  description: string;
  category: KSACategory;
  group?: KSAGroup;
  functions: string[];
  importPath: string;
  servicePaths: string[];
  isLocal: boolean;
  icon?: string;
}

// ============================================================================
// Generated Registry
// ============================================================================

export const KSA_REGISTRY: KSAInfo[] = [
${entries.join(",\n")}
];

// ============================================================================
// Discovery functions
// ============================================================================

export const getAllKSAs = () => KSA_REGISTRY;

export const getKSAsByCategory = (category: KSACategory) =>
  KSA_REGISTRY.filter((k) => k.category === category);

export const getKSA = (name: string) =>
  KSA_REGISTRY.find((k) => k.name === name);

export const getKSAsByNames = (names: string[]) =>
  KSA_REGISTRY.filter((k) => names.includes(k.name));

export const searchKSAs = (keyword: string) => {
  const lower = keyword.toLowerCase();
  return KSA_REGISTRY.filter(
    (k) =>
      k.name.toLowerCase().includes(lower) ||
      k.description.toLowerCase().includes(lower) ||
      k.functions.some((f) => f.toLowerCase().includes(lower))
  );
};

/** Names of core KSAs that are always available */
export const CORE_KSAS = KSA_REGISTRY.filter((k) => k.category === "core").map((k) => k.name);

// ============================================================================
// Policy Functions
// ============================================================================

/**
 * Get allowed service paths for a set of KSA names.
 * Used by gateway to enforce access control.
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
  // Core KSAs are always allowed
  const allAllowed = [...CORE_KSAS, ...allowedKSAs];
  const allowedPaths = getServicePathsForKSAs(allAllowed);
  return allowedPaths.some((p) => path.startsWith(p) || p.startsWith(path));
}
`;
}

function generateConvexRegistry(modules: KSAModuleMeta[]): string {
  const entries = modules.map((m) => {
    const functions = m.functions.map((f) => `"${f.name}"`).join(", ");
    const servicePaths = m.servicePaths.map((p) => `"${p}"`).join(", ");
    const group = m.group ? `\n    group: "${m.group}" as const,` : "";
    const icon = m.icon ? `\n    icon: "${m.icon}",` : "";
    return `  {
    name: "${m.name}",
    description: "${m.description.replace(/"/g, '\\"')}",
    category: "${m.category}" as const,${group}
    functions: [${functions}],
    importPath: "${m.importPath}",
    servicePaths: [${servicePaths}],
    isLocal: ${m.isLocal},${icon}
  }`;
  });

  return `/**
 * KSA Registry - Auto-generated for Convex
 *
 * DO NOT EDIT MANUALLY - run \`bun generate:ksa\`
 *
 * Generated at: ${new Date().toISOString()}
 *
 * This file is generated from the source of truth at:
 * packages/lakitu/ksa/*.ts
 */

// ============================================================================
// Types (duplicated to avoid import issues in Convex)
// ============================================================================

export type KSACategory = "core" | "skills" | "deliverables";
export type KSAGroup = "research";

export interface KSAInfo {
  name: string;
  description: string;
  category: KSACategory;
  group?: KSAGroup;
  functions: string[];
  importPath: string;
  servicePaths: string[];
  isLocal: boolean;
  icon?: string;
}

// ============================================================================
// Generated Registry
// ============================================================================

export const KSA_REGISTRY: KSAInfo[] = [
${entries.join(",\n")}
];

// ============================================================================
// Discovery functions
// ============================================================================

export const getAllKSAs = () => KSA_REGISTRY;

export const getKSAsByCategory = (category: KSACategory) =>
  KSA_REGISTRY.filter((k) => k.category === category);

export const getKSA = (name: string) =>
  KSA_REGISTRY.find((k) => k.name === name);

export const getKSAsByNames = (names: string[]) =>
  KSA_REGISTRY.filter((k) => names.includes(k.name));

export const searchKSAs = (keyword: string) => {
  const lower = keyword.toLowerCase();
  return KSA_REGISTRY.filter(
    (k) =>
      k.name.toLowerCase().includes(lower) ||
      k.description.toLowerCase().includes(lower) ||
      k.functions.some((f) => f.toLowerCase().includes(lower))
  );
};

/** Names of core KSAs that are always available */
export const CORE_KSAS = KSA_REGISTRY.filter((k) => k.category === "core").map((k) => k.name);

// ============================================================================
// Policy Functions
// ============================================================================

/**
 * Get allowed service paths for a set of KSA names.
 * Core KSAs are always included.
 */
export function getServicePathsForKSAs(ksaNames: string[]): string[] {
  const paths = new Set<string>();

  // Always include core KSAs
  const allKSAs = [...CORE_KSAS, ...ksaNames];

  for (const name of allKSAs) {
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
 * Core KSAs are always allowed.
 */
export function isServicePathAllowed(path: string, allowedKSAs: string[]): boolean {
  const allowedPaths = getServicePathsForKSAs(allowedKSAs);
  return allowedPaths.some((p) => path.startsWith(p) || p.startsWith(path));
}

/**
 * Validate KSA names are all recognized.
 */
export function validateKSAs(ksaNames: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const name of ksaNames) {
    if (getKSA(name)) {
      valid.push(name);
    } else {
      invalid.push(name);
    }
  }

  return { valid, invalid };
}
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
    core: "Core KSAs (Always Available)",
    skills: "Skills KSAs (Research & Data)",
    deliverables: "Deliverables KSAs (Output Formats)",
  };

  const categoryOrder: KSACategory[] = ["core", "skills", "deliverables"];

  for (const category of categoryOrder) {
    const mods = byCategory.get(category);
    if (!mods || mods.length === 0) continue;

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
const convexDir = path.resolve(__dirname, "../../../convex/agent/_generated");

const modules = indexKSAs(ksaDir);

if (args.includes("--json")) {
  console.log(JSON.stringify(modules, null, 2));
} else if (args.includes("--generate")) {
  const output = generateLakituRegistry(modules);
  const outputPath = path.resolve(ksaDir, "_generated/registry.ts");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(`Generated Lakitu registry at: ${outputPath}`);
  console.log(`Found ${modules.length} KSAs with ${modules.reduce((n, m) => n + m.functions.length, 0)} functions`);
} else if (args.includes("--generate-convex")) {
  const output = generateConvexRegistry(modules);
  const outputPath = path.resolve(convexDir, "ksaRegistry.ts");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(`Generated Convex registry at: ${outputPath}`);
  console.log(`Found ${modules.length} KSAs with ${modules.reduce((n, m) => n + m.functions.length, 0)} functions`);
} else if (args.includes("--generate-docs")) {
  const output = generateDetailedDocs(modules);
  const outputPath = path.resolve(ksaDir, "_generated/REFERENCE.md");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(`Generated docs at: ${outputPath}`);
} else if (args.includes("--all")) {
  // Generate everything
  fs.mkdirSync(path.resolve(ksaDir, "_generated"), { recursive: true });
  fs.mkdirSync(convexDir, { recursive: true });

  // Lakitu registry
  const lakituRegistry = generateLakituRegistry(modules);
  fs.writeFileSync(path.resolve(ksaDir, "_generated/registry.ts"), lakituRegistry);

  // Convex registry
  const convexRegistry = generateConvexRegistry(modules);
  fs.writeFileSync(path.resolve(convexDir, "ksaRegistry.ts"), convexRegistry);

  // Documentation
  const docs = generateDetailedDocs(modules);
  fs.writeFileSync(path.resolve(ksaDir, "_generated/REFERENCE.md"), docs);

  console.log("Generated all outputs:");
  console.log(`  - packages/lakitu/ksa/_generated/registry.ts (${modules.length} KSAs)`);
  console.log(`  - convex/agent/_generated/ksaRegistry.ts`);
  console.log(`  - packages/lakitu/ksa/_generated/REFERENCE.md`);
} else {
  // Default: print summary
  console.log("KSA Index Summary\n");
  console.log(`Found ${modules.length} KSAs:\n`);

  const byCategory = new Map<KSACategory, KSAModuleMeta[]>();
  for (const m of modules) {
    if (!byCategory.has(m.category)) {
      byCategory.set(m.category, []);
    }
    byCategory.get(m.category)!.push(m);
  }

  const categoryOrder: KSACategory[] = ["core", "skills", "deliverables"];
  for (const cat of categoryOrder) {
    const mods = byCategory.get(cat);
    if (!mods) continue;
    console.log(`[${cat.toUpperCase()}]`);
    for (const m of mods) {
      console.log(`  ${m.name}: ${m.functions.map((f) => f.name).join(", ")}`);
    }
    console.log("");
  }

  console.log("\nRun with:");
  console.log("  --json              Output raw JSON");
  console.log("  --generate          Generate Lakitu registry");
  console.log("  --generate-convex   Generate Convex registry");
  console.log("  --generate-docs     Generate reference docs");
  console.log("  --all               Generate all outputs");
}
