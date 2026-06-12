import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'ganga-maxx-crm';

if (admin.apps.length === 0) {
  // Allow loading service account JSON from either an env var or a file path.
  let serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountJson && serviceAccountPath) {
    try {
      const candidates = [
        path.isAbsolute(serviceAccountPath)
          ? serviceAccountPath
          : path.resolve(process.cwd(), serviceAccountPath),
        path.resolve(__dirname, serviceAccountPath),
      ];

      const resolvedPath = candidates.find((candidate) => fs.existsSync(candidate));
      if (resolvedPath) {
        serviceAccountJson = fs.readFileSync(resolvedPath, { encoding: 'utf8' });
        console.log('ℹ️  Loaded Firebase service account from', resolvedPath);
      } else {
        console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_PATH not found in any candidate path:', candidates.join(' | '));
      }
    } catch (e) {
      console.warn('⚠️  Failed to read FIREBASE_SERVICE_ACCOUNT_PATH:', e.message);
    }
  }

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
    console.warn('⚠️  No FIREBASE_SERVICE_ACCOUNT found in .env or via FIREBASE_SERVICE_ACCOUNT_PATH');
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
