import { db } from '../config/firebase.js';

export class ReturnsRepository {
  static async getReturnsByInstitution(institutionId) {
    try {
      const snapshot = await db.collection('returns')
        .where('institutionId', '==', institutionId)
        .orderBy('createdAt', 'desc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      // Firestore may require a composite index for where+orderBy combinations.
      // Fall back to a simple where() query and sort client-side to avoid crashing the server.
      if (String(err.message || '').toLowerCase().includes('requires an index') || err.code === 9) {
        const snap = await db.collection('returns')
          .where('institutionId', '==', institutionId)
          .get();
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      }
      throw err;
    }
  }

  static async createReturnRequest(data) {
    const docRef = await db.collection('returns').add({
      ...data,
      status: 'requested',
      createdAt: new Date().toISOString().slice(0, 10),
      history: [{
        state: 'requested',
        timestamp: new Date().toISOString(),
        actorId: data.customerId || 'unknown',
        actorEmail: data.customerEmail || 'unknown',
        actorRole: 'Customer',
        remark: 'Return request submitted via Customer Portal'
      }],
      remarks: 'Initial return request'
    });
    return { id: docRef.id, ...data, status: 'requested' };
  }
}
