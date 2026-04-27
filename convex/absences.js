import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("absences").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    userName: v.string(),
    type: v.string(), // "pause" or "absent"
    duration: v.union(v.number(), v.null()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("absences", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
