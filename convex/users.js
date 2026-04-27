import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Mock initialization to seed default team if empty
export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const updateRole = mutation({
  args: { id: v.id("users"), role: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { role: args.role });
  },
});

export const seedTeam = mutation({
  args: {},
  handler: async (ctx) => {
    const existingUsers = await ctx.db.query("users").collect();
    if (existingUsers.length > 0) return "Already seeded";

    const DEFAULT_TEAM = [
      { username: 'karim', password: 'password', name: 'Karim Benali', role: 'surveillant bloc', status: 'present', since: null, duration: null, reason: '' },
      { username: 'sarah', password: 'password', name: 'Dr. Sarah Moussaoui', role: 'medecin anesthesiste', status: 'present', since: null, duration: null, reason: '' },
      { username: 'youcef', password: 'password', name: 'Youcef Hadj', role: 'technicien', status: 'present', since: null, duration: null, reason: '' },
      { username: 'amina', password: 'password', name: 'Amina Khelifi', role: 'technicien', status: 'present', since: null, duration: null, reason: '' },
      { username: 'mehdi', password: 'password', name: 'Dr. Mehdi Larbi', role: 'medecin anesthesiste', status: 'present', since: null, duration: null, reason: '' },
      { username: 'nadia', password: 'password', name: 'Nadia Bouzid', role: 'technicien', status: 'present', since: null, duration: null, reason: '' },
      { username: 'rachid', password: 'password', name: 'Rachid Ferhat', role: 'technicien', status: 'present', since: null, duration: null, reason: '' },
      { username: 'leila', password: 'password', name: 'Leila Mansouri', role: 'technicien', status: 'present', since: null, duration: null, reason: '' },
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
    
    // Search for user
    const users = await ctx.db.query("users").collect();
    const user = users.find(u => u.username.toLowerCase() === normalizedUsername && u.password === args.password);
    
    return user || null;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const updateStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.string(), // "present", "pause", "absent"
    since: v.union(v.number(), v.null()),
    duration: v.union(v.number(), v.null()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);
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
      status: 'present',
      since: null,
      duration: null,
      reason: '',
    });

    return userId;
  },
});
