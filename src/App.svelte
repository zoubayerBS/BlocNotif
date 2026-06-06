<script>
  import { store } from "./lib/store.js";
  import { Hospital } from "lucide-svelte";
  import Login from "./pages/Login.svelte";
  import Register from "./pages/Register.svelte";
  import Notifications from "./pages/Notifications.svelte";
  import Permutations from "./pages/Permutations.svelte";
  import Settings from "./pages/Settings.svelte";
  import BottomNav from "./components/BottomNav.svelte";
  import TeamSidebar from "./components/TeamSidebar.svelte";
  import Toast from "./components/Toast.svelte";

  import { onMount } from "svelte";

  let currentUser = store.state.currentUser;
  let activeTab = "notifications";
  let sidebarOpen = false;
  let authView = "login"; // 'login' or 'register'
  let toasts = [];
  let audioCtx;
  
  let userMenuOpen = false;
  let showPasswordModal = false;
  let oldPassword = '';
  let newPassword = '';
  let pwdError = '';
  let pwdSuccess = false;

  function handleOutsideClick(e) {
    if (userMenuOpen && !e.target.closest('.user-menu-container')) {
      userMenuOpen = false;
    }
  }

  async function handlePasswordChange() {
    pwdError = '';
    pwdSuccess = false;
    const res = await store.changePassword(oldPassword, newPassword);
    if (res.success) {
      pwdSuccess = true;
      setTimeout(() => {
        showPasswordModal = false;
        oldPassword = '';
        newPassword = '';
        pwdSuccess = false;
      }, 1500);
    } else {
      pwdError = res.error || 'Erreur lors du changement';
    }
  }

  // Subscribe to store changes
  store.subscribe("app", (state) => {
    currentUser = state.currentUser ? { ...state.currentUser } : null;
  });

  onMount(() => {
    store.on('new_notification', (newNotifs) => {
      newNotifs.forEach(n => {
        if (n.authorId !== currentUser?._id) {
          const id = Date.now() + Math.random();
          let type = 'info';
          if (n.priority === 'haute') type = 'error';
          else if (n.priority === 'moyenne') type = 'warning';
          
          toasts = [...toasts, {
            id,
            title: `Salle ${n.room} - ${n.type}`,
            message: n.message || 'Nouvelle alerte',
            type
          }];
          playAlertSound(n.priority);
          setTimeout(() => {
            toasts = toasts.filter((t) => t.id !== id);
          }, 5000);
        }
      });
    });
  });

  function playAlertSound(priority) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (priority === 'haute') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.4);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.6);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
        osc.start();
        osc.stop(audioCtx.currentTime + 1);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch(e) { console.error('Audio play failed', e) }
  }

  function handleLogin() {
    currentUser = store.state.currentUser;
  }

  function handleLogout() {
    store.logout();
    currentUser = null;
  }

  function showToast(event) {
    const { title, message, type } = event.detail || event;
    const id = Date.now() + Math.random();
    toasts = [...toasts, { id, title, message, type: type || "info" }];
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
    }, 3000);
  }

  function navigateTo(event) {
    activeTab = event.detail || event;
  }
</script>

<svelte:window on:click={handleOutsideClick}/>

{#if !currentUser}
  {#if authView === "login"}
    <Login 
      on:login={handleLogin} 
      on:switch={(e) => authView = e.detail} 
    />
  {:else}
    <Register 
      on:login={handleLogin} 
      on:switch={(e) => authView = e.detail} 
    />
  {/if}
{:else}
  <div class="app-shell">
    <!-- Header -->
    <header class="app-header">
      <div class="header-left">
        <div class="header-logo">
          <span class="logo-icon"><Hospital size={24} /></span>
          <span class="logo-text">BlocNotif</span>
        </div>
      </div>
      <div class="header-right">
        <button
          class="header-btn team-btn"
          on:click={() => (sidebarOpen = true)}
          title="Équipe"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span class="team-count"
            >{store.state.teamMembers.filter((m) => m.status === "present")
              .length}</span
          >
        </button>
        <div class="user-menu-container">
          <button
            class="header-btn user-btn"
            on:click={() => (userMenuOpen = !userMenuOpen)}
            title="Profil"
          >
            <span class="user-avatar">{currentUser.name.charAt(0)}</span>
          </button>
          
          {#if userMenuOpen}
            <div class="dropdown-menu">
              <div class="dropdown-header">
                <strong>{currentUser.name}</strong>
                <span>{currentUser.role}</span>
              </div>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" on:click={() => { userMenuOpen = false; store.setStatus('present'); }}>
                🟢 Présent
              </button>
              <button class="dropdown-item" on:click={() => { userMenuOpen = false; store.setStatus('pause', 15); }}>
                🟠 En pause (15m)
              </button>
              <button class="dropdown-item" on:click={() => { userMenuOpen = false; store.setStatus('absent'); }}>
                🔴 S'absenter
              </button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" on:click={() => { userMenuOpen = false; showPasswordModal = true; }}>
                Changer mot de passe
              </button>
              <button class="dropdown-item text-danger" on:click={handleLogout}>
                Déconnexion
              </button>
            </div>
          {/if}
        </div>
      </div>
    </header>

    <!-- Page Content -->
    <main class="app-content">
      {#if activeTab === "notifications"}
        <Notifications on:toast={showToast} />
      {:else if activeTab === "permutations"}
        <Permutations on:toast={showToast} />
      {:else if activeTab === "settings"}
        <Settings on:toast={showToast} />
      {/if}
    </main>

    <!-- Bottom Navigation -->
    <BottomNav {activeTab} on:navigate={navigateTo} />

    <!-- Team Sidebar -->
    <TeamSidebar
      bind:open={sidebarOpen}
      on:close={() => (sidebarOpen = false)}
    />

    <!-- Toasts -->
    <div class="toast-container">
      {#each toasts as toast (toast.id)}
        <Toast
          title={toast.title}
          message={toast.message}
          type={toast.type}
          on:dismiss={() => (toasts = toasts.filter((t) => t.id !== toast.id))}
        />
      {/each}
    </div>

    {#if showPasswordModal}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="modal-backdrop" on:click|self={() => showPasswordModal = false}>
        <div class="password-modal">
          <h3 class="modal-title">Changer le mot de passe</h3>
          {#if pwdError}
            <div class="pwd-alert error">{pwdError}</div>
          {/if}
          {#if pwdSuccess}
            <div class="pwd-alert success">Mot de passe modifié avec succès !</div>
          {:else}
            <input type="password" placeholder="Ancien mot de passe" bind:value={oldPassword} class="pwd-input" />
            <input type="password" placeholder="Nouveau mot de passe" bind:value={newPassword} class="pwd-input" />
            <div class="pwd-actions">
              <button class="pwd-btn secondary" on:click={() => showPasswordModal = false}>Annuler</button>
              <button class="pwd-btn primary" on:click={handlePasswordChange}>Valider</button>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    top: calc(var(--space-md) + 72px);
    right: var(--space-md);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    background: var(--bg-primary);
  }

  .app-header {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) var(--space-lg);
    height: 72px; /* Slightly taller for a more premium feel */
    background: rgba(255, 255, 255, 0.8) !important;
    backdrop-filter: blur(24px) !important;
    -webkit-backdrop-filter: blur(24px) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.4) !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.03);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .header-logo {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  .logo-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--color-primary-glow), rgba(255, 255, 255, 0.5));
    color: var(--color-primary);
    border-radius: var(--radius-md);
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.1);
  }

  .logo-text {
    font-size: 1.35rem;
    font-weight: 800;
    background: linear-gradient(
      135deg,
      var(--color-primary),
      var(--color-accent)
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .header-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.5);
    color: var(--text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.8);
    transition: all var(--transition-base);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  }

  .header-btn:active {
    transform: scale(0.92);
    background: rgba(255, 255, 255, 0.9);
  }

  .team-btn {
    position: relative;
  }

  .team-count {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--fs-xs);
    font-weight: var(--fw-bold);
    background: var(--color-success);
    color: var(--text-inverse);
    border-radius: var(--radius-full);
    padding: 0 4px;
  }

  .user-avatar {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    background: linear-gradient(
      135deg,
      var(--color-primary),
      var(--color-primary-dark)
    );
    color: white;
    font-size: var(--fs-sm);
    font-weight: var(--fw-bold);
  }

  .app-content {
    flex: 1;
    padding-bottom: calc(
      var(--bottom-nav-height) + var(--safe-area-bottom) + var(--space-lg)
    );
    overflow-y: auto;
  }

  .user-menu-container {
    position: relative;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: white;
    border-radius: var(--radius-lg);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--border-color);
    min-width: 200px;
    z-index: 1000;
    overflow: hidden;
    animation: fadeIn var(--transition-fast) ease-out;
  }

  .dropdown-header {
    padding: var(--space-md);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    background: var(--bg-surface);
  }

  .dropdown-header strong {
    font-size: var(--fs-sm);
    color: var(--text-primary);
  }

  .dropdown-header span {
    font-size: var(--fs-xs);
    color: var(--text-muted);
    text-transform: capitalize;
  }

  .dropdown-divider {
    height: 1px;
    background: var(--border-color);
    margin: 4px 0;
  }

  .dropdown-item {
    width: 100%;
    text-align: left;
    padding: 12px var(--space-md);
    background: none;
    border: none;
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
    color: var(--text-secondary);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .dropdown-item:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .dropdown-item.text-danger {
    color: var(--color-danger);
  }
  .dropdown-item.text-danger:hover {
    background: var(--color-danger-glow);
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
    animation: fadeIn 0.2s ease-out;
  }

  .password-modal {
    background: white;
    border-radius: var(--radius-xl);
    padding: var(--space-xl);
    width: 100%;
    max-width: 400px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-title {
    margin-bottom: var(--space-lg);
    font-size: var(--fs-lg);
    color: var(--text-primary);
  }

  .pwd-input {
    width: 100%;
    padding: 12px var(--space-md);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
    font-size: var(--fs-base);
    transition: border-color var(--transition-fast);
  }
  .pwd-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .pwd-alert {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
  }
  .pwd-alert.error {
    background: var(--color-danger-glow);
    color: var(--color-danger-dark);
  }
  .pwd-alert.success {
    background: var(--color-success-glow);
    color: var(--color-success-dark);
  }

  .pwd-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }

  .pwd-btn {
    padding: 10px 16px;
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    font-weight: var(--fw-bold);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .pwd-btn.secondary {
    background: var(--bg-surface);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }
  .pwd-btn.secondary:hover {
    background: var(--bg-elevated);
  }
  .pwd-btn.primary {
    background: var(--color-primary);
    color: white;
    border: none;
    box-shadow: 0 4px 12px var(--color-primary-glow);
  }
  .pwd-btn.primary:hover {
    background: var(--color-primary-dark);
  }
</style>
