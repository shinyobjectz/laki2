/**
 * Shared Types - Common TypeScript definitions
 *
 * Types shared between Convex backend and runtime processes.
 */

// ============================================
// Beads (Task Tracking)
// ============================================

export type BeadType = "task" | "bug" | "feature" | "epic" | "chore";
export type BeadStatus = "open" | "in_progress" | "blocked" | "closed";
export type BeadPriority = 0 | 1 | 2 | 3 | 4; // 0=critical, 4=backlog

export interface Bead {
  id: string;
  title: string;
  description?: string;
  type: BeadType;
  priority: BeadPriority;
  labels: string[];
  parentId?: string;
  blockedBy: string[];
  status: BeadStatus;
  closedReason?: string;
  assignee?: string;
  threadId?: string;
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
  relatedFiles: string[];
}

// ============================================
// Artifacts
// ============================================

export interface Artifact {
  name: string;
  type: string; // MIME type
  path: string;
  size: number;
  content?: string;
  storageId?: string;
  metadata?: Record<string, unknown>;
  threadId?: string;
  createdAt: number;
  syncedToCloud: boolean;
}

// ============================================
// File State
// ============================================

export type FileOperation = "read" | "write" | "edit";

export interface FileState {
  path: string;
  contentHash?: string;
  size?: number;
  lastOperation: FileOperation;
  lastAccessAt: number;
  accessCount: number;
  threadId?: string;
}

export interface EditHistoryEntry {
  path: string;
  oldContentHash: string;
  newContentHash: string;
  diff: string;
  verified: boolean;
  threadId?: string;
  createdAt: number;
  rolledBack?: boolean;
  rollbackReason?: string;
}

// ============================================
// Verification
// ============================================

export interface VerificationCheck {
  name: string;
  success: boolean;
  output?: string;
  durationMs?: number;
}

export interface VerificationResult {
  success: boolean;
  checks: VerificationCheck[];
}

export interface TestSuiteResult {
  success: boolean;
  exitCode: number | null;
  output?: string;
  errors?: string;
  durationMs: number;
  timedOut?: boolean;
  testCommand: string;
}

// ============================================
// Checkpoints
// ============================================

export type CheckpointReason = "timeout" | "token_limit" | "manual" | "error_recovery";
export type CheckpointStatus = "active" | "restored" | "completed" | "failed" | "superseded";

export interface FileSnapshot {
  path: string;
  contentHash: string;
  size: number;
  lastModified: number;
}

export interface BeadSnapshot {
  id: string;
  title: string;
  status: string;
  type: string;
  priority: number;
}

export interface MessageSnapshot {
  role: string;
  content: string;
  timestamp?: number;
}

export interface Checkpoint {
  sessionId: string;
  threadId: string;
  iteration: number;
  messageHistory: MessageSnapshot[];
  fileState: FileSnapshot[];
  beadsState: BeadSnapshot[];
  artifactsProduced: string[];
  nextTask: string;
  reason: CheckpointReason;
  status: CheckpointStatus;
  metadata?: Record<string, unknown>;
  createdAt: number;
  restoredAt?: number;
  completedAt?: number;
  error?: string;
}

// ============================================
// Agent Decisions
// ============================================

export type DecisionType =
  | "tool_selection"
  | "file_edit"
  | "task_breakdown"
  | "verification"
  | "rollback"
  | "checkpoint"
  | "error_recovery";

export type DecisionOutcome = "success" | "partial_success" | "failure" | "abandoned";

export interface AgentDecision {
  threadId: string;
  task: string;
  decisionType: DecisionType;
  selectedTools?: string[];
  reasoning: string;
  expectedOutcome?: string;
  alternatives?: Array<{ option: string; reason: string }>;
  confidence?: number;
  outcome?: DecisionOutcome;
  actualResult?: string;
  timestamp: number;
}

// ============================================
// LSP
// ============================================

export type Language = "typescript" | "python" | "rust";

export interface LspDiagnostic {
  path: string;
  line: number;
  character: number;
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  code?: string | number;
  source?: string;
}

export interface LspCompletion {
  label: string;
  kind: string;
  detail?: string;
  documentation?: string;
  insertText?: string;
}

export interface LspHover {
  contents: string;
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

// ============================================
// Browser
// ============================================

export interface BrowserElement {
  ref: string;
  tag: string;
  text?: string;
  role?: string;
  attributes: Record<string, string>;
}

export interface BrowserSnapshot {
  url: string;
  title: string;
  elements: BrowserElement[];
  screenshot?: string;
}

// ============================================
// Subagents
// ============================================

export type SubagentStatus = "pending" | "running" | "completed" | "failed";

export interface Subagent {
  parentThreadId: string;
  threadId: string;
  name: string;
  task: string;
  tools: string[];
  model: string;
  status: SubagentStatus;
  result?: unknown;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

// ============================================
// Sync Queue
// ============================================

export type SyncItemType = "artifact" | "bead" | "decision" | "checkpoint" | "result";
export type SyncStatus = "pending" | "in_progress" | "completed" | "failed";

export interface SyncQueueItem {
  type: SyncItemType;
  itemId: string;
  priority: number;
  status: SyncStatus;
  attempts: number;
  lastError?: string;
  cloudId?: string;
  createdAt: number;
}
