/**
 * Authentication Context
 * Manages Firebase authentication state, Firestore user profile,
 * email OTP verification, role-based access, and admin role elevation.
 * No automatic bypasses; supports standard Google popup login and email OTP.
 */
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  GoogleAuthProvider,
  FacebookAuthProvider,
  browserPopupRedirectResolver,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { notificationService } from '../services/notificationService';
import { adminRoleService } from '../services/adminRoleService';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  isRealAdmin: boolean;
  isBlocked: boolean;
    signInWithGoogle: (providerType?: 'google' | 'facebook') => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  registerWithEmail: (email: string, password: string, name: string, phone?: string) => Promise<{ success: boolean; message: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_PROFILE_KEY = 'roomfinder_user_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_USER_PROFILE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [, setAdminSyncTick] = useState<number>(0);
  const userSnapshotUnsubRef = useRef<(() => void) | null>(null);

  // Helper to persist and broadcast current profile state
  const saveProfile = useCallback((profile: UserProfile | null) => {
    setCurrentUser((prev) => {
      if (!profile && !prev) return null;
      if (
        profile && 
        prev && 
        profile.uid === prev.uid && 
        profile.role === prev.role && 
        profile.email === prev.email && 
        profile.name === prev.name && 
        profile.status === prev.status
      ) {
        return prev;
      }
      return profile;
    });

    if (profile) {
      try {
        localStorage.setItem(LOCAL_USER_PROFILE_KEY, JSON.stringify(profile));
      } catch (e) {
        console.warn('LocalStorage save profile notice:', e);
      }
    } else {
      localStorage.removeItem(LOCAL_USER_PROFILE_KEY);
    }
  }, []);

  // 1. Initialize adminRoleService real-time Firestore sync and listen for admin changes
  useEffect(() => {
    const unsubAdminSync = adminRoleService.initSync();
    const handleAdminConfigChange = async () => {
      setAdminSyncTick((t) => t + 1);
      let current: UserProfile | null = null;
      try {
        const savedUserStr = localStorage.getItem(LOCAL_USER_PROFILE_KEY);
        if (savedUserStr) current = JSON.parse(savedUserStr);
      } catch {}

      const activeUser = auth.currentUser;
      const cleanEmail = (activeUser?.email || current?.email || '').trim().toLowerCase();
      const activeUid = activeUser?.uid || current?.uid || '';

      if (cleanEmail || activeUid) {
        const statusResult = await adminRoleService.checkAdminStatusFromFirestore(cleanEmail, activeUid);
        const shouldBeAdmin = statusResult.isAdmin;

        setCurrentUser((prev) => {
          if (!prev) return null;
          if (shouldBeAdmin && prev.role !== 'admin') {
            const updated: UserProfile = { ...prev, role: 'admin', updatedAt: new Date().toISOString() };
            saveProfile(updated);
            notificationService.add(
              'notice',
              'Admin Access Granted',
              'You have administrative privileges in Khojamm.'
            );
            return updated;
          } else if (!shouldBeAdmin && prev.role === 'admin') {
            const updated: UserProfile = { ...prev, role: 'user', updatedAt: new Date().toISOString() };
            saveProfile(updated);
            notificationService.add(
              'notice',
              statusResult.status === 'expired' ? 'Admin Access Expired' : 'Admin Access Revoked',
              statusResult.status === 'expired'
                ? 'Your temporary administrator access duration has expired.'
                : 'Your administrator access has been revoked.'
            );
            return updated;
          }
          return prev;
        });
      }
    };

    window.addEventListener('khojam_admin_config_changed', handleAdminConfigChange);
    return () => {
      unsubAdminSync();
      window.removeEventListener('khojam_admin_config_changed', handleAdminConfigChange);
    };
  }, [saveProfile]);

  // Synchronize admin status whenever user's email or role changes
  useEffect(() => {
    if (currentUser && currentUser.email) {
      const cleanEmail = currentUser.email.trim().toLowerCase();
      adminRoleService.checkAdminStatusFromFirestore(cleanEmail, currentUser.uid).then((statusResult) => {
        const shouldBeAdmin = statusResult.isAdmin;
        if (shouldBeAdmin && currentUser.role !== 'admin') {
          const updated: UserProfile = { ...currentUser, role: 'admin', updatedAt: new Date().toISOString() };
          saveProfile(updated);
        } else if (!shouldBeAdmin && currentUser.role === 'admin') {
          const updated: UserProfile = { ...currentUser, role: 'user', updatedAt: new Date().toISOString() };
          saveProfile(updated);
        }
      }).catch(() => {});
    }
  }, [currentUser?.email, currentUser?.role, saveProfile]);

  // 2. Prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // 3. Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (userSnapshotUnsubRef.current) {
        userSnapshotUnsubRef.current();
        userSnapshotUnsubRef.current = null;
      }

      if (fbUser) {
        const cleanEmail = (fbUser.email || '').trim().toLowerCase();
        const statusResult = await adminRoleService.checkAdminStatusFromFirestore(cleanEmail, fbUser.uid);
        const shouldBeAdmin = statusResult.isAdmin;

        setCurrentUser((prev) => {
          if (!prev) {
            const baseProfile: UserProfile = {
              uid: fbUser.uid,
              name: fbUser.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'User'),
              email: cleanEmail,
              photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail || fbUser.uid)}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              role: shouldBeAdmin ? 'admin' : 'user',
              status: 'active',
              phone: fbUser.phoneNumber || ''
            };
            localStorage.setItem(LOCAL_USER_PROFILE_KEY, JSON.stringify(baseProfile));
            return baseProfile;
          }
          if (shouldBeAdmin && prev.role !== 'admin') {
            const updated: UserProfile = { ...prev, role: 'admin' };
            localStorage.setItem(LOCAL_USER_PROFILE_KEY, JSON.stringify(updated));
            return updated;
          } else if (!shouldBeAdmin && prev.role === 'admin') {
            const updated: UserProfile = { ...prev, role: 'user' };
            localStorage.setItem(LOCAL_USER_PROFILE_KEY, JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
        setLoading(false);

        // Attach snapshot listener on user document
        const userDocRef = doc(db, 'users', fbUser.uid);
        userSnapshotUnsubRef.current = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            const effectiveRole = shouldBeAdmin ? 'admin' : data.role;
            if (data.status === 'blocked') {
              saveProfile({ ...data, status: 'blocked' });
            } else {
              saveProfile({ ...data, role: effectiveRole });
            }
          }
          setLoading(false);
        }, (err) => {
          console.warn("User profile snapshot listener note:", err);
          setLoading(false);
        });

        // If authorized as admin, ensure dual records in /admins and /users are properly set
        if (shouldBeAdmin) {
          setDoc(doc(db, 'admins', fbUser.uid), {
            uid: fbUser.uid,
            email: cleanEmail,
            assignedAt: new Date().toISOString(),
            status: 'active',
            role: statusResult.isRealAdmin ? 'super_admin' : 'admin'
          }, { merge: true }).catch(() => {});
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (userSnapshotUnsubRef.current) {
        userSnapshotUnsubRef.current();
        userSnapshotUnsubRef.current = null;
      }
    };
  }, [saveProfile]);

  // Standard Google Login via popup
   const signInWithGoogle = async (providerType: 'google' | 'facebook' = 'google') => {
    try {
      setLoading(true);
      const provider = providerType === 'facebook'
        ? new FacebookAuthProvider()
        : new GoogleAuthProvider();
      if (providerType === 'google') {
        provider.setCustomParameters({ prompt: 'select_account' });
      } else {
        (provider as FacebookAuthProvider).addScope('email');
      }
      
      let cred;
      try {
        cred = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      } catch (resolverErr: any) {
        if (resolverErr?.code === 'auth/popup-closed-by-user' || resolverErr?.code === 'auth/unauthorized-domain') {
          throw resolverErr;
        }
        cred = await signInWithPopup(auth, provider);
      }
      const user = cred.user;
      const uid = user.uid;
      const cleanEmail = (user.email || '').trim().toLowerCase();
      const statusResult = await adminRoleService.checkAdminStatusFromFirestore(cleanEmail, uid);
      const shouldBeAdmin = statusResult.isAdmin;
      const now = new Date().toISOString();

      let profile: UserProfile = {
        uid,
        name: user.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'User'),
        email: cleanEmail,
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail || uid)}`,
        createdAt: now,
        updatedAt: now,
        role: shouldBeAdmin ? 'admin' : 'user',
        status: 'active',
        phone: user.phoneNumber || ''
      };

      saveProfile(profile);
      setLoading(false);

      // Background Firestore sync
      (async () => {
        try {
          const userRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const existingData = userSnap.data() as UserProfile;
            if (existingData.status === 'blocked') {
              await firebaseSignOut(auth);
              saveProfile({ ...existingData, status: 'blocked' });
              return;
            }
            profile = {
              ...existingData,
              name: profile.name,
              email: cleanEmail,
              photoURL: profile.photoURL,
              role: shouldBeAdmin ? 'admin' : (existingData.role || 'user'),
              updatedAt: now
            };
            saveProfile(profile);
            await updateDoc(userRef, {
              name: profile.name,
              photoURL: profile.photoURL,
              email: cleanEmail,
              updatedAt: now,
              role: shouldBeAdmin ? 'admin' : 'user'
            });
          } else {
            await setDoc(userRef, profile);
          }

          if (shouldBeAdmin) {
            await setDoc(doc(db, 'admins', uid), {
              uid,
              email: cleanEmail,
              assignedAt: now,
              status: 'active',
              role: statusResult.isRealAdmin ? 'super_admin' : 'admin'
            }, { merge: true });
          }
        } catch (dbErr) {
          console.warn("Background Firestore user profile sync note:", dbErr);
        }
      })();

      notificationService.add(
        'login',
        providerType === 'facebook' ? 'Signed In with Facebook' : 'Signed In with Google',
        `Welcome to Khojamm, ${profile.name}!`
      );
    } catch (err: any) {
      console.warn("Google sign-in notice:", err);
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Real Firebase Email & Password Sign-In
  const signInWithEmail = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) {
        return { success: false, message: 'Please enter both email and password.' };
      }

      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = cred.user;
      const uid = user.uid;
      const statusResult = await adminRoleService.checkAdminStatusFromFirestore(cleanEmail, uid);
      const shouldBeAdmin = statusResult.isAdmin;
      const now = new Date().toISOString();

      let profile: UserProfile = {
        uid,
        name: user.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'User'),
        email: cleanEmail,
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail || uid)}`,
        createdAt: now,
        updatedAt: now,
        role: shouldBeAdmin ? 'admin' : 'user',
        status: 'active',
        phone: user.phoneNumber || ''
      };

      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const existingData = userSnap.data() as UserProfile;
          if (existingData.status === 'blocked') {
            await firebaseSignOut(auth);
            saveProfile({ ...existingData, status: 'blocked' });
            return { success: false, message: 'Your account has been deactivated. Please contact support.' };
          }
          profile = {
            ...existingData,
            role: shouldBeAdmin ? 'admin' : (existingData.role || 'user'),
            updatedAt: now
          };
          saveProfile(profile);
          await updateDoc(userRef, {
            email: cleanEmail,
            updatedAt: now,
            role: shouldBeAdmin ? 'admin' : 'user'
          });
        } else {
          await setDoc(userRef, profile);
        }

        if (shouldBeAdmin) {
          await setDoc(doc(db, 'admins', uid), {
            uid,
            email: cleanEmail,
            assignedAt: now,
            status: 'active',
            role: statusResult.isRealAdmin ? 'super_admin' : 'admin'
          }, { merge: true });
        }
      } catch (dbErr) {
        console.warn('Firestore profile sync note:', dbErr);
      }

      saveProfile(profile);
      notificationService.add(
        'login',
        'Signed In Successfully',
        `Welcome back to Khojamm, ${profile.name}!`
      );
      return { success: true, message: 'Signed in successfully!' };
    } catch (err: any) {
      console.warn('Email sign in error:', err);
      let errorMsg = 'Failed to sign in. Please verify your email and password.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        errorMsg = 'Invalid email or password. If you do not have an account, please click "Create Account".';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/user-disabled') {
        errorMsg = 'This account has been disabled. Please contact support.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Access temporarily disabled due to many failed login attempts. Please reset your password or try again later.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Real Firebase Email & Password Registration
  const registerWithEmail = async (
    email: string, 
    password: string, 
    name: string, 
    phone?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();

      if (!cleanEmail || !password || !cleanName) {
        return { success: false, message: 'Please provide full name, email, and password.' };
      }
      if (password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters long.' };
      }

      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const user = cred.user;
      const uid = user.uid;

      try {
        await updateFirebaseProfile(user, { displayName: cleanName });
      } catch (e) {
        console.warn('Update Firebase profile displayName note:', e);
      }

      const statusResult = await adminRoleService.checkAdminStatusFromFirestore(cleanEmail, uid);
      const shouldBeAdmin = statusResult.isAdmin;
      const now = new Date().toISOString();

      const profile: UserProfile = {
        uid,
        name: cleanName,
        email: cleanEmail,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail || uid)}`,
        createdAt: now,
        updatedAt: now,
        role: shouldBeAdmin ? 'admin' : 'user',
        status: 'active',
        phone: phone?.trim() || ''
      };

      saveProfile(profile);

      try {
        await setDoc(doc(db, 'users', uid), profile);
        if (shouldBeAdmin) {
          await setDoc(doc(db, 'admins', uid), {
            uid,
            email: cleanEmail,
            assignedAt: now,
            status: 'active',
            role: statusResult.isRealAdmin ? 'super_admin' : 'admin'
          }, { merge: true });
        }
      } catch (dbErr) {
        console.warn('Firestore profile creation note:', dbErr);
      }

      notificationService.add(
        'login',
        'Account Created',
        `Welcome to Khojamm, ${cleanName}! Your account has been registered.`
      );
      return { success: true, message: 'Account registered successfully!' };
    } catch (err: any) {
      console.warn('Registration error:', err);
      let errorMsg = 'Failed to register account.';
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'An account with this email already exists. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'Password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Please enter a valid email address.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Real Firebase Password Reset Email
  const sendPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        return { success: false, message: 'Please enter your email address.' };
      }
      await sendPasswordResetEmail(auth, cleanEmail);
      return { 
        success: true, 
        message: `Password reset email sent to ${cleanEmail}. Please check your inbox or spam folder.` 
      };
    } catch (err: any) {
      let errorMsg = 'Failed to send reset email.';
      if (err.code === 'auth/user-not-found') {
        errorMsg = 'No account found with this email.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Please enter a valid email address.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      return { success: false, message: errorMsg };
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    try {
      const updated = {
        ...data,
        updatedAt: new Date().toISOString()
      };
      const merged = { ...currentUser, ...updated };
      saveProfile(merged);

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, updated);
      } catch (e) {
        console.warn("Firestore user profile update note:", e);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const logout = async () => {
    try {
      if (userSnapshotUnsubRef.current) {
        userSnapshotUnsubRef.current();
        userSnapshotUnsubRef.current = null;
      }
      await firebaseSignOut(auth).catch(() => {});
      saveProfile(null);
      setLoading(false);
    } catch (err) {
      console.error("Logout error:", err);
      saveProfile(null);
      setLoading(false);
    }
  };

  const effectiveEmail = (currentUser?.email || firebaseUser?.email || '').trim().toLowerCase();
  const isRealAdmin = adminRoleService.isRealAdmin(effectiveEmail);
  const isAssigned = adminRoleService.isEmailAdmin(effectiveEmail);
  // Strict real-time backend RBAC check: only real super admin or actively assigned non-expired admins qualify
  const isAdmin = isRealAdmin || isAssigned;
  const isBlocked = currentUser?.status === 'blocked';

  return (
    <AuthContext.Provider value={{
      currentUser,
      firebaseUser,
      loading,
      isAdmin,
      isRealAdmin,
      isBlocked,
      signInWithGoogle,
      signInWithEmail,
      registerWithEmail,
      sendPasswordReset,
      updateUserProfile,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
