"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import webpush from "web-push";

export const sendPush = internalAction({
  args: {
    title: v.string(),
    message: v.string(),
    subscriptions: v.array(v.any()), // Array of PushSubscription objects
  },
  handler: async (ctx, args) => {
    const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
      console.error("CRITICAL: VAPID keys are missing in the Convex environment variables.");
      return;
    }

    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const payload = JSON.stringify({
      title: args.title,
      body: args.message,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png", // Safari might ignore this, but just in case
      data: {
        url: "/", // URL to open when notification is clicked
      }
    });

    console.log("USING VAPID PUBLIC KEY:", process.env.VITE_VAPID_PUBLIC_KEY);
    console.log(`Attempting to send push: "${args.title}" to ${args.subscriptions.length} subscribers`);

    const promises = args.subscriptions.map((sub) =>
      webpush.sendNotification(sub, payload).catch(async (error) => {
        console.error("Error sending push to endpoint", sub.endpoint, error);
        
        const isStale = error.statusCode === 410 || error.statusCode === 404;
        const isMismatchedKey = error.statusCode === 400 && error.body && error.body.includes("VapidPkHashMismatch");

        if (isStale || isMismatchedKey) {
          console.log(
            isMismatchedKey 
              ? "Subscription has a mismatched VAPID key. Removing from database." 
              : "Subscription has expired or is no longer valid. Removing from database:"
          );
          try {
            await ctx.runMutation(api.users.removeSubscriptionByEndpoint, { endpoint: sub.endpoint });
            console.log("Removed stale/mismatched subscription from database.");
          } catch (e) {
            console.error("Failed to remove stale subscription", e);
          }
        }
      })
    );

    await Promise.allSettled(promises);
    console.log("Finished sending web push notifications.");
  },
});
