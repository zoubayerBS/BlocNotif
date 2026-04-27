import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("rooms").collect();
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    // Check if room already exists
    const existing = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
    
    if (existing) {
      throw new Error("Cette salle existe déjà.");
    }

    return await ctx.db.insert("rooms", { name: args.name });
  },
});

export const remove = mutation({
  args: { id: v.id("rooms") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const rooms = ["Salle 1", "Salle 2", "Salle 3", "Salle 4", "Salle 5", "Salle 6", "SSPI"];
    for (const name of rooms) {
      const existing = await ctx.db
        .query("rooms")
        .filter((q) => q.eq(q.field("name"), name))
        .first();
      if (!existing) {
        await ctx.db.insert("rooms", { name });
      }
    }
  },
});
