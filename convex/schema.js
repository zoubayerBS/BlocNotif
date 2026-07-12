import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    password: v.string(),
    name: v.string(),
    role: v.string(),
    status: v.optional(v.string()),
    since: v.optional(v.union(v.number(), v.null())),
    duration: v.optional(v.union(v.number(), v.null())),
    reason: v.optional(v.string()),
    lastSeen: v.optional(v.number()),
  }).index("by_username", ["username"]),

  notifications: defineTable({
    room: v.string(),
    type: v.string(),
    priority: v.string(),
    message: v.string(),
    patient: v.optional(v.string()),
    authorId: v.id("users"),
    authorName: v.string(),
    timestamp: v.number(),
    targetId: v.optional(v.union(v.id("users"), v.null())),
    audience: v.optional(v.string()), // "all" | "techniciens" | "medecins" | "instrumentistes" | "tech_marc"
    takenBy: v.union(v.id("users"), v.null()),
    takenByName: v.union(v.string(), v.null()),
    takenAt: v.union(v.number(), v.null()),
    resolved: v.boolean(),
    acknowledgedBy: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          userName: v.string(),
          timestamp: v.number(),
        })
      )
    ),
  }),

  absences: defineTable({
    userId: v.id("users"),
    userName: v.string(),
    type: v.string(),
    duration: v.union(v.number(), v.null()),
    reason: v.string(),
    timestamp: v.number(),
  }),

  permutations: defineTable({
    requesterId: v.id("users"),
    requesterName: v.string(),
    targetId: v.id("users"),
    targetName: v.string(),
    slotA: v.string(),
    slotB: v.string(),
    reason: v.string(),
    status: v.string(), // "pending", "approved", "rejected"
    comment: v.string(),
    decidedBy: v.union(v.string(), v.null()),
    decidedAt: v.union(v.number(), v.null()),
    timestamp: v.number(),
  }),

  rooms: defineTable({
    name: v.string(),
  }),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    subscription: v.any(),
  }).index("by_userId", ["userId"]),

  notificationLogs: defineTable({
    notifId: v.id("notifications"),
    event: v.string(), // "sent" | "delivered" | "clicked" | "acknowledged"
    userId: v.optional(v.union(v.id("users"), v.null())),
    userName: v.optional(v.string()),
    deviceInfo: v.optional(v.string()),
  }).index("by_notifId", ["notifId"]),
});
