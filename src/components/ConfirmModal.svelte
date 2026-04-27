<script>
  import { createEventDispatcher } from 'svelte';
  import { AlertTriangle, Info, CheckCircle2, HelpCircle } from 'lucide-svelte';

  export let title = 'Confirmation';
  export let message = '';
  export let confirmText = 'Confirmer';
  export let cancelText = 'Annuler';
  export let type = 'danger'; // 'danger' | 'info' | 'success' | 'warning'

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
        <Icon size={32} />
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
  .btn:active {
    transform: scale(0.96);
  }

  @keyframes zoomIn {
    from { transform: scale(0.9) translateY(10px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }
</style>
