/**
 * Context KSA - Knowledge, Skills, and Abilities
 *
 * Manage card context and variables that persist across stages.
 * Use this to read the current context and set variables for later stages.
 *
 * @example
 * import { getContext, setVariable, getVariable } from './ksa/context';
 *
 * // Get current card context
 * const ctx = await getContext();
 * console.log(`Working on card: ${ctx.cardId}`);
 *
 * // Set a variable for later stages
 * await setVariable('targetAudience', 'enterprise developers');
 *
 * // Get a previously set variable
 * const audience = await getVariable('targetAudience');
 */

// ============================================================================
// Types
// ============================================================================

export interface CardContext {
  success: boolean;
  cardId?: string;
  workspaceId?: string;
  variables: Record<string, unknown>;
  artifactCount: number;
  error?: string;
}

export interface SetVariableResult {
  success: boolean;
  key?: string;
  error?: string;
}

// ============================================================================
// Gateway Config (set by runtime)
// ============================================================================

let gatewayConfig: { convexUrl: string; jwt: string; cardId?: string } | null =
  null;

/**
 * Set the gateway config for cloud operations.
 * Called by the runtime when starting a session.
 */
export function setGatewayConfig(config: {
  convexUrl: string;
  jwt: string;
  cardId?: string;
}) {
  gatewayConfig = config;
}

// ============================================================================
// Internal: Cloud Communication
// ============================================================================

async function callCloud(
  servicePath: string,
  args: Record<string, unknown>,
  type: "query" | "action" | "mutation" = "query"
): Promise<any> {
  const convexUrl = gatewayConfig?.convexUrl || process.env.CONVEX_URL;
  const jwt = gatewayConfig?.jwt || process.env.SANDBOX_JWT;

  if (!convexUrl || !jwt) {
    console.log("[context] Gateway not configured");
    return { error: "Gateway not configured" };
  }

  try {
    const response = await fetch(`${convexUrl}/agent/call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ path: servicePath, type, args }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[context] Cloud call failed: ${error}`);
      return { error };
    }

    const result = await response.json();
    if (!result.ok) {
      console.error(`[context] Cloud error: ${result.error}`);
      return { error: result.error };
    }

    return result.data;
  } catch (error) {
    console.error(`[context] Cloud exception: ${error}`);
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

// ============================================================================
// Skills: Reading Context
// ============================================================================

/**
 * Get the current card's context.
 *
 * Includes variables set by previous stages and artifact references.
 *
 * @returns Card context with variables and artifact count
 *
 * @example
 * const ctx = await getContext();
 * console.log(`Card: ${ctx.cardId}`);
 * console.log(`Variables: ${JSON.stringify(ctx.variables)}`);
 * console.log(`Artifacts: ${ctx.artifactCount}`);
 */
export async function getContext(): Promise<CardContext> {
  const cardId = gatewayConfig?.cardId || process.env.CARD_ID;
  if (!cardId) {
    return {
      success: false,
      error: "No cardId available",
      variables: {},
      artifactCount: 0,
    };
  }

  const result = await callCloud(
    "features.kanban.executor.getCardContext",
    { cardId },
    "query"
  );

  if (result?.error) {
    return {
      success: false,
      error: result.error,
      variables: {},
      artifactCount: 0,
    };
  }

  console.log(`[context] Got card context`);
  return {
    success: true,
    cardId,
    workspaceId: result.workspaceId,
    variables: result.variables || {},
    artifactCount: (result.artifacts || []).length,
  };
}

/**
 * Get a specific variable from the card context.
 *
 * Convenience wrapper around getContext().
 *
 * @param key - Variable name
 * @returns Variable value or undefined
 *
 * @example
 * const audience = await getVariable('targetAudience');
 * if (audience) {
 *   console.log(`Target: ${audience}`);
 * }
 */
export async function getVariable(key: string): Promise<unknown> {
  const ctx = await getContext();
  return ctx.variables[key];
}

// ============================================================================
// Skills: Setting Variables
// ============================================================================

/**
 * Set a variable in the card context.
 *
 * Variables persist across stages, so later stages can access them.
 *
 * @param key - Variable name
 * @param value - Variable value (any JSON-serializable value)
 * @returns Result with success status
 *
 * @example
 * // Set a string variable
 * await setVariable('targetAudience', 'enterprise developers');
 *
 * // Set an object variable
 * await setVariable('researchFindings', {
 *   competitors: ['A', 'B', 'C'],
 *   marketSize: '$10B',
 * });
 *
 * // Set a list variable
 * await setVariable('keyInsights', [
 *   'Market is growing 20% YoY',
 *   'Main competitor has 45% share',
 * ]);
 */
export async function setVariable(
  key: string,
  value: unknown
): Promise<SetVariableResult> {
  const cardId = gatewayConfig?.cardId || process.env.CARD_ID;
  if (!cardId) {
    return { success: false, error: "No cardId available" };
  }

  const result = await callCloud(
    "features.kanban.executor.setVariable",
    { cardId, key, value },
    "mutation"
  );

  if (result?.error) {
    return { success: false, error: result.error };
  }

  console.log(`[context] Set variable: ${key}`);
  return { success: true, key };
}
