<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { store } from '../lib/store.js';
  import { CalendarDays, ChevronLeft, ChevronRight, Plus, X, Trash2, Sun } from 'lucide-svelte';
  import ConfirmModal from '../components/ConfirmModal.svelte';

  const dispatch = createEventDispatcher();
  const DAY = 86400000;

  const TYPES = ['Congé', 'Maladie', 'Formation', 'Maternité', 'Autre'];
  const TYPE_COLORS = {
    'Congé': 'var(--color-primary)',
    'Maladie': 'var(--color-danger)',
    'Formation': 'var(--color-warning)',
    'Maternité': '#8b5cf6',
    'Autre': 'var(--text-muted)',
  };
  const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  let absences = [...store.state.absences];
  let currentUser = store.state.currentUser;
  let unsubscribe;

  const todayMs = startOfDay(new Date()).getTime();
  let viewDate = startOfMonth(new Date());
  let selectedDay = null;

  let showForm = false;
  let formType = 'Congé';
  let formDate = toISODate(new Date());
  let formDuration = 1;
  let formReason = '';

  let showConfirm = false;
  let confirmConfig = { title: '', message: '', type: 'danger', onConfirm: () => {} };

  onMount(() => {
    unsubscribe = store.subscribe('absences-page', (state) => {
      absences = [...state.absences];
      currentUser = state.currentUser;
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  // --- Dates ---
  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function startOfMonth(d) {
    const x = startOfDay(d);
    x.setDate(1);
    return x;
  }

  function toISODate(d) {
    const x = startOfDay(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  }

  function fromISODate(s) {
    const [y, m, d] = s.split('-').map(Number);
    return startOfDay(new Date(y, m - 1, d)).getTime();
  }

  function fmtShort(ms) {
    return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  function coversDay(a, dayMs) {
    const start = a.timestamp;
    const end = a.timestamp + (a.duration || 1) * DAY;
    return dayMs >= start && dayMs < end;
  }

  function overlapsMonth(a, monthStart) {
    const mStart = monthStart.getTime();
    const mEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).getTime();
    return a.timestamp < mEnd && a.timestamp + (a.duration || 1) * DAY > mStart;
  }

  function absencesOnDay(dayMs) {
    return absences.filter((a) => coversDay(a, dayMs));
  }

  function buildCells(monthStart) {
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((offset + daysInMonth) / 7) * 7;
    const out = [];
    for (let i = 0; i < total; i++) {
      const d = new Date(year, month, i - offset + 1);
      out.push({ ms: startOfDay(d).getTime(), day: d.getDate(), inMonth: d.getMonth() === month });
    }
    return out;
  }

  function dateRange(a) {
    const end = a.timestamp + ((a.duration || 1) - 1) * DAY;
    if ((a.duration || 1) <= 1) {
      return new Date(a.timestamp).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long',
      });
    }
    return `${fmtShort(a.timestamp)} → ${fmtShort(end)} · ${a.duration} jours`;
  }

  // --- Vues ---
  $: monthLabel = viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  $: cells = buildCells(viewDate);
  $: monthAbsences = absences
    .filter((a) => overlapsMonth(a, viewDate))
    .sort((a, b) => a.timestamp - b.timestamp);
  $: visibleAbsences = selectedDay !== null
    ? monthAbsences.filter((a) => coversDay(a, selectedDay))
    : monthAbsences;
  $: absentToday = absences.filter((a) => coversDay(a, todayMs));

  function prevMonth() {
    viewDate = startOfMonth(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  }

  function nextMonth() {
    viewDate = startOfMonth(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  }

  function selectDay(cell) {
    selectedDay = selectedDay === cell.ms ? null : cell.ms;
    if (!cell.inMonth) viewDate = startOfMonth(new Date(cell.ms));
  }

  function clearDayFilter() {
    selectedDay = null;
  }

  // --- Déclaration ---
  function openForm() {
    formType = 'Congé';
    formDate = toISODate(new Date(selectedDay !== null ? selectedDay : todayMs));
    formDuration = 1;
    formReason = '';
    showForm = true;
  }

  async function submitForm() {
    if (!formDate || Number(formDuration) < 1) {
      dispatch('toast', { message: 'Date et durée invalides', type: 'error' });
      return;
    }
    const res = await store.addAbsence({
      type: formType,
      reason: formReason.trim() || '—',
      timestamp: fromISODate(formDate),
      duration: Number(formDuration),
    });
    if (res.success) {
      showForm = false;
      viewDate = startOfMonth(new Date(fromISODate(formDate)));
      dispatch('toast', { message: 'Absence enregistrée', type: 'success' });
    } else {
      dispatch('toast', { message: res.error || 'Enregistrement impossible', type: 'error' });
    }
  }

  // --- Suppression ---
  function canDelete(a) {
    return (currentUser && a.userId === currentUser._id) || store.ability.can('manage', 'Absence');
  }

  function askDelete(a) {
    confirmConfig = {
      title: 'Supprimer cette absence',
      message: `${a.userName} — ${a.type} (${dateRange(a)})`,
      type: 'danger',
      onConfirm: async () => {
        const res = await store.removeAbsence(a._id);
        if (res.success) {
          dispatch('toast', { message: 'Absence supprimée', type: 'warning' });
        } else {
          dispatch('toast', { message: res.error || 'Suppression impossible', type: 'error' });
        }
      },
    };
    showConfirm = true;
  }

  function handleModalConfirm() {
    confirmConfig.onConfirm();
    showConfirm = false;
  }
</script>

<div class="page absences-page">
  <div class="page-header">
    <h1 class="page-title">
      <span class="title-icon"><CalendarDays size={28} /></span>
      Absences
    </h1>
    <span class="month-count">{monthAbsences.length} ce mois</span>
  </div>

  <!-- Aujourd'hui -->
  <div class="today-card">
    <div class="today-label"><Sun size={15} /> Aujourd'hui</div>
    {#if absentToday.length}
      <div class="today-list">
        {#each absentToday as a (a._id)}
          <span class="today-chip" style="--chip: {TYPE_COLORS[a.type] || TYPE_COLORS['Autre']}">
            {a.userName} · {a.type}
          </span>
        {/each}
      </div>
    {:else}
      <p class="today-empty">Toute l'équipe est présente</p>
    {/if}
  </div>

  <!-- Calendrier -->
  <div class="cal-card">
    <div class="cal-head">
      <button class="cal-nav" on:click={prevMonth} title="Mois précédent"><ChevronLeft size={18} /></button>
      <div class="cal-month">{monthLabel}</div>
      <button class="cal-nav" on:click={nextMonth} title="Mois suivant"><ChevronRight size={18} /></button>
    </div>

    <div class="cal-weekdays">
      {#each WEEKDAYS as d, i}
        <span class:weekend={i > 4}>{d}</span>
      {/each}
    </div>

    <div class="cal-grid">
      {#each cells as cell (cell.ms)}
        <button
          class="cal-day"
          class:other={!cell.inMonth}
          class:today={cell.ms === todayMs}
          class:selected={cell.ms === selectedDay}
          on:click={() => selectDay(cell)}
        >
          <span class="cal-num">{cell.day}</span>
          <span class="cal-dots">
            {#each absencesOnDay(cell.ms).slice(0, 3) as a (a._id)}
              <i style="background: {TYPE_COLORS[a.type] || TYPE_COLORS['Autre']}"></i>
            {/each}
          </span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Liste -->
  <div class="list-head">
    <h2>
      {#if selectedDay !== null}
        {new Date(selectedDay).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      {:else}
        Absences du mois
      {/if}
    </h2>
    {#if selectedDay !== null}
      <button class="clear-filter" on:click={clearDayFilter}><X size={14} /> Tout le mois</button>
    {/if}
  </div>

  {#if visibleAbsences.length === 0}
    <div class="empty-state">
      <div class="empty-icon"><CalendarDays size={44} /></div>
      <h3>Aucune absence</h3>
      <p>{selectedDay !== null ? 'Rien de prévu ce jour-là' : 'Aucune absence enregistrée ce mois-ci'}</p>
    </div>
  {:else}
    {#each visibleAbsences as a (a._id)}
      <div class="absence-card">
        <span class="abs-dot" style="background: {TYPE_COLORS[a.type] || TYPE_COLORS['Autre']}"></span>
        <div class="abs-body">
          <div class="abs-top">
            <strong>{a.userName}</strong>
            <span class="abs-type" style="color: {TYPE_COLORS[a.type] || TYPE_COLORS['Autre']}">{a.type}</span>
          </div>
          <div class="abs-dates">{dateRange(a)}</div>
          {#if a.reason && a.reason !== '—'}
            <div class="abs-reason">{a.reason}</div>
          {/if}
        </div>
        {#if canDelete(a)}
          <button class="abs-del" on:click={() => askDelete(a)} title="Supprimer">
            <Trash2 size={16} />
          </button>
        {/if}
      </div>
    {/each}
  {/if}

  <!-- FAB -->
  <div class="fab-container">
    <button class="fab" on:click={openForm} title="Déclarer une absence">
      <Plus size={26} />
    </button>
  </div>

  <!-- Formulaire -->
  {#if showForm}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-backdrop" on:click|self={() => (showForm = false)}>
      <div class="abs-modal">
        <div class="abs-modal-head">
          <h3><CalendarDays size={20} /> Déclarer une absence</h3>
          <button class="modal-close-btn" on:click={() => (showForm = false)}><X size={18} /></button>
        </div>

        <div class="abs-modal-body">
          <span class="field-label">Type</span>
          <div class="type-chips">
            {#each TYPES as t}
              <button
                class="type-chip"
                class:active={formType === t}
                style="--chip: {TYPE_COLORS[t]}"
                on:click={() => (formType = t)}
              >
                <i></i> {t}
              </button>
            {/each}
          </div>

          <label class="field-label" for="abs-date">Date de début</label>
          <input id="abs-date" type="date" bind:value={formDate} />

          <label class="field-label" for="abs-duration">Durée (jours)</label>
          <input id="abs-duration" type="number" min="1" max="90" bind:value={formDuration} />

          <label class="field-label" for="abs-reason">Motif</label>
          <textarea id="abs-reason" rows="2" bind:value={formReason} placeholder="Facultatif"></textarea>
        </div>

        <div class="abs-modal-actions">
          <button class="abs-btn cancel" on:click={() => (showForm = false)}>Annuler</button>
          <button class="abs-btn save" on:click={submitForm}>Enregistrer</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showConfirm}
    <ConfirmModal
      {...confirmConfig}
      on:confirm={handleModalConfirm}
      on:cancel={() => (showConfirm = false)}
    />
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

  .month-count {
    font-size: var(--fs-xs);
    font-weight: var(--fw-semibold);
    color: var(--text-muted);
    padding: 4px 10px;
    background: var(--bg-elevated);
    border-radius: var(--radius-full);
  }

  /* Aujourd'hui */
  .today-card {
    background: var(--bg-card);
    border: 1px solid var(--border-card);
    border-radius: var(--radius-xl);
    padding: var(--space-lg);
    margin-bottom: var(--space-lg);
    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.04);
  }

  .today-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--fs-xs);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-warning);
    margin-bottom: var(--space-sm);
  }

  .today-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .today-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--chip);
    background: color-mix(in srgb, var(--chip) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--chip) 35%, transparent);
    border-radius: var(--radius-full);
  }

  .today-empty {
    font-size: var(--fs-sm);
    color: var(--text-secondary);
  }

  /* Calendrier */
  .cal-card {
    background: var(--bg-card);
    border: 1px solid var(--border-card);
    border-radius: var(--radius-xl);
    padding: var(--space-lg);
    margin-bottom: var(--space-xl);
    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.04);
  }

  .cal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-md);
  }

  .cal-month {
    font-size: var(--fs-md);
    font-weight: 800;
    text-transform: capitalize;
  }

  .cal-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-full);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }

  .cal-nav:hover {
    background: var(--color-primary-glow);
    color: var(--color-primary);
  }

  .cal-weekdays,
  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .cal-weekdays {
    margin-bottom: 6px;
  }

  .cal-weekdays span {
    text-align: center;
    font-size: var(--fs-xs);
    font-weight: 800;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .cal-weekdays span.weekend {
    color: var(--color-danger);
    opacity: 0.7;
  }

  .cal-day {
    aspect-ratio: 1 / 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
    border: 1px solid transparent;
    color: var(--text-primary);
    font-size: var(--fs-sm);
    font-weight: 600;
    transition: all var(--transition-fast);
  }

  .cal-day:hover {
    border-color: var(--color-primary);
  }

  .cal-day.other {
    opacity: 0.35;
  }

  .cal-day.today {
    border-color: var(--color-primary);
    color: var(--color-primary);
    font-weight: 800;
  }

  .cal-day.selected {
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    color: #fff;
    border-color: transparent;
    box-shadow: 0 6px 16px rgba(19, 160, 159, 0.35);
  }

  .cal-dots {
    display: flex;
    gap: 2px;
    height: 5px;
  }

  .cal-dots i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    display: block;
  }

  /* Liste */
  .list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }

  .list-head h2 {
    font-size: var(--fs-md);
    font-weight: 800;
    text-transform: capitalize;
  }

  .clear-filter {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--color-primary);
    background: var(--color-primary-glow);
    border-radius: var(--radius-full);
  }

  .absence-card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
    background: var(--bg-card);
    border: 1px solid var(--border-card);
    border-radius: var(--radius-xl);
    padding: var(--space-lg);
    margin-bottom: var(--space-sm);
    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.04);
    animation: fadeInUp var(--transition-slow) ease-out both;
  }

  .abs-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-top: 6px;
    flex-shrink: 0;
  }

  .abs-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .abs-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
  }

  .abs-type {
    font-size: var(--fs-xs);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .abs-dates {
    font-size: var(--fs-sm);
    color: var(--text-secondary);
    text-transform: capitalize;
  }

  .abs-reason {
    font-size: var(--fs-xs);
    color: var(--text-muted);
    font-style: italic;
  }

  .abs-del {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-full);
    background: var(--bg-elevated);
    color: var(--text-muted);
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .abs-del:hover {
    background: var(--color-danger-glow);
    color: var(--color-danger);
  }

  .empty-state {
    text-align: center;
    padding: var(--space-3xl) var(--space-lg);
    color: var(--text-secondary);
    background: var(--bg-card);
    border: 1px dashed var(--border-color);
    border-radius: var(--radius-xl);
  }

  .empty-icon {
    color: var(--color-primary);
    opacity: 0.6;
    margin-bottom: var(--space-sm);
  }

  .empty-state h3 {
    font-size: var(--fs-md);
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .empty-state p {
    font-size: var(--fs-sm);
  }

  /* FAB */
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
    box-shadow: 0 10px 24px rgba(19, 160, 159, 0.35);
    transition: transform var(--transition-fast);
  }

  .fab:active {
    transform: scale(0.9) rotate(90deg);
  }

  /* Modal */
  .abs-modal {
    width: 92%;
    max-width: 420px;
    background: var(--bg-card);
    border: 1px solid var(--border-card);
    border-radius: var(--radius-xl);
    overflow: hidden;
    animation: fadeInUp var(--transition-base) ease-out;
  }

  .abs-modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-lg) var(--space-xl);
    border-bottom: 1px solid var(--border-color);
  }

  .abs-modal-head h3 {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: var(--fs-md);
    font-weight: 800;
    color: var(--color-primary);
  }

  .modal-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-full);
    background: var(--bg-elevated);
    color: var(--text-secondary);
  }

  .abs-modal-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-xl);
  }

  .field-label {
    font-size: var(--fs-xs);
    font-weight: 800;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: var(--space-xs);
  }

  .type-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .type-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--text-secondary);
    background: var(--bg-elevated);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-full);
    transition: all var(--transition-fast);
  }

  .type-chip i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--chip);
  }

  .type-chip.active {
    color: var(--chip);
    border-color: var(--chip);
    background: color-mix(in srgb, var(--chip) 12%, transparent);
  }

  .abs-modal-actions {
    display: flex;
    gap: var(--space-sm);
    padding: 0 var(--space-xl) var(--space-xl);
  }

  .abs-btn {
    flex: 1;
    padding: 12px;
    border-radius: var(--radius-lg);
    font-size: var(--fs-sm);
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .abs-btn.cancel {
    background: var(--bg-elevated);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  .abs-btn.save {
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    color: #fff;
    box-shadow: 0 4px 12px rgba(19, 160, 159, 0.3);
  }

  @media (max-width: 380px) {
    .cal-day {
      font-size: var(--fs-xs);
    }
  }
</style>
