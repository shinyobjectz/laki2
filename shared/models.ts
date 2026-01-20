/**
 * Shared Model Configuration
 *
 * Pure model preset constants and resolution logic.
 * Used by both cloud and sandbox code.
 */

/**
 * Model preset names.
 */
export type ModelPreset = "fast" | "balanced" | "capable" | "vision";

/**
 * Default model presets.
 * Fast models for quick tasks, capable models for complex reasoning.
 */
export const MODEL_PRESETS: Record<ModelPreset, string> = {
  fast: "groq/llama-3.1-70b-versatile",
  balanced: "anthropic/claude-sonnet-4",
  capable: "anthropic/claude-sonnet-4",
  vision: "anthropic/claude-sonnet-4",
} as const;

/**
 * Resolve a model preset or direct model name to the actual model ID.
 *
 * @param modelOrPreset - Either a preset name ("fast", "balanced") or direct model ID
 * @param customPresets - Optional custom preset overrides
 * @returns Resolved model ID
 */
export function resolveModel(
  modelOrPreset: string | ModelPreset,
  customPresets?: Partial<Record<ModelPreset, string>>
): string {
  const presets = { ...MODEL_PRESETS, ...customPresets };
  
  // Check if it's a preset name
  if (modelOrPreset in presets) {
    return presets[modelOrPreset as ModelPreset];
  }
  
  // Otherwise, treat as direct model ID
  return modelOrPreset;
}

/**
 * Get model for a specific use case.
 *
 * @param useCase - Use case description
 * @returns Recommended preset
 */
export function getModelForUseCase(useCase: 
  | "intent_analysis"
  | "code_execution"
  | "research"
  | "creative"
  | "vision"
): ModelPreset {
  switch (useCase) {
    case "intent_analysis":
      return "fast";
    case "code_execution":
      return "balanced";
    case "research":
      return "capable";
    case "creative":
      return "capable";
    case "vision":
      return "vision";
    default:
      return "balanced";
  }
}
