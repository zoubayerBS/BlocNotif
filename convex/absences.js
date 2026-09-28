import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserFromContext, checkAbility } from "./authorization.js";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("absences").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    type: v.string(),
    reason: v.string(),
    timestamp: v.number(), // date de début (minuit)
    duration: v.number(), // nombre de jours
  },
  handler: async (ctx, args) => {
    const user = await getUserFromContext(ctx);
    checkAbility(user, "create", "Absence");

    if (args.duration < 1) throw new Error("Durée invalide");

    return await ctx.db.insert("absences", {
      userId: user._id,
      userName: user.name,
      type: args.type,
      reason: args.reason,
      timestamp: args.timestamp,
      duration: args.duration,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("absences") },
  handler: async (ctx, args) => {
    const user = await getUserFromContext(ctx);
    const absence = await ctx.db.get(args.id);
    if (!absence) throw new Error("Absence introuvable");

    if (absence.userId !== user._id) {
      checkAbility(user, "manage", "Absence");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
