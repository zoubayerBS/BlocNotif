import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const log = mutation({
  args: {
    notifId: v.id("notifications"),
    event: v.string(),
    userId: v.optional(v.id("users")),
    userName: v.optional(v.string()),
    deviceInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notificationLogs", {
      notifId: args.notifId,
      event: args.event,
      userId: args.userId || null,
      userName: args.userName || null,
      deviceInfo: args.deviceInfo || null,
    });
  },
});

export const getByNotif = query({
  args: { notifId: v.id("notifications") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notificationLogs")
      .withIndex("by_notifId", (q) => q.eq("notifId", args.notifId))
      .order("asc")
      .collect();
  },
});

export const getAuditLog = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("notificationLogs").order("desc").collect();
    const notifs = await ctx.db.query("notifications").collect();
    const users = await ctx.db.query("users").collect();

    const notifMap = new Map(notifs.map(n => [n._id, n]));
    const userMap = new Map(users.map(u => [u._id, u.name]));

    return logs.map(log => ({
      ...log,
      notifType: notifMap.get(log.notifId)?.type || 'Inconnu',
      notifRoom: notifMap.get(log.notifId)?.room || '?',
      notifPriority: notifMap.get(log.notifId)?.priority || '?',
      notifMessage: notifMap.get(log.notifId)?.message || '',
      authorName: notifMap.get(log.notifId)?.authorName || 'Inconnu',
    }));
  },
});
