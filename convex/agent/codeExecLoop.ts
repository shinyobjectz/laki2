/**
 * Code Execution Agent Loop
 *
 * This is the NEW agent loop that uses code execution instead of JSON tool calls.
 *
 * Architecture:
 * 1. Send prompt to LLM (NO tool schemas)
 * 2. LLM responds with TypeScript code
 * 3. Extract code blocks from response
 * 4. Execute code in E2B sandbox
 * 5. Feed output back to LLM
 * 6. Repeat until task complete
 *
 * The agent imports from /home/user/ksa/ (KSAs - Knowledge, Skills, Abilities).
 */

import { internal } from "../_generated/api";
import { wrapCodeForExecution } from "../utils/codeExecHelpers";
import type { ChainOfThoughtStep, StepStatus } from "../../shared/chain-of-thought";
import { createStepId } from "../../shared/chain-of-thought";

// ============================================================================
// Types
// ============================================================================

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GatewayConfig {
  convexUrl: string;
  jwt: string;
}

interface CodeExecResult {
  text: string;
  codeExecutions: Array<{
    code: string;
    output: string;
    success: boolean;
  }>;
}

// ============================================================================
// Chain of Thought Tracking
// ============================================================================

const chainOfThoughtSteps: Map<string, ChainOfThoughtStep[]> = new Map();

function emitStep(
  threadId: string,
  step: Omit<ChainOfThoughtStep, "id" | "timestamp">
): string {
  if (!chainOfThoughtSteps.has(threadId)) {
    chainOfThoughtSteps.set(threadId, []);
  }
  const fullStep = {
    id: createStepId(),
    timestamp: Date.now(),
    ...step,
  } as ChainOfThoughtStep;
  chainOfThoughtSteps.get(threadId)!.push(fullStep);
  return fullStep.id;
}

function updateStepStatus(threadId: string, stepId: string, status: StepStatus) {
  const steps = chainOfThoughtSteps.get(threadId);
  if (steps) {
    const step = steps.find((s) => s.id === stepId);
    if (step) step.status = status;
  }
}

export function getSteps(threadId: string): ChainOfThoughtStep[] {
  return chainOfThoughtSteps.get(threadId) || [];
}

// ============================================================================
// Cloud LLM Gateway (Single execute_code tool)
// ============================================================================

interface ToolCall {
  toolName: string;
  args: Record<string, unknown>;
}

interface LLMResponse {
  text: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
}

// Single tool for code execution
const EXECUTE_CODE_TOOL = {
  type: "function" as const,
  function: {
    name: "execute_code",
    description: "Execute TypeScript code that imports from KSAs (./ksa/*). Use this to perform actions like saving artifacts, searching the web, generating PDFs, etc.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "TypeScript code to execute. Import from ./ksa/* for capabilities.",
        },
      },
      required: ["code"],
    },
  },
};

/**
 * Call the cloud LLM gateway with single execute_code tool.
 */
async function callCloudLLM(
  messages: LLMMessage[],
  gatewayConfig: GatewayConfig,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<LLMResponse> {
  const { convexUrl, jwt } = gatewayConfig;

  if (!convexUrl || !jwt) {
    throw new Error("Gateway not configured");
  }

  const response = await fetch(`${convexUrl}/agent/call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      path: "services.OpenRouter.internal.chatCompletion",
      args: {
        model: options.model || "google/gemini-3-flash-preview",
        messages,
        tools: [EXECUTE_CODE_TOOL],
        maxTokens: options.maxTokens || 4096,
        temperature: options.temperature,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM call failed: ${response.status}`);
  }

  const result = await response.json();
  if (!result.ok) {
    throw new Error(`LLM error: ${result.error || JSON.stringify(result)}`);
  }

  const choice = result.data.choices?.[0];

  // Extract tool calls if present
  const toolCalls = choice?.message?.tool_calls?.map((tc: any) => {
    let args = {};
    const rawArgs = tc.function?.arguments || tc.arguments;
    if (typeof rawArgs === "string" && rawArgs.length > 0) {
      try {
        args = JSON.parse(rawArgs);
      } catch (e) {
        args = { code: rawArgs }; // Treat as raw code if JSON parse fails
      }
    } else if (typeof rawArgs === "object" && rawArgs !== null) {
      args = rawArgs;
    }
    return {
      toolName: tc.function?.name || tc.name,
      args,
    };
  });

  return {
    text: choice?.message?.content || "",
    toolCalls: toolCalls?.length > 0 ? toolCalls : undefined,
    finishReason: choice?.finish_reason,
  };
}

// ============================================================================
// Code Execution Agent Loop
// ============================================================================

/**
 * Run the code execution agent loop.
 *
 * Architecture:
 * - LLM has single execute_code tool
 * - LLM calls the tool with TypeScript code
 * - We execute the code and return results
 * - Loop until LLM responds without tool calls
 */
export async function runCodeExecLoop(
  ctx: any,
  systemPrompt: string,
  userPrompt: string,
  gatewayConfig: GatewayConfig,
  options: {
    maxSteps?: number;
    threadId?: string;
  } = {}
): Promise<CodeExecResult> {
  const maxSteps = options.maxSteps || 10;
  const threadId = options.threadId || `codeexec_${Date.now()}`;

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const allExecutions: CodeExecResult["codeExecutions"] = [];
  let finalText = "";

  emitStep(threadId, {
    type: "thinking",
    status: "complete",
    label: "Starting code execution loop...",
  });

  for (let step = 0; step < maxSteps; step++) {
    const thinkingId = emitStep(threadId, {
      type: "thinking",
      status: "active",
      label: `Step ${step + 1}: Thinking...`,
    });

    // Call LLM with execute_code tool
    const response = await callCloudLLM(messages, gatewayConfig);
    updateStepStatus(threadId, thinkingId, "complete");

    // If no tool calls, this is the final response
    if (!response.toolCalls || response.toolCalls.length === 0) {
      finalText = response.text;
      if (finalText) {
        emitStep(threadId, {
          type: "text",
          status: "complete",
          label: finalText.slice(0, 200),
        });
      }
      break;
    }

    // Execute each tool call (should be execute_code)
    const toolResults: string[] = [];

    for (const tc of response.toolCalls) {
      if (tc.toolName !== "execute_code") {
        toolResults.push(`Unknown tool: ${tc.toolName}`);
        continue;
      }

      const code = wrapCodeForExecution((tc.args as any).code || "");

      const execId = emitStep(threadId, {
        type: "tool",
        status: "active",
        toolName: "execute_code",
        label: "Executing code...",
        input: { code: code.slice(0, 500) },
      });

      try {
        const result = await ctx.runAction(internal.actions.codeExec.execute, {
          code,
          timeoutMs: 60_000,
        });

        allExecutions.push({
          code,
          output: result.output,
          success: result.success,
        });

        if (result.success) {
          toolResults.push(`[execute_code result]\n${result.output}`);
          updateStepStatus(threadId, execId, "complete");
        } else {
          toolResults.push(`[execute_code error]\n${result.error}\n${result.output}`);
          updateStepStatus(threadId, execId, "error");
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        toolResults.push(`[execute_code error]\n${msg}`);
        allExecutions.push({
          code,
          output: msg,
          success: false,
        });
        updateStepStatus(threadId, execId, "error");
      }
    }

    // Add assistant message
    messages.push({
      role: "assistant",
      content: response.text || `Called execute_code`,
    });

    // Add tool results as user message
    messages.push({
      role: "user",
      content: `${toolResults.join("\n\n")}\n\nContinue with the task. When complete, respond without calling execute_code.`,
    });
  }

  return {
    text: finalText,
    codeExecutions: allExecutions,
  };
}
