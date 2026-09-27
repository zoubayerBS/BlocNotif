import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getUserFromContext, checkAbility } from "./authorization.js";

// Déplace une notification clôturée vers la table "archives"
async function archiveNotification(ctx, notif, resolvedAt, resolvedBy) {
  await ctx.db.insert("archives", {
    sourceId: notif._id,
    kind: notif.type === "Annonce" ? "annonce" : "notification",
    type: notif.type,
    room: notif.room,
    priority: notif.priority,
    message: notif.message,
    patient: notif.patient || undefined,
    authorId: notif.authorId,
    authorName: notif.authorName,
    audience: notif.audience || undefined,
    targetId: notif.targetId ?? null,
    originalTimestamp: notif.timestamp,
    takenBy: notif.takenBy ?? null,
    takenByName: notif.takenByName ?? null,
    takenAt: notif.takenAt ?? null,
    acknowledgedBy: notif.acknowledgedBy || [],
    resolvedAt,
    resolvedBy,
  });
  await ctx.db.delete(notif._id);
}

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
    } else {
      console.warn(
        `Push non envoyée (aucun abonné) : type="${args.type}" audience="${args.audience}" ` +
          `ciblés=${targetUserIds.length} — ${pushTitle}`
      );
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

// Seul l'auteur (ou un admin) peut modifier / supprimer / clôturer
async function requireAuthorOrAdmin(ctx, notif) {
  const user = await getUserFromContext(ctx);
  if (notif.authorId !== user._id) {
    checkAbility(user, "manage", "Notification");
  }
  return user;
}

export const update = mutation({
  args: {
    notifId: v.id("notifications"),
    message: v.optional(v.string()),
    priority: v.optional(v.string()),
    room: v.optional(v.string()),
    patient: v.optional(v.string()),
    type: v.optional(v.string()),
    audience: v.optional(v.string()),
    targetId: v.optional(v.union(v.id("users"), v.null())),
  },
  handler: async (ctx, args) => {
    const notif = await ctx.db.get(args.notifId);
    if (!notif) throw new Error("Notification introuvable");
    await requireAuthorOrAdmin(ctx, notif);

    const patch = {};
    if (args.message !== undefined) patch.message = args.message;
    if (args.priority !== undefined) patch.priority = args.priority;
    if (args.room !== undefined) patch.room = args.room;
    if (args.patient !== undefined) patch.patient = args.patient;
    if (args.type !== undefined) patch.type = args.type;
    if (args.audience !== undefined) patch.audience = args.audience;
    if (args.targetId !== undefined) patch.targetId = args.targetId;

    await ctx.db.patch(args.notifId, patch);
    return { success: true };
  },
});

export const remove = mutation({
  args: { notifId: v.id("notifications") },
  handler: async (ctx, args) => {
    const notif = await ctx.db.get(args.notifId);
    if (!notif) throw new Error("Notification introuvable");
    await requireAuthorOrAdmin(ctx, notif);

    // Cascade : on retire aussi les logs d'audit de cette notification
    const logs = await ctx.db
      .query("notificationLogs")
      .withIndex("by_notifId", (q) => q.eq("notifId", args.notifId))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    await ctx.db.delete(args.notifId);
    return { success: true };
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
    const notif = await ctx.db.get(args.notifId);
    if (!notif) throw new Error("Notification introuvable");

    const user = await getUserFromContext(ctx);
    // Seul l'auteur (ou un admin) peut clôturer
    if (notif.authorId !== user._id) {
      checkAbility(user, "manage", "Notification");
    }

    if (notif.resolved) return { success: true };

    await archiveNotification(ctx, notif, Date.now(), user.name);
    return { success: true };
  },
});

// Maintenance : archive les notifications déjà clôturées (resolved: true)
export const archiveResolved = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUserFromContext(ctx);
    checkAbility(user, "manage", "Database");

    const resolved = (await ctx.db.query("notifications").collect())
      .filter((n) => n.resolved);
    for (const notif of resolved) {
      await archiveNotification(ctx, notif, Date.now(), "migration");
    }
    return { success: true, archived: resolved.length };
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
