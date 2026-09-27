import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserFromContext, checkAbility } from "./authorization.js";

const MAX_ARCHIVES = 500;

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("archives")
      .withIndex("by_resolvedAt")
      .order("desc")
      .take(MAX_ARCHIVES);
  },
});

export const remove = mutation({
  args: { id: v.id("archives") },
  handler: async (ctx, args) => {
    const user = await getUserFromContext(ctx);
    checkAbility(user, "manage", "Notification");
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const purge = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromContext(ctx);
    checkAbility(user, "manage", "Notification");
    const docs = await ctx.db.query("archives").collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
    return { success: true, deleted: docs.length };
  },
});
