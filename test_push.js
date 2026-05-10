const webpush = require('web-push');
const VAPID_PUBLIC_KEY = "BO02vu7mvy8oDCzb8PqV7f64_9wfcSK9zAPmdLivlbCWkpe48cBXJcy7jzaMbiJ2_jwgPAj0zvo2RPnGMVQp5ic";
const VAPID_PRIVATE_KEY = "XsgjM1m_2rLKzsCYISjJqy11np1k2NtmXOl2iT8WymA";
const VAPID_SUBJECT = "mailto:zouba196@gmail.com";

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log("VAPID details are valid!");
} catch(e) {
  console.error("VAPID details invalid:", e);
}
