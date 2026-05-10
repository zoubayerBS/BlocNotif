<script>
  import { store } from '../lib/store.js';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  export let activeTab;
  
  const dispatch = createEventDispatcher();

  let pendingCount = 0;
  let notifCount = 0;
  let unsubscribe;

  onMount(() => {
    // Initial values
    updateCounts(store.state);
    
    unsubscribe = store.subscribe('bottomnav', (state) => {
      updateCounts(state);
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  function updateCounts(state) {
    notifCount = state.notifications.filter(n => !n.takenBy && !n.resolved).length;
    if (state.currentUser?.role?.includes('surveillant')) {
      pendingCount = state.permutations.filter(p => p.status === 'pending').length;
    } else {
      pendingCount = 0;
    }
  }

  let currentUser = store.state.currentUser;

  $: tabs = [
    { id: 'notifications', label: 'Alertes', icon: 'bell' },
    { id: 'permutations', label: 'Échanges', icon: 'swap' },
    { id: 'settings', label: 'Paramètres', icon: 'settings' }
  ];
</script>

<nav class="bottom-nav">
  {#each tabs as tab}
    <button
      class="nav-item"
      class:active={activeTab === tab.id}
      on:click={() => dispatch('navigate', tab.id)}
    >
      <div class="nav-icon-wrapper">
        {#if tab.icon === 'bell'}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {#if notifCount > 0}
            <span class="nav-badge danger">{notifCount}</span>
          {/if}
        {:else if tab.icon === 'clock'}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        {:else if tab.icon === 'swap'}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
          {#if pendingCount > 0}
            <span class="nav-badge danger">{pendingCount}</span>
          {/if}
        {:else if tab.icon === 'settings'}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        {/if}
      </div>
      <span class="nav-label">{tab.label}</span>
      {#if activeTab === tab.id}
        <div class="nav-indicator"></div>
      {/if}
    </button>
  {/each}
</nav>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 200;
    display: flex;
    align-items: stretch;
    height: calc(var(--bottom-nav-height) + var(--safe-area-bottom));
    padding-bottom: var(--safe-area-bottom);
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-top: 1px solid var(--border-color);
  }

  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: var(--space-sm) 0;
    color: var(--text-muted);
    transition: color var(--transition-fast);
    position: relative;
    -webkit-tap-highlight-color: transparent;
  }

  .nav-item:active {
    transform: scale(0.9);
  }

  .nav-item.active {
    color: var(--color-primary-light);
  }

  .nav-icon-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 28px;
  }

  .nav-badge {
    position: absolute;
    top: -4px;
    right: -8px;
    min-width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: var(--fw-bold);
    border-radius: var(--radius-full);
    padding: 0 4px;
    animation: fadeIn var(--transition-fast) ease-out;
  }

  .nav-badge.danger {
    background: var(--color-danger);
    color: white;
    box-shadow: 0 0 8px var(--color-danger-glow);
  }

  .nav-label {
    font-size: 11px;
    font-weight: var(--fw-medium);
    letter-spacing: 0.01em;
  }

  .nav-indicator {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 28px;
    height: 3px;
    border-radius: 0 0 var(--radius-full) var(--radius-full);
    background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
    animation: fadeIn var(--transition-fast) ease-out;
  }
</style>
