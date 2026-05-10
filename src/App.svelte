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

  let currentUser = store.state.currentUser;
  let activeTab = "notifications";
  let sidebarOpen = false;
  let authView = "login"; // 'login' or 'register'
  let toasts = [];

  // Subscribe to store changes
  store.subscribe("app", (state) => {
    currentUser = state.currentUser ? { ...state.currentUser } : null;
  });

  function handleLogin() {
    currentUser = store.state.currentUser;
  }

  function handleLogout() {
    store.logout();
    currentUser = null;
  }

  function showToast(event) {
    const { message, type } = event.detail || event;
    const id = Date.now();
    toasts = [...toasts, { id, message, type: type || "info" }];
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
    }, 3000);
  }

  function navigateTo(event) {
    activeTab = event.detail || event;
  }
</script>

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
        <button
          class="header-btn user-btn"
          on:click={handleLogout}
          title="Déconnexion"
        >
          <span class="user-avatar">{currentUser.name.charAt(0)}</span>
        </button>
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
    {#each toasts as toast (toast.id)}
      <Toast
        message={toast.message}
        type={toast.type}
        on:dismiss={() => (toasts = toasts.filter((t) => t.id !== toast.id))}
      />
    {/each}
  </div>
{/if}

<style>
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
</style>
