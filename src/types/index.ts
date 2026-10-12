export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'blocked';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  lifestyle?: {
    diet?: 'Vegetarian' | 'Non-Vegetarian' | 'Vegan';
    smoking?: 'Non-Smoker' | 'Smoker';
    drinking?: 'Non-Drinker' | 'Occasional' | 'Regular';
    cleanliness?: 'Clean' | 'Average' | 'Moderate';
  };
}

export type RoomStatus = 'active' | 'expiring_soon' | 'expired' | 'removed' | 'unavailable';
export type FurnishedStatus = 'Furnished' | 'Semi-Furnished' | 'Unfurnished';
export type BathroomType = 'Attached' | 'Common';
export type GenderPreference = 'Any' | 'Male' | 'Female' | 'Family';

export interface Room {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  contactNumber: string;
  title: string;
  description: string;
  rent: number;
  currency: 'NPR';
  location: string;
  city: string;
  area: string;
  landmark?: string;
  roomType: string;
  floor?: string;
  furnishedStatus: FurnishedStatus;
  bathroomType: BathroomType;
  wifiAvailable: boolean;
  waterAvailable: boolean;
  parkingAvailable: boolean;
  kitchenAccess?: boolean;
  genderPreference: GenderPreference;
  coverImageUrl: string;
  imageUrls: string[];
  videoUrl?: string;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  lastAvailabilityCheckAt?: string;
  publishedAt: string;
  renewedAt?: string;
}

export interface AssignedAdmin {
  id: string;
  email: string;
  assignedAt: string;
  expiresAt: string | null;
  expiresAtMillis?: number | null;
  durationHours: number;
  durationLabel: string;
  assignedBy: string;
  status: 'active' | 'expired';
  expiredAt?: string | null;
}

export interface AdminConfig {
  realAdminEmail: string;
  assignedAdmins: AssignedAdmin[];
  customLogoUrl?: string;
}

export interface AdminLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetType: 'user' | 'room' | 'system';
  targetId: string;
  details: string;
  timestamp: string;
}

export interface RoomFilters {
  searchQuery: string;
  city: string;
  area: string;
  minRent: number;
  maxRent: number;
  roomType: string;
  furnishedStatus: string;
  wifi: boolean;
  water: boolean;
  parking: boolean;
  kitchen: boolean;
  bathroomType: string;
  genderPreference: string;
}

export type NotificationType =
  | 'login'
  | 'room_listed'
  | 'room_booked'
  | 'availability_check'
  | 'notice'
  | 'favorite';

export interface AppNotification {
  id: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  roomId?: string;
}

export type InquiryStatus = 'New' | 'Read' | 'Replied' | 'Resolved';
export type EmailDeliveryStatus = 'Pending' | 'Sent' | 'Failed';

export interface Inquiry {
  id: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  subject: string;
  message: string;
  userId: string | null;
  senderType: 'registered' | 'guest';
  status: InquiryStatus;
  emailDeliveryStatus: EmailDeliveryStatus;
  emailSentAt?: string | null;
  lastEmailError?: string | null;
  recipients?: string[];
  createdAt: string;
  updatedAt: string;
}
