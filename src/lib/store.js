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
    };
    this._listeners = new Map();
    this._eventListeners = new Map();
    this._ability = defineAbilitiesFor(null);

    // Load local session
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        this._state.currentUser = JSON.parse(raw);
        this._ability = defineAbilitiesFor(this._state.currentUser?.role);
        // Try to resubscribe to push if already permission granted
        if (Notification.permission === 'granted') {
          this.subscribeToPush();
        }
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
          localStorage.setItem(SESSION_KEY, JSON.stringify(freshUser));
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

  // --- Push Notifications ---
  
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
      throw e;
    }
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
    let permissionPromise = null;
    if ('Notification' in window && Notification.permission === 'default') {
      permissionPromise = Notification.requestPermission();
    }

    try {
      const user = await httpClient.action(api.auth.login, { username, password });
      if (user) {
        this._state.currentUser = { ...user };
        this._ability = defineAbilitiesFor(user.role);
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        
        if (permissionPromise) {
          const permission = await permissionPromise;
          if (permission === 'granted') {
            this.subscribeToPush();
          }
        } else if ('Notification' in window && Notification.permission === 'granted') {
          this.subscribeToPush();
        }
        
        this._notifyAll();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Login failed:", e);
      return false;
    }
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

  logout() {
    this._state.currentUser = null;
    this._ability = defineAbilitiesFor(null);
    localStorage.removeItem(SESSION_KEY);
    
    
    // Unsubscribe from push
    this.unsubscribeFromPush();

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

  // --- Notifications ---

  async addNotification({ room, type, priority, message, patient, targetId }) {
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

  // Reset
  resetAll() {
    // Only used in demo, disabled for production DB
    console.warn("resetAll is disabled with Convex backend");
  }
}

export const store = new Store();
