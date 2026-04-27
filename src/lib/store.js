import { convex, httpClient } from './convex.js';
import { api } from '../../convex/_generated/api.js';

const SESSION_KEY = 'blocnotif_session';

class Store {
  constructor() {
    this._state = {
      currentUser: null,
      teamMembers: [],
      notifications: [],
      absences: [],
      permutations: [],
      rooms: [],
    };
    this._listeners = new Map();

    // Load local session
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        this._state.currentUser = JSON.parse(raw);
        // Link OneSignal on startup
        if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push(async function(OneSignal) {
            OneSignal.login(JSON.parse(raw)._id);
          });
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
          localStorage.setItem(SESSION_KEY, JSON.stringify(freshUser));
        }
      }
      this._notifyAll();
    });

    // 2. Subscribe to notifications
    convex.onUpdate(api.notifications.list, {}, (notifs) => {
      this._state.notifications = notifs;
      this._notifyAll();
    });

    // 3. Subscribe to absences
    convex.onUpdate(api.absences.list, {}, (absences) => {
      this._state.absences = absences;
      this._notifyAll();
    });

    // 4. Subscribe to permutations
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

  // --- Auth ---

  async loginWithUsername(username, password) {
    try {
      const user = await httpClient.query(api.users.login, { username, password });
      if (user) {
        this._state.currentUser = { ...user };
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        
        // Link OneSignal on login
        if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push(async function(OneSignal) {
            OneSignal.login(user._id);
          });
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
      const user = await httpClient.mutation(api.users.create, userData);
      return { success: true, user };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  }

  logout() {
    this._state.currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    
    // Unlink OneSignal on logout
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async function(OneSignal) {
        OneSignal.logout();
      });
    }

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

  async addNotification({ room, type, priority, message }) {
    if (!this._state.currentUser) return;
    try {
      await httpClient.mutation(api.notifications.create, {
        room: String(room),
        type,
        priority,
        message,
        authorId: this._state.currentUser._id,
        authorName: this._state.currentUser.name,
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

  // --- Absences ---

  async setStatus(type, duration = null, reason = '') {
    const user = this._state.currentUser;
    if (!user) return;

    try {
      const isRetour = (type === 'retour');
      
      // Update user status
      await httpClient.mutation(api.users.updateStatus, {
        userId: user._id,
        status: isRetour ? 'present' : type,
        since: isRetour ? null : Date.now(),
        duration: isRetour ? null : duration,
        reason: isRetour ? '' : reason,
      });

      // Log absence if not a return
      if (!isRetour) {
        await httpClient.mutation(api.absences.create, {
          userId: user._id,
          userName: user.name,
          type,
          duration,
          reason,
        });
      }

      // Add a notification for the team
      const notifType = isRetour ? 'Retour' : (type === 'pause' ? 'Pause' : 'Absence');
      const message = isRetour 
        ? `${user.name} est de retour.` 
        : `${user.name} est en ${type}${duration ? ` pour ${duration} min` : ''}.${reason ? ` Motif : ${reason}` : ''}`;
      
      await this.addNotification({
        room: 'Équipe',
        type: notifType,
        priority: 'low',
        message: message
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
