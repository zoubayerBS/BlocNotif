<script>
  import { createEventDispatcher } from 'svelte';
  import { Check, X, AlertTriangle, Info } from 'lucide-svelte';
  export let message;
  export let type = 'info';

  const dispatch = createEventDispatcher();

  const icons = {
    success: Check,
    error: X,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: 'var(--color-success)',
    error: 'var(--color-danger)',
    warning: 'var(--color-warning)',
    info: 'var(--color-info)',
  };
</script>

<div class="toast" style="--toast-color: {colors[type]}">
  <span class="toast-icon"><svelte:component this={icons[type]} size={14} strokeWidth={3} /></span>
  <span class="toast-message">{message}</span>
  <button class="toast-close" style="display: flex; align-items: center;" on:click={() => dispatch('dismiss')}><X size={16} strokeWidth={2.5} /></button>
</div>

<style>
  .toast {
    position: fixed;
    top: calc(var(--header-height) + var(--space-md));
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md) var(--space-lg);
    background: var(--bg-elevated);
    border: 1px solid var(--border-color);
    border-left: 3px solid var(--toast-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    max-width: calc(100vw - 32px);
    animation: slideDown var(--transition-spring) ease-out;
  }

  .toast-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--toast-color) 15%, transparent);
    color: var(--toast-color);
    font-size: var(--fs-xs);
    font-weight: var(--fw-bold);
    flex-shrink: 0;
  }

  .toast-message {
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
    color: var(--text-primary);
  }

  .toast-close {
    margin-left: auto;
    color: var(--text-muted);
    font-size: var(--fs-sm);
    padding: 4px;
    flex-shrink: 0;
  }

  .toast-close:active {
    color: var(--text-primary);
  }
</style>
