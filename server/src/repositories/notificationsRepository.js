import { db } from '../config/firebase.js';

export class NotificationsRepository {
  static async getNotificationsByUser(userId) {
    const snapshot = await db.collection('notifications')
      .where('recipientId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async markAsRead(notificationId) {
    await db.collection('notifications').doc(notificationId).update({ read: true });
  }
}
