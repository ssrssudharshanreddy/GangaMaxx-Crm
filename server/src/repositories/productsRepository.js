import { db } from '../config/firebase.js';

export class ProductsRepository {
  static async getAllActive() {
    const snapshot = await db.collection('products')
      .where('status', '==', 'active')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async getById(id) {
    const docSnap = await db.collection('products').doc(id).get();
    return docSnap.exists ? { id: docSnap.id, ...docSnap.data() } : null;
  }
}
