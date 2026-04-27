import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendPush = internalAction({
  args: {
    title: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
    const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

    if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
      console.warn("OneSignal credentials not set in Convex dashboard, skipping push notification");
      return;
    }

    try {
      const response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${ONESIGNAL_API_KEY}`
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          included_segments: ["All"],
          contents: { 
            en: args.message,
            fr: args.message 
          },
          headings: { 
            en: args.title,
            fr: args.title 
          },
          priority: 10
        })
      });

      const result = await response.json();
      console.log("OneSignal push result:", result);
    } catch (error) {
      console.error("Failed to send OneSignal push:", error);
    }
  },
});
