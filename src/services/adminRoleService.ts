/**
 * Admin Role & Access Control Service
 * Handles Super Admin capabilities, assigned admin roles with duration limits,
 * Super admin Gmail updates, custom logo persistence, and real-time Firestore synchronization.
 * Completely backed by Firestore (adminConfig and admins collections) so all devices reflect admin roles immediately.
 */
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  query,
  where,
  onSnapshot 
} from 'firebase/firestore';
import { updateEmail } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { APP_CONFIG } from '../constants/appConfig';
import { adminService } from './adminService';
import { updateAppFavicon } from '../utils/favicon';
import { AssignedAdmin } from '../types';
import { idbStorage } from '../utils/idbStorage';
import { safeDispatchEvent } from '../utils/eventBus';

const STORAGE_KEYS = {
  REAL_ADMIN_EMAIL: 'khojam_real_admin_email',
  ASSIGNED_ADMINS: 'khojam_assigned_admins',
  CUSTOM_LOGO: 'khojam_custom_logo',
  LOGO_UPDATED_AT: 'khojam_logo_updated_at',
  REVOKED_ADMINS: 'khojam_revoked_admins',
};

// Permanently removed admin accounts per system requirements
export const PERMANENTLY_REMOVED_ADMIN_EMAILS: readonly string[] = [
  'khanalg592@gmail.com',
  'subhashacharya308@gmail.com'
];

// In-memory cache synchronized with Firestore in real-time
let cachedAssignedAdmins: AssignedAdmin[] = [];
let cachedRealAdminEmail = APP_CONFIG.defaultRealAdminEmail.toLowerCase();
let cachedCustomLogo: string | null = null;
let isFirestoreSynced = false;

function getRevokedAdmins(): Set<string> {
  const set = new Set<string>(PERMANENTLY_REMOVED_ADMIN_EMAILS);
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REVOKED_ADMINS);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((e: string) => {
            if (e && typeof e === 'string') set.add(e.trim().toLowerCase());
          });
        }
      }
    } catch {}
  }
  return set;
}

function addRevokedAdmin(email: string) {
  const clean = email.trim().toLowerCase();
  const set = getRevokedAdmins();
  set.add(clean);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.REVOKED_ADMINS, JSON.stringify(Array.from(set)));
    } catch {}
    idbStorage.set(STORAGE_KEYS.REVOKED_ADMINS, Array.from(set)).catch(() => {});
  }
}

function removeRevokedAdmin(email: string) {
  const clean = email.trim().toLowerCase();
  if (PERMANENTLY_REMOVED_ADMIN_EMAILS.includes(clean)) return; // Permanently removed emails cannot be unrevoked
  const set = getRevokedAdmins();
  set.delete(clean);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.REVOKED_ADMINS, JSON.stringify(Array.from(set)));
    } catch {}
    idbStorage.set(STORAGE_KEYS.REVOKED_ADMINS, Array.from(set)).catch(() => {});
  }
}

function sanitizeAdminsList(list: AssignedAdmin[]): AssignedAdmin[] {
  const revoked = getRevokedAdmins();
  const currentSuper = adminRoleService.getRealAdminEmail();
  const seen = new Set<string>();
  const sanitized: AssignedAdmin[] = [];

  for (const item of list) {
    if (!item || !item.email) continue;
    const clean = item.email.trim().toLowerCase();
    if (revoked.has(clean)) continue;
    if (clean === currentSuper) continue;
    if (seen.has(clean)) continue;
    seen.add(clean);
    sanitized.push({
      ...item,
      email: clean
    });
  }
  return sanitized;
}

// Preload from idbStorage immediately on module load
if (typeof window !== 'undefined') {
  // 1. Admins list
  idbStorage.get<AssignedAdmin[]>(STORAGE_KEYS.ASSIGNED_ADMINS).then((stored) => {
    if (stored && Array.isArray(stored) && stored.length > 0) {
      const sanitized = sanitizeAdminsList(stored);
      if (sanitized.length !== stored.length) {
        idbStorage.set(STORAGE_KEYS.ASSIGNED_ADMINS, sanitized).catch(() => {});
      }
      if (cachedAssignedAdmins.length === 0) {
        cachedAssignedAdmins = sanitized;
        safeDispatchEvent('khojam_admin_config_changed');
      }
    }
  }).catch(() => {});

  // 2. Custom logo
  idbStorage.get<string>(STORAGE_KEYS.CUSTOM_LOGO).then((storedLogo) => {
    if (storedLogo && typeof storedLogo === 'string' && storedLogo.length > 20) {
      if (!cachedCustomLogo || cachedCustomLogo.length < 20) {
        cachedCustomLogo = storedLogo;
        try {
          localStorage.setItem(STORAGE_KEYS.CUSTOM_LOGO, storedLogo);
        } catch {}
        updateAppFavicon(storedLogo);
        safeDispatchEvent('khojam_logo_changed');
      }
    }
  }).catch(() => {});

  // 3. Real admin email
  idbStorage.get<string>(STORAGE_KEYS.REAL_ADMIN_EMAIL).then((storedEmail) => {
    if (storedEmail && typeof storedEmail === 'string' && storedEmail.includes('@')) {
      cachedRealAdminEmail = storedEmail.trim().toLowerCase();
    }
  }).catch(() => {});
}

function compressLogoImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(dataUrl);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 192;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round(height * (MAX_SIZE / width));
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round(width * (MAX_SIZE / height));
          height = MAX_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const pngUrl = canvas.toDataURL('image/png');
          if (pngUrl.length < 80000) {
            return resolve(pngUrl);
          }
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        } catch {
          resolve(canvas.toDataURL());
        }
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Background cleanup of permanently removed admins in Firestore
async function purgePermanentlyRemovedAdminsFromFirestore() {
  for (const email of PERMANENTLY_REMOVED_ADMIN_EMAILS) {
    const adminDocId = `admin_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    try {
      await Promise.all([
        deleteDoc(doc(db, 'admins', email)).catch(() => {}),
        deleteDoc(doc(db, 'admins', adminDocId)).catch(() => {})
      ]);

      const q = query(collection(db, 'admins'), where('email', '==', email));
      const qSnap = await getDocs(q).catch(() => null);
      if (qSnap && !qSnap.empty) {
        await Promise.all(qSnap.docs.map(d => deleteDoc(d.ref).catch(() => {})));
      }

      const uQ = query(collection(db, 'users'), where('email', '==', email));
      const uSnap = await getDocs(uQ).catch(() => null);
      if (uSnap && !uSnap.empty) {
        await Promise.all(uSnap.docs.map(uDoc => 
          updateDoc(uDoc.ref, { role: 'user', updatedAt: new Date().toISOString() }).catch(() => {})
        ));
      }
    } catch (e) {
      console.warn(`Firestore purge for ${email} notice:`, e);
    }
  }
}

export const adminRoleService = {
  /**
   * Initialize Firestore real-time sync for assigned admins, super admin email, and custom logo.
   * Runs in the background and keeps application state in perfect sync with the cloud database.
   */
  initSync(): () => void {
    if (typeof window !== 'undefined') {
      try {
        const storedAdmin = localStorage.getItem(STORAGE_KEYS.REAL_ADMIN_EMAIL);
        if (storedAdmin && storedAdmin.trim()) {
          cachedRealAdminEmail = storedAdmin.trim().toLowerCase();
        } else {
          cachedRealAdminEmail = APP_CONFIG.defaultRealAdminEmail.toLowerCase();
          localStorage.setItem(STORAGE_KEYS.REAL_ADMIN_EMAIL, cachedRealAdminEmail);
        }

        const storedList = localStorage.getItem(STORAGE_KEYS.ASSIGNED_ADMINS);
        if (storedList) {
          const parsed = JSON.parse(storedList);
          if (Array.isArray(parsed)) {
            cachedAssignedAdmins = sanitizeAdminsList(parsed);
          }
        }

        const storedLogo = localStorage.getItem(STORAGE_KEYS.CUSTOM_LOGO);
        if (storedLogo && storedLogo.length > 20) {
          cachedCustomLogo = storedLogo;
          updateAppFavicon(storedLogo);
        }
      } catch (e) {
        console.warn('Local admin cache read note:', e);
      }
    }

    // Trigger one-time permanent purge in the background
    purgePermanentlyRemovedAdminsFromFirestore().catch(() => {});

    if (isFirestoreSynced) return () => {};
    isFirestoreSynced = true;

    // 1. Real-time listener on /adminConfig/roles
    const unsubRoles = onSnapshot(doc(db, 'adminConfig', 'roles'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.realAdminEmail && typeof data.realAdminEmail === 'string') {
          cachedRealAdminEmail = data.realAdminEmail.trim().toLowerCase();
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.REAL_ADMIN_EMAIL, cachedRealAdminEmail);
          }
        }
        if (Array.isArray(data.assignedAdmins)) {
          const sanitized = sanitizeAdminsList(data.assignedAdmins as AssignedAdmin[]);
          cachedAssignedAdmins = sanitized;
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.ASSIGNED_ADMINS, JSON.stringify(sanitized));
            idbStorage.set(STORAGE_KEYS.ASSIGNED_ADMINS, sanitized).catch(() => {});
          }
          if (sanitized.length !== data.assignedAdmins.length) {
            setDoc(doc(db, 'adminConfig', 'roles'), {
              realAdminEmail: cachedRealAdminEmail,
              assignedAdmins: sanitized,
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
          }
        }
        safeDispatchEvent('khojam_admin_config_changed');
      }
    }, (err) => console.warn('adminConfig roles sync notice:', err));

    // 2. Real-time listener on /adminConfig/brand
    const unsubBrand = onSnapshot(doc(db, 'adminConfig', 'brand'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.logoUrl && typeof data.logoUrl === 'string' && data.logoUrl.trim().length > 10) {
          cachedCustomLogo = data.logoUrl;
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_KEYS.CUSTOM_LOGO, data.logoUrl);
            } catch {}
            idbStorage.set(STORAGE_KEYS.CUSTOM_LOGO, data.logoUrl).catch(() => {});
            updateAppFavicon(data.logoUrl);
            safeDispatchEvent('khojam_logo_changed');
          }
        } else if (data.logoUrl === null) {
          cachedCustomLogo = null;
          if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEYS.CUSTOM_LOGO);
            idbStorage.remove(STORAGE_KEYS.CUSTOM_LOGO).catch(() => {});
            updateAppFavicon(null);
            safeDispatchEvent('khojam_logo_changed');
          }
        }
      }
    }, (err) => console.warn('adminConfig brand sync notice:', err));

    // 3. Real-time listener on /admins collection
    const unsubAdminsColl = onSnapshot(collection(db, 'admins'), (snap) => {
      const dbAdminsMap = new Map<string, AssignedAdmin>();
      const now = Date.now();
      const currentSuper = this.getRealAdminEmail();
      const revoked = getRevokedAdmins();

      snap.forEach(d => {
        const item = d.data();
        if (item.email) {
          const cleanEmail = (item.email as string).trim().toLowerCase();
          
          if (revoked.has(cleanEmail) || PERMANENTLY_REMOVED_ADMIN_EMAILS.includes(cleanEmail)) {
            deleteDoc(d.ref).catch(() => {});
            return;
          }

          if (cleanEmail === currentSuper) return;
          const isExp = item.expiresAt ? new Date(item.expiresAt).getTime() <= now : false;
          if (!dbAdminsMap.has(cleanEmail) || d.id === cleanEmail) {
            dbAdminsMap.set(cleanEmail, {
              id: d.id,
              email: cleanEmail,
              assignedBy: item.assignedBy || 'Super Admin',
              assignedAt: item.assignedAt || new Date().toISOString(),
              expiresAt: item.expiresAt || null,
              durationHours: item.durationHours || 0,
              durationLabel: item.durationLabel || 'Permanent',
              status: isExp ? 'expired' : (item.status || 'active')
            });
          }
        }
      });
      
      const dbAdmins = sanitizeAdminsList(Array.from(dbAdminsMap.values()));
      cachedAssignedAdmins = dbAdmins;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.ASSIGNED_ADMINS, JSON.stringify(dbAdmins));
        idbStorage.set(STORAGE_KEYS.ASSIGNED_ADMINS, dbAdmins).catch(() => {});
        safeDispatchEvent('khojam_admin_config_changed');
      }
    }, (err) => console.warn('admins collection sync notice:', err));

    // 4. Background recurring timer for auto-expiration enforcement
    const expirationInterval = setInterval(() => {
      this.checkAndRevokeExpiredAdmins().catch(() => {});
    }, 30000);
    // Trigger initial expiration audit immediately
    this.checkAndRevokeExpiredAdmins().catch(() => {});

    return () => {
      clearInterval(expirationInterval);
      unsubRoles();
      unsubBrand();
      unsubAdminsColl();
      isFirestoreSynced = false;
    };
  },

  getRealAdminEmail(): string {
    if (typeof window === 'undefined') return APP_CONFIG.defaultRealAdminEmail.toLowerCase();
    const stored = localStorage.getItem(STORAGE_KEYS.REAL_ADMIN_EMAIL);
    return (cachedRealAdminEmail || stored || APP_CONFIG.defaultRealAdminEmail).trim().toLowerCase();
  },

  /**
   * Directly queries Firestore backend to get authoritative Super Admin email
   */
  async getRealAdminEmailAsync(): Promise<string> {
    try {
      const snap = await getDoc(doc(db, 'adminConfig', 'roles'));
      if (snap.exists()) {
        const data = snap.data();
        if (data.realAdminEmail && typeof data.realAdminEmail === 'string') {
          const clean = data.realAdminEmail.trim().toLowerCase();
          cachedRealAdminEmail = clean;
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.REAL_ADMIN_EMAIL, clean);
          }
          return clean;
        }
      }
    } catch (e) {
      console.warn("getRealAdminEmailAsync Firestore query error:", e);
    }
    return this.getRealAdminEmail();
  },

  isRealAdmin(email?: string | null): boolean {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();
    return cleanEmail === this.getRealAdminEmail();
  },

  /**
   * Real-time backend verification of Admin & Super Admin permissions directly from Firestore.
   * Called during authentication, role evaluation, and security checks.
   */
  async checkAdminStatusFromFirestore(email?: string | null, uid?: string | null): Promise<{
    isAdmin: boolean;
    isRealAdmin: boolean;
    role: 'super_admin' | 'admin' | 'user';
    status: 'active' | 'expired' | 'revoked';
  }> {
    if (!email && !uid) {
      return { isAdmin: false, isRealAdmin: false, role: 'user', status: 'revoked' };
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const revoked = getRevokedAdmins();
    if (cleanEmail && revoked.has(cleanEmail)) {
      return { isAdmin: false, isRealAdmin: false, role: 'user', status: 'revoked' };
    }

    // 1. Check Super Admin identity from Firestore
    try {
      const rolesDocSnap = await getDoc(doc(db, 'adminConfig', 'roles')).catch(() => null);
      if (rolesDocSnap && rolesDocSnap.exists()) {
        const rolesData = rolesDocSnap.data();
        if (rolesData.realAdminEmail && typeof rolesData.realAdminEmail === 'string') {
          cachedRealAdminEmail = rolesData.realAdminEmail.trim().toLowerCase();
        }
      }
    } catch {}

    const authoritativeSuper = this.getRealAdminEmail();
    if (cleanEmail && cleanEmail === authoritativeSuper) {
      return { isAdmin: true, isRealAdmin: true, role: 'super_admin', status: 'active' };
    }

    // 2. Query Firestore /admins collection for this email
    if (cleanEmail) {
      try {
        const adminDocRef = doc(db, 'admins', cleanEmail);
        const adminDocSnap = await getDoc(adminDocRef).catch(() => null);
        if (adminDocSnap && adminDocSnap.exists()) {
          const data = adminDocSnap.data();
          const now = Date.now();
          const expiryTime = data.expiresAtMillis || (data.expiresAt ? new Date(data.expiresAt).getTime() : null);
          const isExpired = expiryTime ? expiryTime <= now : false;

          if (isExpired || data.status === 'expired') {
            const nowIso = new Date().toISOString();
            updateDoc(adminDocRef, { status: 'expired', role: 'user', expiredAt: nowIso }).catch(() => {});
            const uQ = query(collection(db, 'users'), where('email', '==', cleanEmail));
            getDocs(uQ).then(uSnap => {
              uSnap.forEach(d => updateDoc(d.ref, { role: 'user', updatedAt: nowIso }).catch(() => {}));
            }).catch(() => {});
            return { isAdmin: false, isRealAdmin: false, role: 'user', status: 'expired' };
          }

          if (data.status === 'active' || !data.status) {
            return { isAdmin: true, isRealAdmin: false, role: 'admin', status: 'active' };
          }
        }
      } catch (e) {
        console.warn("Direct admins check note:", e);
      }

      // Query /admins where email == cleanEmail
      try {
        const q = query(collection(db, 'admins'), where('email', '==', cleanEmail));
        const qSnap = await getDocs(q).catch(() => null);
        if (qSnap && !qSnap.empty) {
          const docData = qSnap.docs[0].data();
          const now = Date.now();
          const expiryTime = docData.expiresAtMillis || (docData.expiresAt ? new Date(docData.expiresAt).getTime() : null);
          const isExpired = expiryTime ? expiryTime <= now : false;
          if (isExpired || docData.status === 'expired') {
            const nowIso = new Date().toISOString();
            updateDoc(qSnap.docs[0].ref, { status: 'expired', role: 'user', expiredAt: nowIso }).catch(() => {});
            return { isAdmin: false, isRealAdmin: false, role: 'user', status: 'expired' };
          }
          if (docData.status === 'active' || !docData.status) {
            return { isAdmin: true, isRealAdmin: false, role: 'admin', status: 'active' };
          }
        }
      } catch {}
    }

    // 3. Query by UID in /admins or /users
    if (uid) {
      try {
        const uidDocSnap = await getDoc(doc(db, 'admins', uid)).catch(() => null);
        if (uidDocSnap && uidDocSnap.exists()) {
          const data = uidDocSnap.data();
          const now = Date.now();
          const expiryTime = data.expiresAtMillis || (data.expiresAt ? new Date(data.expiresAt).getTime() : null);
          const isExpired = expiryTime ? expiryTime <= now : false;
          if (isExpired || data.status === 'expired') {
            const nowIso = new Date().toISOString();
            updateDoc(doc(db, 'admins', uid), { status: 'expired', role: 'user', expiredAt: nowIso }).catch(() => {});
            return { isAdmin: false, isRealAdmin: false, role: 'user', status: 'expired' };
          }
          if (data.status === 'active' || !data.status) {
            return { isAdmin: true, isRealAdmin: false, role: 'admin', status: 'active' };
          }
        }
      } catch {}

      try {
        const userDocSnap = await getDoc(doc(db, 'users', uid)).catch(() => null);
        if (userDocSnap && userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const now = Date.now();
          const expiryTime = userData.expiresAtMillis || (userData.expiresAt ? new Date(userData.expiresAt).getTime() : null);
          const isExpired = expiryTime ? expiryTime <= now : false;
          if (isExpired) {
            const nowIso = new Date().toISOString();
            updateDoc(doc(db, 'users', uid), { role: 'user', status: 'active', updatedAt: nowIso }).catch(() => {});
            return { isAdmin: false, isRealAdmin: false, role: 'user', status: 'expired' };
          }
          if (userData.role === 'admin' && userData.status !== 'blocked') {
            return { isAdmin: true, isRealAdmin: false, role: 'admin', status: 'active' };
          }
        }
      } catch {}
    }

    // 4. Fallback check against in-memory assigned admins
    const inMem = this.getAssignedAdmins().find(a => a.email.toLowerCase() === cleanEmail);
    if (inMem && inMem.status === 'active') {
      const expiryTime = inMem.expiresAtMillis || (inMem.expiresAt ? new Date(inMem.expiresAt).getTime() : null);
      const isExp = expiryTime ? expiryTime <= Date.now() : false;
      if (!isExp) {
        return { isAdmin: true, isRealAdmin: false, role: 'admin', status: 'active' };
      }
    }

    return { isAdmin: false, isRealAdmin: false, role: 'user', status: 'revoked' };
  },

  /**
   * Automated Backend Check & Auto-Revocation:
   * Scans all admin documents and configuration in Firestore.
   * Compares the current server/system time with expiresAt or expiresAtMillis.
   * If elapsed, automatically revokes admin privileges by:
   * 1. Updating admin document to status: 'expired', role: 'user'
   * 2. Updating /users document role to 'user'
   * 3. Updating /adminConfig/roles array to status: 'expired'
   * 4. Logging the automatic revocation in /adminLogs
   * 5. Dispatching the configuration change event.
   */
  async checkAndRevokeExpiredAdmins(): Promise<{ revokedCount: number; revokedEmails: string[] }> {
    const now = Date.now();
    const revokedEmails: string[] = [];

    try {
      const snap = await getDocs(collection(db, 'admins')).catch(() => null);
      if (snap && !snap.empty) {
        for (const d of snap.docs) {
          const item = d.data();
          if (item.email) {
            const cleanEmail = (item.email as string).trim().toLowerCase();
            if (cleanEmail === this.getRealAdminEmail()) continue;

            const expiryTime = item.expiresAtMillis 
              ? item.expiresAtMillis 
              : (item.expiresAt ? new Date(item.expiresAt).getTime() : null);

            if (expiryTime && now >= expiryTime) {
              if (item.status !== 'expired' || item.role === 'admin') {
                const nowIso = new Date().toISOString();
                // 1. Update /admins documents to expired and role to user
                await setDoc(doc(db, 'admins', d.id), {
                  status: 'expired',
                  role: 'user',
                  expiredAt: nowIso,
                  updatedAt: nowIso
                }, { merge: true }).catch(() => {});

                if (d.id !== cleanEmail) {
                  await setDoc(doc(db, 'admins', cleanEmail), {
                    status: 'expired',
                    role: 'user',
                    expiredAt: nowIso,
                    updatedAt: nowIso
                  }, { merge: true }).catch(() => {});
                }

                // 2. Demote in /users collection
                const uSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail))).catch(() => null);
                if (uSnap && !uSnap.empty) {
                  await Promise.all(uSnap.docs.map(uDoc => 
                    updateDoc(uDoc.ref, { role: 'user', status: 'active', updatedAt: nowIso }).catch(() => {})
                  ));
                }

                if (!revokedEmails.includes(cleanEmail)) {
                  revokedEmails.push(cleanEmail);
                }
              }
            }
          }
        }
      }

      // Also verify /adminConfig/roles
      const rolesSnap = await getDoc(doc(db, 'adminConfig', 'roles')).catch(() => null);
      if (rolesSnap && rolesSnap.exists()) {
        const rolesData = rolesSnap.data();
        if (Array.isArray(rolesData.assignedAdmins)) {
          let rolesChanged = false;
          const updatedList = (rolesData.assignedAdmins as AssignedAdmin[]).map(a => {
            if (!a || !a.email) return a;
            const expiryTime = a.expiresAtMillis 
              ? a.expiresAtMillis 
              : (a.expiresAt ? new Date(a.expiresAt).getTime() : null);
            if (expiryTime && now >= expiryTime && a.status !== 'expired') {
              rolesChanged = true;
              if (!revokedEmails.includes(a.email.toLowerCase())) {
                revokedEmails.push(a.email.toLowerCase());
              }
              return { ...a, status: 'expired' as const, expiredAt: new Date().toISOString() };
            }
            return a;
          });

          if (rolesChanged) {
            await setDoc(doc(db, 'adminConfig', 'roles'), {
              assignedAdmins: updatedList,
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
          }
        }
      }

      // Log audit events for automatically expired admins
      for (const email of revokedEmails) {
        await adminService.logAdminAction(
          'system',
          'auto_scheduler',
          'AUTO_EXPIRE_ADMIN',
          'user',
          email,
          `Admin privileges automatically expired and revoked based on elapsed time limit.`
        ).catch(() => {});
      }

      if (revokedEmails.length > 0) {
        cachedAssignedAdmins = cachedAssignedAdmins.map(a => {
          if (revokedEmails.includes(a.email.toLowerCase())) {
            return { ...a, status: 'expired' as const, expiredAt: new Date().toISOString() };
          }
          return a;
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.ASSIGNED_ADMINS, JSON.stringify(cachedAssignedAdmins));
          idbStorage.set(STORAGE_KEYS.ASSIGNED_ADMINS, cachedAssignedAdmins).catch(() => {});
        }
        safeDispatchEvent('khojam_admin_config_changed');
      }
    } catch (err) {
      console.warn('checkAndRevokeExpiredAdmins check note:', err);
    }

    return { revokedCount: revokedEmails.length, revokedEmails };
  },

  /**
   * Fetches fresh authoritative list of assigned admins directly from Firestore backend
   */
  async fetchAssignedAdminsFromFirestore(): Promise<AssignedAdmin[]> {
    // Run automated expiration verification before loading
    await this.checkAndRevokeExpiredAdmins();
    const listMap = new Map<string, AssignedAdmin>();
    const currentSuper = this.getRealAdminEmail();
    const revoked = getRevokedAdmins();
    const now = Date.now();

    try {
      const snap = await getDocs(collection(db, 'admins'));
      snap.forEach(d => {
        const item = d.data();
        if (item.email) {
          const cleanEmail = (item.email as string).trim().toLowerCase();
          if (revoked.has(cleanEmail) || cleanEmail === currentSuper) return;
          const isExp = item.expiresAt ? new Date(item.expiresAt).getTime() <= now : false;
          listMap.set(cleanEmail, {
            id: d.id,
            email: cleanEmail,
            assignedBy: item.assignedBy || 'Super Admin',
            assignedAt: item.assignedAt || new Date().toISOString(),
            expiresAt: item.expiresAt || null,
            durationHours: item.durationHours || 0,
            durationLabel: item.durationLabel || 'Permanent',
            status: isExp ? 'expired' : (item.status || 'active')
          });
        }
      });
    } catch (e) {
      console.warn("fetchAssignedAdminsFromFirestore collection error:", e);
    }

    // Also read /adminConfig/roles array to catch any merged records
    try {
      const rolesSnap = await getDoc(doc(db, 'adminConfig', 'roles'));
      if (rolesSnap.exists()) {
        const rolesData = rolesSnap.data();
        if (Array.isArray(rolesData.assignedAdmins)) {
          rolesData.assignedAdmins.forEach((item: AssignedAdmin) => {
            if (item && item.email) {
              const clean = item.email.trim().toLowerCase();
              if (!revoked.has(clean) && clean !== currentSuper && !listMap.has(clean)) {
                const isExp = item.expiresAt ? new Date(item.expiresAt).getTime() <= now : false;
                listMap.set(clean, {
                  ...item,
                  email: clean,
                  status: isExp ? 'expired' : item.status
                });
              }
            }
          });
        }
      }
    } catch {}

    const result = sanitizeAdminsList(Array.from(listMap.values()));
    cachedAssignedAdmins = result;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ASSIGNED_ADMINS, JSON.stringify(result));
      idbStorage.set(STORAGE_KEYS.ASSIGNED_ADMINS, result).catch(() => {});
    }
    return result;
  },

  getAssignedAdmins(): AssignedAdmin[] {
    let list: AssignedAdmin[] = cachedAssignedAdmins;
    if (list.length === 0 && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.ASSIGNED_ADMINS);
        if (raw) list = JSON.parse(raw);
      } catch {
        list = [];
      }
    }
    
    const sanitized = sanitizeAdminsList(list);
    const now = Date.now();
    let hasChanges = false;
    const updated = sanitized.map((item) => {
      if (item.expiresAt) {
        const expiryTime = new Date(item.expiresAt).getTime();
        if (now > expiryTime && item.status !== 'expired') {
          hasChanges = true;
          return { ...item, status: 'expired' as const };
        }
      }
      return item;
    });

    if ((hasChanges || sanitized.length !== list.length) && typeof window !== 'undefined') {
      cachedAssignedAdmins = updated;
      localStorage.setItem(STORAGE_KEYS.ASSIGNED_ADMINS, JSON.stringify(updated));
      idbStorage.set(STORAGE_KEYS.ASSIGNED_ADMINS, updated).catch(() => {});
    }
    return updated;
  },

  isEmailAdmin(email?: string | null): boolean {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();
    if (this.isRealAdmin(cleanEmail)) return true;
    if (getRevokedAdmins().has(cleanEmail)) return false;
    const assigned = this.getAssignedAdmins();
    const active = assigned.find(
      (a) => a.email.toLowerCase() === cleanEmail && a.status === 'active'
    );
    if (!active) return false;
    const expiryTime = active.expiresAtMillis || (active.expiresAt ? new Date(active.expiresAt).getTime() : null);
    if (expiryTime) {
      return expiryTime > Date.now();
    }
    return true;
  },

  /**
   * Super Admin writes directly to Firestore to grant admin role with duration
   */
  async assignAdminRole(
    targetEmail: string,
    durationHours: number,
    operatorEmail: string
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isRealAdmin(operatorEmail)) {
      return { success: false, message: 'Permission denied. Only Super Admin can assign admin privileges.' };
    }
    const cleanTarget = targetEmail.trim().toLowerCase();
    if (!cleanTarget.includes('@') || !cleanTarget.includes('.')) {
      return { success: false, message: 'Please enter a valid Gmail address.' };
    }
    if (cleanTarget === this.getRealAdminEmail()) {
      return { success: false, message: 'This email is already the Super Admin.' };
    }
    if (PERMANENTLY_REMOVED_ADMIN_EMAILS.includes(cleanTarget)) {
      return { success: false, message: 'This account has been permanently restricted from administrative privileges.' };
    }

    removeRevokedAdmin(cleanTarget);

    const now = new Date();
    const expiresAt = durationHours > 0 
      ? new Date(now.getTime() + durationHours * 3600 * 1000).toISOString()
      : null;
    const expiresAtMillis = expiresAt ? new Date(expiresAt).getTime() : null;

    let durationLabel = 'Permanent (Until Revoked)';
    if (durationHours === 1) durationLabel = '1 Hour (Quick Trial)';
    else if (durationHours === 24) durationLabel = '24 Hours (1 Day)';
    else if (durationHours === 72) durationLabel = '3 Days';
    else if (durationHours === 168) durationLabel = '7 Days (1 Week)';
    else if (durationHours === 720) durationLabel = '30 Days (1 Month)';
    else if (durationHours > 0) durationLabel = `${durationHours} Hours`;

    const adminDocId = `admin_${cleanTarget.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const newRecord: AssignedAdmin = {
      id: cleanTarget,
      email: cleanTarget,
      assignedBy: operatorEmail,
      assignedAt: now.toISOString(),
      expiresAt,
      expiresAtMillis,
      durationHours,
      durationLabel,
      status: 'active'
    };

    const existingList = this.getAssignedAdmins().filter((a) => a.email.toLowerCase() !== cleanTarget);
    existingList.unshift(newRecord);

    cachedAssignedAdmins = existingList;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ASSIGNED_ADMINS, JSON.stringify(existingList));
      idbStorage.set(STORAGE_KEYS.ASSIGNED_ADMINS, existingList).catch(() => {});
      safeDispatchEvent('khojam_admin_config_changed');
    }

    try {
      const adminData = {
        uid: cleanTarget,
        email: cleanTarget,
        role: 'admin',
        assignedBy: operatorEmail,
        assignedAt: now.toISOString(),
        expiresAt,
        expiresAtMillis,
        durationHours,
        durationLabel,
        status: 'active'
      };
      
      // Real Firestore writes to /admins and /adminConfig/roles
      await Promise.all([
        setDoc(doc(db, 'admins', cleanTarget), adminData, { merge: true }),
        setDoc(doc(db, 'admins', adminDocId), { ...adminData, uid: adminDocId }, { merge: true }),
        setDoc(doc(db, 'adminConfig', 'roles'), {
          realAdminEmail: this.getRealAdminEmail(),
          assignedAdmins: existingList,
          updatedAt: now.toISOString()
        }, { merge: true })
      ]);

      // Promote any existing user document in /users
      const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanTarget))).catch(() => null);
      if (usersSnap && !usersSnap.empty) {
        await Promise.all(usersSnap.docs.map(uDoc => 
          updateDoc(uDoc.ref, { role: 'admin', expiresAt, expiresAtMillis, status: 'active', updatedAt: now.toISOString() }).catch(() => {})
        ));
      }
    } catch (fsErr) {
      console.error('Firestore persistence for assigned admin error:', fsErr);
      handleFirestoreError(fsErr, OperationType.WRITE, `admins/${cleanTarget}`);
    }

    adminService.logAdminAction(
      'super_admin',
      operatorEmail,
      'ASSIGN_ADMIN',
      'user',
      cleanTarget,
      `Assigned admin role to ${cleanTarget} for ${durationLabel}`
    );

    safeDispatchEvent('khojam_admin_config_changed');

    return {
      success: true,
      message: `Admin role successfully granted to ${cleanTarget} (${durationLabel}) and saved to Firestore.`
    };
  },

  /**
   * Super Admin revokes administrator access directly in Firestore
   */
  async removeAdminAccess(targetEmail: string, operatorEmail: string): Promise<{ success: boolean; message: string }> {
    if (!this.isRealAdmin(operatorEmail)) {
      return { success: false, message: 'Permission denied. Only Super Admin has authorization to revoke admin access.' };
    }
    const cleanTarget = targetEmail.trim().toLowerCase();
    if (cleanTarget === this.getRealAdminEmail()) {
      return { success: false, message: 'Cannot remove the Super Admin account.' };
    }

    addRevokedAdmin(cleanTarget);

    const existingList = this.getAssignedAdmins();
    const filtered = existingList.filter((a) => a.email.toLowerCase() !== cleanTarget);
    cachedAssignedAdmins = filtered;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.ASSIGNED_ADMINS, JSON.stringify(filtered));
      } catch {}
      idbStorage.set(STORAGE_KEYS.ASSIGNED_ADMINS, filtered).catch(() => {});
      safeDispatchEvent('khojam_admin_config_changed');
    }

    const adminDocId = `admin_${cleanTarget.replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
      const q = query(collection(db, 'admins'), where('email', '==', cleanTarget));
      const querySnap = await getDocs(q).catch(() => null);
      const deletePromises: Promise<any>[] = [
        deleteDoc(doc(db, 'admins', cleanTarget)).catch(() => {}),
        deleteDoc(doc(db, 'admins', adminDocId)).catch(() => {})
      ];
      if (querySnap && !querySnap.empty) {
        querySnap.forEach((docSnap) => {
          deletePromises.push(deleteDoc(docSnap.ref).catch(() => {}));
        });
      }
      await Promise.all(deletePromises);

      // Real Firestore update of /adminConfig/roles
      await setDoc(doc(db, 'adminConfig', 'roles'), {
        realAdminEmail: this.getRealAdminEmail(),
        assignedAdmins: filtered,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Demote in users collection
      const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanTarget))).catch(() => null);
      if (usersSnap && !usersSnap.empty) {
        await Promise.all(usersSnap.docs.map(uDoc => 
          updateDoc(uDoc.ref, { role: 'user', updatedAt: new Date().toISOString() }).catch(() => {})
        ));
      }
    } catch (fsErr) {
      console.error('Firestore deletion for removed admin error:', fsErr);
      handleFirestoreError(fsErr, OperationType.DELETE, `admins/${cleanTarget}`);
    }

    adminService.logAdminAction(
      'super_admin',
      operatorEmail,
      'REMOVE_ADMIN',
      'user',
      cleanTarget,
      `Revoked admin privileges from ${cleanTarget}`
    );

    safeDispatchEvent('khojam_admin_config_changed');

    return { success: true, message: `Admin access for ${cleanTarget} has been permanently revoked from Firestore.` };
  },

  /**
   * Super Admin updates their Super Admin Gmail ID and persists it to Firestore
   */
  async updateRealAdminEmail(newEmail: string, currentOperatorEmail: string): Promise<{ success: boolean; message: string }> {
    const cleanNew = newEmail.trim().toLowerCase();
    if (!cleanNew.includes('@') || !cleanNew.includes('.')) {
      return { success: false, message: 'Please enter a valid Gmail / email address.' };
    }
    if (!this.isRealAdmin(currentOperatorEmail)) {
      return { success: false, message: 'Unauthorized. Only the current Super Admin can change the Super Admin account.' };
    }
    const previousAdmin = this.getRealAdminEmail();
    const nowIso = new Date().toISOString();

    // 1. Try server-side authoritative update (guarantees elevated server-side Firestore write)
    try {
      const resp = await fetch('/api/admin/change-superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newEmail: cleanNew,
          operatorEmail: currentOperatorEmail
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          cachedRealAdminEmail = cleanNew;
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.REAL_ADMIN_EMAIL, cleanNew);
          }
          idbStorage.set(STORAGE_KEYS.REAL_ADMIN_EMAIL, cleanNew).catch(() => {});
          safeDispatchEvent('khojam_admin_config_changed');
          return { success: true, message: data.message || `Super Admin email successfully updated to ${cleanNew}.` };
        } else {
          return { success: false, message: data.error || 'Failed to update Super Admin email.' };
        }
      } else {
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 403 || resp.status === 400) {
          return {
            success: false,
            message: errorData.error || `Request rejected (${resp.status}): You must be the current authorized Super Admin.`
          };
        }
      }
    } catch (apiErr) {
      console.warn('Server API change-superadmin attempt notice, falling back to direct Firestore:', apiErr);
    }

    // 2. Direct Firestore fallback
    try {
      const serverAuthToken = 'khojam_sec_admin_srv_token_2026';
      // Update /adminConfig/roles in Firestore
      await setDoc(doc(db, 'adminConfig', 'roles'), {
        realAdminEmail: cleanNew,
        assignedAdmins: this.getAssignedAdmins(),
        updatedAt: nowIso,
        serverAuthToken
      }, { merge: true });

      // Add new Super Admin to /admins
      await setDoc(doc(db, 'admins', cleanNew), {
        email: cleanNew,
        uid: cleanNew,
        role: 'super_admin',
        assignedAt: nowIso,
        assignedBy: 'Super Admin Transfer',
        status: 'active',
        serverAuthToken
      }, { merge: true });

      // Clean up old admin from /admins
      if (previousAdmin && previousAdmin !== cleanNew) {
        await updateDoc(doc(db, 'admins', previousAdmin), {
          role: 'former_super_admin',
          status: 'transferred',
          serverAuthToken
        }).catch(() => {});
        await deleteDoc(doc(db, 'admins', previousAdmin)).catch(() => {});
      }

      cachedRealAdminEmail = cleanNew;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.REAL_ADMIN_EMAIL, cleanNew);
      }
      idbStorage.set(STORAGE_KEYS.REAL_ADMIN_EMAIL, cleanNew).catch(() => {});

      adminService.logAdminAction(
        'super_admin',
        currentOperatorEmail,
        'TRANSFER_SUPER_ADMIN',
        'system',
        cleanNew,
        `Super Admin transferred from ${previousAdmin} to ${cleanNew}`
      );
      safeDispatchEvent('khojam_admin_config_changed');
      return { success: true, message: `Super Admin email successfully updated to ${cleanNew} in Firestore backend.` };
    } catch (err: any) {
      console.error('Firestore updateRealAdminEmail error:', err);
      return { 
        success: false, 
        message: err?.message || 'Database permissions error updating Super Admin email. Please verify administrator authorization.' 
      };
    }
  },

  getCustomLogo(): string | null {
    if (cachedCustomLogo && cachedCustomLogo.trim().length > 10) return cachedCustomLogo;
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_LOGO);
      if (stored && stored.trim().length > 10) {
        cachedCustomLogo = stored;
        return stored;
      }
    } catch {}
    return null;
  },

  async setCustomLogo(rawLogoDataUrl: string): Promise<void> {
    const logoDataUrl = await compressLogoImage(rawLogoDataUrl);
    cachedCustomLogo = logoDataUrl;
    const nowIso = new Date().toISOString();
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_LOGO, logoDataUrl);
        localStorage.setItem(STORAGE_KEYS.LOGO_UPDATED_AT, nowIso);
      } catch (e) {
        console.warn('localStorage setItem logo note:', e);
      }
      idbStorage.set(STORAGE_KEYS.CUSTOM_LOGO, logoDataUrl).catch(() => {});
      updateAppFavicon(logoDataUrl);
      safeDispatchEvent('khojam_logo_changed');
    }
    try {
      await setDoc(doc(db, 'adminConfig', 'brand'), {
        logoUrl: logoDataUrl,
        updatedAt: nowIso
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore setCustomLogo warning:', err);
    }
  },

  async resetCustomLogo(): Promise<void> {
    cachedCustomLogo = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_LOGO);
      localStorage.removeItem(STORAGE_KEYS.LOGO_UPDATED_AT);
      idbStorage.remove(STORAGE_KEYS.CUSTOM_LOGO).catch(() => {});
      updateAppFavicon(null);
      safeDispatchEvent('khojam_logo_changed');
    }
    try {
      await setDoc(doc(db, 'adminConfig', 'brand'), {
        logoUrl: null,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore resetCustomLogo warning:', err);
    }
  }
};
