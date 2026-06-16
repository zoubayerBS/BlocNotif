<script>
  import { createEventDispatcher } from 'svelte';
  import { AlertTriangle, Info, CheckCircle2, HelpCircle } from 'lucide-svelte';

  export let title = 'Confirmation';
  export let message = '';
  export let confirmText = 'Confirmer';
  export let cancelText = 'Annuler';
  export let type = 'danger';

  const dispatch = createEventDispatcher();

  function handleCancel() {
    dispatch('cancel');
  }

  function handleConfirm() {
    dispatch('confirm');
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) handleCancel();
  }

  function getIcon() {
    if (type === 'danger') return AlertTriangle;
    if (type === 'success') return CheckCircle2;
    if (type === 'warning') return Info;
    return HelpCircle;
  }

  const Icon = getIcon();
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="modal-backdrop" on:click={handleBackdrop}>
  <div class="confirm-modal">
    <div class="modal-content">
      <div class="icon-wrapper {type}">
        <Icon size={28} strokeWidth={2.2} />
      </div>
      
      <div class="text-content">
        <h2 class="title">{title}</h2>
        <p class="message">{message}</p>
      </div>

      <div class="actions">
        <button class="btn btn-cancel" on:click={handleCancel}>
          {cancelText}
        </button>
        <button class="btn btn-confirm {type}" on:click={handleConfirm}>
          {confirmText}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
    animation: fadeIn 0.2s ease-out;
  }

  .confirm-modal {
    width: 100%;
    max-width: 360px;
    animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-content {
    background: var(--bg-card);
    border-radius: var(--radius-xl);
    padding: var(--space-2xl) var(--space-xl) var(--space-xl);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--space-md);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
  }

  .icon-wrapper {
    width: 60px;
    height: 60px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .icon-wrapper.danger {
    background: var(--color-danger-glow);
    color: var(--color-danger);
  }

  .icon-wrapper.warning {
    background: var(--color-warning-glow);
    color: var(--color-warning);
  }

  .icon-wrapper.success {
    background: var(--color-success-glow);
    color: var(--color-success);
  }

  .icon-wrapper.info {
    background: var(--color-primary-glow);
    color: var(--color-primary);
  }

  .text-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .title {
    font-size: var(--fs-lg);
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.01em;
    margin: 0;
  }

  .message {
    font-size: var(--fs-sm);
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .actions {
    display: flex;
    gap: var(--space-sm);
    width: 100%;
    margin-top: var(--space-sm);
  }

  .btn {
    flex: 1;
    padding: 12px;
    border-radius: var(--radius-lg);
    font-size: var(--fs-sm);
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn:active {
    transform: scale(0.96);
  }

  .btn-cancel {
    background: var(--bg-elevated);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  .btn-cancel:hover {
    background: var(--bg-surface);
    color: var(--text-primary);
  }

  .btn-confirm.danger {
    background: var(--color-danger);
    color: white;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  .btn-confirm.danger:hover {
    background: #dc2626;
  }

  .btn-confirm.warning {
    background: var(--color-warning);
    color: white;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }

  .btn-confirm.warning:hover {
    background: #d97706;
  }

  .btn-confirm.success {
    background: var(--color-success);
    color: white;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }

  .btn-confirm.success:hover {
    background: #16a34a;
  }

  .btn-confirm.info {
    background: var(--color-primary);
    color: white;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  }

  .btn-confirm.info:hover {
    background: var(--color-primary-dark);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes zoomIn {
    from { transform: scale(0.92) translateY(8px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }
</style>
