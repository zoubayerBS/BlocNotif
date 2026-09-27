import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserFromContext, checkAbility } from "./authorization.js";

export const COLLECTIONS = [
  "users",
  "rooms",
  "notifications",
  "absences",
  "permutations",
  "pushSubscriptions",
  "notificationLogs",
  "settings",
  "archives",
];

// Purge en masse interdite : vider les utilisateurs verrouille l'accès à l'app
const BULK_CLEAR_FORBIDDEN = ["users"];

const MAX_LIST = 200;

async function requireDatabaseAccess(ctx) {
  const user = await getUserFromContext(ctx);
  checkAbility(user, "manage", "Database");
  return user;
}

function assertCollection(name) {
  if (!COLLECTIONS.includes(name)) throw new Error("Collection inconnue");
}

export const stats = query({
  args: {},
  handler: async (ctx) => {
    await requireDatabaseAccess(ctx);
    const out = {};
    for (const name of COLLECTIONS) {
      out[name] = (await ctx.db.query(name).collect()).length;
    }
    return out;
  },
});

export const list = query({
  args: {
    collection: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireDatabaseAccess(ctx);
    assertCollection(args.collection);
    const limit = Math.min(Math.max(args.limit ?? 50, 1), MAX_LIST);
    const docs = await ctx.db.query(args.collection).order("desc").take(limit);
    // Ne jamais exposer les hashes de mots de passe
    return docs.map((d) => {
      if (args.collection === "users" && d.password) {
        const { password, ...rest } = d;
        return rest;
      }
      return d;
    });
  },
});

export const removeDocument = mutation({
  args: {
    collection: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    await requireDatabaseAccess(ctx);
    assertCollection(args.collection);
    const id = ctx.db.normalizeId(args.collection, args.id);
    if (!id) throw new Error("ID invalide");
    await ctx.db.delete(id);
    return { success: true };
  },
});

export const clearCollection = mutation({
  args: { collection: v.string() },
  handler: async (ctx, args) => {
    await requireDatabaseAccess(ctx);
    assertCollection(args.collection);
    if (BULK_CLEAR_FORBIDDEN.includes(args.collection)) {
      throw new Error("Purge en masse interdite : supprimez les utilisateurs un par un");
    }
    const docs = await ctx.db.query(args.collection).collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
    return { success: true, deleted: docs.length };
  },
});
