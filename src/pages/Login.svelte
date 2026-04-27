<script>
  import { store } from '../lib/store.js';
  import { createEventDispatcher } from 'svelte';
  import { Hospital, User, KeyRound, AlertCircle, ArrowRight } from 'lucide-svelte';

  const dispatch = createEventDispatcher();
  
  let username = '';
  let password = '';
  let animating = false;
  let errorMessage = '';

  function handleLogin(e) {
    e.preventDefault();
    if (!username || !password) {
      errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    const success = store.loginWithUsername(username, password);
    
    if (success) {
      errorMessage = '';
      animating = true;
      setTimeout(() => {
        dispatch('login');
      }, 300);
    } else {
      errorMessage = 'Identifiant ou mot de passe incorrect.';
    }
  }
</script>

<div class="login-page" class:animating>
  <div class="login-container">
    <!-- Decorative elements -->
    <div class="login-glow glow-1"></div>
    <div class="login-glow glow-2"></div>

    <div class="login-card">
      <div class="login-header">
        <div class="login-icon-wrapper">
          <Hospital size={40} strokeWidth={2} />
        </div>
        <h1 class="login-title">BlocNotif</h1>
        <p class="login-subtitle">Connexion à votre espace</p>
      </div>

      {#if errorMessage}
        <div class="error-banner">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      {/if}

      <form class="login-form" on:submit={handleLogin}>
        <div class="form-group">
          <label for="username">Identifiant</label>
          <div class="input-wrapper">
            <span class="input-icon"><User size={20} /></span>
            <input 
              type="text" 
              id="username" 
              bind:value={username} 
              placeholder="Ex: karim" 
              autocomplete="username"
            />
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
            />
          </div>
        </div>

        <button type="submit" class="login-btn" disabled={!username || !password}>
          <span>Se connecter</span>
          <ArrowRight size={20} />
        </button>
      </form>
      
      <div class="login-footer">
        <p>Demo: karim / password</p>
        <p style="margin-top: 12px;">Pas de compte ? <button class="link-btn" on:click={() => dispatch('switch', 'register')}>Créer un compte</button></p>
      </div>
    </div>
  </div>
</div>

<style>
  /* Existing styles ... */
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
    animation: fadeIn var(--transition-fast) ease-out;
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
    color: var(--text-muted);
    display: flex;
    align-items: center;
    pointer-events: none;
    transition: color var(--transition-fast);
  }

  input {
    width: 100%;
    padding: 14px 16px 14px 48px;
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

  .input-wrapper:focus-within .input-icon {
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
    background: var(--bg-elevated);
    color: var(--text-muted);
    box-shadow: none;
    cursor: not-allowed;
  }

  .login-btn:not(:disabled):active {
    transform: scale(0.98);
    box-shadow: 0 4px 12px var(--color-primary-glow);
  }

  .login-footer {
    text-align: center;
    margin-top: var(--space-xl);
    font-size: var(--fs-xs);
    color: var(--text-muted);
    opacity: 0.7;
  }
</style>
