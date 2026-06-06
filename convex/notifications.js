import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("notifications").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    room: v.string(),
    type: v.string(),
    priority: v.string(),
    message: v.string(),
    authorId: v.id("users"),
    authorName: v.string(),
    targetId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const newNotifId = await ctx.db.insert("notifications", {
      ...args,
      targetId: args.targetId || null,
      timestamp: Date.now(),
      takenBy: null,
      takenByName: null,
      takenAt: null,
      resolved: false,
      acknowledgedBy: [],
    });

    // Custom push notification content for urgent alerts
    let pushTitle = `${args.type} - Salle ${args.room}`;
    let pushMessage = args.message || `Alerte ${args.priority} en salle ${args.room}`;

    if (args.type === 'Appel Astreinte') {
      pushTitle = `🚨 RAPPEL ASTREINTE - BLOC`;
      pushMessage = args.message ? `⚠️ Astreinte : ${args.message}` : `⚠️ Vous êtes appelé à l'astreinte immédiatement au Bloc Central.`;
    }

    // Send push notification via Web Push
    let subscriptions = [];
    if (args.targetId) {
      const userSubs = await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", args.targetId))
        .collect();
      subscriptions = userSubs.map(s => s.subscription);
    } else if (args.type === 'Appel Astreinte') {
      // General astreinte call. Target users with the specific role:
      let targetRole = null;
      if (args.message.includes("Technicien") || args.message.includes("IADE")) {
        targetRole = "technicien";
      } else if (args.message.includes("MAR")) {
        targetRole = "medecin anesthesiste";
      }

      if (targetRole) {
        const users = await ctx.db.query("users").collect();
        const targetUserIds = users.filter(u => u.role === targetRole).map(u => u._id);
        
        for (const uid of targetUserIds) {
          const userSubs = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", uid))
            .collect();
          subscriptions.push(...userSubs.map(s => s.subscription));
        }
      } else {
        const allSubs = await ctx.db.query("pushSubscriptions").collect();
        subscriptions = allSubs.map(s => s.subscription);
      }
    } else {
      const allSubs = await ctx.db.query("pushSubscriptions").collect();
      subscriptions = allSubs.map(s => s.subscription);
    }

    if (subscriptions.length > 0) {
      await ctx.scheduler.runAfter(0, internal.webpush.sendPush, {
        title: pushTitle,
        message: pushMessage,
        subscriptions,
      });
    }

    return newNotifId;
  },
});

export const take = mutation({
  args: {
    notifId: v.id("notifications"),
    userId: v.id("users"),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const notif = await ctx.db.get(args.notifId);
    if (!notif) throw new Error("Notification not found");
    if (notif.takenBy) throw new Error("Already taken");

    await ctx.db.patch(args.notifId, {
      takenBy: args.userId,
      takenByName: args.userName,
      takenAt: Date.now(),
    });
  },
});

export const resolve = mutation({
  args: {
    notifId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notifId, {
      resolved: true,
    });
  },
});

export const acknowledge = mutation({
  args: {
    notifId: v.id("notifications"),
    userId: v.id("users"),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const notif = await ctx.db.get(args.notifId);
    if (!notif) throw new Error("Notification introuvable");

    const currentAck = notif.acknowledgedBy || [];
    if (currentAck.some((a) => a.userId === args.userId)) {
      return; // Already acknowledged
    }

    const updatedAck = [
      ...currentAck,
      {
        userId: args.userId,
        userName: args.userName,
        timestamp: Date.now(),
      },
    ];

    await ctx.db.patch(args.notifId, {
      acknowledgedBy: updatedAck,
    });
  },
});
