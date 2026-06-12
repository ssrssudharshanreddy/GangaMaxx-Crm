import { DBNotifier } from './dbNotifier';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'https://gangamaxx-backend-production.up.railway.app';

const ensureArray = (value) => Array.isArray(value) ? value : [];

export class FirestoreDatabaseService {
  constructor() {
    this.cache = {
      staff: [],
      institutions: [],
      notifications: [],
      orders: [],
      invoices: [],
      payments: [],
      tickets: [],
      products: [],
      procurement: [],
      visitLogs: [],
      followUps: [],
      returns: [],
      audits: [],
      creditAccounts: [],
      categories: [],
    };
    this.pollingInterval = null;

    if (!auth) {
      return;
    }

    const waitForProfileReady = async (timeout = 5000) => {
      const start = Date.now();
      const key = 'gm_crm_active_session';
      while (Date.now() - start < timeout) {
        if (localStorage.getItem(key)) return true;
        // small delay
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 150));
      }
      return false;
    };

    this.authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await waitForProfileReady(5000);
        } catch {
          void 0;
        }
        this.startPolling();
      } else {
        this.stopPolling();
        this.clearCache();
      }
    });
  }

  async getHeaders() {
    if (!auth.currentUser) return {};
    try {
      const token = await auth.currentUser.getIdToken();
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
    } catch (err) {
      try {
        const token = await auth.currentUser.getIdToken(true);
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };
      } catch (err2) {
        console.warn('Failed to get ID token:', err2);
        return {};
      }
    }
  }

  startPolling() {
    this.stopPolling();
    this.fetchAllData();
    this.pollingInterval = setInterval(() => {
      this.fetchAllData();
    }, 5000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  clearCache() {
    Object.keys(this.cache).forEach((key) => {
      this.cache[key] = [];
      DBNotifier.notify(key);
    });
  }

  async fetchAllData() {
    if (!auth.currentUser) return;
    try {
      const headers = await this.getHeaders();

      // Parallel fetch of all CRM data resources from Shared Backend
      const [
        staffRes, instRes, notifRes, orderRes, invRes,
        payRes, ticketRes, prodRes, procRes, visitRes, followRes,
        retRes, auditRes, creditRes, catRes
      ] = await Promise.all([
        fetch(`${API_URL}/api/staff`, { headers }),
        fetch(`${API_URL}/api/institutions`, { headers }),
        fetch(`${API_URL}/api/notifications`, { headers }),
        fetch(`${API_URL}/api/orders`, { headers }),
        fetch(`${API_URL}/api/invoices`, { headers }),
        fetch(`${API_URL}/api/payments`, { headers }),
        fetch(`${API_URL}/api/tickets`, { headers }),
        fetch(`${API_URL}/api/products`, { headers }),
        fetch(`${API_URL}/api/procurement`, { headers }),
        fetch(`${API_URL}/api/visit-logs`, { headers }),
        fetch(`${API_URL}/api/follow-ups`, { headers }),
        fetch(`${API_URL}/api/returns`, { headers }),
        fetch(`${API_URL}/api/audits`, { headers }).catch(() => null),
        fetch(`${API_URL}/api/credit-accounts`, { headers }),
        fetch(`${API_URL}/api/categories`, { headers }).catch(() => null),
      ]);

      // if unauthorized responses present, stop polling and sign out
      const responses = [staffRes, instRes, notifRes, orderRes, invRes, payRes, ticketRes];
      if (responses.some(r => r && (r.status === 401 || r.status === 403))) {
        this.stopPolling();
        this.clearCache();
        try { await signOut(auth); } catch { void 0; }
        return;
      }

      if (staffRes?.ok) { this.cache.staff = ensureArray(await staffRes.json()); DBNotifier.notify('staff'); }
      if (instRes?.ok) { this.cache.institutions = ensureArray(await instRes.json()); DBNotifier.notify('institutions'); }
      if (notifRes?.ok) { this.cache.notifications = ensureArray(await notifRes.json()); DBNotifier.notify('notifications'); }
      if (orderRes?.ok) { this.cache.orders = ensureArray(await orderRes.json()); DBNotifier.notify('orders'); }
      if (invRes?.ok) { this.cache.invoices = ensureArray(await invRes.json()); DBNotifier.notify('invoices'); }
      if (payRes?.ok) { this.cache.payments = ensureArray(await payRes.json()); DBNotifier.notify('payments'); }
      if (ticketRes?.ok) { this.cache.tickets = ensureArray(await ticketRes.json()); DBNotifier.notify('tickets'); }
      if (prodRes?.ok) { this.cache.products = ensureArray(await prodRes.json()); DBNotifier.notify('products'); }
      if (procRes?.ok) { this.cache.procurement = ensureArray(await procRes.json()); DBNotifier.notify('procurement'); }
      if (visitRes?.ok) { this.cache.visitLogs = ensureArray(await visitRes.json()); DBNotifier.notify('visitLogs'); }
      if (followRes?.ok) { this.cache.followUps = ensureArray(await followRes.json()); DBNotifier.notify('followUps'); }
      if (retRes?.ok) { this.cache.returns = ensureArray(await retRes.json()); DBNotifier.notify('returns'); }
      if (auditRes?.ok) { this.cache.audits = ensureArray(await auditRes.json()); DBNotifier.notify('audits'); }
      if (creditRes?.ok) { this.cache.creditAccounts = ensureArray(await creditRes.json()); DBNotifier.notify('creditAccounts'); }
      if (catRes?.ok) { this.cache.categories = ensureArray(await catRes.json()); DBNotifier.notify('categories'); }
    } catch (error) {
      console.error('Error fetching CRM data from Shared Backend:', error);
    }
  }

  getStaff() { return ensureArray(this.cache.staff); }
  getInstitutions() { return ensureArray(this.cache.institutions); }
  getNotifications(userId) {
    const all = ensureArray(this.cache.notifications);
    return userId ? all.filter((item) => item.recipientId === userId) : all;
  }
  getOrders() { return ensureArray(this.cache.orders); }
  getInvoices() { return ensureArray(this.cache.invoices); }
  getPayments() { return ensureArray(this.cache.payments); }
  getTickets() { return ensureArray(this.cache.tickets); }
  getProducts() { return ensureArray(this.cache.products); }
  getProcurement() { return ensureArray(this.cache.procurement); }
  getVisitLogs() { return ensureArray(this.cache.visitLogs); }
  getFollowUps() { return ensureArray(this.cache.followUps); }
  getReturns() { return ensureArray(this.cache.returns); }
  getAudits() { return ensureArray(this.cache.audits); }
  getCreditAccounts() { return ensureArray(this.cache.creditAccounts); }
  getCategories() { return ensureArray(this.cache.categories); }

  // Mutation operations routed via Shared Backend API

  /**
   * createStaff — creates a Firebase Auth user + Firestore staff document
   * through the backend (no direct client-side Firebase Admin usage).
   */
  async createStaff(staffData, actor) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/staff`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...staffData, createdBy: actor?.email || actor?.id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create staff member');
    }
    const data = await res.json();
    this.fetchAllData();
    return data;
  }

  /** Legacy alias */
  async addStaff(staff) {
    return this.createStaff(staff, null);
  }

  async updateStaff(id, updates, actor, remark) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/staff/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ updates, remark }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update staff');
    }
    this.fetchAllData();
  }

  async resetStaffPassword(id) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/staff/${id}/reset-password`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reset password');
    }
  }

  /**
   * secureUpdateDoc — generic document update with mandatory remark (governance rule).
   */
  async secureUpdateDoc(collectionName, id, updates, actor, remark) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/${collectionName}/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ updates, remark, actorId: actor?.id, actorEmail: actor?.email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update ${collectionName} document`);
    }
    this.fetchAllData();
  }

  async addInstitution(institution) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/institutions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(institution),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add institution');
    }
    const data = await res.json();
    this.fetchAllData();
    return data;
  }

  async updateInstitution(id, updates, actor, remark) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/institutions/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ updates, remark }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update institution');
    }
    this.fetchAllData();
  }

  async approveInstitution(id, payload) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/institutions/${id}/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to approve institution');
    }
    this.fetchAllData();
  }

  async addProduct(product) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(product),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add product');
    }
    const data = await res.json();
    this.fetchAllData();
    return data;
  }

  async updateProduct(id, updates, actor, remark) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/products/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ updates, remark }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update product');
    }
    this.fetchAllData();
  }

  async addProcurement(po) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/procurement`, {
      method: 'POST',
      headers,
      body: JSON.stringify(po),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add procurement');
    }
    const data = await res.json();
    this.fetchAllData();
    return data;
  }

  async updateProcurement(id, updates) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/procurement/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update procurement');
    }
    this.fetchAllData();
  }

  async addOrder(order) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(order),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add order');
    }
    const data = await res.json();
    this.fetchAllData();
    return data;
  }

  async updateOrder(id, updates, actor, remark) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/orders/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ updates, remark }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update order');
    }
    this.fetchAllData();
  }

  async deliverOrder(id, payload) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/orders/${id}/deliver`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to verify delivery');
    }
    this.fetchAllData();
  }

  async addInvoice(invoice) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/invoices`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invoice),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add invoice');
    }
    const data = await res.json();
    this.fetchAllData();
    return data;
  }

  async updateInvoice(id, updates) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/invoices/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update invoice');
    }
    this.fetchAllData();
  }

  async softDeleteDoc(collectionName, id, actor, remark) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/soft-delete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ collectionName, id, remark }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to archive document');
    }
    this.fetchAllData();
  }

  async addPayment(payment) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payment),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add payment');
    }
    const data = await res.json();
    this.fetchAllData();
    return data;
  }

  async addTicket(ticket) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ticket),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to open ticket');
    }
    const data = await res.json();
    this.fetchAllData();
    return data;
  }

  async updateTicket(id, updates) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/tickets/${id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update ticket');
    }
    this.fetchAllData();
  }

  async addFollowUp(followUp) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/follow-ups`, {
      method: 'POST',
      headers,
      body: JSON.stringify(followUp),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add follow up');
    }
    const data = await res.json();
    this.fetchAllData();
    return data;
  }

  async updateFollowUp(id, updates) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/follow-ups/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update follow up');
    }
    this.fetchAllData();
  }

  async addVisitLog(visitLog) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/visit-logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(visitLog),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add visit log');
    }
    const data = await res.json();
    this.fetchAllData();
    return data;
  }

  async addReturn(ret) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/returns`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ret),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add return');
    }
    const data = await res.json();
    this.fetchAllData();
    return data;
  }

  async updateReturn(id, updates) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/returns/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update return');
    }
    this.fetchAllData();
  }

  async addCategory(category) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/categories`, {
      method: 'POST',
      headers,
      body: JSON.stringify(category),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add category');
    }
    const data = await res.json();
    this.fetchAllData();
    return data;
  }

  async addNotification(notif) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/notifications`, {
      method: 'POST',
      headers,
      body: JSON.stringify(notif),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add notification');
    }
    const data = await res.json();
    this.fetchAllData();
    return data;
  }

  async markNotificationRead(id) {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
      method: 'POST',
      headers,
    });
    if (res.ok) {
      this.fetchAllData();
    }
  }

  async logAuditAction(actorId, actorEmail, actorRole, action, entityType, entityId, details) {
    try {
      const headers = await this.getHeaders();
      await fetch(`${API_URL}/api/audits`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          actorId,
          actorEmail,
          actorRole,
          action,
          entityType,
          entityId,
          details,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Audit logging must not crash the UI
    }
  }

  destroy() {
    this.stopPolling();
    if (this.authUnsubscribe) this.authUnsubscribe();
  }
}
