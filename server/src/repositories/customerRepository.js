import { db } from '../config/firebase.js';

export class CustomerRepository {
  static async getInstitution(id) {
    const docSnap = await db.collection('institutions').doc(id).get();
    return docSnap.exists ? { id: docSnap.id, ...docSnap.data() } : null;
  }

  static async getCreditAccount(institutionId) {
    const snapshot = await db.collection('creditAccounts')
      .where('institutionId', '==', institutionId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  static async getInvoices(institutionId) {
    const snapshot = await db.collection('invoices')
      .where('institutionId', '==', institutionId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async getPayments(institutionId) {
    const snapshot = await db.collection('payments')
      .where('institutionId', '==', institutionId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async getCreditRequests(institutionId) {
    const snapshot = await db.collection('credit_requests')
      .where('institutionId', '==', institutionId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async createCreditRequest(data) {
    const docRef = await db.collection('credit_requests').add({
      ...data,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    return { id: docRef.id, ...data };
  }

  static async getDocuments(institutionId) {
    const snapshot = await db.collection('documents')
      .where('institutionId', '==', institutionId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async createDocument(data) {
    const docRef = await db.collection('documents').add({
      ...data,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    return { id: docRef.id, ...data };
  }

  static async getTimelines(institutionId) {
    const snapshot = await db.collection('customer_timelines')
      .where('institutionId', '==', institutionId)
      .orderBy('timestamp', 'asc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
