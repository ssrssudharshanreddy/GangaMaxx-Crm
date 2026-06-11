import { db } from '../config/firebase.js';

export class UserRepository {
  static async getById(uid) {
    const docSnap = await db.collection('users').doc(uid).get();
    return docSnap.exists ? docSnap.data() : null;
  }

  static async update(uid, updates) {
    await db.collection('users').doc(uid).update(updates);
  }
}
