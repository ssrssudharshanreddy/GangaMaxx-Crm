import { db } from '../config/firebase.js';

export const logAuditAction = async ({
  userId,
  userEmail,
  role,
  action,
  module,
  entityId = '',
  details = '',
  previousValue = null,
  newValue = null,
  reason = '',
}) => {
  try {
    const timestamp = new Date().toISOString();
    await db.collection('audits').add({
      actorId: userId,
      actorEmail: userEmail,
      actorRole: role,
      action,
      entityType: module,
      entityId,
      remark: reason || details,
      payloadDiff: (previousValue || newValue) ? { before: previousValue, after: newValue } : null,
      timestamp,
      createdAt: timestamp,
    });
  } catch (error) {
    console.error('Audit Log Insertion Failed:', error);
  }
};
