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
      userId: args.userId ?? null,
      userName: args.userName,
      deviceInfo: args.deviceInfo,
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
    const archives = await ctx.db.query("archives").collect();
    const users = await ctx.db.query("users").collect();

    const notifMap = new Map(notifs.map(n => [n._id, n]));
    const archMap = new Map(archives.map(a => [a.sourceId, a]));
    const userMap = new Map(users.map(u => [u._id, u.name]));

    // Les notifications clôturées ont quitté "notifications" : on les
    // retrouve dans "archives" (champs compatibles).
    const source = (id) => notifMap.get(id) || archMap.get(id);

    return logs.map(log => ({
      ...log,
      notifType: source(log.notifId)?.type || 'Inconnu',
      notifRoom: source(log.notifId)?.room || '?',
      notifPriority: source(log.notifId)?.priority || '?',
      notifMessage: source(log.notifId)?.message || '',
      authorName: source(log.notifId)?.authorName || 'Inconnu',
    }));
  },
});
