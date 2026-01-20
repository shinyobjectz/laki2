/**
 * Centralized Model Configuration
 *
 * All LLM model selection flows through this module.
 * Implementations can override presets via config.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Re-export shared model constants for backward compatibility
export { MODEL_PRESETS, resolveModel, getModelForUseCase, type ModelPreset } from "../../shared/models";
import type { ModelPreset } from "../../shared/models";
import { resolveModel } from "../../shared/models";

/**
 * Model configuration stored in the database.
 */
export interface ModelConfig {
  /** Default model preset */
  defaultPreset: ModelPreset;
  /** Custom preset overrides */
  presets?: Partial<Record<ModelPreset, string>>;
  /** Per-use-case overrides */
  useCaseOverrides?: Record<string, string>;
}

/**
 * Default model configuration.
 */
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  defaultPreset: "balanced",
  presets: {},
  useCaseOverrides: {},
};

// ============================================================================
// Convex Functions
// ============================================================================

/**
 * Get model configuration from database or return defaults.
 */
export const getConfig = query({
  args: {},
  handler: async (ctx): Promise<ModelConfig> => {
    const config = await ctx.db
      .query("modelConfig")
      .first();
    
    if (!config) {
      return DEFAULT_MODEL_CONFIG;
    }
    
    return {
      defaultPreset: (config.defaultPreset as ModelPreset) || "balanced",
      presets: config.presets as Partial<Record<ModelPreset, string>> || {},
      useCaseOverrides: config.useCaseOverrides as Record<string, string> || {},
    };
  },
});

/**
 * Update model configuration.
 */
export const updateConfig = mutation({
  args: {
    defaultPreset: v.optional(v.string()),
    presets: v.optional(v.any()),
    useCaseOverrides: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("modelConfig")
      .first();
    
    const updates: Record<string, unknown> = {};
    if (args.defaultPreset) updates.defaultPreset = args.defaultPreset;
    if (args.presets) updates.presets = args.presets;
    if (args.useCaseOverrides) updates.useCaseOverrides = args.useCaseOverrides;
    
    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      return await ctx.db.insert("modelConfig", {
        defaultPreset: args.defaultPreset || "balanced",
        presets: args.presets || {},
        useCaseOverrides: args.useCaseOverrides || {},
      });
    }
  },
});

/**
 * Resolve model for a given context.
 */
export const resolveForContext = query({
  args: {
    preset: v.optional(v.string()),
    useCase: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const config = await ctx.db
      .query("modelConfig")
      .first();
    
    const presets = config?.presets as Partial<Record<ModelPreset, string>> || {};
    const useCaseOverrides = config?.useCaseOverrides as Record<string, string> || {};
    
    // Check use case override first
    if (args.useCase && useCaseOverrides[args.useCase]) {
      return useCaseOverrides[args.useCase];
    }
    
    // Then check preset
    if (args.preset) {
      return resolveModel(args.preset, presets);
    }
    
    // Fall back to default
    const defaultPreset = (config?.defaultPreset as ModelPreset) || "balanced";
    return resolveModel(defaultPreset, presets);
  },
});
