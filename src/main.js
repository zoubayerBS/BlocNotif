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
    appId: "63bad8ac-eb43-46fd-809b-061962bc04f2",
  });
});

export default app
