import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, query, limit, where } from 'firebase/firestore';
import { auth, firestore } from '../config/firebase';
import { logAuditAction } from '../services';

const AuthContext = createContext(undefined);
const staffRoles = new Set(['owner', 'sales_admin', 'salesman', 'warehouse_manager', 'warehouse_staff', 'accounts_manager', 'accounts_executive', 'support_manager', 'support_staff', 'compliance_manager']);
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const loadFirebaseUserProfile = async (firebaseUser) => {
  let userSnap = await getDoc(doc(firestore, 'users', firebaseUser.uid));
  if (!userSnap.exists()) {
    try {
      const usersQuery = query(collection(firestore, 'users'), limit(1));
      const usersSnap = await getDocs(usersQuery);
      
      if (usersSnap.empty) {
        const profileData = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'System Owner',
          email: firebaseUser.email,
          role: 'owner',
          status: 'active',
          permissions: [],
          createdAt: new Date().toISOString().slice(0, 10),
        };
        await setDoc(doc(firestore, 'users', firebaseUser.uid), profileData);
        await setDoc(doc(firestore, 'staff', firebaseUser.uid), {
          uid: profileData.uid,
          name: profileData.name,
          email: profileData.email,
          role: profileData.role,
          status: profileData.status,
          permissions: [],
          createdAt: profileData.createdAt,
        });
        userSnap = await getDoc(doc(firestore, 'users', firebaseUser.uid));
      } else {
        const staffQuery = query(collection(firestore, 'staff'), where('email', '==', firebaseUser.email), limit(1));
        const staffSnap = await getDocs(staffQuery);
        
        if (!staffSnap.empty) {
          const staffDoc = staffSnap.docs[0];
          const staffData = staffDoc.data();
          const profileData = {
            uid: firebaseUser.uid,
            name: staffData.name || firebaseUser.displayName || 'Staff Member',
            email: firebaseUser.email,
            role: staffData.role || 'salesman',
            status: staffData.status || 'active',
            phoneNumber: staffData.phoneNumber || '',
            permissions: staffData.permissions || [],
            createdAt: staffData.createdAt || new Date().toISOString().slice(0, 10),
          };
          await setDoc(doc(firestore, 'users', firebaseUser.uid), profileData);
          await setDoc(doc(firestore, 'staff', firebaseUser.uid), profileData);
          userSnap = await getDoc(doc(firestore, 'users', firebaseUser.uid));
        } else {
          const instQuery = query(collection(firestore, 'institutions'), where('contactPerson.email', '==', firebaseUser.email), limit(1));
          const instSnap = await getDocs(instQuery);
          
          if (!instSnap.empty) {
            const instDoc = instSnap.docs[0];
            const instData = instDoc.data();
            const profileData = {
              uid: firebaseUser.uid,
              name: instData.contactPerson?.name || firebaseUser.displayName || 'Contact Person',
              email: firebaseUser.email,
              role: 'customer_admin',
              status: instData.status === 'active' ? 'active' : 'pending_approval',
              phoneNumber: instData.contactPerson?.phone || '',
              institutionId: instDoc.id,
              permissions: [],
              createdAt: instData.createdAt || new Date().toISOString().slice(0, 10),
            };
            await setDoc(doc(firestore, 'users', firebaseUser.uid), profileData);
            await setDoc(doc(firestore, 'institutions', instDoc.id), {
              ...instData,
              'contactPerson.uid': firebaseUser.uid
            });
            userSnap = await getDoc(doc(firestore, 'users', firebaseUser.uid));
          } else {
            const profileData = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Staff Member',
              email: firebaseUser.email,
              role: 'salesman',
              status: 'active',
              permissions: [],
              createdAt: new Date().toISOString().slice(0, 10),
            };
            await setDoc(doc(firestore, 'users', firebaseUser.uid), profileData);
            await setDoc(doc(firestore, 'staff', firebaseUser.uid), profileData);
            userSnap = await getDoc(doc(firestore, 'users', firebaseUser.uid));
          }
        }
      }
    } catch (err) {
      throw new Error(`Failed to auto-create user profile: ${err.message}`, { cause: err });
    }
  }

  let profile = userSnap.data();
  let updatedFields = {};
  
  if (profile.role === 'salesAdmin') {
    profile.role = 'sales_admin';
    updatedFields.role = 'sales_admin';
  } else if (profile.role === 'accountsManager') {
    profile.role = 'accounts_manager';
    updatedFields.role = 'accounts_manager';
  } else if (profile.role === 'complianceAdmin') {
    profile.role = 'compliance_manager';
    updatedFields.role = 'compliance_manager';
  } else if (profile.role === 'supportStaff') {
    profile.role = 'support_staff';
    updatedFields.role = 'support_staff';
  } else if (profile.role === 'warehouseStaff') {
    profile.role = 'warehouse_staff';
    updatedFields.role = 'warehouse_staff';
  }
  
  if (!profile.uid) {
    profile.uid = firebaseUser.uid;
    updatedFields.uid = firebaseUser.uid;
  }
  
  if (!profile.email) {
    profile.email = firebaseUser.email;
    updatedFields.email = firebaseUser.email;
  }
  
  if (profile.permissions === undefined) {
    profile.permissions = [];
    updatedFields.permissions = [];
  }
  
  if (!profile.status) {
    profile.status = 'active';
    updatedFields.status = 'active';
  }

  if (Object.keys(updatedFields).length > 0) {
    try {
      await setDoc(doc(firestore, 'users', firebaseUser.uid), updatedFields, { merge: true });
      if (staffRoles.has(profile.role) || profile.role === 'owner') {
        await setDoc(doc(firestore, 'staff', firebaseUser.uid), updatedFields, { merge: true });
      }
    } catch {
      void 0;
    }
  }

  if (!staffRoles.has(profile.role)) {
    throw new Error('This account is not authorized for the admin portal.');
  }
  if (profile.status !== 'active') {
    throw new Error('This account is not active.');
  }

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    name: profile.name || profile.displayName || firebaseUser.displayName || 'Staff Member',
    ...profile,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gm_crm_active_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        localStorage.removeItem('gm_crm_active_session');
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (!auth || !firestore) return false;
    return true;
  });

  const logout = useCallback(async () => {
    setUser((currentUser) => {
      if (currentUser) {
        logAuditAction(
          currentUser.id,
          currentUser.email,
          currentUser.role,
          'logout',
          'user',
          currentUser.id,
          `${currentUser.name || currentUser.email} logged out successfully`
        );
      }
      return null;
    });
    localStorage.removeItem('gm_crm_active_session');
    if (auth) {
      try {
        await signOut(auth);
      } catch {
        void 0;
      }
    }
  }, []);

  const idleTimerRef = useRef(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      logout();
      localStorage.setItem('gm_session_expired', '1');
    }, IDLE_TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    if (!auth || !firestore) {
      return;
    }

    setPersistence(auth, browserLocalPersistence).catch(() => {
      void 0;
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          localStorage.removeItem('gm_crm_active_session');
          return;
        }

        const profile = await loadFirebaseUserProfile(firebaseUser);
        setUser(profile);
        localStorage.setItem('gm_crm_active_session', JSON.stringify(profile));
      } catch {
        setUser(null);
        localStorage.removeItem('gm_crm_active_session');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, resetIdleTimer]);

  const loginWithEmail = async (email, password) => {
    setLoading(true);
    if (!auth) {
      setLoading(false);
      throw new Error('Authentication service is not available.');
    }

    if (!password) {
      setLoading(false);
      throw new Error('Password is required.');
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const profile = await loadFirebaseUserProfile(credential.user);
      setUser(profile);
      localStorage.setItem('gm_crm_active_session', JSON.stringify(profile));
      logAuditAction(
        profile.id,
        profile.email,
        profile.role,
        'login',
        'user',
        profile.id,
        `${profile.name || profile.email} logged in successfully`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
