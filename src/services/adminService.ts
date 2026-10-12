/**
 * Admin Service
 * System management, user moderation, listing control, and audit logs.
 */
import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query,
  limit,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AdminLog, UserProfile } from '../types';

const LOCAL_USERS_KEY = 'khojam_all_users_cache';

export const adminService = {
  /**
   * Log an administrative action to adminLogs collection
   */
  async logAdminAction(adminUid: string, adminEmail: string, action: string, targetType: 'user' | 'room' | 'system', targetId: string, details: string) {
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const logEntry: AdminLog = {
        id: logId,
        adminUid,
        adminEmail,
        action,
        targetType,
        targetId,
        details,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'adminLogs', logId), logEntry);
    } catch (err) {
      console.warn("Audit logging warning:", err);
    }
  },

  /**
   * Fetch all registered users from Firestore
   */
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const fsUsers = snap.docs.map(d => {
        const data = d.data() as UserProfile;
        return {
          ...data,
          uid: data.uid || d.id
        };
      });
      return fsUsers;
    } catch (err) {
      console.warn("Firestore getAllUsers error:", err);
      return [];
    }
  },

  /**
   * Block a user and deactivate all their listings
   */
  async blockUser(adminUid: string, adminEmail: string, targetUid: string, reason?: string): Promise<void> {
    const now = new Date().toISOString();

    try {
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, {
        status: 'blocked',
        updatedAt: now
      });

      // Also deactivate all listings owned by this user
      const roomsQuery = query(collection(db, 'rooms'), where('ownerId', '==', targetUid));
      const roomsSnap = await getDocs(roomsQuery);
      for (const rDoc of roomsSnap.docs) {
        await updateDoc(doc(db, 'rooms', rDoc.id), {
          status: 'unavailable',
          updatedAt: now
        });
      }

      await this.logAdminAction(
        adminUid, 
        adminEmail, 
        'BLOCK_USER', 
        'user', 
        targetUid, 
        `User blocked. ${roomsSnap.size} listings marked unavailable. Reason: ${reason || 'Admin action'}`
      );
    } catch (err) {
      console.warn("Firestore blockUser error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  },

  /**
   * Unblock a user
   */
  async unblockUser(adminUid: string, adminEmail: string, targetUid: string): Promise<void> {
    const now = new Date().toISOString();

    try {
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, {
        status: 'active',
        updatedAt: now
      });

      await this.logAdminAction(
        adminUid, 
        adminEmail, 
        'UNBLOCK_USER', 
        'user', 
        targetUid, 
        'User account unblocked and restored to active state.'
      );
    } catch (err) {
      console.warn("Firestore unblockUser error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  },

  /**
   * Delete a user profile permanently
   */
  async deleteUser(adminUid: string, adminEmail: string, targetUid: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', targetUid));
      
      // Also delete their rooms
      const roomsQuery = query(collection(db, 'rooms'), where('ownerId', '==', targetUid));
      const roomsSnap = await getDocs(roomsQuery);
      for (const rDoc of roomsSnap.docs) {
        await deleteDoc(doc(db, 'rooms', rDoc.id));
      }

      await this.logAdminAction(
        adminUid, 
        adminEmail, 
        'DELETE_USER', 
        'user', 
        targetUid, 
        `User account and ${roomsSnap.size} associated listings permanently deleted.`
      );
    } catch (err) {
      console.warn("Firestore deleteUser error:", err);
      handleFirestoreError(err, OperationType.DELETE, `users/${targetUid}`);
    }
  },

  /**
   * Fetch recent admin logs
   */
  async getAuditLogs(): Promise<AdminLog[]> {
    try {
      const q = query(collection(db, 'adminLogs'), limit(50));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data() as AdminLog);
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return list;
    } catch (err) {
      console.warn("Could not fetch admin logs:", err);
      return [];
    }
  }
};
