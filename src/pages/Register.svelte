<script>
  import { store } from '../lib/store.js';
  import { createEventDispatcher } from 'svelte';
  import { Hospital, User, KeyRound, AlertCircle, ArrowRight, UserCircle, Briefcase, ChevronDown, CheckCircle2 } from 'lucide-svelte';

  const dispatch = createEventDispatcher();
  
  let username = '';
  let password = '';
  let name = '';
  let role = 'technicien'; // Default role
  let animating = false;
  let errorMessage = '';
  let loading = false;
  let isRoleDropdownOpen = false;

  const roles = [
    { value: 'technicien', label: 'Technicien d\'Anesthésie' },
    { value: 'medecin anesthesiste', label: 'Médecin Anesthésiste' },
    { value: 'surveillant bloc', label: 'Surveillant Bloc' }
  ];

  async function handleRegister(e) {
    e.preventDefault();
    if (!username || !password || !name || !role) {
      errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    loading = true;
    errorMessage = '';
    
    const result = await store.register({ username, password, name, role });
    
    if (result.success) {
      // Automatically login after registration
      const user = await store.loginWithUsername(username, password);
      if (user) {
        animating = true;
        setTimeout(() => {
          dispatch('login');
        }, 300);
      }
    } else {
      errorMessage = result.error || "Erreur lors de l'inscription.";
      loading = false;
    }
  }

  function handleWindowClick(e) {
    if (isRoleDropdownOpen && !e.target.closest('.custom-dropdown-container')) {
      isRoleDropdownOpen = false;
    }
  }
</script>

<svelte:window on:click={handleWindowClick} />

<div class="login-page" class:animating>
  <div class="login-container">
    <div class="login-glow glow-1"></div>
    <div class="login-glow glow-2"></div>

    <div class="login-card">
      <div class="login-header">
        <div class="login-icon-wrapper">
          <Hospital size={40} strokeWidth={2} />
        </div>
        <h1 class="login-title">BlocNotif</h1>
        <p class="login-subtitle">Créer votre compte</p>
      </div>

      {#if errorMessage}
        <div class="error-banner">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      {/if}

      <form class="login-form" on:submit={handleRegister}>
        <div class="form-group">
          <label for="name">Nom Complet</label>
          <div class="input-wrapper">
            <span class="input-icon"><UserCircle size={20} /></span>
            <input 
              type="text" 
              id="name" 
              bind:value={name} 
              placeholder="Ex: Karim Benali" 
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label for="username">Identifiant (login)</label>
          <div class="input-wrapper">
            <span class="input-icon"><User size={20} /></span>
            <input 
              type="text" 
              id="username" 
              bind:value={username} 
              placeholder="Ex: karim" 
              required
            />
          </div>
        </div>

        <div class="form-group custom-dropdown-container">
          <label for="role">Fonction</label>
          <div class="custom-select-wrapper" class:open={isRoleDropdownOpen}>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div 
              class="custom-select-trigger" 
              on:click|stopPropagation={() => isRoleDropdownOpen = !isRoleDropdownOpen}
            >
              <span class="input-icon"><Briefcase size={20} /></span>
              <span class="selected-value">{roles.find(r => r.value === role)?.label}</span>
              <div class="dropdown-icon" class:rotated={isRoleDropdownOpen}>
                <ChevronDown size={18} />
              </div>
            </div>

            {#if isRoleDropdownOpen}
              <div class="custom-select-options">
                {#each roles as r}
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <!-- svelte-ignore a11y-no-static-element-interactions -->
                  <div 
                    class="custom-option" 
                    class:selected={role === r.value}
                    on:click|stopPropagation={() => { role = r.value; isRoleDropdownOpen = false; }}
                  >
                    {r.label}
                    {#if role === r.value}
                      <CheckCircle2 size={16} class="option-check" />
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="form-group">
          <label for="password">Mot de passe</label>
          <div class="input-wrapper">
            <span class="input-icon"><KeyRound size={20} /></span>
            <input 
              type="password" 
              id="password" 
              bind:value={password} 
              placeholder="••••••••" 
              required
            />
          </div>
        </div>

        <button type="submit" class="login-btn" disabled={loading || !username || !password || !name}>
          <span>{loading ? 'Inscription...' : 'S\'inscrire'}</span>
          {#if !loading}<ArrowRight size={20} />{/if}
        </button>
      </form>
      
      <div class="login-footer">
        <p>Déjà un compte ? <button class="link-btn" on:click={() => dispatch('switch', 'login')}>Se connecter</button></p>
      </div>
    </div>
  </div>
</div>

<style>
  /* Reuse styles from Login.svelte */
  .login-page {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
    background: var(--bg-primary);
    position: relative;
    overflow: hidden;
    animation: fadeIn 0.5s ease-out;
  }

  .login-page.animating {
    animation: fadeOut 0.4s cubic-bezier(0.36, 0, 0.64, 1) forwards;
  }

  @keyframes fadeOut {
    to { opacity: 0; transform: scale(0.95) translateY(-20px); }
  }

  .login-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
    z-index: 0;
  }

  .glow-1 {
    width: 400px;
    height: 400px;
    background: var(--color-primary-glow);
    top: -100px;
    right: -100px;
    animation: float 10s infinite alternate ease-in-out;
  }

  .glow-2 {
    width: 350px;
    height: 350px;
    background: var(--color-accent-glow);
    bottom: -100px;
    left: -100px;
    animation: float 12s infinite alternate-reverse ease-in-out;
  }

  @keyframes float {
    0% { transform: translate(0, 0); }
    100% { transform: translate(30px, 30px); }
  }

  .login-container {
    width: 100%;
    max-width: 440px;
    position: relative;
    z-index: 1;
  }

  .login-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: var(--radius-2xl);
    padding: var(--space-2xl);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8);
    animation: fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .login-header {
    text-align: center;
    margin-bottom: var(--space-2xl);
  }

  .login-icon-wrapper {
    width: 72px;
    height: 72px;
    margin: 0 auto var(--space-md);
    background: linear-gradient(135deg, var(--color-primary-glow), rgba(255,255,255,0.5));
    color: var(--color-primary);
    border-radius: var(--radius-xl);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 8px 24px var(--color-primary-glow);
  }

  .login-title {
    font-size: var(--fs-3xl);
    font-weight: 900;
    background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 4px;
    letter-spacing: -0.02em;
  }

  .login-subtitle {
    color: var(--text-secondary);
    font-size: var(--fs-base);
    font-weight: var(--fw-medium);
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-danger-glow);
    color: var(--color-danger-dark);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-xl);
    font-size: var(--fs-sm);
    font-weight: var(--fw-semibold);
    border: 1px solid rgba(255, 107, 107, 0.2);
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group label {
    font-size: var(--fs-sm);
    font-weight: 800;
    color: var(--text-secondary);
    margin-left: 4px;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
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

  input {
    width: 100%;
    padding: 14px 16px 14px 56px;
    border-radius: var(--radius-lg);
    border: 1.5px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.5);
    font-size: var(--fs-base);
    color: var(--text-primary);
    transition: all var(--transition-fast);
  }

  input:focus {
    outline: none;
    background: white;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 4px var(--color-primary-glow);
  }

  /* Custom Dropdown Styles */
  .custom-dropdown-container {
    position: relative;
  }

  .custom-select-wrapper {
    position: relative;
    width: 100%;
  }



  .custom-select-trigger {
    position: relative;
    width: 100%;
    padding: 14px 16px 14px 56px;
    border-radius: var(--radius-lg);
    border: 1.5px solid rgba(0, 0, 0, 0.08);
    background: rgba(255, 255, 255, 0.5);
    font-size: var(--fs-base);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .custom-select-wrapper.open .custom-select-trigger,
  .custom-select-trigger:hover {
    background: white;
    border-color: var(--color-primary);
  }

  .custom-select-wrapper.open .custom-select-trigger {
    box-shadow: 0 0 0 4px var(--color-primary-glow);
  }

  .selected-value {
    flex-grow: 1;
  }

  .dropdown-icon {
    color: var(--text-muted);
    display: flex;
    transition: transform 0.2s ease;
  }

  .dropdown-icon.rotated {
    transform: rotate(180deg);
    color: var(--color-primary);
  }

  .custom-select-options {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: var(--radius-lg);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    z-index: 50;
    overflow: hidden;
    animation: fadeIn 0.2s ease-out;
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
    background-color: var(--bg-primary);
  }

  .custom-option.selected {
    background-color: var(--color-primary-glow);
    color: var(--color-primary-dark);
    font-weight: 700;
  }

  :global(.option-check) {
    color: var(--color-primary);
  }

  .login-btn {
    margin-top: var(--space-md);
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: 16px;
    border-radius: var(--radius-lg);
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    color: white;
    font-size: var(--fs-md);
    font-weight: 800;
    transition: all var(--transition-fast);
    box-shadow: 0 8px 24px var(--color-primary-glow);
    border: none;
    cursor: pointer;
  }

  .login-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .login-footer {
    text-align: center;
    margin-top: var(--space-xl);
    font-size: var(--fs-sm);
    color: var(--text-muted);
  }

  .link-btn {
    background: none;
    border: none;
    color: var(--color-primary);
    font-weight: 700;
    cursor: pointer;
    padding: 0;
    margin-left: 4px;
    text-decoration: underline;
  }
</style>
