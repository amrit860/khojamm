/**
 * Inquiry Service
 * Handles user contact inquiries, storage in Firestore, live subscriptions,
 * backend email delivery dispatch, and status updates for the Admin Panel.
 */
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { Inquiry, InquiryStatus } from '../types';

export interface SubmitInquiryParams {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  userId?: string | null;
}

export const inquiryService = {
  /**
   * Submit a new inquiry to the backend API with Firestore fallback/sync
   */
  async submitInquiry(params: SubmitInquiryParams): Promise<{ success: boolean; inquiry?: Inquiry; error?: string }> {
    try {
      // Get authentication token if user is signed in
      let idToken: string | null = null;
      if (auth.currentUser) {
        try {
          idToken = await auth.currentUser.getIdToken();
        } catch {
          // Token retrieval failed or guest
        }
      }

      // 1. Attempt submitting through the real backend API
      try {
        const response = await fetch('/api/inquiries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
          },
          body: JSON.stringify({
            name: params.name.trim(),
            email: params.email.trim(),
            phone: params.phone?.trim() || '',
            subject: params.subject.trim(),
            message: params.message.trim(),
            userId: auth.currentUser?.uid || params.userId || null
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.inquiry) {
            return { success: true, inquiry: data.inquiry };
          }
        }
      } catch (apiErr) {
        console.warn('Backend API submission unreachable, falling back to direct Firestore:', apiErr);
      }

      // 2. Direct Firestore fallback (preserves database integrity)
      const now = new Date().toISOString();
      const inqId = `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newInquiry: Inquiry = {
        id: inqId,
        senderName: params.name.trim(),
        senderEmail: params.email.trim(),
        senderPhone: params.phone?.trim() || '',
        subject: params.subject.trim(),
        message: params.message.trim(),
        userId: auth.currentUser?.uid || params.userId || null,
        senderType: auth.currentUser ? 'registered' : 'guest',
        status: 'New',
        emailDeliveryStatus: 'Pending',
        createdAt: now,
        updatedAt: now
      };

      await setDoc(doc(db, 'inquiries', inqId), newInquiry);
      return { success: true, inquiry: newInquiry };
    } catch (err: any) {
      console.error('Failed to submit contact inquiry:', err);
      return { success: false, error: err?.message || 'Failed to submit inquiry' };
    }
  },

  /**
   * Fetch all inquiries from Firestore (for authorized admins)
   */
  async getAllInquiries(): Promise<Inquiry[]> {
    // 1. Try direct Firestore read (allowed for authenticated admins)
    try {
      const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: Inquiry[] = [];
      snap.forEach(d => {
        list.push({ ...d.data(), id: d.id } as Inquiry);
      });
      return list;
    } catch (err: any) {
      // If error is permission error (e.g. guest or not yet authenticated) or index error
      const isPermissionDenied = err?.code === 'permission-denied' || 
        (err?.message && err.message.toLowerCase().includes('permission'));

      if (!isPermissionDenied) {
        // Fallback without orderBy in case composite index is missing or building
        try {
          const snap = await getDocs(collection(db, 'inquiries'));
          const list: Inquiry[] = [];
          snap.forEach(d => {
            list.push({ ...d.data(), id: d.id } as Inquiry);
          });
          return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch {
          // Continue to backend API fallback
        }
      }
    }

    // 2. Fallback to server API endpoint (/api/inquiries)
    try {
      const res = await fetch('/api/inquiries');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.inquiries)) {
          return data.inquiries;
        }
      }
    } catch {
      // Backend API unreachable
    }

    return [];
  },

  /**
   * Real-time subscription to inquiries (for authorized admins)
   */
  subscribeInquiries(listener: (inquiries: Inquiry[]) => void): () => void {
    try {
      const colRef = collection(db, 'inquiries');
      return onSnapshot(colRef, (snap) => {
        const list: Inquiry[] = [];
        snap.forEach(d => {
          list.push({ ...d.data(), id: d.id } as Inquiry);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        listener(list);
      }, (err) => {
        // Silently handle permission notices or try fallback fetch
        if (err?.code !== 'permission-denied') {
          console.warn('subscribeInquiries notice:', err?.message || err);
        }
      });
    } catch {
      return () => {};
    }
  },

  /**
   * Update inquiry status (New, Read, Replied, Resolved)
   */
  async updateStatus(id: string, status: InquiryStatus): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'inquiries', id), {
        status,
        updatedAt: now
      });

      // Also notify backend if available
      fetch(`/api/inquiries/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      }).catch(() => {});

      return true;
    } catch (err) {
      console.error('Failed to update inquiry status:', err);
      return false;
    }
  },

  /**
   * Retry sending email notification through the backend email service
   */
  async retryEmail(id: string, inquiry?: Inquiry): Promise<{ success: boolean; message: string }> {
    try {
      let idToken: string | null = null;
      if (auth.currentUser) {
        try {
          idToken = await auth.currentUser.getIdToken();
        } catch {}
      }

      const response = await fetch(`/api/inquiries/${id}/retry-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({ inquiry })
      });

      const data = await response.json();
      return {
        success: response.ok && data.success,
        message: data.message || (response.ok ? 'Email delivery dispatched successfully' : 'Email retry failed')
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error retrying email delivery' };
    }
  }
};
