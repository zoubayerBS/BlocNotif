import { query, internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserFromContext, checkAbility, validateRole } from "./authorization.js";

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getUserFromContext(ctx);
    checkAbility(user, 'manage', 'User');
    await ctx.db.delete(args.id);
  },
});

export const updateRole = mutation({
  args: { id: v.id("users"), role: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserFromContext(ctx);
    checkAbility(user, 'manage', 'User');
    validateRole(args.role);
    await ctx.db.patch(args.id, { role: args.role });
  },
});

export const setPassword = mutation({
  args: { userId: v.id("users"), password: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { password: args.password });
  },
});

export const seedTeam = mutation({
  args: {},
  handler: async (ctx) => {
    const existingUsers = await ctx.db.query("users").collect();
    if (existingUsers.length > 0) return "Already seeded";

    const DEFAULT_TEAM = [
      { username: 'karim', password: 'password', name: 'Karim Benali', role: 'surveillant bloc' },
      { username: 'sarah', password: 'password', name: 'Dr. Sarah Moussaoui', role: 'medecin anesthesiste' },
      { username: 'youcef', password: 'password', name: 'Youcef Hadj', role: 'technicien' },
      { username: 'amina', password: 'password', name: 'Amina Khelifi', role: 'technicien' },
      { username: 'mehdi', password: 'password', name: 'Dr. Mehdi Larbi', role: 'medecin anesthesiste' },
      { username: 'nadia', password: 'password', name: 'Nadia Bouzid', role: 'technicien' },
      { username: 'rachid', password: 'password', name: 'Rachid Ferhat', role: 'technicien' },
      { username: 'leila', password: 'password', name: 'Leila Mansouri', role: 'technicien' },
    ];

    for (const user of DEFAULT_TEAM) {
      await ctx.db.insert("users", user);
    }
    return "Seeded successfully";
  },
});

export const login = query({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const normalizedUsername = args.username.trim().toLowerCase();
    const users = await ctx.db.query("users").collect();
    const user = users.find(u => u.username.toLowerCase() === normalizedUsername);
    if (!user) return null;

    if (user.password !== args.password) return null;

    const { password, ...safeUser } = user;
    return safeUser;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(({ password, ...rest }) => rest);
  },
});

export const getForAuth = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const create = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    name: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    validateRole(args.role);

    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username.toLowerCase()))
      .first();
    
    if (existing) {
      throw new Error("Username already taken");
    }

    const userId = await ctx.db.insert("users", {
      username: args.username.toLowerCase(),
      password: args.password,
      name: args.name,
      role: args.role,
    });

    return userId;
  },
});

export const savePushSubscription = mutation({
  args: {
    userId: v.id("users"),
    subscription: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    const existingSub = existing.find(
      (sub) => sub.subscription.endpoint === args.subscription.endpoint
    );

    if (existingSub) {
      await ctx.db.patch(existingSub._id, {
        subscription: args.subscription,
      });
    } else {
      await ctx.db.insert("pushSubscriptions", {
        userId: args.userId,
        subscription: args.subscription,
      });
    }
  },
});

export const removePushSubscription = mutation({
  args: {
    userId: v.id("users"),
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    for (const sub of existing) {
      if (sub.subscription.endpoint === args.endpoint) {
        await ctx.db.delete(sub._id);
      }
    }
  },
});

export const removeSubscriptionByEndpoint = mutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const allSubs = await ctx.db.query("pushSubscriptions").collect();
    for (const sub of allSubs) {
      if (sub.subscription.endpoint === args.endpoint) {
        await ctx.db.delete(sub._id);
      }
    }
  },
});
