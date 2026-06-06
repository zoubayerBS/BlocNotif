<script>
  import { onMount } from 'svelte';
  
  // Detect if running on iOS
  let isIOS = false;
  let isInstalled = false;
  let show = false;

  onMount(() => {
    const ua = navigator.userAgent;
    isIOS = /iphone|ipad|ipod/i.test(ua);
    // Standalone = already installed as PWA
    isInstalled = window.navigator.standalone === true;
    
    const dismissed = sessionStorage.getItem('pwa-banner-dismissed');
    
    if (isIOS && !isInstalled && !dismissed) {
      // Show after 3 seconds
      setTimeout(() => { show = true; }, 3000);
    }
  });

  function dismiss() {
    show = false;
    sessionStorage.setItem('pwa-banner-dismissed', '1');
  }
</script>

{#if show}
  <div class="ios-banner">
    <div class="banner-content">
      <img src="/icons/icon-192.png" alt="BlocNotif" class="banner-icon" />
      <div class="banner-text">
        <strong>Installer BlocNotif</strong>
        <span>Pour recevoir les notifications sur iOS, ajoutez l'app à votre écran d'accueil.</span>
        <div class="banner-steps">
          <span>① Appuyez sur <strong>⎙ Partager</strong></span>
          <span>② Puis <strong>"Sur l'écran d'accueil"</strong></span>
        </div>
      </div>
      <button class="banner-close" on:click={dismiss} aria-label="Fermer">✕</button>
    </div>
  </div>
{/if}

<style>
  .ios-banner {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    padding: 12px 16px;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
    background: rgba(15, 17, 23, 0.97);
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    animation: slideUpBanner 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUpBanner {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }

  .banner-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    max-width: 500px;
    margin: 0 auto;
  }

  .banner-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    flex-shrink: 0;
  }

  .banner-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .banner-text strong {
    font-size: 15px;
    font-weight: 700;
    color: #ffffff;
  }

  .banner-text span {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.65);
    line-height: 1.4;
  }

  .banner-steps {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 6px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.07);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .banner-steps span {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
  }

  .banner-steps strong {
    font-size: 13px;
    color: #60a5fa;
  }

  .banner-close {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: rgba(255, 255, 255, 0.6);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: pointer;
    transition: background 0.2s;
  }

  .banner-close:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
</style>
