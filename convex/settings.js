import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserFromContext, checkAbility } from "./authorization.js";

// Valeurs par défaut : masquées tant qu'un admin ne les active pas
const DEFAULT_FEATURES = {
  appelAstreinte: false,
  appelMar: false,
};

async function getFeaturesRow(ctx) {
  return await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "features"))
    .first();
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const row = await getFeaturesRow(ctx);
    if (!row) return { ...DEFAULT_FEATURES };
    return {
      appelAstreinte: row.appelAstreinte,
      appelMar: row.appelMar,
    };
  },
});

export const update = mutation({
  args: {
    appelAstreinte: v.boolean(),
    appelMar: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromContext(ctx);
    checkAbility(user, "manage", "Settings");

    const existing = await getFeaturesRow(ctx);
    if (existing) {
      await ctx.db.patch(existing._id, {
        appelAstreinte: args.appelAstreinte,
        appelMar: args.appelMar,
      });
    } else {
      await ctx.db.insert("settings", {
        key: "features",
        appelAstreinte: args.appelAstreinte,
        appelMar: args.appelMar,
      });
    }
    return { success: true };
  },
});
