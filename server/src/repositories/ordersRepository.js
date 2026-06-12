import { db } from '../config/firebase.js';

export class OrdersRepository {
  static async getNextCounterValue(counterName) {
    const counterDocRef = db.collection('counters').doc(counterName);
    return await db.runTransaction(async (transaction) => {
      const counterSnap = await transaction.get(counterDocRef);
      let currentVal = 0;
      if (counterSnap.exists) {
        currentVal = counterSnap.data().value || 0;
      }
      const newVal = currentVal + 1;
      transaction.set(counterDocRef, { value: newVal });
      return newVal;
    });
  }

  static async getOrdersByInstitution(institutionId) {
    const snapshot = await db.collection('orders')
      .where('institutionId', '==', institutionId)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async getOrderById(id) {
    const docSnap = await db.collection('orders').doc(id).get();
    return docSnap.exists ? { id: docSnap.id, ...docSnap.data() } : null;
  }

  static async createOrder(orderData) {
    const nextVal = await this.getNextCounterValue('orders');
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(nextVal).padStart(5, '0')}`;
    const deliveryPin = String(Math.floor(100000 + Math.random() * 900000));
    const finalOrder = {
      ...orderData,
      orderNumber,
      deliveryPin,
      status: 'pending',
      deletedAt: null,
      createdAt: new Date().toISOString().slice(0, 10),
      history: [{
        state: 'pending',
        timestamp: new Date().toISOString(),
        actorId: orderData.customerId || 'unknown',
        actorEmail: orderData.customerEmail || 'unknown',
        actorRole: 'Customer',
        remark: 'Order created via Customer Portal'
      }],
      remarks: 'Initial order submission'
    };
    await db.collection('orders').doc(orderNumber).set(finalOrder);
    return finalOrder;
  }
}
