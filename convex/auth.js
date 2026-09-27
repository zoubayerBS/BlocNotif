"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 10;

const SESSION_ISSUER = "https://glorious-crocodile-963.eu-west-1.convex.site";
const SESSION_AUDIENCE = "blocnotif";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 jours

// Émet un JWT RS256 signé par la clé privée (env SESSION_PRIVATE_KEY),
// vérifié côté Convex grâce à convex/auth.config.js + convex/http.js (JWKS).
function signSession(userId) {
  const privateKey = process.env.SESSION_PRIVATE_KEY;
  if (!privateKey) throw new Error("SESSION_PRIVATE_KEY manquante côté Convex");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: "blocnotif-1" };
  const payload = {
    iss: SESSION_ISSUER,
    aud: SESSION_AUDIENCE,
    sub: userId,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    jti: crypto.randomUUID(),
  };

  const data = `${Buffer.from(JSON.stringify(header)).toString("base64url")}.${Buffer.from(
    JSON.stringify(payload)
  ).toString("base64url")}`;

  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(data), privateKey)
    .toString("base64url");

  return `${data}.${signature}`;
}

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
        await ctx.runMutation(internal.users.setPassword, { userId: user._id, password: hash });
      }
    }

    if (!valid) return null;

    const { password, ...safeUser } = user;
    return { ...safeUser, sessionToken: signSession(user._id) };
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
    await ctx.runMutation(internal.users.setPassword, { userId: args.userId, password: hash });
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
        await ctx.runMutation(internal.users.setPassword, { userId: user._id, password: hash });
        migrated++;
      }
    }
    return `Migrated ${migrated} passwords`;
  },
});
