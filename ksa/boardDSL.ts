/**
 * Board DSL KSA - Create boards from YAML definitions
 *
 * Instead of making multiple API calls, define your entire board in YAML
 * and create it atomically with a single function call.
 *
 * @example
 * import { createBoardFromYAML } from './ksa/boardDSL';
 *
 * const yaml = `
 * name: Email Intelligence Pipeline
 * description: Analyze incoming emails and generate actionable insights
 *
 * trigger:
 *   name: Email Analysis
 *   methods:
 *     prompt: true
 *     email: true
 *   chat:
 *     systemPrompt: Analyze the provided email and extract key information
 *     placeholder: Paste an email to analyze...
 *     images: true
 *     files: true
 *     urls: true
 *
 * stages:
 *   - name: Extract Information
 *     type: agent
 *     goals:
 *       - Extract sender, recipient, date, subject
 *       - Identify key entities (people, companies, products)
 *       - Determine email intent and urgency
 *     skills:
 *       - context
 *       - web
 *     deliverables:
 *       - name: Email Summary
 *         type: artifact
 *         description: Structured summary of email contents
 *
 *   - name: Research Context
 *     type: agent
 *     goals:
 *       - Research mentioned companies and people
 *       - Find relevant news and updates
 *       - Identify potential opportunities or risks
 *     skills:
 *       - web
 *       - news
 *       - companies
 *     deliverables:
 *       - name: Context Report
 *         type: report
 *         description: Background research on entities in email
 *
 *   - name: Generate Response
 *     type: agent
 *     goals:
 *       - Draft appropriate response based on analysis
 *       - Include relevant talking points
 *       - Suggest follow-up actions
 *     skills:
 *       - context
 *       - artifacts
 *     deliverables:
 *       - name: Draft Response
 *         type: artifact
 *         description: Suggested email response
 *
 *   - name: Human Review
 *     type: human
 *     goals:
 *       - Review AI-generated response
 *       - Make any necessary edits
 *       - Approve for sending
 * `;
 *
 * const boardId = await createBoardFromYAML(yaml);
 * console.log('Created board:', boardId);
 */

import { callGateway } from "./_shared/gateway";
import * as yaml from "yaml";

// ============================================================================
// DSL Types
// ============================================================================

/**
 * YAML Board Definition Schema
 *
 * This is the structure the agent should write in YAML format.
 */
export interface BoardDSL {
  /** Board name (required) */
  name: string;

  /** Optional description of what this board does */
  description?: string;

  /** How cards are created on this board */
  trigger?: TriggerDSL;

  /** The stages/pipeline steps (required, at least 1) */
  stages: StageDSL[];

  /** Workspace mode: per_card (each card gets own workspace) or shared */
  workspaceMode?: "per_card" | "shared";
}

export interface TriggerDSL {
  /** Trigger display name */
  name: string;

  /** Which input methods are enabled */
  methods?: {
    prompt?: boolean;   // Chat/prompt input (default: true)
    webform?: boolean;  // Web form submission
    webhook?: boolean;  // API webhook
    mcp?: boolean;      // MCP tool call
    schedule?: boolean; // Scheduled runs
    email?: boolean;    // Email trigger
  };

  /** Chat configuration (for prompt trigger) */
  chat?: {
    systemPrompt: string;
    placeholder?: string;
    emptyStateMessage?: string;
    images?: boolean;    // Allow image uploads
    files?: boolean;     // Allow file uploads
    urls?: boolean;      // Allow URL scraping
    startWithPlan?: boolean;
    clarifyingQuestions?: {
      beforeStart?: boolean;
      duringStages?: boolean;
    };
  };

  /** Form configuration (for webform trigger) */
  form?: {
    fields: Array<{
      id: string;
      label: string;
      type: "text" | "textarea" | "select" | "checkbox" | "file";
      required?: boolean;
      placeholder?: string;
      options?: string[];  // For select type
    }>;
  };

  /** Schedule configuration */
  schedule?: {
    interval: "daily" | "weekly" | "monthly";
    time: string;      // HH:MM format
    timezone: string;  // e.g., "America/New_York"
  };

  /** Email configuration */
  email?: {
    prefix: string;
    allowedDomains?: string[];
    subjectAsTitle?: boolean;
    includeAttachments?: boolean;
  };
}

export interface StageDSL {
  /** Stage name (required) */
  name: string;

  /** Stage type: agent (AI-powered) or human (manual step) */
  type: "agent" | "human";

  /** Agent prompt/instructions (for agent stages) */
  prompt?: string;

  /** Goals for this stage - what should be accomplished */
  goals?: string[];

  /** Skills/capabilities needed for this stage */
  skills?: string[];

  /** Expected outputs from this stage */
  deliverables?: Array<{
    name: string;
    type: "report" | "artifact" | "pdf" | "data" | "image" | "file";
    description?: string;
  }>;
}

// ============================================================================
// ID Generation
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ============================================================================
// DSL Parser & Creator
// ============================================================================

/**
 * Create a board from a YAML definition.
 *
 * This is the PREFERRED way to create boards. Write your board as YAML,
 * then call this function to create it atomically.
 *
 * @param yamlContent - YAML string defining the board
 * @returns The created board ID
 *
 * @example
 * const boardId = await createBoardFromYAML(`
 * name: Research Pipeline
 * description: Automated research workflow
 *
 * trigger:
 *   name: Research Request
 *   methods:
 *     prompt: true
 *   chat:
 *     systemPrompt: Research the given topic thoroughly
 *     placeholder: What would you like me to research?
 *     images: true
 *     files: true
 *     urls: true
 *
 * stages:
 *   - name: Gather Sources
 *     type: agent
 *     goals:
 *       - Find 5-10 authoritative sources
 *       - Include academic papers if relevant
 *       - Verify source credibility
 *     skills:
 *       - web
 *       - news
 *       - pdf
 *     deliverables:
 *       - name: Source List
 *         type: artifact
 *         description: Curated list of sources with summaries
 *
 *   - name: Synthesize Findings
 *     type: agent
 *     goals:
 *       - Extract key insights from each source
 *       - Identify patterns and contradictions
 *       - Create coherent narrative
 *     skills:
 *       - context
 *       - artifacts
 *     deliverables:
 *       - name: Research Report
 *         type: report
 *         description: Comprehensive analysis of findings
 *
 *   - name: Review
 *     type: human
 *     goals:
 *       - Verify accuracy
 *       - Request clarifications if needed
 * `);
 */
export async function createBoardFromYAML(yamlContent: string): Promise<string> {
  // Parse YAML
  let dsl: BoardDSL;
  try {
    dsl = yaml.parse(yamlContent) as BoardDSL;
  } catch (e) {
    throw new Error(`Invalid YAML: ${(e as Error).message}`);
  }

  // Validate required fields
  if (!dsl.name) {
    throw new Error("Board name is required");
  }
  if (!dsl.stages || dsl.stages.length === 0) {
    throw new Error("At least one stage is required");
  }

  // Create the board
  const boardId = await callGateway<string>(
    "internal.features.kanban.boards.createInternal",
    {
      name: dsl.name,
      description: dsl.description,
      workspaceMode: dsl.workspaceMode || "per_card",
      blank: true, // We'll add stages manually
    },
    "mutation"
  );

  // Add stages
  for (let i = 0; i < dsl.stages.length; i++) {
    const stage = dsl.stages[i];

    // Convert goals from strings to proper format
    const goals = stage.goals?.map((text) => ({
      id: generateId(),
      text,
      done: false,
    }));

    // Convert skills from strings to proper format
    const skills = stage.skills?.map((name) => ({
      id: generateId(),
      name,
      icon: getSkillIcon(name),
    }));

    // Convert deliverables to proper format
    const deliverables = stage.deliverables?.map((d) => ({
      id: generateId(),
      type: d.type,
      name: d.name,
      description: d.description,
    }));

    await callGateway(
      "internal.features.kanban.boards.addTaskInternal",
      {
        boardId,
        name: stage.name,
        order: i,
        stageType: stage.type,
        agentPrompt: stage.prompt,
        goals,
        skills,
        deliverables,
      },
      "mutation"
    );
  }

  // Set trigger if provided
  if (dsl.trigger) {
    const trigger = buildTriggerConfig(dsl.trigger);
    await callGateway(
      "internal.features.kanban.boards.updateTriggerInternal",
      { id: boardId, trigger },
      "mutation"
    );
  }

  return boardId;
}

/**
 * Get icon name for a skill
 */
function getSkillIcon(skill: string): string {
  const icons: Record<string, string> = {
    web: "globe",
    news: "newspaper",
    pdf: "file-text",
    file: "file",
    context: "brain",
    artifacts: "package",
    beads: "layers",
    browser: "chrome",
    instagram: "instagram",
    tiktok: "video",
    youtube: "youtube",
    linkedin: "linkedin",
    twitter: "twitter",
    email: "mail",
    boards: "layout",
    brandscan: "scan",
    workspaces: "folder",
    frames: "frame",
    companies: "building",
    social: "users",
  };
  return icons[skill.toLowerCase()] || "tool";
}

/**
 * Build full trigger config from DSL
 */
function buildTriggerConfig(dsl: TriggerDSL): Record<string, unknown> {
  return {
    name: dsl.name,
    methods: {
      prompt: dsl.methods?.prompt ?? true,
      webform: dsl.methods?.webform ?? false,
      webhook: dsl.methods?.webhook ?? false,
      mcp: dsl.methods?.mcp ?? false,
      schedule: dsl.methods?.schedule ?? false,
      email: dsl.methods?.email ?? false,
    },
    chat: {
      images: { enabled: dsl.chat?.images ?? true, maxSize: "10MB" },
      files: { enabled: dsl.chat?.files ?? true, maxSize: "25MB", types: ["pdf", "docx", "txt", "csv", "json"] },
      urls: { enabled: dsl.chat?.urls ?? true, scrape: true },
      placeholder: dsl.chat?.placeholder || "Enter your request...",
      emptyStateMessage: dsl.chat?.emptyStateMessage || "What would you like me to work on?",
      systemPrompt: dsl.chat?.systemPrompt || "",
      startWithPlan: dsl.chat?.startWithPlan ?? false,
      clarifyingQuestions: {
        beforeStart: dsl.chat?.clarifyingQuestions?.beforeStart ?? false,
        duringStages: dsl.chat?.clarifyingQuestions?.duringStages ?? false,
      },
    },
    form: {
      fields: dsl.form?.fields?.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        required: f.required ?? false,
        placeholder: f.placeholder,
        options: f.options,
      })) || [],
    },
    schedule: dsl.schedule ? {
      interval: dsl.schedule.interval,
      time: dsl.schedule.time,
      timezone: dsl.schedule.timezone,
    } : undefined,
    email: dsl.email ? {
      prefix: dsl.email.prefix,
      allowedDomains: dsl.email.allowedDomains || [],
      subjectAsTitle: dsl.email.subjectAsTitle ?? true,
      includeAttachments: dsl.email.includeAttachments ?? true,
      autoReply: { enabled: true },
    } : undefined,
  };
}

// ============================================================================
// Validation & Preview
// ============================================================================

/**
 * Validate a YAML board definition without creating it.
 *
 * Use this to check for errors before creating.
 *
 * @param yamlContent - YAML string to validate
 * @returns Validation result with any errors
 *
 * @example
 * const result = validateBoardYAML(yaml);
 * if (result.valid) {
 *   console.log('Board definition is valid!');
 *   console.log('Summary:', result.summary);
 * } else {
 *   console.log('Errors:', result.errors);
 * }
 */
export function validateBoardYAML(yamlContent: string): {
  valid: boolean;
  errors: string[];
  summary?: {
    name: string;
    stageCount: number;
    hasTrigger: boolean;
    triggerMethods: string[];
  };
} {
  const errors: string[] = [];

  let dsl: BoardDSL;
  try {
    dsl = yaml.parse(yamlContent) as BoardDSL;
  } catch (e) {
    return { valid: false, errors: [`Invalid YAML: ${(e as Error).message}`] };
  }

  // Required fields
  if (!dsl.name) {
    errors.push("Board name is required");
  }
  if (!dsl.stages || !Array.isArray(dsl.stages)) {
    errors.push("Stages array is required");
  } else if (dsl.stages.length === 0) {
    errors.push("At least one stage is required");
  } else {
    // Validate each stage
    dsl.stages.forEach((stage, i) => {
      if (!stage.name) {
        errors.push(`Stage ${i + 1}: name is required`);
      }
      if (!stage.type || !["agent", "human"].includes(stage.type)) {
        errors.push(`Stage ${i + 1}: type must be 'agent' or 'human'`);
      }
      if (stage.type === "agent" && (!stage.goals || stage.goals.length === 0)) {
        errors.push(`Stage ${i + 1} (${stage.name}): agent stages should have goals`);
      }
    });
  }

  // Trigger validation
  if (dsl.trigger) {
    if (!dsl.trigger.name) {
      errors.push("Trigger name is required");
    }
    if (dsl.trigger.methods?.prompt && !dsl.trigger.chat?.systemPrompt) {
      errors.push("Chat trigger requires a systemPrompt");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Build summary
  const triggerMethods: string[] = [];
  if (dsl.trigger?.methods) {
    if (dsl.trigger.methods.prompt) triggerMethods.push("prompt");
    if (dsl.trigger.methods.webform) triggerMethods.push("webform");
    if (dsl.trigger.methods.webhook) triggerMethods.push("webhook");
    if (dsl.trigger.methods.mcp) triggerMethods.push("mcp");
    if (dsl.trigger.methods.schedule) triggerMethods.push("schedule");
    if (dsl.trigger.methods.email) triggerMethods.push("email");
  }

  return {
    valid: true,
    errors: [],
    summary: {
      name: dsl.name,
      stageCount: dsl.stages.length,
      hasTrigger: !!dsl.trigger,
      triggerMethods,
    },
  };
}

// Re-export yaml parser for convenience
export { yaml };
