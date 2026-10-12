/**
 * Room Listing & Lifecycle Service
 * Handles Firestore CRUD operations, 30-day expiration, availability checks,
 * image management, and user wishlists.
 */
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Room, RoomFilters, RoomStatus } from '../types';
import { idbStorage } from '../utils/idbStorage';
import { safeDispatchEvent } from '../utils/eventBus';

const ROOMS_COLLECTION = 'rooms';

// Calculate 30-day expiry from date
export function computeExpiryDate(fromMs: number = Date.now()): string {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  return new Date(fromMs + THIRTY_DAYS_MS).toISOString();
}

/**
 * Check if a room requires 24-hour reoccurring availability check
 * Triggered starting from 5 days of posting and reoccurring every 24 hours.
 */
export function isAwaitingAvailabilityCheck(room: Room): boolean {
  try {
    const createdAtMs = new Date(room.createdAt).getTime();
    const now = Date.now();
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    // Must be at least 5 days since posting
    if (now - createdAtMs < FIVE_DAYS_MS) {
      return false;
    }

    // If checked recently, check if 24 hours have elapsed
    if (room.lastAvailabilityCheckAt) {
      const lastCheckMs = new Date(room.lastAvailabilityCheckAt).getTime();
      if (now - lastCheckMs < TWENTY_FOUR_HOURS_MS) {
        return false;
      }
    }

    return room.status === 'active' || room.status === 'expiring_soon';
  } catch {
    return false;
  }
}

// Initial high-quality curated listings for Nepal cities
export const INITIAL_CURATED_ROOMS: Omit<Room, 'id'>[] = [
  {
    ownerId: 'owner_amrit_01',
    ownerName: 'Amrit Acharya',
    ownerEmail: 'amritacharya25@gmail.com',
    contactNumber: '+977 9841234567',
    title: 'Sunny 2BHK Apartment with Balcony & Solar Water',
    description: 'Bright and spacious 2BHK flat located in a peaceful residential street. 24/7 water supply, solar heating, fiber optic Wi-Fi, open modular kitchen, and secure bike/car parking.',
    rent: 22000,
    currency: 'NPR',
    location: 'Baluwatar, Kathmandu',
    city: 'Kathmandu',
    area: 'Baluwatar',
    landmark: 'Near Russian Embassy & Prime Minister Quarter',
    roomType: '2BHK',
    floor: '2nd Floor',
    furnishedStatus: 'Semi-Furnished',
    bathroomType: 'Attached',
    wifiAvailable: true,
    waterAvailable: true,
    parkingAvailable: true,
    kitchenAccess: true,
    genderPreference: 'Any',
    coverImageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80'
    ],
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: computeExpiryDate(Date.now() - 2 * 24 * 60 * 60 * 1000),
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    ownerId: 'owner_bishal_02',
    ownerName: 'Bishal Marasini',
    ownerEmail: 'bishal.marasini@gmail.com',
    contactNumber: '+977 9851098765',
    title: 'Cozy Master Bedroom with Attached Bath & Rooftop Terrace',
    description: 'Executive master bedroom for working professional or student. Includes attached Western bathroom, independent entrance, high-speed Wi-Fi, 24/7 pure boring water, and bike parking.',
    rent: 11000,
    currency: 'NPR',
    location: 'Shankhamul, Lalitpur',
    city: 'Lalitpur',
    area: 'Shankhamul',
    landmark: '5 mins walk from New Baneshwor Bridge',
    roomType: 'Master Bedroom',
    floor: '1st Floor',
    furnishedStatus: 'Furnished',
    bathroomType: 'Attached',
    wifiAvailable: true,
    waterAvailable: true,
    parkingAvailable: true,
    kitchenAccess: false,
    genderPreference: 'Any',
    coverImageUrl: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'
    ],
    status: 'active',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: computeExpiryDate(Date.now() - 3 * 24 * 60 * 60 * 1000),
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    ownerId: 'owner_amit_03',
    ownerName: 'Amit Chhetri',
    ownerEmail: 'amit.chhetri@gmail.com',
    contactNumber: '+977 9801234567',
    title: 'Modern 1BHK Flat near Lakeside with Mountain View',
    description: 'Scenic 1BHK apartment in quiet area of Lakeside, Pokhara. Fully furnished with modular kitchen, microwave, refrigerator, comfy queen bed, inverter backup, and fast 100Mbps Wi-Fi.',
    rent: 18500,
    currency: 'NPR',
    location: 'Lakeside, Pokhara',
    city: 'Pokhara',
    area: 'Lakeside',
    landmark: 'Near Hallan Chowk & Camping Ground',
    roomType: '1BHK',
    floor: '3rd Floor',
    furnishedStatus: 'Furnished',
    bathroomType: 'Attached',
    wifiAvailable: true,
    waterAvailable: true,
    parkingAvailable: true,
    kitchenAccess: true,
    genderPreference: 'Any',
    coverImageUrl: 'https://images.unsplash.com/photo-1502005229762-ee1b2b814660?auto=format&fit=crop&w=1200&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1502005229762-ee1b2b814660?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80'
    ],
    status: 'active',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: computeExpiryDate(Date.now() - 1 * 24 * 60 * 60 * 1000),
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    ownerId: 'owner_sunita_04',
    ownerName: 'Sunita Sharma',
    ownerEmail: 'sunita.sharma@gmail.com',
    contactNumber: '+977 9851123456',
    title: 'Affordable Single Room for Students near Campus',
    description: 'Clean and peaceful single room for student or office worker. Close to main highway and market, pure drinking water facility, quiet family environment, and ample bike parking.',
    rent: 6500,
    currency: 'NPR',
    location: 'Campus Road, Dhangadhi',
    city: 'Dhangadhi',
    area: 'Campus Road',
    landmark: 'Opposite SPA College',
    roomType: 'Single Room',
    floor: 'Ground Floor',
    furnishedStatus: 'Semi-Furnished',
    bathroomType: 'Common',
    wifiAvailable: true,
    waterAvailable: true,
    parkingAvailable: true,
    kitchenAccess: false,
    genderPreference: 'Male',
    coverImageUrl: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80'
    ],
    status: 'active',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: computeExpiryDate(Date.now() - 5 * 24 * 60 * 60 * 1000),
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    ownerId: 'owner_amrit_05',
    ownerName: 'Amrit Acharya',
    ownerEmail: 'amritacharya25@gmail.com',
    contactNumber: '+977 9841234567',
    title: 'Executive 3BHK Family Flat with Covered Car Parking',
    description: 'Premium 3BHK flat on 2nd floor with wooden parquet flooring, large living hall, 2 Western bathrooms, 24/7 security guard, backup inverter, and dedicated covered car parking space.',
    rent: 34000,
    currency: 'NPR',
    location: 'Jhamsikhel, Lalitpur',
    city: 'Lalitpur',
    area: 'Jhamsikhel',
    landmark: 'Behind St. Mary High School',
    roomType: '3BHK',
    floor: '2nd Floor',
    furnishedStatus: 'Furnished',
    bathroomType: 'Attached',
    wifiAvailable: true,
    waterAvailable: true,
    parkingAvailable: true,
    kitchenAccess: true,
    genderPreference: 'Family',
    coverImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80'
    ],
    status: 'active',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: computeExpiryDate(Date.now() - 4 * 24 * 60 * 60 * 1000),
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    ownerId: 'owner_rojina_06',
    ownerName: 'Rojina Thapa',
    ownerEmail: 'rojina.thapa@gmail.com',
    contactNumber: '+977 9849887766',
    title: 'Peaceful 1BHK Apartment with Kitchen & Sunlight',
    description: 'Comfortable 1BHK apartment suitable for a small family or female students/professionals. Constant hot water, high-speed internet, calm environment, and friendly neighborhood.',
    rent: 14000,
    currency: 'NPR',
    location: 'Kapan, Kathmandu',
    city: 'Kathmandu',
    area: 'Kapan',
    landmark: 'Near Kapan Monastery',
    roomType: '1BHK',
    floor: '1st Floor',
    furnishedStatus: 'Semi-Furnished',
    bathroomType: 'Attached',
    wifiAvailable: true,
    waterAvailable: true,
    parkingAvailable: true,
    kitchenAccess: true,
    genderPreference: 'Any',
    coverImageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'
    ],
    status: 'active',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: computeExpiryDate(Date.now() - 6 * 24 * 60 * 60 * 1000),
    publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const STORAGE_KEYS = {
  USER_ROOMS: 'khojam_user_rooms',
  SEEDED_FLAG: 'khojam_rooms_seeded'
};

let inMemoryUserRooms: Room[] | null = null;

// Initialize in-memory cache from IndexedDB asynchronously on load
if (typeof window !== 'undefined') {
  idbStorage.get<Room[]>(STORAGE_KEYS.USER_ROOMS).then((stored) => {
    if (stored && Array.isArray(stored) && stored.length > 0) {
      if (!inMemoryUserRooms || inMemoryUserRooms.length < stored.length) {
        inMemoryUserRooms = stored;
        safeDispatchEvent('khojam_rooms_updated');
      }
    }
  }).catch(() => {});
}

function getLocalUserRooms(): Room[] {
  if (inMemoryUserRooms && inMemoryUserRooms.length > 0) {
    return inMemoryUserRooms;
  }
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_ROOMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryUserRooms = parsed;
        return parsed;
      }
    }
  } catch {}
  return [];
}

function saveLocalUserRoom(room: Room): void {
  const current = getLocalUserRooms();
  const filtered = current.filter(r => r.id !== room.id);
  filtered.unshift(room);
  inMemoryUserRooms = filtered;

  // Persist to IndexedDB (virtually unlimited quota, never throws QuotaExceededError)
  idbStorage.set(STORAGE_KEYS.USER_ROOMS, filtered).catch(() => {});

  // Best effort persist to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_ROOMS, JSON.stringify(filtered));
    } catch (e) {
      // LocalStorage quota reached (common with high-res base64 images)
      // Save lighter version in localStorage while IndexedDB has the full version
      try {
        const lightweight = filtered.map(r => ({
          ...r,
          imageUrls: (r.imageUrls || []).slice(0, 2)
        }));
        localStorage.setItem(STORAGE_KEYS.USER_ROOMS, JSON.stringify(lightweight));
      } catch {}
    }
  }
}

function removeLocalUserRoom(roomId: string): void {
  const current = getLocalUserRooms();
  const filtered = current.filter(r => r.id !== roomId);
  inMemoryUserRooms = filtered;

  idbStorage.set(STORAGE_KEYS.USER_ROOMS, filtered).catch(() => {});
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_ROOMS, JSON.stringify(filtered));
    } catch {}
  }
}

// Saved-room (favorites) cache per user, so "Saved" survives a page refresh
const readLocalFavorites = (userId: string): string[] => {
  try {
    const raw = localStorage.getItem(`khojam_favorites_${userId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalFavorites = (userId: string, ids: string[]): void => {
  try {
    localStorage.setItem(`khojam_favorites_${userId}`, JSON.stringify(ids));
  } catch {}
};

export const roomService = {
  getLocalRoomsFallback(): Room[] {
    const curated = INITIAL_CURATED_ROOMS.map((r, idx) => ({
      ...r,
      id: `room_griha_${idx + 1}`
    })) as Room[];

    const userRooms = getLocalUserRooms();
    const map = new Map<string, Room>();
    curated.forEach(r => map.set(r.id, r));
    userRooms.forEach(r => map.set(r.id, r));
    const combined = Array.from(map.values());
    combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return combined;
  },

  async seedCuratedRoomsIfEmpty(): Promise<void> {
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEYS.SEEDED_FLAG)) {
      return;
    }
    try {
      const snap = await getDocs(collection(db, ROOMS_COLLECTION));
      if (snap.empty) {
        console.info("Seeding curated room listings to Firestore for Khojamm...");
        for (let i = 0; i < INITIAL_CURATED_ROOMS.length; i++) {
          const item = INITIAL_CURATED_ROOMS[i];
          const id = `room_griha_${i + 1}`;
          await setDoc(doc(db, ROOMS_COLLECTION, id), { ...item, id }, { merge: true });
        }
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SEEDED_FLAG, 'true');
      }
    } catch (err) {
      console.warn("Seeding initial rooms note:", err);
    }
  },

  /**
   * Fetch active rooms directly from Firebase with 30-day expiration check
   */
  async getActiveRooms(filters?: Partial<RoomFilters>): Promise<Room[]> {
    try {
      const roomsRef = collection(db, ROOMS_COLLECTION);
      const snapshot = await getDocs(roomsRef);

      const now = Date.now();
      const rooms: Room[] = [];

      for (const d of snapshot.docs) {
        const data = d.data() as Room;
        const createdAtMs = new Date(data.createdAt).getTime();
        const expiresAtMs = data.expiresAt ? new Date(data.expiresAt).getTime() : (createdAtMs + 30 * 24 * 60 * 60 * 1000);

        // 30-day automatic expiration check
        if (now >= expiresAtMs || now - createdAtMs >= 30 * 24 * 60 * 60 * 1000) {
          if (data.status !== 'expired' && data.status !== 'removed') {
            updateDoc(doc(db, ROOMS_COLLECTION, data.id), {
              status: 'expired',
              updatedAt: new Date().toISOString()
            }).catch(() => {});
          }
          continue;
        }

        if (data.status === 'active' || data.status === 'expiring_soon' || !data.status) {
          rooms.push(data);
        }
      }

      // Merge with user-uploaded local rooms
      const localRooms = getLocalUserRooms();
      const map = new Map<string, Room>();
      rooms.forEach(r => map.set(r.id, r));
      localRooms.forEach(r => {
        if (!map.has(r.id)) map.set(r.id, r);
      });
      const combined = Array.from(map.values());
      combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      return this.filterRooms(combined, filters);
    } catch (err) {
      console.warn("getActiveRooms fallback notice:", err);
      return this.filterRooms(this.getLocalRoomsFallback(), filters);
    }
  },

  /**
   * Listen to real-time updates of active rooms from Firebase
   */
  subscribeToActiveRooms(onUpdate: (rooms: Room[]) => void, onError?: (err: any) => void) {
    const roomsRef = collection(db, ROOMS_COLLECTION);
    let lastEmittedKeys = '';

    return onSnapshot(roomsRef, (snap) => {
      const now = Date.now();
      const list: Room[] = [];
      snap.forEach(d => {
        const item = d.data() as Room;
        const createdAtMs = new Date(item.createdAt).getTime();
        const expiresAtMs = item.expiresAt ? new Date(item.expiresAt).getTime() : (createdAtMs + 30 * 24 * 60 * 60 * 1000);

        // Filter out expired or removed rooms
        if (now < expiresAtMs && (now - createdAtMs < 30 * 24 * 60 * 60 * 1000) && (item.status === 'active' || item.status === 'expiring_soon' || !item.status)) {
          list.push(item);
        }
      });

      // Synchronize with local user uploads
      const localUserRooms = getLocalUserRooms();
      const map = new Map<string, Room>();
      list.forEach(r => map.set(r.id, r));
      localUserRooms.forEach(r => {
        if (!map.has(r.id)) map.set(r.id, r);
      });

      const combined = Array.from(map.values());
      combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const toEmit = combined.length === 0 ? this.getLocalRoomsFallback() : combined;
      const keys = toEmit.map(r => `${r.id}_${r.status}_${r.updatedAt || ''}`).join(',');
      if (keys !== lastEmittedKeys) {
        lastEmittedKeys = keys;
        onUpdate(toEmit);
      }
    }, (error) => {
      console.warn("Active rooms listener fallback:", error);
      onError?.(error);
      const fallback = this.getLocalRoomsFallback();
      const keys = fallback.map(r => `${r.id}_${r.status}_${r.updatedAt || ''}`).join(',');
      if (keys !== lastEmittedKeys) {
        lastEmittedKeys = keys;
        onUpdate(fallback);
      }
    });
  },

  async getRoomById(id: string): Promise<Room | null> {
    const local = getLocalUserRooms().find(r => r.id === id);
    if (local) return local;

    try {
      const snap = await getDoc(doc(db, ROOMS_COLLECTION, id));
      if (!snap.exists()) return null;
      return snap.data() as Room;
    } catch (err) {
      console.warn("getRoomById fallback note:", err);
      return this.getLocalRoomsFallback().find(r => r.id === id) || null;
    }
  },

  async getOwnerListings(ownerId: string, ownerEmail?: string): Promise<Room[]> {
    const cleanEmail = ownerEmail?.trim().toLowerCase();
    const localListings = getLocalUserRooms().filter(
      r => r.ownerId === ownerId || (cleanEmail && r.ownerEmail?.toLowerCase() === cleanEmail)
    );

    try {
      const q = query(
        collection(db, ROOMS_COLLECTION),
        where('ownerId', '==', ownerId)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => d.data() as Room);

      const map = new Map<string, Room>();
      localListings.forEach(r => map.set(r.id, r));
      list.forEach(r => map.set(r.id, r));
      const combined = Array.from(map.values());
      combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return combined;
    } catch (err) {
      console.warn("Firestore owner listings note:", err);
      return localListings;
    }
  },

  async getListingsAwaitingAvailability(ownerId: string): Promise<Room[]> {
    try {
      const listings = await this.getOwnerListings(ownerId);
      return listings.filter(r => isAwaitingAvailabilityCheck(r));
    } catch {
      return [];
    }
  },

  async confirmRoomAvailability(roomId: string, isAvailable: boolean): Promise<void> {
    const now = new Date().toISOString();
    if (isAvailable) {
      const local = getLocalUserRooms().find(r => r.id === roomId);
      if (local) {
        saveLocalUserRoom({ ...local, status: 'active', lastAvailabilityCheckAt: now, updatedAt: now });
      }
      try {
        await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
          status: 'active',
          lastAvailabilityCheckAt: now,
          updatedAt: now
        });
      } catch (e) {
        console.warn('confirmRoomAvailability update note:', e);
      }
    } else {
      // Room no longer available: permanently delete
      removeLocalUserRoom(roomId);
      try {
        await deleteDoc(doc(db, ROOMS_COLLECTION, roomId));
      } catch (e) {
        console.warn('confirmRoomAvailability delete note:', e);
      }
    }
    safeDispatchEvent('khojam_rooms_updated');
  },

  /**
   * Booked Room – Permanent Deletion
   * Deletes the room document from Firebase Firestore, removes local copies,
   * and updates UI immediately across all views.
   */
  async markRoomAsBooked(roomId: string): Promise<void> {
    // 1. Remove from client local memory & storage immediately
    removeLocalUserRoom(roomId);
    safeDispatchEvent('khojam_rooms_updated');

    // 2. Permanently delete from Firebase Firestore
    try {
      await deleteDoc(doc(db, ROOMS_COLLECTION, roomId));
    } catch (e) {
      console.error('markRoomAsBooked Firestore delete error:', e);
      handleFirestoreError(e, OperationType.DELETE, `${ROOMS_COLLECTION}/${roomId}`);
    }
  },

  /**
   * Create a new room listing
   * Validates form and saves locally immediately, then syncs to Firebase Firestore.
   */
  async createRoomListing(roomData: Omit<Room, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'publishedAt' | 'status'> & { status?: RoomStatus }): Promise<string> {
    const id = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const expiresAt = computeExpiryDate(Date.now());

    const rawRoom: Room = {
      ...roomData,
      id,
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      expiresAt,
      status: roomData.status || 'active'
    };

    const sanitizedRoom: Record<string, any> = {};
    for (const [key, val] of Object.entries(rawRoom)) {
      if (val !== undefined) {
        sanitizedRoom[key] = val;
      }
    }

    // 1. Immediately store in local cache (IndexedDB + localStorage) and dispatch event for INSTANT UI availability
    saveLocalUserRoom(sanitizedRoom as Room);
    safeDispatchEvent('khojam_rooms_updated');

    // 2. Sync to Firebase Firestore in background with graceful fallback
    try {
      await setDoc(doc(db, ROOMS_COLLECTION, id), sanitizedRoom);
    } catch (fsErr) {
      console.warn('Firebase Firestore write notice (room is safely preserved in local database):', fsErr);
    }

    return id;
  },

  /**
   * Update existing room
   */
  async updateRoomListing(roomId: string, data: Partial<Room>): Promise<void> {
    const current = getLocalUserRooms().find(r => r.id === roomId);
    if (current) {
      saveLocalUserRoom({ ...current, ...data, updatedAt: new Date().toISOString() });
    }
    safeDispatchEvent('khojam_rooms_updated');

    try {
      const roomRef = doc(db, ROOMS_COLLECTION, roomId);
      const sanitizedData: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };
      for (const [key, val] of Object.entries(data)) {
        if (val !== undefined) {
          sanitizedData[key] = val;
        }
      }
      await updateDoc(roomRef, sanitizedData);
    } catch (err) {
      console.warn('Firestore updateRoomListing notice:', err);
    }
  },

  /**
   * Delete room listing permanently
   */
  async deleteRoomListing(roomId: string): Promise<void> {
    removeLocalUserRoom(roomId);
    safeDispatchEvent('khojam_rooms_updated');

    try {
      await deleteDoc(doc(db, ROOMS_COLLECTION, roomId));
    } catch (err) {
      console.warn('Firestore deleteRoomListing notice:', err);
    }
  },

  /**
   * Admin: Fetch all rooms across all statuses
   */
  async getAllRoomsForAdmin(): Promise<Room[]> {
    const localRooms = getLocalUserRooms();
    try {
      const snap = await getDocs(collection(db, ROOMS_COLLECTION));
      const list = snap.docs.map(d => d.data() as Room);
      
      const map = new Map<string, Room>();
      list.forEach(r => map.set(r.id, r));
      localRooms.forEach(r => {
        if (!map.has(r.id)) map.set(r.id, r);
      });
      const combined = Array.from(map.values());
      combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return combined.length > 0 ? combined : this.getLocalRoomsFallback();
    } catch (err) {
      console.warn('getAllRoomsForAdmin fallback notice:', err);
      const fallback = this.getLocalRoomsFallback();
      const map = new Map<string, Room>();
      fallback.forEach(r => map.set(r.id, r));
      localRooms.forEach(r => {
        if (!map.has(r.id)) map.set(r.id, r);
      });
      return Array.from(map.values());
    }
  },

  // async toggleFavorite(userId: string, roomId: string, isFav: boolean): Promise<void> {
  //   try {
  //     const favRef = doc(db, 'users', userId, 'favorites', roomId);
  //     if (isFav) {
  //       await setDoc(favRef, {
  //         roomId,
  //         userId,
  //         createdAt: new Date().toISOString()
  //       });
  //     } else {
  //       await deleteDoc(favRef);
  //     }
  //   } catch (err) {
  //     console.warn('Toggle favorite notice:', err);
  //   }
  // },

  // async getUserFavorites(userId: string): Promise<string[]> {
  //   try {
  //     const snap = await getDocs(collection(db, 'users', userId, 'favorites'));
  //     return snap.docs.map(d => d.id);
  //   } catch (err) {
  //     console.warn("Favorites fetch warning:", err);
  //     return [];
  //   }
  // },

  async toggleFavorite(userId: string, roomId: string, isFav: boolean): Promise<void> {
    // 1. Save on this device first so it survives a refresh even if the cloud write fails
    const withoutRoom = readLocalFavorites(userId).filter(id => id !== roomId);
    writeLocalFavorites(userId, isFav ? [...withoutRoom, roomId] : withoutRoom);

    // 2. Then sync to Firestore
    try {
      const favRef = doc(db, 'users', userId, 'favorites', roomId);
      if (isFav) {
        await setDoc(favRef, {
          roomId,
          userId,
          createdAt: new Date().toISOString()
        });
      } else {
        await deleteDoc(favRef);
      }
    } catch (err) {
      console.warn('Toggle favorite notice:', err);
    }
  },

  async getUserFavorites(userId: string): Promise<string[]> {
    const local = readLocalFavorites(userId);
    try {
      const snap = await getDocs(collection(db, 'users', userId, 'favorites'));
      const cloud = snap.docs.map(d => d.id);
      // Combine cloud + this-device favorites so nothing is lost on refresh
      const merged = Array.from(new Set([...cloud, ...local]));
      writeLocalFavorites(userId, merged);
      return merged;
    } catch (err) {
      console.warn("Favorites fetch warning:", err);
      return local;
    }
  },

  filterRooms(rooms: Room[], filters?: Partial<RoomFilters>): Room[] {
    if (!filters) return rooms;

    return rooms.filter(room => {
      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase().trim();
        const matches = 
          room.title?.toLowerCase().includes(query) ||
          room.location?.toLowerCase().includes(query) ||
          room.city?.toLowerCase().includes(query) ||
          room.area?.toLowerCase().includes(query) ||
          room.roomType?.toLowerCase().includes(query) ||
          room.description?.toLowerCase().includes(query);
        if (!matches) return false;
      }

      if (filters.city && filters.city !== 'All Cities' && room.city?.toLowerCase() !== filters.city?.toLowerCase()) {
        return false;
      }

      if (filters.area && filters.area.trim() !== '' && !room.area?.toLowerCase().includes(filters.area.toLowerCase())) {
        return false;
      }

      if (filters.minRent && room.rent < filters.minRent) {
        return false;
      }

      if (filters.maxRent && filters.maxRent > 0 && room.rent > filters.maxRent) {
        return false;
      }

      if (filters.roomType && filters.roomType !== 'All' && room.roomType !== filters.roomType) {
        return false;
      }

      if (filters.furnishedStatus && filters.furnishedStatus !== 'All' && room.furnishedStatus !== filters.furnishedStatus) {
        return false;
      }

      if (filters.wifi && !room.wifiAvailable) return false;
      if (filters.water && !room.waterAvailable) return false;
      if (filters.parking && !room.parkingAvailable) return false;
      if (filters.kitchen && !room.kitchenAccess) return false;

      if (filters.bathroomType && filters.bathroomType !== 'All' && room.bathroomType !== filters.bathroomType) {
        return false;
      }

      if (filters.genderPreference && filters.genderPreference !== 'All' && room.genderPreference !== filters.genderPreference) {
        return false;
      }

      return true;
    });
  }
};
