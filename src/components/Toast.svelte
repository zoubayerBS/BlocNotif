<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { Check, X, AlertTriangle, Info, BellRing } from 'lucide-svelte';
  
  export let title = '';
  export let message;
  export let type = 'info';

  const dispatch = createEventDispatcher();

  const icons = {
    success: Check,
    error: AlertTriangle,
    warning: BellRing,
    info: Info,
  };

  const colors = {
    success: 'var(--color-success)',
    error: 'var(--color-danger)',
    warning: 'var(--color-warning)',
    info: 'var(--color-primary)',
  };
</script>

<div class="toast-wrapper">
  <div class="toast-content" style="--toast-color: {colors[type]}">
    <div class="toast-icon-bg">
      <svelte:component this={icons[type]} size={20} strokeWidth={2.5} />
    </div>
    <div class="toast-text">
      {#if title}
        <strong class="toast-title">{title}</strong>
      {/if}
      <span class="toast-message">{message}</span>
    </div>
    <button class="toast-close" on:click={() => dispatch('dismiss')}>
      <X size={18} strokeWidth={2.5} />
    </button>
    <div class="toast-progress"></div>
  </div>
</div>

<style>
  .toast-wrapper {
    position: relative;
    z-index: 9999;
    margin-bottom: var(--space-sm);
    animation: slideInRight var(--transition-spring) forwards;
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translate3d(100%, 0, 0) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: var(--radius-xl);
    box-shadow: 0 10px 40px -10px var(--toast-color), 0 0 0 1px color-mix(in srgb, var(--toast-color) 20%, transparent);
    min-width: 300px;
    max-width: calc(100vw - 32px);
    overflow: hidden;
  }

  .toast-icon-bg {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, color-mix(in srgb, var(--toast-color) 80%, white), var(--toast-color));
    color: white;
    flex-shrink: 0;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--toast-color) 40%, transparent);
  }

  .toast-text {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    justify-content: center;
  }

  .toast-title {
    font-size: var(--fs-sm);
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 2px;
  }

  .toast-message {
    font-size: var(--fs-xs);
    font-weight: var(--fw-medium);
    color: var(--text-secondary);
  }

  .toast-close {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: transparent;
    transition: all var(--transition-fast);
    flex-shrink: 0;
    margin-left: var(--space-xs);
  }

  .toast-close:hover, .toast-close:active {
    background: var(--bg-surface);
    color: var(--text-primary);
  }

  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: var(--toast-color);
    width: 100%;
    animation: shrink 5s linear forwards;
    border-radius: 0 0 0 var(--radius-xl);
  }

  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
</style>
