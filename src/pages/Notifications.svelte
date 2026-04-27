<script>
  import { store } from '../lib/store.js';
  import NotificationForm from './NotificationForm.svelte';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { Bell, ShieldAlert, Wrench, Package, AlertTriangle, Info, CheckCircle2, ListFilter, UserSquare2, Syringe, Coffee, Ban, Phone, X } from 'lucide-svelte';

  const dispatch = createEventDispatcher();

  let notifications = [...store.state.notifications];
  let teamMembers = [...store.state.teamMembers];
  let showForm = false;
  let showIadeSelect = false;
  let filter = 'all'; // all | haute | moyenne | basse
  let unsubscribe;

  onMount(() => {
    unsubscribe = store.subscribe('notifications-page', (state) => {
      notifications = [...state.notifications];
      teamMembers = [...state.teamMembers];
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  function handleTake(notifId) {
    store.takeNotification(notifId);
    if (navigator.vibrate) navigator.vibrate(50);
    dispatch('toast', { message: 'Notification prise en charge', type: 'success' });
  }

  function handleResolve(notifId) {
    store.resolveNotification(notifId);
    dispatch('toast', { message: 'Notification résolue', type: 'success' });
  }

  function handleCreate(event) {
    const data = event.detail;
    store.addNotification(data);
    showForm = false;
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    dispatch('toast', { message: 'Alerte envoyée à l\'équipe', type: 'success' });
  }

  function handleQuickAstreinte(type) {
    if (type === 'Technicien') {
      showIadeSelect = true;
    } else {
      sendAstreinteAlert(type);
    }
  }

  function sendAstreinteAlert(type, personName = null) {
    const label = type === 'Technicien' ? "Technicien d'Anesthésie" : type;
    const message = personName 
      ? `DEMANDE D'ASTREINTE : ${label} (${personName})`
      : `DEMANDE D'ASTREINTE : ${label}`;
      
    store.addNotification({
      room: 'BLOC CENTRAL',
      type: 'Appel Astreinte',
      priority: 'haute',
      message: message
    });
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    dispatch('toast', { message: `Appel astreinte ${label} envoyé`, type: 'success' });
    showIadeSelect = false;
  }

  $: iades = teamMembers.filter(m => m.role === 'technicien');

  function getTypeIcon(type) {
    const icons = {
      'Préparation matériel': Package,
      'Protocole anesthésique': Syringe,
      'Salle non opérable': ShieldAlert,
      'Équipement HS': Wrench,
      'Manque matériel': Package,
      'Urgence': AlertTriangle,
      'Info': Info,
      'Pause': Coffee,
      'Absence': Ban,
      'Retour': CheckCircle2,
    };
    return icons[type] || Info;
  }

  function getPriorityClass(priority) {
    if (priority === 'haute') return 'priority-high';
    if (priority === 'moyenne') return 'priority-medium';
    return 'priority-low';
  }

  function getPriorityLabel(priority) {
    if (priority === 'haute') return 'Haute';
    if (priority === 'moyenne') return 'Moyenne';
    return 'Basse';
  }

  function timeAgo(timestamp) {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
    return new Date(timestamp).toLocaleDateString('fr-FR');
  }

  $: filteredNotifications = filter === 'all'
      ? notifications.filter(n => !n.resolved)
      : notifications.filter(n => !n.resolved && n.priority === filter);

  $: currentUser = store.state.currentUser;
</script>

<div class="page notifications-page">
  <div class="page-header">
    <h1 class="page-title">
      <span class="title-icon"><Bell size={28} /></span>
      Alertes bloc
    </h1>
    <span class="notif-count">{filteredNotifications.length} active{filteredNotifications.length > 1 ? 's' : ''}</span>
  </div>

  <!-- Filters -->
  <div class="filter-bar">
    <button class="filter-chip" style="display: inline-flex; align-items: center; gap: 4px;" class:active={filter === 'all'} on:click={() => filter = 'all'}>
      <ListFilter size={16} /> Toutes
    </button>
    <button class="filter-chip priority-high" style="display: inline-flex; align-items: center; gap: 4px;" class:active={filter === 'haute'} on:click={() => filter = 'haute'}>
      <AlertTriangle size={16} /> Haute
    </button>
    <button class="filter-chip priority-medium" style="display: inline-flex; align-items: center; gap: 4px;" class:active={filter === 'moyenne'} on:click={() => filter = 'moyenne'}>
      <AlertTriangle size={16} /> Moyenne
    </button>
    <button class="filter-chip priority-low" style="display: inline-flex; align-items: center; gap: 4px;" class:active={filter === 'basse'} on:click={() => filter = 'basse'}>
      <Info size={16} /> Basse
    </button>
  </div>

  {#if currentUser?.role?.includes('surveillant')}
    <div class="quick-actions-section">
      <h3 class="section-title">Appel Astreintes</h3>
      <div class="quick-actions-grid">
        <button class="quick-action-btn astreinte-mar" on:click={() => handleQuickAstreinte('MAR')}>
          <div class="btn-icon"><Phone size={18} /></div>
          <div class="btn-label">Astreinte MAR</div>
        </button>
        <button class="quick-action-btn astreinte-iade" on:click={() => handleQuickAstreinte('Technicien')}>
          <div class="btn-icon"><Phone size={18} /></div>
          <div class="btn-label">Astreinte Technicien</div>
        </button>
      </div>
    </div>
  {/if}

  <!-- Notification List -->
  <div class="notif-list">
    {#if filteredNotifications.length === 0}
      <div class="empty-state">
        <div class="empty-icon"><CheckCircle2 size={48} /></div>
        <h3>Aucune alerte active</h3>
        <p>Le bloc fonctionne normalement</p>
      </div>
    {:else}
      {#each filteredNotifications as notif, i}
        <div
          class="notif-card"
          class:taken={notif.takenBy}
          style="animation-delay: {i * 50}ms"
        >
          <div class="notif-header-new">
            <div class="type-icon-wrapper {getPriorityClass(notif.priority)}">
              <svelte:component this={getTypeIcon(notif.type)} size={22} />
            </div>
            
            <div class="notif-titles">
              <div class="notif-title-row">
                <span class="type-label">{notif.type}</span>
                <span class="notif-priority-badge {getPriorityClass(notif.priority)}">
                  {getPriorityLabel(notif.priority)}
                </span>
              </div>
              <div class="notif-room">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Salle {notif.room}
                {#if notif.patient}
                  <span class="meta-dot">•</span>
                  <span class="notif-patient">
                    <UserSquare2 size={14} /> {notif.patient}
                  </span>
                {/if}
              </div>
            </div>
          </div>

          {#if notif.message}
            <div class="notif-divider"></div>
            <p class="notif-message">{notif.message}</p>
          {/if}

          <div class="notif-divider"></div>

          <div class="notif-footer">
            <div class="notif-meta">
              <span class="notif-author-avatar">{notif.authorName.charAt(0)}</span>
              <span class="notif-author">{notif.authorName}</span>
              <span class="meta-dot">•</span>
              <span class="notif-time">{timeAgo(notif.timestamp)}</span>
            </div>

            {#if notif.takenBy}
              <div class="notif-taken">
                <span class="taken-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {notif.takenByName}
                </span>
                {#if notif.takenBy === currentUser?._id}
                  <button class="resolve-btn" on:click={() => handleResolve(notif._id)}>
                    Résolu
                  </button>
                {/if}
              </div>
            {:else}
              <button class="take-btn" on:click={() => handleTake(notif._id)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Prendre
              </button>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- FAB -->
  <div class="fab-container">
    <button class="fab" on:click={() => showForm = true} title="Nouvelle alerte">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  </div>

  <!-- Form Modal -->
  {#if showForm}
    <NotificationForm on:submit={handleCreate} on:close={() => showForm = false} />
  {/if}

  {#if showIadeSelect}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-backdrop" on:click|self={() => showIadeSelect = false}>
      <div class="iade-modal">
        <div class="modal-header">
          <h2 class="modal-title">Choisir le Technicien d'astreinte</h2>
          <button class="modal-close" on:click={() => showIadeSelect = false}>
            <X size={20} />
          </button>
        </div>
        <div class="modal-body">
          <div class="iade-grid">
            {#each iades as iade}
              <button class="iade-card" on:click={() => sendAstreinteAlert('Technicien', iade.name)}>
                <div class="iade-avatar">{iade.name.charAt(0)}</div>
                <div class="iade-info">
                  <span class="iade-name">{iade.name}</span>
                  <span class="iade-role">Technicien d'Anesthésie</span>
                </div>
                <Phone size={18} class="call-icon" />
              </button>
            {/each}
            
            {#if iades.length === 0}
              <p class="empty-msg">Aucun IADE enregistré dans l'équipe.</p>
            {/if}
          </div>
          
          <button class="btn-generic" on:click={() => sendAstreinteAlert('Technicien')}>
            Appel général Technicien (sans nom)
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .page {
    padding: var(--space-lg);
    animation: fadeIn var(--transition-base) ease-out;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-lg);
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: var(--fs-xl);
    font-weight: var(--fw-bold);
  }

  .title-icon {
    font-size: 1.3rem;
  }

  .notif-count {
    font-size: var(--fs-xs);
    font-weight: var(--fw-semibold);
    color: var(--text-muted);
    padding: 4px 10px;
    background: var(--bg-elevated);
    border-radius: var(--radius-full);
  }

  /* Filters */
  .filter-bar {
    display: flex;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
    overflow-x: auto;
    padding-bottom: var(--space-xs);
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .filter-bar::-webkit-scrollbar { display: none; }

  .filter-chip {
    padding: 8px 14px;
    border-radius: var(--radius-full);
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
    white-space: nowrap;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }

  .filter-chip:active { transform: scale(0.95); }

  .filter-chip.active {
    background: var(--color-primary);
    color: white;
    box-shadow: 0 4px 12px var(--color-primary-glow);
  }

  /* Quick Actions */
  .quick-actions-section {
    margin-bottom: var(--space-xl);
    padding: 0 var(--space-xs);
  }

  .section-title {
    font-size: var(--fs-xs);
    font-weight: 800;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-sm);
  }

  .quick-actions-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
  }

  .quick-action-btn {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    background: white;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
    transition: all 0.2s;
    cursor: pointer;
    text-align: left;
  }

  .quick-action-btn:active { transform: scale(0.96); }

  .btn-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .astreinte-mar .btn-icon { background: var(--color-danger-glow); color: var(--color-danger); }
  .astreinte-iade .btn-icon { background: var(--color-warning-glow); color: var(--color-warning); }

  .btn-label {
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--text-primary);
  }

  .filter-chip.priority-high.active { background: var(--color-danger); border-color: var(--color-danger); }
  .filter-chip.priority-medium.active { background: var(--color-warning); border-color: var(--color-warning); color: var(--text-inverse);}
  .filter-chip.priority-low.active { background: var(--color-success); border-color: var(--color-success); color: var(--text-inverse);}

  /* Notification Cards Premium Layout */
  .notif-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .notif-card {
    background: rgba(255, 255, 255, 0.75) !important;
    border: 1px solid rgba(255, 255, 255, 0.9) !important;
    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.04) !important;
    border-radius: var(--radius-xl);
    padding: var(--space-xl);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
    animation: fadeInUp var(--transition-slow) ease-out both;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
  }

  .notif-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(31, 38, 135, 0.08) !important;
  }

  .notif-card.taken {
    opacity: 0.7;
    filter: grayscale(0.3);
  }

  .notif-header-new {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  .type-icon-wrapper {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .type-icon-wrapper.priority-high {
    background: linear-gradient(135deg, #ff7675, #d63031);
    color: white;
    box-shadow: 0 4px 16px rgba(214, 48, 49, 0.3);
  }

  .type-icon-wrapper.priority-medium {
    background: linear-gradient(135deg, #fdcb6e, #e17055);
    color: white;
    box-shadow: 0 4px 16px rgba(225, 112, 85, 0.3);
  }

  .type-icon-wrapper.priority-low {
    background: linear-gradient(135deg, #55efc4, #00b894);
    color: white;
    box-shadow: 0 4px 16px rgba(0, 184, 148, 0.3);
  }

  .notif-titles {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .notif-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .type-label {
    font-size: var(--fs-md);
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .notif-room {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--fs-sm);
    font-weight: var(--fw-semibold);
    color: var(--color-primary);
  }

  .notif-patient {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-secondary);
  }

  .notif-priority-badge {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 4px 10px;
    border-radius: var(--radius-full);
  }

  .notif-priority-badge.priority-high {
    background: var(--color-danger-glow);
    color: var(--color-danger-dark);
  }

  .notif-priority-badge.priority-medium {
    background: var(--color-warning-glow);
    color: var(--color-warning-dark);
  }

  .notif-priority-badge.priority-low {
    background: var(--color-success-glow);
    color: var(--color-success-dark);
  }

  .notif-divider {
    height: 1px;
    background: rgba(0, 0, 0, 0.06);
    margin: var(--space-md) 0;
    width: 100%;
  }

  .notif-message {
    font-size: var(--fs-base);
    color: var(--text-secondary);
    line-height: 1.5;
    background: rgba(255, 255, 255, 0.5);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    border: 1px solid rgba(255, 255, 255, 0.8);
  }

  .notif-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .notif-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--fs-xs);
    color: var(--text-muted);
  }

  .notif-author-avatar {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-full);
    background: var(--bg-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: var(--fw-bold);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  .notif-author {
    font-weight: var(--fw-bold);
    color: var(--text-secondary);
  }

  .meta-dot {
    opacity: 0.5;
  }

  .notif-taken {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .taken-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: var(--fs-xs);
    font-weight: 800;
    color: var(--color-success);
    padding: 6px 12px;
    background: var(--color-success-glow);
    border-radius: var(--radius-full);
  }

  .take-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    border-radius: var(--radius-full);
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    color: white;
    font-size: var(--fs-sm);
    font-weight: 800;
    transition: all var(--transition-fast);
    box-shadow: 0 4px 12px var(--color-primary-glow);
  }

  .take-btn:active {
    transform: scale(0.95);
  }

  .resolve-btn {
    padding: 8px 14px;
    border-radius: var(--radius-full);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    font-size: var(--fs-xs);
    font-weight: 800;
    border: 1px solid var(--border-color);
    transition: all var(--transition-fast);
  }

  .resolve-btn:active {
    background: var(--color-success);
    color: white;
    border-color: var(--color-success);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: var(--space-3xl) var(--space-lg);
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: var(--space-md);
  }

  .empty-state h3 {
    font-size: var(--fs-lg);
    font-weight: var(--fw-semibold);
    margin-bottom: var(--space-xs);
  }

  .empty-state p {
    color: var(--text-muted);
    font-size: var(--fs-sm);
  }

  /* FAB */
  @keyframes fabPulse {
    0% {
      box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4), 0 0 0 0 rgba(79, 70, 229, 0.6);
    }
    70% {
      box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4), 0 0 0 16px rgba(79, 70, 229, 0);
    }
    100% {
      box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4), 0 0 0 0 rgba(79, 70, 229, 0);
    }
  }

  .fab-container {
    position: fixed;
    bottom: calc(var(--bottom-nav-height) + var(--safe-area-bottom) + var(--space-lg));
    right: var(--space-lg);
    z-index: 90;
    animation: fadeInUp var(--transition-slow) ease-out 0.3s both;
  }

  .fab {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-full);
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform var(--transition-fast), background var(--transition-fast);
    animation: fabPulse 2.5s infinite cubic-bezier(0.36, 0, 0.64, 1);
  }

  .fab:active {
    transform: scale(0.9) rotate(90deg);
  }

  /* IADE Selection Modal */
  .iade-modal {
    width: 90%;
    max-width: 400px;
    background: white;
    border-radius: var(--radius-2xl);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease-out;
    overflow: hidden;
    margin-bottom: var(--safe-area-bottom);
  }

  .iade-modal .modal-header {
    padding: var(--space-lg) var(--space-xl);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .iade-modal .modal-title {
    font-size: var(--fs-md);
    font-weight: 800;
    color: var(--text-primary);
  }

  .iade-modal .modal-body {
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    max-height: 60vh;
    overflow-y: auto;
  }

  .iade-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .iade-card {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--bg-elevated);
    border: 1.5px solid transparent;
    border-radius: var(--radius-xl);
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
    border: none;
  }

  .iade-card:hover {
    border-color: var(--color-primary);
    background: white;
  }

  .iade-avatar {
    width: 40px;
    height: 40px;
    background: var(--color-primary-glow);
    color: var(--color-primary);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }

  .iade-info {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  .iade-name {
    font-size: var(--fs-base);
    font-weight: 700;
    color: var(--text-primary);
  }

  .iade-role {
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    font-weight: 800;
  }

  .call-icon {
    color: var(--color-primary);
  }

  .btn-generic {
    width: 100%;
    padding: 12px;
    background: var(--bg-body);
    border-radius: var(--radius-lg);
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    border: none;
  }

  .empty-msg {
    text-align: center;
    color: var(--text-muted);
    font-size: var(--fs-sm);
    padding: var(--space-lg) 0;
  }
</style>
