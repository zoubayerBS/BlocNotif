import { convex, httpClient } from './convex.js';
import { api } from '../../convex/_generated/api.js';
import { defineAbilitiesFor } from './abilities.js';

const SESSION_KEY = 'blocnotif_session';

class Store {
  constructor() {
    this._state = {
      currentUser: null,
      teamMembers: [],
      notifications: [],
      permutations: [],
      rooms: [],
      features: { appelAstreinte: false, appelMar: false },
    };
    this._listeners = new Map();
    this._eventListeners = new Map();
    this._ability = defineAbilitiesFor(null);
    this._sessionToken = null;
    this.lastLoginError = null;

    // Load local session
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        const { sessionToken, ...user } = stored;
        // Auth Convex AVANT les abonnements realtime (les requêtes doivent
        // être authentifiées)
        this.applyAuthToken(sessionToken);
        if (!sessionToken) {
          console.warn(
            'Session locale sans token : reconnectez-vous pour activer les actions protégées.'
          );
        }
        this._state.currentUser = user;
        this._ability = defineAbilitiesFor(user?.role);
        // (Ré)abonner l'appareil aux pushes : demande la permission si besoin
        this.ensurePushSubscription();
      }
    } catch (e) {}

    // 1. Subscribe to users
    convex.onUpdate(api.users.list, {}, (users) => {
      this._state.teamMembers = users;
      // Sync currentUser state if it changed in backend
      if (this._state.currentUser) {
        const freshUser = users.find(u => u._id === this._state.currentUser._id);
        if (freshUser) {
          this._state.currentUser = { ...freshUser };
          this._ability = defineAbilitiesFor(freshUser.role);
          this.persistSession(freshUser);
        }
      }
      this._notifyAll();
    });

    // 2. Subscribe to notifications
    convex.onUpdate(api.notifications.list, {}, (notifs) => {
      if (this._state.notifications.length > 0) {
        const newNotifs = notifs.filter(n => !this._state.notifications.some(old => old._id === n._id));
        if (newNotifs.length > 0) {
          this._emitEvent('new_notification', newNotifs);
        }
      }
      this._state.notifications = notifs;
      this._notifyAll();
    });

    // 3. Subscribe to permutations
    convex.onUpdate(api.permutations.list, {}, (perms) => {
      this._state.permutations = perms;
      this._notifyAll();
    });
    // 5. Subscribe to rooms
    convex.onUpdate(api.rooms.list, {}, (rooms) => {
      this._state.rooms = rooms;
      this._notifyAll();
    });

    // 6. Subscribe to feature flags (paramètres admin)
    convex.onUpdate(api.settings.get, {}, (features) => {
      this._state.features = features;
      this._notifyAll();
    });

    // Listen for Service Worker messages (notification events)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'LOG_NOTIF_EVENT') {
          this.logNotificationEvent(event.data.notifId, event.data.event);
        }
      });
    }
    
    // Seed database if empty (fire and forget)
    httpClient.mutation(api.users.seedTeam, {}).catch(console.error);
    httpClient.mutation(api.rooms.seed, {}).catch(console.error);
  }

  get state() {
    return this._state;
  }

  get ability() {
    return this._ability;
  }

  subscribe(key, callback) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(callback);
    // Immediately fire with current state
    callback(this._state);
    return () => this._listeners.get(key)?.delete(callback);
  }

  _notifyAll() {
    for (const [, callbacks] of this._listeners) {
      for (const cb of callbacks) {
        try { cb(this._state); } catch (e) { console.error(e); }
      }
    }
  }

  on(event, callback) {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event).add(callback);
    return () => this._eventListeners.get(event)?.delete(callback);
  }

  _emitEvent(event, data) {
    if (this._eventListeners.has(event)) {
      for (const cb of this._eventListeners.get(event)) {
        try { cb(data); } catch (e) { console.error(e); }
      }
    }
  }

  // --- Session / auth Convex ---

  applyAuthToken(token) {
    this._sessionToken = token || null;
    if (!token) return;
    try {
      // Requêtes one-shot (mutations) + abonnements realtime
      httpClient.setAuth(token);
      convex.setAuth(async () => token, () => {});
    } catch (e) {
      console.error('setAuth failed', e);
    }
  }

  persistSession(user) {
    if (!user) return;
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...user, sessionToken: this._sessionToken })
    );
  }

  // --- Push Notifications ---

  async ensurePushSubscription() {
    if (!('Notification' in window)) return;
    if (!this._state.currentUser) return;

    let permission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch (e) {
        permission = 'denied';
      }
    }

    if (permission === 'granted') {
      try {
        await this.subscribeToPush();
      } catch (e) {
        console.warn('Abonnement push impossible (non bloquant) :', e);
      }
    } else {
      console.warn('Push non abonné : permission =', permission);
    }
  }

  async subscribeToPush() {
    if (!this._state.currentUser) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      
      // Hardcoded Public Key
      const vapidPublicKey = "BO02vu7mvy8oDCzb8PqV7f64_9wfcSK9zAPmdLivlbCWkpe48cBXJcy7jzaMbiJ2_jwgPAj0zvo2RPnGMVQp5ic";
      const convertedVapidKey = this.urlBase64ToUint8Array(vapidPublicKey);
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }

      // Save to Convex
      await httpClient.mutation(api.users.savePushSubscription, {
        userId: this._state.currentUser._id,
        subscription: JSON.parse(JSON.stringify(subscription))
      });
    } catch (e) {
      console.error('Failed to subscribe to push', e);
      // Ne jamais faire échouer l'appelant (connexion, restauration de session)
      return false;
    }
    return true;
  }

  async unsubscribeFromPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        // Optionally unsubscribe locally
        // await subscription.unsubscribe();
        
        // Let's remove it from Convex (using the last known user ID if any, but since we cleared it...)
        // Actually, better to pass the user ID before setting it to null
        const userId = JSON.parse(localStorage.getItem(SESSION_KEY))?._id;
        if (userId) {
          await httpClient.mutation(api.users.removePushSubscription, {
            userId: userId,
            endpoint: endpoint
          });
        }
      }
    } catch (e) {
      console.error('Failed to unsubscribe', e);
    }
  }

  urlBase64ToUint8Array(base64String) {
    if (!base64String) throw new Error("Base64 string is empty");
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // --- Auth ---

  async loginWithUsername(username, password) {
    this.lastLoginError = null;
    let permissionPromise = null;
    if ('Notification' in window && Notification.permission === 'default') {
      permissionPromise = Notification.requestPermission().catch(() => 'denied');
    }

    try {
      const user = await httpClient.action(api.auth.login, { username, password });
      if (!user) {
        this.lastLoginError = 'Identifiant ou mot de passe incorrect.';
        return false;
      }

      const { sessionToken, ...safeUser } = user;
      this.applyAuthToken(sessionToken);
      this._state.currentUser = safeUser;
      this._ability = defineAbilitiesFor(safeUser.role);
      this.persistSession(safeUser);
      this._notifyAll();

      // Push : ne doit JAMAIS faire échouer la connexion
      try {
        if (permissionPromise) await permissionPromise;
        await this.ensurePushSubscription();
      } catch (e) {
        console.warn('Abonnement push impossible (non bloquant) :', e);
      }

      return true;
    } catch (e) {
      console.error('Login failed:', e);
      this.lastLoginError = this._friendlyAuthError(e);
      return false;
    }
  }

  _friendlyAuthError(e) {
    const msg = String(e?.message || e || '').split('\n')[0];
    if (/fetch|network|Failed to load|load failed|ECONN/i.test(msg)) {
      return 'Connexion au serveur impossible. Vérifiez votre réseau.';
    }
    if (/Non authentifi|password|credential/i.test(msg)) {
      return 'Identifiant ou mot de passe incorrect.';
    }
    return `Erreur serveur : ${msg.slice(0, 160)}`;
  }

  async register(userData) {
    try {
      const user = await httpClient.action(api.auth.register, userData);
      return { success: true, user };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }

  async changePassword(oldPassword, newPassword) {
    if (!this._state.currentUser) return { success: false, error: "Non connecté" };
    try {
      await httpClient.action(api.auth.changePassword, {
        userId: this._state.currentUser._id,
        oldPassword,
        newPassword
      });
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }

  async logout() {
    // Retirer l'abonnement AVANT d'effacer la session : unsubscribeFromPush
    // lit le userId dans localStorage (SESSION_KEY)
    try {
      await this.unsubscribeFromPush();
    } catch (e) {
      console.error('unsubscribeFromPush failed', e);
    }

    this._state.currentUser = null;
    this._ability = defineAbilitiesFor(null);
    localStorage.removeItem(SESSION_KEY);

    window.location.reload();
  }

  async removeUser(id) {
    try {
      await httpClient.mutation(api.users.remove, { id });
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }

  async updateUserRole(id, role) {
    try {
      await httpClient.mutation(api.users.updateRole, { id, role });
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }

  // --- Rooms ---
  async addRoom(name) {
    try {
      await httpClient.mutation(api.rooms.create, { name });
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }

  async removeRoom(id) {
    try {
      await httpClient.mutation(api.rooms.remove, { id });
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }

  // --- Feature flags (admin) ---

  async updateFeatures(features) {
    try {
      await httpClient.mutation(api.settings.update, {
        appelAstreinte: !!features.appelAstreinte,
        appelMar: !!features.appelMar,
      });
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }

  // --- Base de données (superuser) ---

  async dbStats() {
    try {
      const data = await httpClient.query(api.database.stats, {});
      return { success: true, data };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }

  async dbList(collection, limit = 50) {
    try {
      const data = await httpClient.query(api.database.list, { collection, limit });
      return { success: true, data };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }

  async dbRemoveDocument(collection, id) {
    try {
      await httpClient.mutation(api.database.removeDocument, { collection, id });
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }

  async dbClearCollection(collection) {
    try {
      const res = await httpClient.mutation(api.database.clearCollection, { collection });
      return { success: true, deleted: res?.deleted ?? 0 };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }

  async seedDefaults() {
    try {
      await httpClient.mutation(api.rooms.seed, {});
      await httpClient.mutation(api.users.seedTeam, {});
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }

  // --- Notifications ---

  async addNotification({ room, type, priority, message, patient, targetId, audience }) {
    if (!this._state.currentUser) return;
    try {
      await httpClient.mutation(api.notifications.create, {
        room: String(room),
        type,
        priority,
        message,
        patient: patient || undefined,
        authorId: this._state.currentUser._id,
        authorName: this._state.currentUser.name,
        targetId: targetId || undefined,
        audience: audience || 'all',
      });
    } catch (e) { console.error(e); }
  }

  async takeNotification(notifId) {
    if (!this._state.currentUser) return;
    try {
      await httpClient.mutation(api.notifications.take, {
        notifId,
        userId: this._state.currentUser._id,
        userName: this._state.currentUser.name,
      });
    } catch (e) { console.error(e); }
  }

  async resolveNotification(notifId) {
    try {
      await httpClient.mutation(api.notifications.resolve, { notifId });
    } catch (e) { console.error(e); }
  }

  async acknowledgeNotification(notifId) {
    if (!this._state.currentUser) return;
    try {
      await httpClient.mutation(api.notifications.acknowledge, {
        notifId,
        userId: this._state.currentUser._id,
        userName: this._state.currentUser.name,
      });
    } catch (e) { console.error(e); }
  }

  // --- Permutations ---

  async addPermutation({ targetId, slotA, slotB, reason }) {
    if (!this._state.currentUser) return;
    const target = this._state.teamMembers.find(m => m._id === targetId);
    
    try {
      await httpClient.mutation(api.permutations.create, {
        requesterId: this._state.currentUser._id,
        requesterName: this._state.currentUser.name,
        targetId,
        targetName: target?.name || 'Inconnu',
        slotA,
        slotB,
        reason,
      });
    } catch (e) { console.error(e); }
  }

  async decidePermutation(permId, decision, comment = '') {
    if (!this._state.currentUser) return;
    try {
      await httpClient.mutation(api.permutations.decide, {
        permId,
        decision,
        comment,
        decidedBy: this._state.currentUser.name,
      });
    } catch (e) { console.error(e); }
  }

  async logNotificationEvent(notifId, event) {
    try {
      await httpClient.mutation(api.notificationLogs.log, {
        notifId,
        event,
        userId: this._state.currentUser?._id,
        userName: this._state.currentUser?.name,
        deviceInfo: navigator.userAgent,
      });
    } catch (e) { console.error('Failed to log notification event:', e); }
  }

  // Reset
  resetAll() {
    // Only used in demo, disabled for production DB
    console.warn("resetAll is disabled with Convex backend");
  }
}

export const store = new Store();
