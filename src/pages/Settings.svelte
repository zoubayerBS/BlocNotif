<script>
  import { 
    Settings, Users, Bell, Shield, LogOut, ChevronRight, UserPlus, 
    Home, Trash2, Plus, Edit2, Check, X, ShieldAlert, ShieldCheck 
  } from 'lucide-svelte';
  import { store } from '../lib/store.js';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import ConfirmModal from '../components/ConfirmModal.svelte';

  const dispatch = createEventDispatcher();

  let currentUser = store.state.currentUser;
  let rooms = [...store.state.rooms];
  let teamMembers = [...store.state.teamMembers];
  let unsubscribe;

  let activeSection = 'rooms'; // 'rooms' | 'users' | 'app'
  
  // Room Management State
  let newRoomName = '';
  let isAddingRoom = false;

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
    unsubscribe = store.subscribe('settings-page', (state) => {
      rooms = [...state.rooms];
      teamMembers = [...state.teamMembers];
      currentUser = state.currentUser;
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
        await store.removeRoom(id);
        dispatch('toast', { message: 'Salle supprimée', type: 'info' });
      }
    });
  }

  async function handleUpdateRole(userId, currentRole) {
    const roles = ['technicien', 'medecin anesthesiste', 'surveillant bloc'];
    const roleLabels = {
      'technicien': 'Technicien d\'Anesthésie',
      'medecin anesthesiste': 'Médecin Anesthésiste',
      'surveillant bloc': 'Surveillant Bloc'
    };
    const currentIndex = roles.indexOf(currentRole);
    const nextIndex = (currentIndex + 1) % roles.length;
    const nextRole = roles[nextIndex];
    
    triggerConfirm({
      title: 'Changer rôle',
      message: `Passer le rôle de cet utilisateur à "${roleLabels[nextRole]}" ?`,
      type: 'info',
      onConfirm: async () => {
        await store.updateUserRole(userId, nextRole);
        dispatch('toast', { message: 'Rôle mis à jour', type: 'success' });
      }
    });
  }

  async function handleDeleteUser(userId) {
    triggerConfirm({
      title: 'Supprimer utilisateur',
      message: 'Cette action est irréversible. Supprimer ce compte ?',
      type: 'danger',
      onConfirm: async () => {
        await store.removeUser(userId);
        dispatch('toast', { message: 'Utilisateur supprimé', type: 'warning' });
      }
    });
  }

  function handleLogout() {
    store.logout();
  }

  function handleEnableNotifications() {
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.Notifications.requestPermission();
      });
    } else {
      dispatch('toast', { message: 'Chargement des notifications...', type: 'info' });
    }
  }
</script>

<div class="settings-page">
  <div class="settings-header">
    <h1 class="page-title">Administration</h1>
    <p class="page-subtitle">Gestion du bloc et de l'équipe</p>
  </div>

  <!-- Section Switcher -->
  <div class="section-tabs">
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

    {:else if activeSection === 'app'}
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

          <button class="settings-item btn-item" on:click={handleEnableNotifications}>
            <div class="item-icon bell-icon"><Bell size={20} /></div>
            <div class="item-content">
              <span class="item-label">S'abonner aux Push</span>
              <span class="item-description">Recevoir les alertes sur cet appareil</span>
            </div>
            <ChevronRight size={18} class="text-muted" />
          </button>
          
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
  }

  .section-tab {
    flex: 1;
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
    background: white;
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
    background: white;
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
    background: white;
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
    background: white;
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-color);
    overflow: hidden;
  }

  .settings-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    background: white;
    border: none;
    border-bottom: 1px solid var(--border-color-light);
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
</style>
