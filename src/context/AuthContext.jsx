import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../config/firebase';

const AuthContext = createContext(undefined);
const staffRoles = new Set(['owner', 'sales_admin', 'salesman', 'warehouse_staff', 'accounts_manager', 'support_staff', 'compliance_admin']);

const loadFirebaseUserProfile = async (firebaseUser) => {
  const userSnap = await getDoc(doc(firestore, 'users', firebaseUser.uid));
  if (!userSnap.exists()) {
    throw new Error(`No user profile document exists for this Firebase account (UID: ${firebaseUser.uid}).`);
  }

  const profile = userSnap.data();
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
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem('gm_crm_active_session');
    if (auth) {
      try {
        await signOut(auth);
      } catch (error) {
        void 0;
      }
    }
  }, []);

  const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
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
      setLoading(false);
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
      } catch (error) {
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
    } catch (error) {
      throw error;
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
