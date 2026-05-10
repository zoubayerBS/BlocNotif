import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    password: v.string(), // Note: In a real prod app, use proper hashing
    name: v.string(),
    role: v.string(),
    status: v.string(), // "present", "pause", "absent"
    since: v.union(v.number(), v.null()),
    duration: v.union(v.number(), v.null()),
    reason: v.string(),
  }).index("by_username", ["username"]),

  notifications: defineTable({
    room: v.string(),
    type: v.string(),
    priority: v.string(), // "high", "medium", "low"
    message: v.string(),
    authorId: v.id("users"),
    authorName: v.string(),
    timestamp: v.number(),
    targetId: v.optional(v.union(v.id("users"), v.null())),
    takenBy: v.union(v.id("users"), v.null()),
    takenByName: v.union(v.string(), v.null()),
    takenAt: v.union(v.number(), v.null()),
    resolved: v.boolean(),
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
    subscription: v.any(), // Store the raw PushSubscription object
  }).index("by_userId", ["userId"]),
});
