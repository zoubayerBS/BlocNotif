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
    patient: v.optional(v.string()),
    authorId: v.id("users"),
    authorName: v.string(),
    targetId: v.optional(v.id("users")),
    audience: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const newNotifId = await ctx.db.insert("notifications", {
      ...args,
      targetId: args.targetId || null,
      audience: args.audience || 'all',
      timestamp: Date.now(),
      takenBy: null,
      takenByName: null,
      takenAt: null,
      resolved: false,
      acknowledgedBy: [],
    });

    let pushTitle = `${args.type} - Salle ${args.room}`;
    let pushMessage = args.message || `Alerte ${args.priority} en salle ${args.room}`;

    if (args.type === 'Appel Astreinte') {
      pushTitle = `RAPPEL ASTREINTE - BLOC`;
      pushMessage = args.message ? `Astreinte : ${args.message}` : `Vous etes appele a l'astreinte immediatement au Bloc Central.`;
    }

    // Determine target users based on audience or targetId
    let targetUserIds = [];
    const allUsers = await ctx.db.query("users").collect();

    if (args.targetId) {
      targetUserIds = [args.targetId];
    } else if (args.type === 'Appel Astreinte') {
      let targetRole = null;
      if (args.message.includes("Technicien") || args.message.includes("IADE")) {
        targetRole = "technicien";
      } else if (args.message.includes("MAR")) {
        targetRole = "medecin anesthesiste";
      }
      if (targetRole) {
        targetUserIds = allUsers.filter(u => u.role === targetRole).map(u => u._id);
      } else {
        targetUserIds = allUsers.map(u => u._id);
      }
    } else {
      // Use audience filter
      targetUserIds = getAudienceUserIds(allUsers, args.audience || 'all');
    }

    // Collect subscriptions for target users
    let subscriptions = [];
    for (const uid of targetUserIds) {
      const userSubs = await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", uid))
        .collect();
      subscriptions.push(...userSubs.map(s => s.subscription));
    }

    if (subscriptions.length > 0) {
      await ctx.scheduler.runAfter(0, internal.webpush.sendPush, {
        title: pushTitle,
        message: pushMessage,
        subscriptions,
        notifId: newNotifId,
      });

      // Log "sent" for each targeted user
      for (const uid of targetUserIds) {
        await ctx.db.insert("notificationLogs", {
          notifId: newNotifId,
          event: "sent",
          userId: uid,
        });
      }
    }

    return newNotifId;
  },
});

function getAudienceUserIds(users, audience) {
  switch (audience) {
    case 'techniciens':
      return users.filter(u => u.role === 'technicien').map(u => u._id);
    case 'medecins':
      return users.filter(u => u.role === 'medecin anesthesiste').map(u => u._id);
    case 'instrumentistes':
      return users.filter(u => u.role === 'instrumentiste').map(u => u._id);
    case 'tech_marc':
      return users.filter(u => u.role === 'technicien' || u.role === 'medecin anesthesiste').map(u => u._id);
    default:
      return users.map(u => u._id);
  }
}

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

    // Log acknowledged event
    await ctx.db.insert("notificationLogs", {
      notifId: args.notifId,
      event: "acknowledged",
      userId: args.userId,
      userName: args.userName,
    });
  },
});
