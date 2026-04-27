import './app.css'
import App from './App.svelte'

const app = new App({
  target: document.getElementById('app'),
})

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed, app still works
    });
  });
}

// OneSignal Initialization (V16)
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
  await OneSignal.init({
    appId: import.meta.env.VITE_ONESIGNAL_APP_ID || "63bad8ac-eb43-46fd-809b-061962bc04f2",
    safari_web_id: "web.onesignal.auto.63f03f56-6218-498c-8507-6f654924a686", 
    notifyButton: {
      enable: true,
      position: 'bottom-left',
      size: 'medium',
      colors: {
        'circle.background': '#4f46e5'
      }
    },
    allowLocalhostAsSecureOrigin: true,
    welcomeNotification: {
      "title": "BlocNotif",
      "message": "Merci de vous être abonné !"
    }
  });

  // Display prompt automatically if not subscribed
  if (!OneSignal.Notifications.permission) {
    OneSignal.Slidedown.showSlidedownPrompt();
  }
});

export default app
