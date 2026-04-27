import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("permutations").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    requesterId: v.id("users"),
    requesterName: v.string(),
    targetId: v.id("users"),
    targetName: v.string(),
    slotA: v.string(),
    slotB: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("permutations", {
      ...args,
      status: "pending",
      comment: "",
      decidedBy: null,
      decidedAt: null,
      timestamp: Date.now(),
    });
  },
});

export const decide = mutation({
  args: {
    permId: v.id("permutations"),
    decision: v.string(), // "approved" or "rejected"
    comment: v.string(),
    decidedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.permId, {
      status: args.decision,
      comment: args.comment,
      decidedBy: args.decidedBy,
      decidedAt: Date.now(),
    });
  },
});
