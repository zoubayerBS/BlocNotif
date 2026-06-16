<script>
  import { store } from '../lib/store.js';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  export let open = false;

  const dispatch = createEventDispatcher();
  let members = [...store.state.teamMembers];
  let unsubscribe;

  onMount(() => {
    unsubscribe = store.subscribe('sidebar', (state) => {
      members = [...state.teamMembers];
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) dispatch('close');
  }
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="sidebar-backdrop" on:click={handleBackdropClick}>
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Équipe
        </h2>
        <button class="sidebar-close" on:click={() => dispatch('close')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="member-list">
        {#each members as member}
          <div class="member-card">
            <div class="member-avatar" style="background: {
              member.role === 'surveillant bloc' ? 'linear-gradient(135deg, var(--color-accent), #00b3ad)' : 
              member.role === 'medecin anesthesiste' ? 'linear-gradient(135deg, #a29bfe, #6c5ce7)' : 
              'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
            }">
              {getInitials(member.name)}
            </div>
            <div class="member-info">
              <span class="member-name">
                {member.name}
                {#if member.role === 'surveillant bloc'}
                  <span class="role-badge badge-surveillant">Surveillant</span>
                {:else if member.role === 'medecin anesthesiste'}
                  <span class="role-badge badge-medecin">Médecin</span>
                {/if}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </aside>
  </div>
{/if}

<style>
  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 500;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    animation: fadeIn var(--transition-fast) ease-out;
  }

  .sidebar {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(320px, 85vw);
    background: var(--bg-card);
    border-left: 1px solid var(--border-card);
    display: flex;
    flex-direction: column;
    animation: slideInRight var(--transition-base) ease-out;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-lg) var(--space-lg);
    border-bottom: 1px solid var(--border-color);
  }

  .sidebar-title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: var(--fs-lg);
    font-weight: var(--fw-bold);
    color: var(--text-primary);
  }

  .sidebar-close {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }

  .sidebar-close:active {
    background: var(--bg-elevated);
    transform: scale(0.9);
  }

  .member-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-sm) var(--space-md);
  }

  .member-card {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    transition: background var(--transition-fast);
  }

  .member-avatar {
    width: 42px;
    height: 42px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--fs-sm);
    font-weight: var(--fw-bold);
    color: white;
    flex-shrink: 0;
  }

  .member-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .member-name {
    font-size: var(--fs-base);
    font-weight: var(--fw-semibold);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .role-badge {
    font-size: 9px;
    font-weight: var(--fw-bold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 3px 6px;
    border-radius: var(--radius-full);
  }

  .badge-surveillant {
    background: var(--color-accent-glow);
    color: var(--color-accent);
  }

  .badge-medecin {
    background: rgba(108, 92, 231, 0.15);
    color: #6c5ce7;
  }
</style>
