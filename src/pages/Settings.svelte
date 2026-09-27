<script>
  import { 
    Settings, Users, Bell, Shield, LogOut, ChevronRight, UserPlus, 
    Home, Trash2, Plus, Edit2, Check, X, ShieldAlert, ShieldCheck, Lock, Moon, Sun, ScrollText, Phone, Database, Eye, RefreshCw
  } from 'lucide-svelte';
  import { store } from '../lib/store.js';
  import { httpClient } from '../lib/convex.js';
  import { api } from '../../convex/_generated/api.js';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import ConfirmModal from '../components/ConfirmModal.svelte';

  const dispatch = createEventDispatcher();

  let currentUser = store.state.currentUser;
  let rooms = [...store.state.rooms];
  let teamMembers = [...store.state.teamMembers];
  let features = { ...store.state.features };
  let unsubscribe;

  let ability = store.ability;
  let activeSection = ability.can('manage', 'Room') ? 'rooms' : 'app'; // 'rooms' | 'users' | 'audit' | 'app'
  
  // Room Management State
  let newRoomName = '';
  let isAddingRoom = false;
  let migratingPasswords = false;
  let darkMode = false;
  let auditLogs = [];
  let loadingAudit = false;

  // Confirmation Modal State
  let showConfirm = false;
  let confirmConfig = {
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {}
  };

  function triggerConfirm(config) {
    confirmConfig = { ...config };
    showConfirm = true;
  }

  function handleModalConfirm() {
    confirmConfig.onConfirm();
    showConfirm = false;
  }

  onMount(() => {
    darkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    unsubscribe = store.subscribe('settings-page', (state) => {
      rooms = [...state.rooms];
      teamMembers = [...state.teamMembers];
      currentUser = state.currentUser;
      features = { ...state.features };
      ability = store.ability;
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  async function handleAddRoom() {
    if (!newRoomName.trim()) return;
    const result = await store.addRoom(newRoomName.trim());
    if (result.success) {
      newRoomName = '';
      isAddingRoom = false;
      dispatch('toast', { message: 'Salle ajoutée avec succès', type: 'success' });
    } else {
      dispatch('toast', { message: result.error, type: 'error' });
    }
  }

  async function handleDeleteRoom(id) {
    triggerConfirm({
      title: 'Supprimer salle',
      message: 'Êtes-vous sûr de vouloir supprimer cette salle d\'opération ?',
      type: 'danger',
      onConfirm: async () => {
        const result = await store.removeRoom(id);
        if (result.success) {
          dispatch('toast', { message: 'Salle supprimée', type: 'info' });
        } else {
          dispatch('toast', { message: result.error || 'Suppression impossible', type: 'error' });
        }
      }
    });
  }

  async function handleUpdateRole(userId, currentRole) {
    const roles = ['technicien', 'medecin anesthesiste', 'surveillant bloc', 'instrumentiste'];
    const roleLabels = {
      'technicien': 'Technicien d\'Anesthésie',
      'medecin anesthesiste': 'Médecin Anesthésiste',
      'surveillant bloc': 'Surveillant Bloc',
      'instrumentiste': 'Instrumentiste',
      'superuser': 'Superuser'
    };
    // Le rôle superuser n'est cycleable que par un superuser
    if (ability.can('manage', 'Database')) roles.push('superuser');
    const currentIndex = roles.indexOf(currentRole);
    const nextIndex = (currentIndex + 1) % roles.length;
    const nextRole = roles[nextIndex];
    
    triggerConfirm({
      title: 'Changer rôle',
      message: `Passer le rôle de cet utilisateur à "${roleLabels[nextRole]}" ?`,
      type: 'info',
      onConfirm: async () => {
        const result = await store.updateUserRole(userId, nextRole);
        if (result.success) {
          dispatch('toast', { message: 'Rôle mis à jour', type: 'success' });
        } else {
          dispatch('toast', { message: result.error || 'Mise à jour impossible', type: 'error' });
        }
      }
    });
  }

  async function handleDeleteUser(userId) {
    triggerConfirm({
      title: 'Supprimer utilisateur',
      message: 'Cette action est irréversible. Supprimer ce compte ?',
      type: 'danger',
      onConfirm: async () => {
        const result = await store.removeUser(userId);
        if (result.success) {
          dispatch('toast', { message: 'Utilisateur supprimé', type: 'warning' });
        } else {
          dispatch('toast', { message: result.error || 'Suppression impossible', type: 'error' });
        }
      }
    });
  }

  async function toggleFeature(key, enabled) {
    const next = { ...features, [key]: enabled };
    const result = await store.updateFeatures(next);
    if (result.success) {
      features = next;
      dispatch('toast', {
        message: enabled ? 'Fonctionnalité activée' : 'Fonctionnalité désactivée',
        type: 'success'
      });
    } else {
      dispatch('toast', { message: result.error || 'Mise à jour impossible', type: 'error' });
    }
  }

  function handleLogout() {
    store.logout();
  }

  // --- Base de données (superuser) ---

  const collections = [
    'users', 'rooms', 'notifications', 'absences',
    'permutations', 'pushSubscriptions', 'notificationLogs', 'settings', 'archives'
  ];
  const collectionLabels = {
    users: 'Utilisateurs',
    rooms: 'Salles',
    notifications: 'Notifications',
    absences: 'Absences',
    permutations: 'Permutations',
    pushSubscriptions: 'Abonnements push',
    notificationLogs: "Journal d'audit",
    settings: 'Paramètres',
    archives: 'Archives',
  };

  let dbStats = null;
  let dbCollection = null;
  let dbDocs = [];
  let dbLoading = false;

  async function loadDbStats() {
    const result = await store.dbStats();
    if (result.success) dbStats = result.data;
    else dispatch('toast', { message: result.error || 'Lecture impossible', type: 'error' });
  }

  async function viewCollection(name) {
    dbCollection = name;
    dbLoading = true;
    const result = await store.dbList(name, 100);
    dbLoading = false;
    if (result.success) dbDocs = result.data;
    else dispatch('toast', { message: result.error || 'Lecture impossible', type: 'error' });
  }

  function confirmClear(name) {
    triggerConfirm({
      title: `Vider « ${collectionLabels[name]} »`,
      message: 'Tous les documents de cette collection seront définitivement supprimés.',
      type: 'danger',
      onConfirm: async () => {
        const result = await store.dbClearCollection(name);
        if (result.success) {
          dispatch('toast', { message: `${result.deleted} document(s) supprimé(s)`, type: 'warning' });
          await loadDbStats();
          if (dbCollection === name) await viewCollection(name);
        } else {
          dispatch('toast', { message: result.error || 'Purge impossible', type: 'error' });
        }
      }
    });
  }

  function confirmRemoveDoc(collection, id) {
    triggerConfirm({
      title: 'Supprimer ce document',
      message: `Document ${id} — action irréversible.`,
      type: 'danger',
      onConfirm: async () => {
        const result = await store.dbRemoveDocument(collection, id);
        if (result.success) {
          dispatch('toast', { message: 'Document supprimé', type: 'warning' });
          await loadDbStats();
          if (dbCollection === collection) await viewCollection(collection);
        } else {
          dispatch('toast', { message: result.error || 'Suppression impossible', type: 'error' });
        }
      }
    });
  }

  function confirmSeedDefaults() {
    triggerConfirm({
      title: 'Réinitialiser les données par défaut',
      message: 'Recrée les salles et l\'équipe par défaut si elles sont manquantes (aucune donnée existante n\'est écrasée).',
      type: 'info',
      onConfirm: async () => {
        const result = await store.seedDefaults();
        if (result.success) {
          dispatch('toast', { message: 'Données par défaut restaurées', type: 'success' });
          await loadDbStats();
        } else {
          dispatch('toast', { message: result.error || 'Réinitialisation impossible', type: 'error' });
        }
      }
    });
  }

  function docSummary(collection, doc) {
    if (!doc) return '';
    const key =
      collection === 'users' ? `@${doc.username} • ${doc.role} (${doc.name})`
      : collection === 'rooms' ? doc.name
      : collection === 'notifications' ? `${doc.type} • ${doc.room} — ${String(doc.message || '').slice(0, 60)}`
      : collection === 'absences' ? `${doc.userName} • ${doc.type} ${doc.duration ?? ''}`
      : collection === 'permutations' ? `${doc.requesterName} ↔ ${doc.targetName} • ${doc.status}`
      : collection === 'pushSubscriptions' ? String(doc.subscription?.endpoint || '').slice(0, 60)
      : collection === 'notificationLogs' ? `${doc.event} • ${doc.userName || '—'}`
      : collection === 'archives' ? `${doc.type} • ${doc.room} — ${String(doc.message || '').slice(0, 60)}`
      : `${doc.key || ''}`;
    return key;
  }

  async function openDatabase() {
    activeSection = 'database';
    dbCollection = null;
    dbDocs = [];
    await loadDbStats();
  }

  async function handleMigratePasswords() {
    triggerConfirm({
      title: 'Sécuriser les mots de passe',
      message: 'Hacher tous les mots de passe en clair avec bcrypt ? Cette action est irréversible.',
      type: 'danger',
      onConfirm: async () => {
        migratingPasswords = true;
        try {
          const result = await httpClient.action(api.auth.migratePasswords);
          dispatch('toast', { message: result, type: 'success' });
        } catch (e) {
          dispatch('toast', { message: e.message || 'Erreur lors de la migration', type: 'error' });
        } finally {
          migratingPasswords = false;
        }
      }
    });
  }

  function toggleDarkMode() {
    darkMode = !darkMode;
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('blocnotif_theme', darkMode ? 'dark' : 'light');
  }

  async function loadAuditLogs() {
    loadingAudit = true;
    try {
      auditLogs = await httpClient.query(api.notificationLogs.getAuditLog);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      loadingAudit = false;
    }
  }

  function formatLogTime(timestamp) {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function getEventLabel(event) {
    const labels = {
      sent: 'Envoyée',
      delivered: 'Livrée',
      clicked: 'Cliquée',
      acknowledged: 'Acquittée',
    };
    return labels[event] || event;
  }

  function getEventColor(event) {
    const colors = {
      sent: '#13A09F',
      delivered: '#f59e0b',
      clicked: '#3b82f6',
      acknowledged: '#10b981',
    };
    return colors[event] || '#6b7280';
  }
</script>

<div class="settings-page">
  <div class="settings-header">
    <h1 class="page-title">{ability.can('manage', 'User') ? 'Administration' : 'Paramètres'}</h1>
    <p class="page-subtitle">{ability.can('manage', 'User') ? "Gestion du bloc et de l'équipe" : "Gérer votre compte"}</p>
  </div>

  <!-- Section Switcher -->
  <div class="section-tabs">
          {#if ability.can('manage', 'User')}
      <button 
        class="section-tab" 
        class:active={activeSection === 'rooms'} 
        on:click={() => activeSection = 'rooms'}
      >
        <Home size={18} /> Salles
      </button>
      <button 
        class="section-tab" 
        class:active={activeSection === 'users'} 
        on:click={() => activeSection = 'users'}
      >
        <Users size={18} /> Équipe
      </button>
    {/if}
    {#if ability.can('manage', 'User')}
      <button 
        class="section-tab" 
        class:active={activeSection === 'audit'} 
        on:click={() => { activeSection = 'audit'; loadAuditLogs(); }}
      >
        <ScrollText size={18} /> Audit
      </button>
    {/if}
    {#if ability.can('manage', 'Database')}
      <button
        class="section-tab"
        class:active={activeSection === 'database'}
        on:click={openDatabase}
      >
        <Database size={18} /> Base de données
      </button>
    {/if}
    <button 
      class="section-tab" 
      class:active={activeSection === 'app'} 
      on:click={() => activeSection = 'app'}
    >
      <Settings size={18} /> App
    </button>
  </div>

  <div class="settings-content">
    {#if activeSection === 'rooms'}
      <div class="admin-section">
        <div class="section-header">
          <h2 class="section-title">Salles d'opération</h2>
          <button class="add-btn" on:click={() => isAddingRoom = !isAddingRoom}>
            <Plus size={18} />
          </button>
        </div>

        {#if isAddingRoom}
          <div class="add-form animate-slide-down">
            <input 
              type="text" 
              bind:value={newRoomName} 
              placeholder="Nom de la salle (ex: Salle 7)"
              on:keydown={(e) => e.key === 'Enter' && handleAddRoom()}
            />
            <div class="add-form-actions">
              <button class="btn-cancel" on:click={() => isAddingRoom = false}><X size={18} /></button>
              <button class="btn-confirm" on:click={handleAddRoom}><Check size={18} /></button>
            </div>
          </div>
        {/if}

        <div class="item-list">
          {#each rooms as room}
            <div class="admin-item">
              <div class="item-info">
                <span class="item-main">{room.name}</span>
                <span class="item-sub">Actuellement active</span>
              </div>
              <button class="item-action delete" on:click={() => handleDeleteRoom(room._id)}>
                <Trash2 size={18} />
              </button>
            </div>
          {/each}
        </div>
      </div>

    {:else if activeSection === 'users'}
      <div class="admin-section">
        <div class="section-header">
          <h2 class="section-title">Gestion de l'équipe</h2>
        </div>

        <div class="item-list">
          {#each teamMembers as user}
            <div class="admin-item user-item">
              <div class="user-avatar-small">
                {user.name.charAt(0)}
              </div>
              <div class="item-info">
                <span class="item-main">{user.name}</span>
                <span class="item-sub">@{user.username} • {user.role}</span>
              </div>
              <div class="user-actions">
                <button 
                  class="item-action role-toggle" 
                  title="Changer le rôle"
                  on:click={() => handleUpdateRole(user._id, user.role)}
                >
                  {#if user.role.includes('surveillant')}
                    <ShieldCheck size={18} />
                  {:else}
                    <Shield size={18} />
                  {/if}
                </button>
                {#if user._id !== currentUser._id}
                  <button class="item-action delete" on:click={() => handleDeleteUser(user._id)}>
                    <Trash2 size={18} />
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

    {:else if activeSection === 'audit'}
      <div class="admin-section">
        <div class="section-header">
          <h2 class="section-title">Journal d'audit des notifications</h2>
          <button class="add-btn" on:click={loadAuditLogs}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
        </div>

        {#if loadingAudit}
          <div class="empty-state">
            <p>Chargement...</p>
          </div>
        {:else if auditLogs.length === 0}
          <div class="empty-state">
            <p>Aucun log d'audit</p>
          </div>
        {:else}
          <div class="audit-list">
            {#each auditLogs.slice(0, 100) as log}
              <div class="audit-item">
                <div class="audit-event" style="color: {getEventColor(log.event)}">
                  {getEventLabel(log.event)}
                </div>
                <div class="audit-info">
                  <span class="audit-notif">{log.notifType} - Salle {log.notifRoom}</span>
                  <span class="audit-meta">
                    {#if log.userName}{log.userName} · {/if}{log.authorName} · {formatLogTime(log._creationTime)}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    {:else if activeSection === 'database'}
      <div class="admin-section">
        <div class="section-header">
          <h2 class="section-title">Collections</h2>
          <button class="add-btn" title="Rafraîchir" on:click={loadDbStats}>
            <RefreshCw size={16} />
          </button>
        </div>

        {#if !dbStats}
          <div class="empty-state"><p>Chargement...</p></div>
        {:else}
          <div class="settings-list">
            {#each collections as c}
              <div class="settings-item">
                <div class="item-icon" style="background: rgba(19, 160, 159, 0.15); color: #13A09F;">
                  <Database size={20} />
                </div>
                <div class="item-content">
                  <span class="item-label">{collectionLabels[c]}</span>
                  <span class="item-description">{dbStats[c]} document(s)</span>
                </div>
                <div class="user-actions">
                  <button class="item-action" title="Voir les documents" on:click={() => viewCollection(c)}>
                    <Eye size={18} />
                  </button>
                  <button class="item-action delete" title="Vider la collection" on:click={() => confirmClear(c)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      {#if dbCollection}
        <div class="admin-section">
          <div class="section-header">
            <h2 class="section-title">{collectionLabels[dbCollection]} — {dbDocs.length} affiché(s)</h2>
            <button class="add-btn" title="Rafraîchir" on:click={() => viewCollection(dbCollection)}>
              <RefreshCw size={16} />
            </button>
          </div>
          {#if dbLoading}
            <div class="empty-state"><p>Chargement...</p></div>
          {:else if dbDocs.length === 0}
            <div class="empty-state"><p>Collection vide</p></div>
          {:else}
            <div class="db-docs">
              {#each dbDocs as doc}
                <div class="db-doc">
                  <div class="db-doc-main">
                    <span class="db-doc-id">{doc._id}</span>
                    <span class="db-doc-summary">{docSummary(dbCollection, doc)}</span>
                  </div>
                  <button class="item-action delete" title="Supprimer" on:click={() => confirmRemoveDoc(dbCollection, doc._id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <div class="admin-section">
        <button class="settings-item btn-item" on:click={confirmSeedDefaults}>
          <div class="item-icon" style="background: rgba(34, 197, 94, 0.15); color: #22c55e;"><RefreshCw size={20} /></div>
          <div class="item-content">
            <span class="item-label">Restaurer les données par défaut</span>
            <span class="item-description">Recrée les salles et l'équipe manquantes</span>
          </div>
          <ChevronRight size={18} class="text-muted" />
        </button>
      </div>

    {:else if activeSection === 'app'}
      {#if ability.can('manage', 'Settings')}
        <div class="admin-section">
          <h2 class="section-title">Fonctionnalités</h2>
          <p class="section-hint">
            Les fonctions désactivées sont masquées pour tous les utilisateurs.
          </p>
          <div class="settings-list">
            <div class="settings-item">
              <div class="item-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">
                <Phone size={20} />
              </div>
              <div class="item-content">
                <span class="item-label">Appel Astreinte</span>
                <span class="item-description">Bouton « Astreinte Technicien » et type « Appel Astreinte »</span>
              </div>
              <label class="switch">
                <input
                  type="checkbox"
                  checked={features.appelAstreinte}
                  on:change={(e) => toggleFeature('appelAstreinte', e.target.checked)}
                >
                <span class="slider"></span>
              </label>
            </div>

            <div class="settings-item">
              <div class="item-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">
                <Phone size={20} />
              </div>
              <div class="item-content">
                <span class="item-label">Appel MAR</span>
                <span class="item-description">Bouton « Astreinte MAR » et choix du MAR à appeler</span>
              </div>
              <label class="switch">
                <input
                  type="checkbox"
                  checked={features.appelMar}
                  on:change={(e) => toggleFeature('appelMar', e.target.checked)}
                >
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
      {/if}

      <div class="admin-section">
        <h2 class="section-title">Paramètres Application</h2>
        <div class="settings-list">
          <div class="settings-item">
            <div class="item-icon bell-icon"><Bell size={20} /></div>
            <div class="item-content">
              <span class="item-label">Notifications Sonores</span>
              <span class="item-description">Activer le son des alertes</span>
            </div>
            <label class="switch">
              <input type="checkbox" checked>
              <span class="slider"></span>
            </label>
          </div>

          <div class="settings-item">
            <div class="item-icon" style="background: rgba(19, 160, 159, 0.15); color: #13A09F;">
              {#if darkMode}<Moon size={20} />{:else}<Sun size={20} />{/if}
            </div>
            <div class="item-content">
              <span class="item-label">Mode Sombre</span>
              <span class="item-description">{darkMode ? 'Désactiver le thème sombre' : 'Activer le thème sombre'}</span>
            </div>
            <label class="switch">
              <input type="checkbox" checked={darkMode} on:change={toggleDarkMode}>
              <span class="slider"></span>
            </label>
          </div>

          {#if ability.can('manage', 'Room')}
            <button class="settings-item btn-item" on:click={handleMigratePasswords} disabled={migratingPasswords}>
              <div class="item-icon" style="background: rgba(251, 191, 36, 0.15); color: #d97706;"><Lock size={20} /></div>
              <div class="item-content">
                <span class="item-label">{migratingPasswords ? 'Migration en cours...' : 'Sécuriser les mots de passe'}</span>
                <span class="item-description">Hacher les mots de passe en clair avec bcrypt</span>
              </div>
              <ChevronRight size={18} class="text-muted" />
            </button>
          {/if}

          <button class="settings-item btn-item logout-btn" on:click={handleLogout}>
            <div class="item-icon"><LogOut size={20} /></div>
            <div class="item-content">
              <span class="item-label">Se déconnecter</span>
              <span class="item-description">Fermer la session actuelle</span>
            </div>
          </button>
        </div>
      </div>
    {/if}

    <div class="app-version">
      BlocNotif v2.2.0 • Surveillance Mode
    </div>
  </div>
</div>

{#if showConfirm}
  <ConfirmModal 
    {...confirmConfig} 
    on:confirm={handleModalConfirm}
    on:cancel={() => showConfirm = false}
  />
{/if}

<style>
  .settings-page {
    padding: var(--space-xl) var(--space-lg);
    animation: fadeIn 0.4s ease-out;
  }

  .settings-header {
    margin-bottom: var(--space-xl);
  }

  .page-title {
    font-size: var(--fs-2xl);
    font-weight: 900;
    color: var(--text-primary);
    letter-spacing: -0.02em;
  }

  .page-subtitle {
    color: var(--text-secondary);
    font-size: var(--fs-sm);
  }

  /* Tabs */
  .section-tabs {
    display: flex;
    gap: var(--space-xs);
    background: rgba(0, 0, 0, 0.04);
    padding: 4px;
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-xl);
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .section-tabs::-webkit-scrollbar {
    display: none;
  }

  .section-tab {
    flex: 1 1 auto;
    min-width: max-content;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--text-secondary);
    transition: all 0.2s;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .section-tab.active {
    background: var(--bg-card);
    color: var(--color-primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  /* Admin Sections */
  .admin-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-xs);
  }

  .section-title {
    font-size: var(--fs-xs);
    font-weight: 800;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .section-hint {
    font-size: var(--fs-xs);
    color: var(--text-muted);
    padding: 0 var(--space-xs);
    margin-top: calc(var(--space-xs) * -1);
  }

  .db-docs {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .db-doc {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-card);
    border: 1px solid var(--border-card);
    border-radius: var(--radius-md);
  }

  .db-doc-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .db-doc-id {
    font-family: monospace;
    font-size: var(--fs-xs);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .db-doc-summary {
    font-size: var(--fs-sm);
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .add-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    background: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
  }

  /* Add Form */
  .add-form {
    display: flex;
    gap: var(--space-sm);
    background: var(--bg-card);
    padding: var(--space-sm);
    border-radius: var(--radius-lg);
    border: 1.5px solid var(--color-primary);
  }

  .add-form input {
    flex: 1;
    border: none;
    padding: 8px 12px;
    font-size: var(--fs-base);
    outline: none;
  }

  .add-form-actions {
    display: flex;
    gap: 4px;
  }

  .btn-confirm, .btn-cancel {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
  }

  .btn-confirm { background: var(--color-success); color: white; }
  .btn-cancel { background: var(--bg-elevated); color: var(--text-secondary); }

  /* Item List */
  .item-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .admin-item {
    background: var(--bg-card);
    padding: var(--space-md) var(--space-lg);
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: var(--space-md);
    box-shadow: var(--shadow-sm);
  }

  .user-avatar-small {
    width: 40px;
    height: 40px;
    background: var(--bg-elevated);
    color: var(--color-primary);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }

  .item-info {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  .item-main {
    font-size: var(--fs-base);
    font-weight: 700;
    color: var(--text-primary);
  }

  .item-sub {
    font-size: var(--fs-xs);
    color: var(--text-muted);
  }

  .user-actions {
    display: flex;
    gap: 8px;
  }

  .item-action {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    transition: all 0.2s;
  }

  .item-action.delete:hover { background: var(--color-danger-glow); color: var(--color-danger); }
  .item-action.role-toggle:hover { background: var(--color-primary-glow); color: var(--color-primary); }

  /* Settings List Reused */
  .settings-list {
    background: var(--bg-card);
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-card);
    overflow: hidden;
  }

  .settings-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    background: var(--bg-card);
    border: none;
    border-bottom: 1px solid var(--border-color);
    text-align: left;
  }

  .item-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bell-icon { background: var(--color-warning-glow); color: var(--color-warning); }
  .logout-btn .item-icon { background: var(--color-danger-glow); color: var(--color-danger); }

  .item-label { font-weight: 700; }
  .item-description { font-size: var(--fs-xs); color: var(--text-muted); }

  .logout-btn .item-label { color: var(--color-danger); }

  /* Switch Toggle */
  .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; cursor: pointer; inset: 0; background-color: #e2e8f0; transition: .4s; border-radius: 24px; }
  .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
  input:checked + .slider { background-color: var(--color-primary); }
  input:checked + .slider:before { transform: translateX(20px); }

  .app-version {
    text-align: center;
    font-size: var(--fs-xs);
    color: var(--text-muted);
    margin-top: var(--space-2xl);
  }

  .animate-slide-down {
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Audit Log */
  .audit-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .audit-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    background: var(--bg-card);
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-color);
  }

  .audit-event {
    font-size: var(--fs-xs);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    background: var(--bg-elevated);
    white-space: nowrap;
  }

  .audit-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .audit-notif {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .audit-meta {
    font-size: var(--fs-xs);
    color: var(--text-muted);
  }

  .empty-state {
    text-align: center;
    padding: var(--space-2xl);
    color: var(--text-muted);
  }
</style>
