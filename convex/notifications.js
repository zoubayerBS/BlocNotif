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
    });

    // Custom push notification content for urgent alerts
    let pushTitle = `${args.type} - Salle ${args.room}`;
    let pushMessage = args.message || `Alerte ${args.priority} en salle ${args.room}`;

    if (args.type === 'Appel Astreinte') {
      pushTitle = `🚨 RAPPEL ASTREINTE - BLOC`;
      pushMessage = `⚠️ Vous êtes appelé à l'astreinte immédiatement au Bloc Central.`;
    }

    // Send push notification via OneSignal
    await ctx.scheduler.runAfter(0, internal.onesignal.sendPush, {
      title: pushTitle,
      message: pushMessage,
      targetId: args.targetId,
    });

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
