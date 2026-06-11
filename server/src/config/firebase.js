import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'ganga-maxx-crm';

if (admin.apps.length === 0) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
      });
      console.log('✅ Firebase initialized with Service Account');
    } catch (e) {
      console.warn('⚠️  Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
      console.warn('⚠️  Attempting to use Application Default Credentials...');
      console.log('📖 To fix: See SERVICE_ACCOUNT_SETUP.md in project root');
      try {
        admin.initializeApp({
          projectId: projectId,
        });
        console.log('✅ Firebase initialized (may have limited permissions)');
      } catch (adcError) {
        console.error('❌ Firebase initialization failed:', adcError.message);
        console.error('📖 Please follow: SERVICE_ACCOUNT_SETUP.md');
        throw adcError;
      }
    }
  } else {
    console.warn('⚠️  No FIREBASE_SERVICE_ACCOUNT found in .env');
    console.warn('⚠️  Attempting to use Application Default Credentials...');
    console.log('📖 To fix: See SERVICE_ACCOUNT_SETUP.md in project root');
    try {
      admin.initializeApp({
        projectId: projectId,
      });
      console.log('✅ Firebase initialized (may have limited permissions)');
    } catch (adcError) {
      console.error('❌ Firebase initialization failed:', adcError.message);
      console.error('📖 Please follow: SERVICE_ACCOUNT_SETUP.md');
      throw adcError;
    }
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
export default admin;
