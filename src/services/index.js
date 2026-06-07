import { FirestoreDatabaseService } from './firestoreDb';
import { isFirebaseConfigured } from '../config/firebase';

if (!isFirebaseConfigured) {
  throw new Error('[Ganga Maxx] Firebase is not properly configured in this production build.');
}

export const db = new FirestoreDatabaseService();

export const logAuditAction = (actorId, actorEmail, actorRole, action, entityType, entityId, details) => {
  if (typeof db.logAuditAction === 'function') {
    db.logAuditAction(actorId, actorEmail, actorRole, action, entityType, entityId, details);
  }
};

export default db;
