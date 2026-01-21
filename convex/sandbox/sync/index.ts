/**
 * Sync Outbox - Local to Cloud Sync
 *
 * Transactional outbox pattern for syncing local sandbox data to cloud.
 * All local writes are recorded atomically, then synced via gateway.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================================
// Outbox Operations
// ============================================================================

/**
 * Add an item to the sync outbox.
 * Called atomically with the local write.
 */
export const addToOutbox = mutation({
  args: {
    idempotencyKey: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    operation: v.union(
      v.literal("create"),
      v.literal("update"),
      v.literal("delete"),
      v.literal("upsert")
    ),
    payload: v.any(),
    cloudPath: v.string(),
    priority: v.optional(v.number()),
    sessionId: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for existing entry with same idempotency key
    const existing = await ctx.db
      .query("syncOutbox")
      .withIndex("by_idempotency", q => q.eq("idempotencyKey", args.idempotencyKey))
      .first();

    if (existing) {
      // Already in outbox, skip
      return existing._id;
    }

    return await ctx.db.insert("syncOutbox", {
      idempotencyKey: args.idempotencyKey,
      entityType: args.entityType,
      entityId: args.entityId,
      operation: args.operation,
      payload: args.payload,
      cloudPath: args.cloudPath,
      status: "pending",
      attempts: 0,
      maxAttempts: 3,
      priority: args.priority ?? 5,
      createdAt: Date.now(),
      sessionId: args.sessionId,
      threadId: args.threadId,
    });
  },
});

/**
 * Get pending items from outbox, ordered by priority and creation time.
 */
export const getPendingItems = query({
  args: {
    limit: v.optional(v.number()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.sessionId) {
      return await ctx.db
        .query("syncOutbox")
        .withIndex("by_session", q => q.eq("sessionId", args.sessionId).eq("status", "pending"))
        .take(limit);
    }

    return await ctx.db
      .query("syncOutbox")
      .withIndex("by_priority", q => q.eq("status", "pending"))
      .take(limit);
  },
});

/**
 * Mark item as syncing (in progress).
 */
export const markSyncing = mutation({
  args: {
    id: v.id("syncOutbox"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return null;

    await ctx.db.patch(args.id, {
      status: "syncing",
      lastAttemptAt: Date.now(),
      attempts: item.attempts + 1,
    });

    return item;
  },
});

/**
 * Mark item as synced (success).
 */
export const markSynced = mutation({
  args: {
    id: v.id("syncOutbox"),
    cloudId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "synced",
      syncedAt: Date.now(),
      cloudId: args.cloudId,
    });
  },
});

/**
 * Mark item as failed.
 */
export const markFailed = mutation({
  args: {
    id: v.id("syncOutbox"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return;

    const newStatus = item.attempts >= item.maxAttempts ? "failed" : "pending";

    await ctx.db.patch(args.id, {
      status: newStatus,
      lastError: args.error,
      lastAttemptAt: Date.now(),
    });
  },
});

/**
 * Get outbox statistics.
 */
export const getStats = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let items;
    if (args.sessionId) {
      items = await ctx.db
        .query("syncOutbox")
        .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
        .collect();
    } else {
      items = await ctx.db.query("syncOutbox").collect();
    }

    return {
      total: items.length,
      pending: items.filter(i => i.status === "pending").length,
      syncing: items.filter(i => i.status === "syncing").length,
      synced: items.filter(i => i.status === "synced").length,
      failed: items.filter(i => i.status === "failed").length,
      byType: items.reduce((acc, i) => {
        acc[i.entityType] = (acc[i.entityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },
});

/**
 * Clear synced items (cleanup).
 */
export const clearSynced = mutation({
  args: {
    olderThanMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.olderThanMs ?? 24 * 60 * 60 * 1000); // 24h default

    const synced = await ctx.db
      .query("syncOutbox")
      .withIndex("by_status", q => q.eq("status", "synced"))
      .collect();

    let deleted = 0;
    for (const item of synced) {
      if (item.syncedAt && item.syncedAt < cutoff) {
        await ctx.db.delete(item._id);
        deleted++;
      }
    }

    return { deleted };
  },
});

/**
 * Retry failed items.
 */
export const retryFailed = mutation({
  args: {
    entityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const failed = await ctx.db
      .query("syncOutbox")
      .withIndex("by_status", q => q.eq("status", "failed"))
      .collect();

    let retried = 0;
    for (const item of failed) {
      if (!args.entityType || item.entityType === args.entityType) {
        await ctx.db.patch(item._id, {
          status: "pending",
          attempts: 0,
          lastError: undefined,
        });
        retried++;
      }
    }

    return { retried };
  },
});
