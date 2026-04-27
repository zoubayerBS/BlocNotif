import { ConvexHttpClient, ConvexClient } from "convex/browser";

const url = import.meta.env.VITE_CONVEX_URL;

if (!url) {
  throw new Error("VITE_CONVEX_URL is not set in environment.");
}

// HTTP Client for one-off requests like mutations
export const httpClient = new ConvexHttpClient(url);

// WebSocket Client for real-time subscriptions
export const convex = new ConvexClient(url);
