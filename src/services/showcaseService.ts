/**
 * Showcase Photos Service
 * Manages admin-uploaded sliding showcase photos for the Home screen hero slider.
 * Maximum 5 images limit with full CRUD (Create, Read, Update, Delete) capability.
 * Synchronizes with Firestore (adminConfig/showcase), localStorage, and IndexedDB.
 * Enforces atomic deletions and permanent tombstoning so deleted photos NEVER reappear.
 */
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { idbStorage } from '../utils/idbStorage';
import { safeDispatchEvent } from '../utils/eventBus';

export interface ShowcasePhoto {
  id: string;
  url: string;
  title: string;
  caption: string;
  createdAt: string;
}

const STORAGE_KEYS = {
  PHOTOS: 'khojam_showcase_photos',
  DELETED_IDS: 'khojam_showcase_deleted_ids',
  INITIALIZED: 'khojam_showcase_initialized'
};

export const MAX_SHOWCASE_PHOTOS = 5;

export const DEFAULT_SHOWCASE_PHOTOS: ShowcasePhoto[] = [
  {
    id: 'showcase_1',
    url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=85',
    title: 'Modern 2BHK Apartment Living Room',
    caption: 'Baluwatar, Kathmandu',
    createdAt: new Date().toISOString()
  },
  {
    id: 'showcase_2',
    url: 'https://images.unsplash.com/photo-1502005229762-ee1b2b814660?auto=format&fit=crop&w=1600&q=85',
    title: 'Sunny Studio Flat with Scenic View',
    caption: 'Lakeside, Pokhara',
    createdAt: new Date().toISOString()
  },
  {
    id: 'showcase_3',
    url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1600&q=85',
    title: 'Executive Master Bedroom with Attached Bath',
    caption: 'Shankhamul, Lalitpur',
    createdAt: new Date().toISOString()
  },
  {
    id: 'showcase_4',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
    title: 'Spacious 3BHK Family Flat with Balcony',
    caption: 'Jhamsikhel, Lalitpur',
    createdAt: new Date().toISOString()
  },
  {
    id: 'showcase_5',
    url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=85',
    title: 'Cozy Furnished Room with Sunlight',
    caption: 'Kapan, Kathmandu',
    createdAt: new Date().toISOString()
  }
];

let cachedPhotos: ShowcasePhoto[] = [];
let cachedDeletedIds: Set<string> = new Set();
let isFirestoreShowcaseSynced = false;

function loadDeletedIds(): Set<string> {
  const set = new Set<string>();
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id: string) => {
            if (id && typeof id === 'string') set.add(id.trim());
          });
        }
      }
    } catch {}
  }
  return set;
}

function saveDeletedIds(set: Set<string>) {
  cachedDeletedIds = set;
  if (typeof window !== 'undefined') {
    try {
      const arr = Array.from(set);
      localStorage.setItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify(arr));
      idbStorage.set(STORAGE_KEYS.DELETED_IDS, arr).catch(() => {});
    } catch {}
  }
}

// Preload deleted IDs from IndexedDB
if (typeof window !== 'undefined') {
  cachedDeletedIds = loadDeletedIds();
  idbStorage.get<string[]>(STORAGE_KEYS.DELETED_IDS).then((storedIds) => {
    if (storedIds && Array.isArray(storedIds)) {
      storedIds.forEach((id) => cachedDeletedIds.add(id));
      saveDeletedIds(cachedDeletedIds);
    }
  }).catch(() => {});

  idbStorage.get<ShowcasePhoto[]>(STORAGE_KEYS.PHOTOS).then((storedPhotos) => {
    if (storedPhotos && Array.isArray(storedPhotos)) {
      const sanitized = storedPhotos.filter(p => !cachedDeletedIds.has(p.id));
      if (cachedPhotos.length === 0 && sanitized.length > 0) {
        cachedPhotos = sanitized;
        safeDispatchEvent('khojam_showcase_updated');
      }
    }
  }).catch(() => {});
}

export const showcaseService = {
  initSync(): () => void {
    if (isFirestoreShowcaseSynced) return () => {};
    isFirestoreShowcaseSynced = true;

    cachedDeletedIds = loadDeletedIds();

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.PHOTOS);
        const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            cachedPhotos = parsed.filter(p => !cachedDeletedIds.has(p.id));
          }
        } else if (!isInit) {
          // First ever initial load
          const defaults = DEFAULT_SHOWCASE_PHOTOS.filter(p => !cachedDeletedIds.has(p.id));
          cachedPhotos = defaults;
          localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(defaults));
          localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        }
      } catch {
        cachedPhotos = DEFAULT_SHOWCASE_PHOTOS.filter(p => !cachedDeletedIds.has(p.id));
      }
    }

    try {
      const unsub = onSnapshot(doc(db, 'adminConfig', 'showcase'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          
          // Merge any remote tombstoned deleted IDs
          if (Array.isArray(data.deletedPhotoIds)) {
            data.deletedPhotoIds.forEach((id: string) => {
              if (id && typeof id === 'string') cachedDeletedIds.add(id.trim());
            });
            saveDeletedIds(cachedDeletedIds);
          }

          if (Array.isArray(data.photos)) {
            // Strictly exclude any photos that have been deleted
            const sanitized = (data.photos as ShowcasePhoto[])
              .filter(p => p && p.id && !cachedDeletedIds.has(String(p.id).trim()))
              .slice(0, MAX_SHOWCASE_PHOTOS);

            cachedPhotos = sanitized;
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(sanitized));
              localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
              idbStorage.set(STORAGE_KEYS.PHOTOS, sanitized).catch(() => {});
              safeDispatchEvent('khojam_showcase_updated');
            }

            // If Firestore data contained deleted photos, cleanse Firestore immediately
            if (sanitized.length !== data.photos.length) {
              setDoc(doc(db, 'adminConfig', 'showcase'), {
                photos: sanitized,
                deletedPhotoIds: Array.from(cachedDeletedIds),
                updatedAt: new Date().toISOString()
              }, { merge: true }).catch(() => {});
            }
          }
        }
      }, (err) => {
        console.warn("Firestore showcase sync notice:", err);
      });

      return () => {
        unsub();
        isFirestoreShowcaseSynced = false;
      };
    } catch {
      return () => {
        isFirestoreShowcaseSynced = false;
      };
    }
  },

  getPhotos(): ShowcasePhoto[] {
    cachedDeletedIds = loadDeletedIds();
    if (typeof window === 'undefined') {
      return DEFAULT_SHOWCASE_PHOTOS.filter(p => !cachedDeletedIds.has(p.id));
    }
    try {
      const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
      const stored = localStorage.getItem(STORAGE_KEYS.PHOTOS);

      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.filter(p => !cachedDeletedIds.has(p.id)).slice(0, MAX_SHOWCASE_PHOTOS);
          cachedPhotos = sanitized;
          return sanitized;
        }
      }

      // If user has initialized the app and deleted photos, respect their empty or custom list!
      if (isInit) {
        return cachedPhotos.filter(p => !cachedDeletedIds.has(p.id));
      }

      // Truly fresh initial visit
      const defaults = DEFAULT_SHOWCASE_PHOTOS.filter(p => !cachedDeletedIds.has(p.id));
      localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(defaults));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      cachedPhotos = defaults;
      return defaults;
    } catch {
      return cachedPhotos.filter(p => !cachedDeletedIds.has(p.id));
    }
  },

  async addPhoto(photo: { url: string; title?: string; caption?: string }): Promise<{ success: boolean; message: string; photo?: ShowcasePhoto }> {
    const list = this.getPhotos();
    if (list.length >= MAX_SHOWCASE_PHOTOS) {
      return { 
        success: false, 
        message: `Maximum limit of ${MAX_SHOWCASE_PHOTOS} showcase photos reached. Please delete or edit an existing photo first.` 
      };
    }
    if (!photo.url.trim()) {
      return { success: false, message: 'Please provide or upload an image.' };
    }

    const newPhoto: ShowcasePhoto = {
      id: `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      url: photo.url.trim(),
      title: (photo.title || '').trim(),
      caption: (photo.caption || '').trim(),
      createdAt: new Date().toISOString()
    };

    const updated = [...list, newPhoto];
    cachedPhotos = updated;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      idbStorage.set(STORAGE_KEYS.PHOTOS, updated).catch(() => {});
      safeDispatchEvent('khojam_showcase_updated');
    }

    try {
      await setDoc(doc(db, 'adminConfig', 'showcase'), {
        photos: updated,
        deletedPhotoIds: Array.from(cachedDeletedIds),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore addPhoto notice:', err);
    }

    return {
      success: true,
      message: 'Showcase photo successfully added for Home screen slideshow!',
      photo: newPhoto
    };
  },

  async updatePhoto(id: string, updates: Partial<ShowcasePhoto>): Promise<{ success: boolean; message: string }> {
    const list = this.getPhotos();
    const cleanId = String(id).trim();
    const idx = list.findIndex(p => String(p.id).trim() === cleanId);
    if (idx === -1) {
      return { success: false, message: 'Showcase photo not found.' };
    }

    list[idx] = {
      ...list[idx],
      ...updates
    };

    cachedPhotos = list;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(list));
      idbStorage.set(STORAGE_KEYS.PHOTOS, list).catch(() => {});
      safeDispatchEvent('khojam_showcase_updated');
    }

    try {
      await setDoc(doc(db, 'adminConfig', 'showcase'), {
        photos: list,
        deletedPhotoIds: Array.from(cachedDeletedIds),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore updatePhoto notice:', err);
    }

    return { success: true, message: 'Showcase photo updated successfully.' };
  },

  async deletePhoto(id: string): Promise<{ success: boolean; message: string }> {
    const cleanId = String(id).trim();
    
    // 1. Add to permanent tombstone list
    cachedDeletedIds.add(cleanId);
    saveDeletedIds(cachedDeletedIds);

    // 2. Immediate synchronous local deletion
    const currentList = this.getPhotos();
    const filtered = currentList.filter(p => String(p.id).trim() !== cleanId);
    cachedPhotos = filtered;

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(filtered));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      idbStorage.set(STORAGE_KEYS.PHOTOS, filtered).catch(() => {});
      safeDispatchEvent('khojam_showcase_updated');
    }

    // 3. Atomic deletion write to Firestore
    try {
      await setDoc(doc(db, 'adminConfig', 'showcase'), {
        photos: filtered,
        deletedPhotoIds: Array.from(cachedDeletedIds),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore deletePhoto notice:', err);
    }

    return { success: true, message: 'Showcase photo permanently deleted.' };
  },

  async resetToDefaults(): Promise<{ success: boolean; message: string }> {
    cachedDeletedIds.clear();
    saveDeletedIds(cachedDeletedIds);
    cachedPhotos = DEFAULT_SHOWCASE_PHOTOS;

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(DEFAULT_SHOWCASE_PHOTOS));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      idbStorage.set(STORAGE_KEYS.PHOTOS, DEFAULT_SHOWCASE_PHOTOS).catch(() => {});
      safeDispatchEvent('khojam_showcase_updated');
    }

    try {
      await setDoc(doc(db, 'adminConfig', 'showcase'), {
        photos: DEFAULT_SHOWCASE_PHOTOS,
        deletedPhotoIds: [],
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore resetToDefaults notice:', err);
    }

    return { success: true, message: 'Showcase photos reset to defaults.' };
  }
};
