<script>
  import { store } from '../lib/store.js';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  export let open = false;

  const dispatch = createEventDispatcher();
  let members = [...store.state.teamMembers];
  let unsubscribe;

  // Live timer update
  let now = Date.now();
  let timerInterval;

  $: if (open) {
    now = Date.now();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => { now = Date.now(); }, 1000);
  } else {
    clearInterval(timerInterval);
  }

  onMount(() => {
    unsubscribe = store.subscribe('sidebar', (state) => {
      members = [...state.teamMembers];
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    clearInterval(timerInterval);
  });

  function formatDuration(since, currentNow) {
    if (!since) return '';
    const diff = Math.floor((currentNow - since) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
    return `${s}s`;
  }

  function getStatusColor(status) {
    if (status === 'present') return 'var(--color-success)';
    if (status === 'pause') return 'var(--color-warning)';
    return 'var(--color-danger)';
  }

  function getStatusLabel(status) {
    if (status === 'present') return 'Présent';
    if (status === 'pause') return 'En pause';
    return 'Absent';
  }

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

      <div class="sidebar-stats">
        <div class="stat-chip present">
          <span class="stat-dot"></span>
          {members.filter(m => m.status === 'present').length} présents
        </div>
        <div class="stat-chip pause">
          <span class="stat-dot"></span>
          {members.filter(m => m.status === 'pause').length} en pause
        </div>
        <div class="stat-chip absent">
          <span class="stat-dot"></span>
          {members.filter(m => m.status === 'absent').length} absents
        </div>
      </div>

      <div class="member-list">
        {#each members as member}
          <div class="member-card" class:is-away={member.status !== 'present'}>
            <div class="member-avatar" style="background: {
              member.role === 'surveillant bloc' ? 'linear-gradient(135deg, var(--color-accent), #00b3ad)' : 
              member.role === 'medecin anesthesiste' ? 'linear-gradient(135deg, #a29bfe, #6c5ce7)' : 
              'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
            }">
              {getInitials(member.name)}
              <span class="status-dot" style="background: {getStatusColor(member.status)}"></span>
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
              <span class="member-status" style="color: {getStatusColor(member.status)}">
                {getStatusLabel(member.status)}
                {#if member.since && member.status !== 'present'}
                  <span class="member-timer">• {formatDuration(member.since, now)}</span>
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
    background: var(--bg-surface);
    border-left: 1px solid var(--border-color);
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

  .sidebar-stats {
    display: flex;
    gap: var(--space-sm);
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--border-color);
    overflow-x: auto;
  }

  .stat-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: var(--radius-full);
    font-size: var(--fs-xs);
    font-weight: var(--fw-semibold);
    white-space: nowrap;
    background: var(--bg-elevated);
    color: var(--text-secondary);
  }

  .stat-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .stat-chip.present .stat-dot { background: var(--color-success); }
  .stat-chip.pause .stat-dot { background: var(--color-warning); }
  .stat-chip.absent .stat-dot { background: var(--color-danger); }

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

  .member-card.is-away {
    opacity: 0.75;
  }

  .member-avatar {
    position: relative;
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

  .status-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--bg-surface);
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

  .member-status {
    font-size: var(--fs-xs);
    font-weight: var(--fw-medium);
  }

  .member-timer {
    font-variant-numeric: tabular-nums;
  }
</style>
