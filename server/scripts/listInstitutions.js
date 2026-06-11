import admin from '../src/config/firebase.js';

async function listInstitutions() {
  try {
    const db = admin.firestore();
    const snap = await db.collection('institutions').orderBy('createdAt', 'desc').limit(20).get();
    console.log(`Found ${snap.size} institutions:`);
    snap.docs.forEach(doc => {
      console.log(doc.id, JSON.stringify(doc.data()));
    });
    process.exit(0);
  } catch (err) {
    console.error('Error listing institutions:', err);
    process.exit(1);
  }
}

listInstitutions();