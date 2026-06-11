import { db } from '../config/firebase.js';

export class TicketsRepository {
  static async getTicketsByInstitution(institutionId) {
    const snapshot = await db.collection('tickets')
      .where('institutionId', '==', institutionId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async createTicket(data) {
    const docRef = await db.collection('tickets').add({
      ...data,
      status: 'Open',
      messages: data.messages || [],
      createdAt: new Date().toISOString().slice(0, 10),
    });
    return { id: docRef.id, ...data, status: 'Open' };
  }

  static async addMessage(ticketId, message) {
    const docRef = db.collection('tickets').doc(ticketId);
    await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) throw new Error('Ticket not found');
      const data = docSnap.data();
      const messages = data.messages || [];
      messages.push({
        ...message,
        createdAt: new Date().toISOString(),
      });
      transaction.update(docRef, { messages });
    });
  }
}
