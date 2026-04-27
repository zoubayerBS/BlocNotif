<script>
  import { store } from '../lib/store.js';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { Bell } from 'lucide-svelte';

  const dispatch = createEventDispatcher();

  let room = '';
  let roomDropdownOpen = false;
  let type = '';
  let typeDropdownOpen = false;
  let priority = '';
  let patient = '';
  let message = '';

  let rooms = [...store.state.rooms];
  let unsubscribe;

  onMount(() => {
    unsubscribe = store.subscribe('notif-form', (state) => {
      rooms = [...state.rooms];
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });
  const types = [
    'Urgence',
    'Préparation matériel',
    'Protocole anesthésique',
    'Manque matériel',
    'Équipement HS',
    'Salle non opérable',
    'Info',
    'Appel Astreinte'
  ];

  function handleSubmit(e) {
    e.preventDefault();
    if (!room || !type || !priority) return;
    dispatch('submit', { room, type, priority, patient, message });
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) dispatch('close');
  }
  function handleWindowClick(e) {
    if (roomDropdownOpen && !e.target.closest('#room-dropdown-container')) {
      roomDropdownOpen = false;
    }
    if (typeDropdownOpen && !e.target.closest('#type-dropdown-container')) {
      typeDropdownOpen = false;
    }
  }

  $: if (type !== 'Protocole anesthésique') {
    patient = '';
  }
</script>

<svelte:window on:click={handleWindowClick} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="modal-backdrop" on:click={handleBackdrop}>
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">
        <Bell size={24} /> Nouvelle alerte
      </h2>
      <button class="modal-close" on:click={() => dispatch('close')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <form class="modal-body" on:submit={handleSubmit}>
      <!-- Room -->
      <div class="form-group relative" id="room-dropdown-container">
        <div class="form-label" id="room-label">Salle</div>
        <button
          type="button"
          class="custom-select-trigger"
          class:open={roomDropdownOpen}
          on:click={() => roomDropdownOpen = !roomDropdownOpen}
          aria-labelledby="room-label"
        >
          {room ? room : 'Choisir une salle...'}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron" class:rotate={roomDropdownOpen}>
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {#if roomDropdownOpen}
          <div class="custom-select-dropdown">
            {#each rooms as r}
              <button
                type="button"
                class="custom-select-option"
                class:selected={room === r.name}
                on:click={() => { room = r.name; roomDropdownOpen = false; }}
              >
                {r.name}
                {#if room === r.name}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Type -->
      <div class="form-group relative" id="type-dropdown-container">
        <div class="form-label" id="type-label">Type d'alerte</div>
        <button
          type="button"
          class="custom-select-trigger"
          class:open={typeDropdownOpen}
          on:click={() => typeDropdownOpen = !typeDropdownOpen}
          aria-labelledby="type-label"
        >
          {type ? type : 'Choisir un type...'}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron" class:rotate={typeDropdownOpen}>
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {#if typeDropdownOpen}
          <div class="custom-select-dropdown">
            {#each types as t}
              <button
                type="button"
                class="custom-select-option"
                class:selected={type === t}
                on:click={() => { type = t; typeDropdownOpen = false; }}
              >
                {t}
                {#if type === t}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Priority -->
      <div class="form-group">
        <div class="form-label" id="priority-label">Priorité</div>
        <div class="priority-selector" role="group" aria-labelledby="priority-label">
          <button
            type="button"
            class="priority-btn high"
            class:selected={priority === 'haute'}
            on:click={() => priority = 'haute'}
          >
            <span class="priority-dot"></span>
            Haute
          </button>
          <button
            type="button"
            class="priority-btn medium"
            class:selected={priority === 'moyenne'}
            on:click={() => priority = 'moyenne'}
          >
            <span class="priority-dot"></span>
            Moyenne
          </button>
          <button
            type="button"
            class="priority-btn low"
            class:selected={priority === 'basse'}
            on:click={() => priority = 'basse'}
          >
            <span class="priority-dot"></span>
            Basse
          </button>
        </div>
      </div>

      <!-- Patient -->
      {#if type === 'Protocole anesthésique'}
        <div class="form-group" style="animation: slideDown var(--transition-base) ease-out;">
          <label class="form-label" for="notif-patient">Patient (optionnel)</label>
          <input
            type="text"
            id="notif-patient"
            bind:value={patient}
            placeholder="Ex: M. Dupont (Chambre 12)"
          />
        </div>
      {/if}

      <!-- Message -->
      <div class="form-group">
        <label class="form-label" for="notif-message">Message (optionnel)</label>
        <textarea
          id="notif-message"
          bind:value={message}
          placeholder="Détails supplémentaires..."
          rows="3"
        ></textarea>
      </div>

      <button
        type="submit"
        class="submit-btn"
        disabled={!room || !type || !priority}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
        Envoyer l'alerte
      </button>
    </form>
  </div>
</div>

<style>
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
    max-height: 92vh;
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
    position: sticky;
    top: 0;
    background: #ffffff !important;
    z-index: 1;
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

  .modal-close:active {
    background: var(--bg-elevated);
    transform: scale(0.9);
  }

  .modal-body {
    padding: var(--space-xl);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    padding-bottom:  calc(var(--space-3xl) + var(--safe-area-bottom));
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

  .relative { position: relative; }

  /* Custom Select Dropdown */
  .custom-select-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) var(--space-lg);
    background: var(--bg-input);
    border: 1.5px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: var(--fs-base);
    color: var(--text-primary);
    transition: all var(--transition-fast);
    text-align: left;
    min-height: 52px;
  }

  .custom-select-trigger:focus, .custom-select-trigger.open {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 4px var(--color-primary-glow);
    background: rgba(255, 255, 255, 0.85);
  }

  .chevron {
    transition: transform var(--transition-base);
    color: var(--text-secondary);
  }

  .chevron.rotate {
    transform: rotate(180deg);
    color: var(--color-primary);
  }

  .custom-select-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: #ffffff;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
    max-height: 240px;
    overflow-y: auto;
    z-index: 50;
    padding: var(--space-xs);
    animation: slideUp 0.2s ease-out;
  }

  .custom-select-option {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) var(--space-lg);
    border-radius: var(--radius-sm);
    font-size: var(--fs-base);
    color: var(--text-primary);
    transition: background var(--transition-fast);
    text-align: left;
  }

  .custom-select-option:hover {
    background: var(--bg-elevated);
  }

  .custom-select-option.selected {
    background: var(--color-primary-glow);
    color: var(--color-primary-dark);
    font-weight: var(--fw-semibold);
  }

  /* Priority Selector */
  .priority-selector {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-sm);
  }

  .priority-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: var(--space-md);
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
    border: 1.5px solid var(--border-color);
    font-size: var(--fs-sm);
    font-weight: var(--fw-semibold);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
    min-height: 48px;
  }

  .priority-btn:active { transform: scale(0.96); }

  .priority-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .priority-btn.high .priority-dot { background: var(--color-danger); }
  .priority-btn.medium .priority-dot { background: var(--color-warning); }
  .priority-btn.low .priority-dot { background: var(--color-success); }

  .priority-btn.high.selected {
    border-color: var(--color-danger);
    background: var(--color-danger-glow);
    color: var(--color-danger);
  }

  .priority-btn.medium.selected {
    border-color: var(--color-warning);
    background: var(--color-warning-glow);
    color: var(--color-warning);
  }

  .priority-btn.low.selected {
    border-color: var(--color-success);
    background: var(--color-success-glow);
    color: var(--color-success);
  }

  /* Submit */
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
    margin-top: var(--space-sm);
    min-height: 52px;
  }

  .submit-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .submit-btn:not(:disabled):active {
    transform: scale(0.97);
  }
</style>
