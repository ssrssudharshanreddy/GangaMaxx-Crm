import { addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from '../config/firebase';
import { DBNotifier } from './dbNotifier';

export class FirestoreDatabaseService {
  constructor() {
    this.cache = {};
    this.errors = {};
    this.unsubscribes = [];
    this.collectionConfigs = [
      { key: 'staff', names: ['staff'] },
      { key: 'institutions', names: ['institutions'] },
      { key: 'notifications', names: ['notifications'] },
      { key: 'orders', names: ['orders'] },
      { key: 'orderItems', names: ['order_items'] },
      { key: 'quotations', names: ['quotations'] },
      { key: 'invoices', names: ['invoices'] },
      { key: 'payments', names: ['payments'] },
      { key: 'tickets', names: ['tickets', 'support_tickets'] },
      { key: 'products', names: ['products'] },
      { key: 'procurement', names: ['procurement'] },
      { key: 'visitLogs', names: ['visitLogs', 'visit_logs'] },
      { key: 'followUps', names: ['followUps', 'follow_ups'] },
      { key: 'returns', names: ['returns'] },
      { key: 'audits', names: ['audits'] },
    ];

    this.collectionConfigs.forEach(({ key }) => {
      this.cache[key] = [];
    });

    if (!auth || !firestore) {
      this.errors.firebase = 'Firebase is not configured.';
      return;
    }

    this.authUnsubscribe = onAuthStateChanged(auth, (user) => {
      this.detachListeners();
      if (user) {
        this.initListeners();
      } else {
        this.clearCache();
      }
    });
  }

  initListeners() {
    this.collectionConfigs.forEach(({ key, names }) => {
      const snapshotsByName = new Map();

      names.forEach((collectionName) => {
        const unsubscribe = onSnapshot(
          collection(firestore, collectionName),
          (snapshot) => {
            snapshotsByName.set(
              collectionName,
              snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                sourceCollection: collectionName,
                ...docSnap.data(),
              }))
            );
            this.errors[key] = null;
            this.cache[key] = Array.from(snapshotsByName.values()).flat();
            DBNotifier.notify(key);
          },
          (error) => {
            this.errors[key] = error;
            void 0;
            DBNotifier.notify(key);
          }
        );
        this.unsubscribes.push(unsubscribe);
      });
    });
  }

  detachListeners() {
    this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.unsubscribes = [];
  }

  clearCache() {
    this.collectionConfigs.forEach(({ key }) => {
      this.cache[key] = [];
      DBNotifier.notify(key);
    });
  }

  destroy() {
    this.detachListeners();
    if (this.authUnsubscribe) this.authUnsubscribe();
  }

  getStaff() { return this.cache.staff || []; }
  getInstitutions() { return this.cache.institutions || []; }
  getNotifications(userId) {
    const all = this.cache.notifications || [];
    return userId ? all.filter((item) => item.recipientId === userId) : all;
  }
  getOrders() { return this.cache.orders || []; }
  getQuotations() { return this.cache.quotations || []; }
  getInvoices() { return this.cache.invoices || []; }
  getPayments() { return this.cache.payments || []; }
  getTickets() { return this.cache.tickets || []; }
  getProducts() { return this.cache.products || []; }
  getProcurement() { return this.cache.procurement || []; }
  getVisitLogs() { return this.cache.visitLogs || []; }
  getFollowUps() { return this.cache.followUps || []; }
  getReturns() { return this.cache.returns || []; }
  getAudits() { return this.cache.audits || []; }

  async addStaff(staff) {
    const docRef = await addDoc(collection(firestore, 'staff'), {
      ...staff,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    return { id: docRef.id, ...staff };
  }

  async updateStaff(id, updates) {
    await updateDoc(doc(firestore, 'staff', id), updates);
  }

  async addInstitution(institution) {
    const docRef = await addDoc(collection(firestore, 'institutions'), {
      ...institution,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    return { id: docRef.id, ...institution };
  }

  async updateInstitution(id, updates) {
    await updateDoc(doc(firestore, 'institutions', id), updates);
  }

  async addProduct(product) {
    const docRef = await addDoc(collection(firestore, 'products'), {
      ...product,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    return { id: docRef.id, ...product };
  }

  async updateProduct(id, updates) {
    await updateDoc(doc(firestore, 'products', id), updates);
  }

  async addProcurement(po) {
    const docRef = await addDoc(collection(firestore, 'procurement'), {
      ...po,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    return { id: docRef.id, ...po };
  }

  async updateProcurement(id, updates) {
    await updateDoc(doc(firestore, 'procurement', id), updates);
  }

  async addOrder(order) {
    const docRef = await addDoc(collection(firestore, 'orders'), {
      ...order,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    return { id: docRef.id, ...order };
  }

  async updateOrder(id, updates) {
    await updateDoc(doc(firestore, 'orders', id), updates);
  }

  async addQuotation(quote) {
    const docRef = await addDoc(collection(firestore, 'quotations'), {
      ...quote,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    return { id: docRef.id, ...quote };
  }

  async updateQuotation(id, updates) {
    await updateDoc(doc(firestore, 'quotations', id), updates);
  }

  async addInvoice(invoice) {
    const docRef = await addDoc(collection(firestore, 'invoices'), {
      ...invoice,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    return { id: docRef.id, ...invoice };
  }

  async updateInvoice(id, updates) {
    await updateDoc(doc(firestore, 'invoices', id), updates);
  }

  async addPayment(payment) {
    const docRef = await addDoc(collection(firestore, 'payments'), {
      ...payment,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    return { id: docRef.id, ...payment };
  }

  async addTicket(ticket) {
    const docRef = await addDoc(collection(firestore, 'tickets'), {
      ...ticket,
      createdAt: new Date().toISOString().slice(0, 10),
      messages: ticket.messages || [],
    });
    return { id: docRef.id, ...ticket };
  }

  async updateTicket(id, updates) {
    await updateDoc(doc(firestore, 'tickets', id), updates);
  }

  async addFollowUp(followUp) {
    const docRef = await addDoc(collection(firestore, 'followUps'), {
      ...followUp,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    return { id: docRef.id, ...followUp };
  }

  async updateFollowUp(id, updates) {
    await updateDoc(doc(firestore, 'followUps', id), updates);
  }

  async addVisitLog(visitLog) {
    const docRef = await addDoc(collection(firestore, 'visitLogs'), visitLog);
    return { id: docRef.id, ...visitLog };
  }

  async addReturn(ret) {
    const docRef = await addDoc(collection(firestore, 'returns'), {
      ...ret,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    return { id: docRef.id, ...ret };
  }

  async updateReturn(id, updates) {
    await updateDoc(doc(firestore, 'returns', id), updates);
  }

  async addNotification(notif) {
    const docRef = await addDoc(collection(firestore, 'notifications'), {
      ...notif,
      read: false,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    });
    return { id: docRef.id, ...notif };
  }

  async markNotificationRead(id) {
    await updateDoc(doc(firestore, 'notifications', id), {
      read: true,
      readAt: new Date().toISOString(),
    });
  }

  async logAuditAction(actorId, actorEmail, actorRole, action, entityType, entityId, details) {
    await addDoc(collection(firestore, 'audits'), {
      actorId,
      actorEmail,
      actorRole,
      action,
      entityType,
      entityId,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      details,
    });
  }
}
