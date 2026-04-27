<script>
  import { store } from '../lib/store.js';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { ArrowRightLeft, Clock, MessageSquare, ScrollText, FileText, ClipboardList, CheckCircle2, ChevronDown, User } from 'lucide-svelte';

  const dispatch = createEventDispatcher();

  let currentUser = store.state.currentUser ? { ...store.state.currentUser } : null;
  let permutations = [...store.state.permutations];
  let teamMembers = [...store.state.teamMembers];
  let unsubscribe;

  let showForm = false;
  let showDecisionModal = false;
  let selectedPerm = null;
  let decisionComment = '';

  // Form fields
  let targetId = '';
  let slotA = '';
  let slotB = '';
  let permReason = '';
  let isDropdownOpen = false;
  let isDropdownAOpen = false;
  let isDropdownBOpen = false;
  const slotOptions = ['Matin', 'Après-midi', 'Garde de nuit'];

  onMount(() => {
    unsubscribe = store.subscribe('permutations-page', (state) => {
      currentUser = state.currentUser ? { ...state.currentUser } : null;
      permutations = [...state.permutations];
      teamMembers = [...state.teamMembers];
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  $: isSurveillant = currentUser?.role?.includes('surveillant');

  $: pendingPerms = permutations.filter(p => p.status === 'pending');
  $: myPerms = permutations.filter(p => p.requesterId === currentUser?._id || p.targetId === currentUser?._id);
  $: otherTechnicians = teamMembers.filter(m => m._id !== currentUser?._id && m.role === 'technicien');

  function handleSubmit() {
    if (!targetId || !slotA || !slotB) return;
    store.addPermutation({ targetId, slotA, slotB, reason: permReason });
    showForm = false;
    targetId = '';
    slotA = '';
    slotB = '';
    permReason = '';
    if (navigator.vibrate) navigator.vibrate(50);
    dispatch('toast', { message: 'Demande de permutation envoyée', type: 'success' });
  }

  function openDecision(perm) {
    selectedPerm = perm;
    decisionComment = '';
    showDecisionModal = true;
  }

  function handleDecision(decision) {
    if (!selectedPerm) return;
    store.decidePermutation(selectedPerm._id, decision, decisionComment);
    showDecisionModal = false;
    selectedPerm = null;
    if (navigator.vibrate) navigator.vibrate(50);
    dispatch('toast', { 
        message: decision === 'approved' ? 'Permutation accordée' : 'Permutation refusée', 
        type: decision === 'approved' ? 'success' : 'error' 
    });
  }

  function getStatusLabel(status) {
    if (status === 'pending') return 'En attente';
    if (status === 'approved') return 'Accordée';
    return 'Refusée';
  }

  function getStatusClass(status) {
    if (status === 'pending') return 'status-pending';
    if (status === 'approved') return 'status-approved';
    return 'status-rejected';
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function handleFormBackdrop(e) {
    if (e.target === e.currentTarget) {
      showForm = false;
      isDropdownOpen = false;
      isDropdownAOpen = false;
      isDropdownBOpen = false;
    }
  }

  function handleDecisionBackdrop(e) {
    if (e.target === e.currentTarget) showDecisionModal = false;
  }

  // Close dropdown if click outside
  function handleWindowClick(e) {
    if (isDropdownOpen && !e.target.closest('.custom-dropdown-container')) {
      isDropdownOpen = false;
    }
    if (isDropdownAOpen && !e.target.closest('.dropdown-slot-a')) {
      isDropdownAOpen = false;
    }
    if (isDropdownBOpen && !e.target.closest('.dropdown-slot-b')) {
      isDropdownBOpen = false;
    }
  }
</script>

<svelte:window on:click={handleWindowClick} />

<div class="page permutations-page">
  <div class="page-header">
    <h1 class="page-title">
      <span class="title-icon"><ArrowRightLeft size={28} /></span>
      {isSurveillant ? 'Gestion des échanges' : 'Échanges de créneaux'}
    </h1>
    {#if isSurveillant && pendingPerms.length > 0}
      <span class="pending-badge">{pendingPerms.length} en attente</span>
    {/if}
  </div>

  <!-- Surveillant View: Pending Requests -->
  {#if isSurveillant}
    {#if pendingPerms.length > 0}
      <div class="section">
        <h3 class="section-title" style="display: inline-flex; align-items: center; gap: 6px;"><Clock size={16} /> Demandes en attente</h3>
        <div class="perm-list">
          {#each pendingPerms as perm, i}
            <div class="perm-card pending" style="animation-delay: {i * 50}ms">
              <div class="perm-header">
                <div class="perm-users">
                  <span class="perm-requester">{perm.requesterName}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="17 1 21 5 17 9"/>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                    <polyline points="7 23 3 19 7 15"/>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                  </svg>
                  <span class="perm-target">{perm.targetName}</span>
                </div>
                <span class="perm-date">{formatDate(perm.timestamp)}</span>
              </div>

              <div class="perm-slots">
                <div class="slot">
                  <span class="slot-label">Créneau A</span>
                  <span class="slot-value">{perm.slotA}</span>
                </div>
                <div class="slot-arrow"><ArrowRightLeft size={20} /></div>
                <div class="slot">
                  <span class="slot-label">Créneau B</span>
                  <span class="slot-value">{perm.slotB}</span>
                </div>
              </div>

              {#if perm.reason}
                <p class="perm-reason" style="display: inline-flex; align-items: center; gap: 6px;"><MessageSquare size={14} /> {perm.reason}</p>
              {/if}

              <div class="perm-actions">
                <button class="action-approve" on:click={() => openDecision(perm)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Accorder
                </button>
                <button class="action-reject" on:click={() => { selectedPerm = perm; decisionComment = ''; handleDecision('rejected'); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Refuser
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="empty-state">
        <div class="empty-icon"><ClipboardList size={48} /></div>
        <h3>Aucune demande en attente</h3>
        <p>Toutes les demandes ont été traitées</p>
      </div>
    {/if}

    <!-- All history for surveillant -->
    {#if permutations.filter(p => p.status !== 'pending').length > 0}
      <div class="section history-section">
        <h3 class="section-title" style="display: inline-flex; align-items: center; gap: 6px;"><ScrollText size={16} /> Historique</h3>
        <div class="perm-list">
          {#each permutations.filter(p => p.status !== 'pending') as perm}
            <div class="perm-card {getStatusClass(perm.status)}">
              <div class="perm-header">
                <div class="perm-users">
                  <span class="perm-requester">{perm.requesterName}</span>
                  <span class="swap-icon"><ArrowRightLeft size={14} /></span>
                  <span class="perm-target">{perm.targetName}</span>
                </div>
                <span class="perm-status-badge {getStatusClass(perm.status)}">
                  {getStatusLabel(perm.status)}
                </span>
              </div>
              <div class="perm-slots compact">
                <span>{perm.slotA}</span>
                <span class="slot-sep"><ArrowRightLeft size={14} /></span>
                <span>{perm.slotB}</span>
              </div>
              {#if perm.comment}
                <p class="perm-comment" style="display: inline-flex; align-items: center; gap: 6px;"><FileText size={14} /> {perm.comment}</p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

  {:else}
    <!-- Technician View -->
    <button class="new-request-btn" on:click={() => showForm = true}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Nouvelle demande de permutation
    </button>

    {#if myPerms.filter(p => p.status === 'pending').length > 0}
      <div class="section">
        <h3 class="section-title" style="display: inline-flex; align-items: center; gap: 6px;"><ClipboardList size={16} /> Demandes en cours</h3>
        <div class="perm-list">
          {#each myPerms.filter(p => p.status === 'pending') as perm, i}
            <div class="perm-card pending" style="animation-delay: {i * 50}ms">
              <div class="perm-header">
                <div class="perm-users">
                  <span class="perm-requester">{perm.requesterId === currentUser?._id ? 'Moi' : perm.requesterName}</span>
                  <span class="swap-icon"><ArrowRightLeft size={14} /></span>
                  <span class="perm-target">{perm.targetId === currentUser?._id ? 'Moi' : perm.targetName}</span>
                </div>
                <span class="perm-status-badge pending">En attente</span>
              </div>

              <div class="perm-slots">
                <div class="slot">
                  <span class="slot-label">{perm.requesterId === currentUser?._id ? 'Mon créneau' : 'Son créneau'}</span>
                  <span class="slot-value">{perm.slotA}</span>
                </div>
                <div class="slot-arrow"><ArrowRightLeft size={20} /></div>
                <div class="slot">
                  <span class="slot-label">{perm.requesterId === currentUser?._id ? 'Créneau souhaité' : 'Mon créneau'}</span>
                  <span class="slot-value">{perm.slotB}</span>
                </div>
              </div>

              {#if perm.reason}
                <p class="perm-reason" style="display: inline-flex; align-items: center; gap: 6px;"><MessageSquare size={14} /> {perm.reason}</p>
              {/if}

              <span class="perm-date">{formatDate(perm.timestamp)}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if myPerms.filter(p => p.status !== 'pending').length > 0}
      <div class="section history-section">
        <h3 class="section-title" style="display: inline-flex; align-items: center; gap: 6px;"><ScrollText size={16} /> Mon historique</h3>
        <div class="perm-list">
          {#each myPerms.filter(p => p.status !== 'pending') as perm}
            <div class="perm-card {getStatusClass(perm.status)}">
              <div class="perm-header">
                <div class="perm-users">
                  <span class="perm-requester">{perm.requesterId === currentUser?._id ? 'Moi' : perm.requesterName}</span>
                  <span class="swap-icon"><ArrowRightLeft size={14} /></span>
                  <span class="perm-target">{perm.targetId === currentUser?._id ? 'Moi' : perm.targetName}</span>
                </div>
                <span class="perm-status-badge {getStatusClass(perm.status)}">
                  {getStatusLabel(perm.status)}
                </span>
              </div>
              <div class="perm-slots compact">
                <span>{perm.slotA}</span>
                <span class="slot-sep"><ArrowRightLeft size={14} /></span>
                <span>{perm.slotB}</span>
              </div>
              {#if perm.comment}
                <p class="perm-comment" style="display: inline-flex; align-items: center; gap: 6px;"><FileText size={14} /> {perm.comment}</p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if myPerms.length === 0}
      <div class="empty-state">
        <div class="empty-icon"><ArrowRightLeft size={48} /></div>
        <h3>Aucune demande</h3>
        <p>Créez une demande de permutation de créneau</p>
      </div>
    {/if}
  {/if}
</div>

<!-- New Request Form Modal -->
{#if showForm}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={handleFormBackdrop}>
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title"><ArrowRightLeft size={24} /> Nouvelle permutation</h2>
        <button class="modal-close" on:click={() => showForm = false}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="form-group custom-dropdown-container">
          <div class="form-label" id="colleague-label">Collègue</div>
          
          <!-- Custom Dropdown -->
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="custom-select-wrapper" class:open={isDropdownOpen}>
            <div 
              class="form-input custom-select-trigger" 
              class:placeholder={!targetId}
              on:click|stopPropagation={() => isDropdownOpen = !isDropdownOpen}
            >
              <span class="input-icon"><User size={18} /></span>
              <span class="selected-value">{targetId ? otherTechnicians.find(t => t._id === targetId)?.name : 'Choisir un collègue...'}</span>
              <div class="dropdown-icon" class:rotated={isDropdownOpen}>
                <ChevronDown size={18} />
              </div>
            </div>

            {#if isDropdownOpen}
              <div class="custom-select-options">
                {#each otherTechnicians as tech}
                  <div 
                    class="custom-option" 
                    class:selected={targetId === tech._id}
                    on:click|stopPropagation={() => { targetId = tech._id; isDropdownOpen = false; }}
                  >
                    {tech.name}
                    {#if targetId === tech._id}
                      <CheckCircle2 size={16} class="option-check" />
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="form-group dropdown-slot-a">
          <div class="form-label">Mon créneau</div>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="custom-select-wrapper" class:open={isDropdownAOpen}>
            <div 
              class="form-input custom-select-trigger" 
              class:placeholder={!slotA}
              on:click|stopPropagation={() => {
                isDropdownAOpen = !isDropdownAOpen;
                isDropdownBOpen = false;
                isDropdownOpen = false;
              }}
            >
              <span class="input-icon"><Clock size={18} /></span>
              <span class="selected-value">{slotA || 'Choisir un créneau...'}</span>
              <div class="dropdown-icon" class:rotated={isDropdownAOpen}>
                <ChevronDown size={18} />
              </div>
            </div>

            {#if isDropdownAOpen}
              <div class="custom-select-options">
                {#each slotOptions as option}
                  <div 
                    class="custom-option" 
                    class:selected={slotA === option}
                    on:click|stopPropagation={() => { slotA = option; isDropdownAOpen = false; }}
                  >
                    {option}
                    {#if slotA === option}
                      <CheckCircle2 size={16} class="option-check" />
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="form-group dropdown-slot-b">
          <div class="form-label">Créneau souhaité</div>
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="custom-select-wrapper" class:open={isDropdownBOpen}>
            <div 
              class="form-input custom-select-trigger" 
              class:placeholder={!slotB}
              on:click|stopPropagation={() => {
                isDropdownBOpen = !isDropdownBOpen;
                isDropdownAOpen = false;
                isDropdownOpen = false;
              }}
            >
              <span class="input-icon"><Clock size={18} /></span>
              <span class="selected-value">{slotB || 'Choisir un créneau...'}</span>
              <div class="dropdown-icon" class:rotated={isDropdownBOpen}>
                <ChevronDown size={18} />
              </div>
            </div>

            {#if isDropdownBOpen}
              <div class="custom-select-options">
                {#each slotOptions as option}
                  <div 
                    class="custom-option" 
                    class:selected={slotB === option}
                    on:click|stopPropagation={() => { slotB = option; isDropdownBOpen = false; }}
                  >
                    {option}
                    {#if slotB === option}
                      <CheckCircle2 size={16} class="option-check" />
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="perm-reason">Motif (optionnel)</label>
          <div class="input-wrapper">
            <span class="input-icon" style="top: 14px;"><MessageSquare size={18} /></span>
            <textarea id="perm-reason" class="form-input with-icon" bind:value={permReason} placeholder="Raison de la demande..." rows="2"></textarea>
          </div>
        </div>

        <button
          class="submit-btn"
          disabled={!targetId || !slotA || !slotB}
          on:click={handleSubmit}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          Envoyer la demande
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Decision Modal -->
{#if showDecisionModal && selectedPerm}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={handleDecisionBackdrop}>
    <div class="modal decision-modal">
      <div class="modal-header">
        <h2 class="modal-title"><CheckCircle2 size={24} /> Accorder la permutation</h2>
        <button class="modal-close" on:click={() => showDecisionModal = false}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="decision-summary">
          <span>{selectedPerm.requesterName}</span>
          <span class="swap-icon"><ArrowRightLeft size={14} /></span>
          <span>{selectedPerm.targetName}</span>
        </div>

        <div class="form-group">
          <label class="form-label" for="decision-comment">Commentaire (optionnel)</label>
          <textarea id="decision-comment" class="form-input" bind:value={decisionComment} placeholder="Ajouter un commentaire..." rows="2"></textarea>
        </div>

        <button class="submit-btn approve-btn" on:click={() => handleDecision('approved')}>
          <CheckCircle2 size={20} /> Confirmer l'accord
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page {
    padding: var(--space-lg);
    animation: fadeIn var(--transition-base) ease-out;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-xl);
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: var(--fs-xl);
    font-weight: var(--fw-bold);
  }

  .title-icon { font-size: 1.3rem; }

  .pending-badge {
    font-size: var(--fs-xs);
    font-weight: var(--fw-bold);
    padding: 4px 12px;
    border-radius: var(--radius-full);
    background: var(--color-danger);
    color: white;
    animation: pulse 2s ease-in-out infinite;
  }

  /* Sections */
  .section {
    margin-bottom: var(--space-xl);
  }

  .section-title {
    font-size: var(--fs-sm);
    font-weight: var(--fw-semibold);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: var(--space-md);
  }

  .history-section {
    margin-top: var(--space-2xl);
  }

  /* New Request Btn */
  .new-request-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
    border: 2px dashed var(--border-color-strong);
    background: var(--bg-surface);
    color: var(--color-primary-light);
    font-size: var(--fs-base);
    font-weight: var(--fw-semibold);
    transition: all var(--transition-fast);
    margin-bottom: var(--space-xl);
  }

  .new-request-btn:active {
    transform: scale(0.98);
    border-color: var(--color-primary);
    background: var(--color-primary-glow);
  }

  /* Perm Cards */
  .perm-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .perm-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    animation: fadeInUp var(--transition-slow) ease-out both;
    position: relative;
    overflow: hidden;
  }

  .perm-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
  }

  .perm-card.pending::before,
  .perm-card.status-pending::before { background: var(--color-warning); }
  .perm-card.status-approved::before { background: var(--color-success); }
  .perm-card.status-rejected::before { background: var(--color-danger); }

  .perm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-md);
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .perm-users {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .perm-requester, .perm-target {
    font-size: var(--fs-sm);
    font-weight: var(--fw-semibold);
  }

  .swap-icon {
    color: var(--color-primary-light);
    font-size: var(--fs-sm);
  }

  .perm-date {
    font-size: var(--fs-xs);
    color: var(--text-muted);
  }

  .perm-status-badge {
    font-size: 10px;
    font-weight: var(--fw-bold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 3px 10px;
    border-radius: var(--radius-full);
  }

  .perm-status-badge.status-pending {
    background: var(--color-warning-glow);
    color: var(--color-warning);
  }

  .perm-status-badge.status-approved {
    background: var(--color-success-glow);
    color: var(--color-success);
  }

  .perm-status-badge.status-rejected {
    background: var(--color-danger-glow);
    color: var(--color-danger);
  }

  /* Slots */
  .perm-slots {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: var(--space-sm);
    align-items: center;
    margin-bottom: var(--space-md);
  }

  .perm-slots.compact {
    display: flex;
    gap: var(--space-sm);
    font-size: var(--fs-sm);
    color: var(--text-secondary);
  }

  .slot-sep {
    color: var(--color-primary-light);
  }

  .slot {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
  }

  .slot-label {
    font-size: 10px;
    font-weight: var(--fw-semibold);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .slot-value {
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
    color: var(--text-primary);
  }

  .slot-arrow {
    color: var(--color-primary-light);
    font-size: var(--fs-lg);
    text-align: center;
  }

  .perm-reason, .perm-comment {
    font-size: var(--fs-sm);
    color: var(--text-secondary);
    margin-bottom: var(--space-sm);
  }

  .perm-comment {
    color: var(--color-info);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-info-glow);
    border-radius: var(--radius-sm);
  }

  /* Actions */
  .perm-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }

  .action-approve, .action-reject {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: var(--space-md);
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    font-weight: var(--fw-semibold);
    transition: all var(--transition-fast);
    cursor: pointer;
  }
  .form-input {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 16px;
    border: 1.5px solid var(--border-color);
    border-radius: var(--radius-md);
    background-color: #ffffff;
    font-size: var(--fs-base);
    font-family: inherit;
    color: var(--text-primary);
    transition: all var(--transition-fast);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .form-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-glow);
  }

  .custom-select-trigger {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px 12px 56px;
    background: white;
    border: 1.5px solid rgba(0, 0, 0, 0.08);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-fast);
    min-height: 48px;
  }

  .selected-value {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .input-wrapper {
    position: relative;
    width: 100%;
  }

  .input-icon {
    position: absolute;
    left: 16px;
    top: 0;
    bottom: 0;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    pointer-events: none;
    z-index: 2;
  }

  .form-input.with-icon {
    padding-left: 56px;
  }

  .action-approve {
    background: var(--color-success-glow);
    color: var(--color-success);
    border: 1px solid rgba(46, 213, 115, 0.2);
  }

  .action-approve:active {
    background: var(--color-success);
    color: white;
    transform: scale(0.97);
  }

  .action-reject {
    background: var(--color-danger-glow);
    color: var(--color-danger);
    border: 1px solid rgba(255, 107, 107, 0.2);
  }

  .action-reject:active {
    background: var(--color-danger);
    color: white;
    transform: scale(0.97);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: var(--space-3xl) var(--space-lg);
  }

  .empty-icon { font-size: 3rem; margin-bottom: var(--space-md); }
  .empty-state h3 { font-size: var(--fs-lg); font-weight: var(--fw-semibold); margin-bottom: var(--space-xs); }
  .empty-state p { color: var(--text-muted); font-size: var(--fs-sm); }

  /* Modals */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 400;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-end;
    animation: fadeIn var(--transition-fast) ease-out;
  }

  .modal {
    width: 100%;
    max-height: 90vh;
    background: #ffffff;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    overflow-y: auto;
    animation: slideUp var(--transition-base) ease-out;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-lg) var(--space-xl);
    border-bottom: 1px solid var(--border-color);
  }

  .modal-title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: var(--fs-lg);
    font-weight: var(--fw-bold);
  }

  .modal-close {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
  }

  .modal-close:active { background: var(--bg-elevated); transform: scale(0.9); }

  .modal-body {
    padding: var(--space-xl);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    padding-bottom: calc(var(--space-3xl) + var(--safe-area-bottom));
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .form-label {
    font-size: var(--fs-sm);
    font-weight: var(--fw-semibold);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }



  /* Custom Dropdown Styles */
  .custom-dropdown-container {
    position: relative;
  }

  .custom-select-wrapper {
    position: relative;
    width: 100%;
  }

  .custom-select-trigger.placeholder {
    color: var(--text-muted);
  }

  .dropdown-icon {
    color: var(--text-secondary);
    display: flex;
    transition: transform 0.2s ease;
  }

  .dropdown-icon.rotated {
    transform: rotate(180deg);
  }

  .custom-select-wrapper.open .custom-select-trigger {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-glow);
  }

  .custom-select-options {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 50;
    overflow: hidden;
    animation: fadeIn 0.15s ease-out;
  }

  .custom-option {
    padding: 12px 16px;
    font-size: var(--fs-base);
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background-color 0.1s ease;
  }

  .custom-option:hover {
    background-color: var(--bg-body);
  }

  .custom-option.selected {
    background-color: var(--color-primary-glow);
    color: var(--color-primary-dark);
    font-weight: var(--fw-semibold);
  }

  :global(.option-check) {
    color: var(--color-primary);
  }

  .decision-summary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    padding: var(--space-lg);
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    font-size: var(--fs-md);
    font-weight: var(--fw-semibold);
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-lg);
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    color: white;
    font-size: var(--fs-md);
    font-weight: var(--fw-semibold);
    transition: all var(--transition-fast);
    min-height: 52px;
  }

  .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .submit-btn:not(:disabled):active { transform: scale(0.97); }

  .approve-btn {
    background: linear-gradient(135deg, var(--color-success), var(--color-success-dark));
  }
</style>
