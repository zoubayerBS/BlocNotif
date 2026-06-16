"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export const register = action({
  args: {
    username: v.string(),
    password: v.string(),
    name: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const hash = await bcrypt.hash(args.password, SALT_ROUNDS);
    const userId = await ctx.runMutation(api.users.create, {
      username: args.username,
      password: hash,
      name: args.name,
      role: args.role,
    });
    return userId;
  },
});

export const login = action({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const normalizedUsername = args.username.trim().toLowerCase();
    const users = await ctx.runQuery(api.users.getForAuth);
    const user = users.find(u => u.username.toLowerCase() === normalizedUsername);
    if (!user) return null;

    const isHashed = user.password.startsWith("$2");
    let valid = false;

    if (isHashed) {
      valid = await bcrypt.compare(args.password, user.password);
    } else {
      valid = args.password === user.password;
      if (valid) {
        const hash = await bcrypt.hash(args.password, SALT_ROUNDS);
        await ctx.runMutation(api.users.setPassword, { userId: user._id, password: hash });
      }
    }

    if (!valid) return null;

    const { password, ...safeUser } = user;
    return safeUser;
  },
});

export const changePassword = action({
  args: { userId: v.id("users"), oldPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.runQuery(api.users.getForAuth);
    const user = users.find(u => u._id === args.userId);
    if (!user) throw new Error("Utilisateur introuvable");

    const isHashed = user.password.startsWith("$2");
    let valid = false;

    if (isHashed) {
      valid = await bcrypt.compare(args.oldPassword, user.password);
    } else {
      valid = args.oldPassword === user.password;
    }

    if (!valid) throw new Error("Ancien mot de passe incorrect");

    const hash = await bcrypt.hash(args.newPassword, SALT_ROUNDS);
    await ctx.runMutation(api.users.setPassword, { userId: args.userId, password: hash });
    return true;
  },
});

export const migratePasswords = action({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(api.users.getForAuth);
    let migrated = 0;
    for (const user of users) {
      if (user.password && !user.password.startsWith("$2")) {
        const hash = await bcrypt.hash(user.password, SALT_ROUNDS);
        await ctx.runMutation(api.users.setPassword, { userId: user._id, password: hash });
        migrated++;
      }
    }
    return `Migrated ${migrated} passwords`;
  },
});
