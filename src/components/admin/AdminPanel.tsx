import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminService } from '../../services/adminService';
import { roomService } from '../../services/roomService';
import { adminRoleService } from '../../services/adminRoleService';
import { showcaseService, ShowcasePhoto, MAX_SHOWCASE_PHOTOS } from '../../services/showcaseService';
import { inquiryService } from '../../services/inquiryService';
import { Room, UserProfile, AdminLog, RoomStatus, AssignedAdmin, Inquiry, InquiryStatus } from '../../types';
import { 
  ShieldCheck, 
  Users, 
  Layers, 
  FileText, 
  Search, 
  UserX, 
  UserCheck, 
  Trash2, 
  Edit3, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  RefreshCw, 
  X,
  ChevronRight,
  ShieldAlert,
  Key,
  UserPlus,
  Upload,
  Image as ImageIcon,
  Shield,
  RotateCcw,
  Check,
  Sparkles,
  Plus,
  Clock,
  Mail,
  MessageSquare,
  Send,
  Inbox,
  ExternalLink,
  RotateCw,
  Phone
} from 'lucide-react';

interface AdminPanelProps {
  onBackToApp: () => void;
  onViewRoomInApp?: (room: Room) => void;
  onOpenAuth?: () => void;
}

type AdminTab = 'dashboard' | 'admins' | 'showcase' | 'users' | 'listings' | 'logs' | 'inquiries';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onBackToApp,
  onViewRoomInApp,
  onOpenAuth
}) => {
  const { currentUser, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Super Admin & Assigned Admins state
  const isRealAdmin = adminRoleService.isRealAdmin(currentUser?.email);
  const [realAdminEmail, setRealAdminEmail] = useState(adminRoleService.getRealAdminEmail());
  const [assignedAdmins, setAssignedAdmins] = useState<AssignedAdmin[]>([]);
  const [isRefreshingRoles, setIsRefreshingRoles] = useState(false);
  const [isCheckingExpirations, setIsCheckingExpirations] = useState(false);

  // Assign Admin Form
  const [assignGmail, setAssignGmail] = useState('');
  const [assignDurationHours, setAssignDurationHours] = useState<number>(24);
  const [assignFeedback, setAssignFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Transfer Super Admin Form
  const [newRealAdminInput, setNewRealAdminInput] = useState('');
  const [transferFeedback, setTransferFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);

  // Logo Upload State
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(adminRoleService.getCustomLogo());
  const [logoFeedback, setLogoFeedback] = useState<string | null>(null);

  // Showcase Sliding Photos State (CRUD, limit 5 images)
  const [showcasePhotos, setShowcasePhotos] = useState<ShowcasePhoto[]>(() => showcaseService.getPhotos());
  const [showcaseTitle, setShowcaseTitle] = useState('');
  const [showcaseCaption, setShowcaseCaption] = useState('');
  const [showcaseImageInput, setShowcaseImageInput] = useState('');
  const [editingShowcaseId, setEditingShowcaseId] = useState<string | null>(null);
  const [showcaseFeedback, setShowcaseFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingShowcaseImg, setUploadingShowcaseImg] = useState(false);

  // Search & Filter queries
  const [userSearch, setUserSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState<string>('All');

  // Edit Room Modal state in admin
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editRent, setEditRent] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<RoomStatus>('active');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Room Confirmation popup in Admin
  const [roomToDeleteInAdmin, setRoomToDeleteInAdmin] = useState<Room | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  // Inquiry Management State
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [inquirySearch, setInquirySearch] = useState('');
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<string>('All');
  const [inquiryDeliveryFilter, setInquiryDeliveryFilter] = useState<string>('All');
  const [retryingInquiryId, setRetryingInquiryId] = useState<string | null>(null);
  const [retryFeedback, setRetryFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const unreadInquiriesCount = inquiries.filter((inq) => inq.status === 'New').length;

  const loadInquiries = async () => {
    try {
      const list = await inquiryService.getAllInquiries();
      setInquiries(list);
    } catch (err) {
      console.warn('loadInquiries error:', err);
    }
  };

  const handleUpdateInquiryStatus = async (id: string, status: InquiryStatus) => {
    setUpdatingStatusId(id);
    try {
      await inquiryService.updateStatus(id, status);
      setInquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item))
      );
      if (selectedInquiry && selectedInquiry.id === id) {
        setSelectedInquiry((prev) => (prev ? { ...prev, status, updatedAt: new Date().toISOString() } : null));
      }
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleRetryInquiryEmail = async (inquiry: Inquiry) => {
    setRetryingInquiryId(inquiry.id);
    setRetryFeedback(null);
    try {
      const res = await inquiryService.retryEmail(inquiry.id, inquiry);
      setRetryFeedback({ id: inquiry.id, success: res.success, message: res.message });
      if (res.success) {
        const updatedList = await inquiryService.getAllInquiries();
        setInquiries(updatedList);
        if (selectedInquiry && selectedInquiry.id === inquiry.id) {
          const updated = updatedList.find((i) => i.id === inquiry.id);
          if (updated) setSelectedInquiry(updated);
        }
      }
    } catch (err: any) {
      setRetryFeedback({ id: inquiry.id, success: false, message: err?.message || 'Retry attempt failed.' });
    } finally {
      setRetryingInquiryId(null);
    }
  };

  const handleOpenInquiry = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    if (inquiry.status === 'New') {
      handleUpdateInquiryStatus(inquiry.id, 'Read');
    }
  };

  // Load all real data from Firebase
  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedRooms, fetchedLogs, fetchedInquiries] = await Promise.all([
        adminService.getAllUsers().catch(() => []),
        roomService.getAllRoomsForAdmin().catch(() => []),
        adminService.getAuditLogs().catch(() => []),
        inquiryService.getAllInquiries().catch(() => [])
      ]);
      setUsers(fetchedUsers);
      setRooms(fetchedRooms);
      setLogs(fetchedLogs);
      setInquiries(fetchedInquiries);
    } catch (err) {
      console.error("Admin data loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminRoles = async () => {
    setIsRefreshingRoles(true);
    try {
      const [email, admins] = await Promise.all([
        adminRoleService.getRealAdminEmailAsync(),
        adminRoleService.fetchAssignedAdminsFromFirestore()
      ]);
      setRealAdminEmail(email);
      setAssignedAdmins(admins);
      setCustomLogoUrl(adminRoleService.getCustomLogo());
    } catch (e) {
      console.warn("loadAdminRoles error:", e);
      setRealAdminEmail(adminRoleService.getRealAdminEmail());
      setAssignedAdmins(adminRoleService.getAssignedAdmins());
    } finally {
      setIsRefreshingRoles(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
    loadAdminRoles();
    loadShowcasePhotos();
    const unsubShowcase = showcaseService.initSync();
    let unsubInquiries = () => {};
    if (isAdmin) {
      unsubInquiries = inquiryService.subscribeInquiries((list) => {
        setInquiries(list);
      });
    }

    const handleConfigChange = () => {
      loadAdminRoles();
    };
    const handleShowcaseChange = () => loadShowcasePhotos();
    window.addEventListener('khojam_admin_config_changed', handleConfigChange);
    window.addEventListener('khojam_logo_changed', handleConfigChange);
    window.addEventListener('khojam_showcase_updated', handleShowcaseChange);

    return () => {
      unsubShowcase();
      unsubInquiries();
      window.removeEventListener('khojam_admin_config_changed', handleConfigChange);
      window.removeEventListener('khojam_logo_changed', handleConfigChange);
      window.removeEventListener('khojam_showcase_updated', handleShowcaseChange);
    };
  }, [isAdmin]);

  // Handlers for Admin Role Assignment & Management
  const handleAssignAdminRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const cleanTarget = assignGmail.trim().toLowerCase();
    setIsAssigning(true);
    setAssignFeedback({ type: 'success', text: `Writing admin role for ${cleanTarget} to Firestore...` });
    try {
      const res = await adminRoleService.assignAdminRole(cleanTarget, assignDurationHours, currentUser.email);
      if (res.success) {
        setAssignFeedback({ type: 'success', text: res.message });
        setAssignGmail('');
        const freshList = await adminRoleService.fetchAssignedAdminsFromFirestore();
        setAssignedAdmins(freshList);
      } else {
        setAssignFeedback({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setAssignFeedback({ type: 'error', text: err?.message || 'Failed to save admin assignment to Firestore.' });
    } finally {
      setIsAssigning(false);
      setTimeout(() => setAssignFeedback(null), 5000);
    }
  };

  const handleRemoveAdmin = async (targetEmail: string) => {
    if (!currentUser) return;
    const cleanTarget = targetEmail.trim().toLowerCase();
    setRevokingEmail(cleanTarget);
    setAssignFeedback({ type: 'success', text: `Deleting admin privileges for ${cleanTarget} from Firestore...` });
    try {
      const res = await adminRoleService.removeAdminAccess(cleanTarget, currentUser.email);
      if (res.success) {
        setAssignFeedback({ type: 'success', text: res.message });
        const freshList = await adminRoleService.fetchAssignedAdminsFromFirestore();
        setAssignedAdmins(freshList);
      } else {
        setAssignFeedback({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setAssignFeedback({ type: 'error', text: err?.message || 'Failed to remove admin from Firestore.' });
    } finally {
      setRevokingEmail(null);
      setTimeout(() => setAssignFeedback(null), 5000);
    }
  };

  const handleCheckExpirations = async () => {
    setIsCheckingExpirations(true);
    setAssignFeedback({ type: 'success', text: 'Checking active admin expiration timestamps in Firestore...' });
    try {
      const result = await adminRoleService.checkAndRevokeExpiredAdmins();
      const freshList = await adminRoleService.fetchAssignedAdminsFromFirestore();
      setAssignedAdmins(freshList);
      if (result.revokedCount > 0) {
        setAssignFeedback({ 
          type: 'success', 
          text: `Auto-revocation complete: Automatically revoked ${result.revokedCount} expired admin account(s): ${result.revokedEmails.join(', ')}.` 
        });
      } else {
        setAssignFeedback({ 
          type: 'success', 
          text: 'Auto-expiration audit complete: All temporary admin access timestamps are currently active and valid.' 
        });
      }
    } catch (err: any) {
      setAssignFeedback({ type: 'error', text: err?.message || 'Failed to check admin expirations.' });
    } finally {
      setIsCheckingExpirations(false);
      setTimeout(() => setAssignFeedback(null), 6000);
    }
  };

  const handleChangeRealAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isTransferring) return;

    const cleanInput = newRealAdminInput.trim().toLowerCase();
    if (!cleanInput || !cleanInput.includes('@') || !cleanInput.includes('.')) {
      setTransferFeedback({ type: 'error', text: 'Please enter a valid Gmail / email address.' });
      setTimeout(() => setTransferFeedback(null), 5000);
      return;
    }

    if (cleanInput === realAdminEmail.trim().toLowerCase()) {
      setTransferFeedback({ type: 'error', text: `${cleanInput} is already the current Super Admin email.` });
      setTimeout(() => setTransferFeedback(null), 5000);
      return;
    }

    setIsTransferring(true);
    setTransferFeedback(null);

    try {
      const res = await adminRoleService.updateRealAdminEmail(cleanInput, currentUser.email);
      if (res.success) {
        setTransferFeedback({ type: 'success', text: res.message });
        setNewRealAdminInput('');
        const updatedSuper = adminRoleService.getRealAdminEmail();
        setRealAdminEmail(updatedSuper);
        await loadAdminRoles();
      } else {
        setTransferFeedback({ type: 'error', text: res.message });
        setRealAdminEmail(adminRoleService.getRealAdminEmail());
      }
    } catch (err: any) {
      setTransferFeedback({ type: 'error', text: err?.message || 'Failed to update Super Admin in Firestore.' });
      setRealAdminEmail(adminRoleService.getRealAdminEmail());
    } finally {
      setIsTransferring(false);
      setTimeout(() => setTransferFeedback(null), 6000);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      setLogoFeedback("Please upload a valid image file (PNG, JPG, SVG, WebP).");
      setTimeout(() => setLogoFeedback(null), 4000);
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setCustomLogoUrl(dataUrl); // Immediate optimistic UI update
      await adminRoleService.setCustomLogo(dataUrl);
      const savedLogo = adminRoleService.getCustomLogo();
      setCustomLogoUrl(savedLogo || dataUrl);
      setLogoFeedback("Logo successfully updated in database, app homescreen, and browser favicon!");
      setTimeout(() => setLogoFeedback(null), 4000);
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = async () => {
    await adminRoleService.resetCustomLogo();
    setCustomLogoUrl(null);
    setLogoFeedback("Reset to default Khojamm room-finder logo.");
    setTimeout(() => setLogoFeedback(null), 3000);
  };

  // Showcase Photos CRUD Handlers
  const loadShowcasePhotos = () => {
    setShowcasePhotos(showcaseService.getPhotos());
  };

  const handleShowcaseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      setShowcaseFeedback({ type: 'error', text: 'Please select a valid image file (JPEG, PNG, WebP).' });
      return;
    }
    setUploadingShowcaseImg(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setShowcaseImageInput(event.target?.result as string);
      setUploadingShowcaseImg(false);
    };
    reader.onerror = () => {
      setShowcaseFeedback({ type: 'error', text: 'Failed to read image file.' });
      setUploadingShowcaseImg(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveShowcasePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showcaseImageInput.trim()) {
      setShowcaseFeedback({ type: 'error', text: 'Please select or upload an image file.' });
      return;
    }

    if (editingShowcaseId) {
      const res = await showcaseService.updatePhoto(editingShowcaseId, {
        url: showcaseImageInput.trim(),
        title: showcaseTitle.trim(),
        caption: showcaseCaption.trim()
      });
      if (res.success) {
        setShowcaseFeedback({ type: 'success', text: res.message });
        setEditingShowcaseId(null);
        setShowcaseImageInput('');
        setShowcaseTitle('');
        setShowcaseCaption('');
        loadShowcasePhotos();
      } else {
        setShowcaseFeedback({ type: 'error', text: res.message });
      }
    } else {
      if (showcasePhotos.length >= MAX_SHOWCASE_PHOTOS) {
        setShowcaseFeedback({ 
          type: 'error', 
          text: `Maximum limit of ${MAX_SHOWCASE_PHOTOS} showcase photos reached. Please edit or delete an existing photo.` 
        });
        return;
      }
      const res = await showcaseService.addPhoto({
        url: showcaseImageInput.trim(),
        title: showcaseTitle.trim(),
        caption: showcaseCaption.trim()
      });
      if (res.success) {
        setShowcaseFeedback({ type: 'success', text: res.message });
        setShowcaseImageInput('');
        setShowcaseTitle('');
        setShowcaseCaption('');
        loadShowcasePhotos();
      } else {
        setShowcaseFeedback({ type: 'error', text: res.message });
      }
    }
    setTimeout(() => setShowcaseFeedback(null), 4000);
  };

  const handleStartEditShowcase = (photo: ShowcasePhoto) => {
    setEditingShowcaseId(photo.id);
    setShowcaseImageInput(photo.url);
    setShowcaseTitle(photo.title);
    setShowcaseCaption(photo.caption);
    setShowcaseFeedback(null);
  };

  const handleCancelEditShowcase = () => {
    setEditingShowcaseId(null);
    setShowcaseImageInput('');
    setShowcaseTitle('');
    setShowcaseCaption('');
    setShowcaseFeedback(null);
  };

  const handleDeleteShowcase = async (id: string, title?: string) => {
    const cleanId = String(id).trim();
    // Immediate optimistic removal from state array
    setShowcasePhotos((prev) => prev.filter((p) => String(p.id).trim() !== cleanId));
    if (editingShowcaseId === cleanId) {
      handleCancelEditShowcase();
    }
    try {
      const res = await showcaseService.deletePhoto(cleanId);
      if (res.success) {
        setShowcaseFeedback({ type: 'success', text: `Photo "${title || 'Showcase Image'}" deleted successfully.` });
        loadShowcasePhotos();
      } else {
        setShowcaseFeedback({ type: 'error', text: res.message });
        loadShowcasePhotos();
      }
    } catch (err: any) {
      console.warn("Delete photo error:", err);
      loadShowcasePhotos();
    }
    setTimeout(() => setShowcaseFeedback(null), 3500);
  };

  const handleResetShowcase = async () => {
    const res = await showcaseService.resetToDefaults();
    setShowcaseFeedback({ type: 'success', text: res.message });
    loadShowcasePhotos();
    handleCancelEditShowcase();
    setTimeout(() => setShowcaseFeedback(null), 3000);
  };

  // Compute Dashboard Statistics
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status !== 'blocked').length;
  const blockedUsers = users.filter(u => u.status === 'blocked').length;
  const totalListings = rooms.length;
  const activeListings = rooms.filter(r => r.status === 'active').length;
  const expiringListings = rooms.filter(r => r.status === 'expiring_soon').length;
  const expiredListings = rooms.filter(r => r.status === 'expired' || r.status === 'unavailable').length;

  // Handlers for User Moderation
  const handleBlockUser = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    if (targetUser.role === 'admin') return;
    const reason = 'Violation of listing terms';
    try {
      await adminService.blockUser(currentUser.uid, currentUser.email, targetUser.uid, reason);
      await loadAllAdminData();
    } catch {
      console.warn("Failed to block user.");
    }
  };

  const handleUnblockUser = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    try {
      await adminService.unblockUser(currentUser.uid, currentUser.email, targetUser.uid);
      await loadAllAdminData();
    } catch {
      console.warn("Failed to unblock user.");
    }
  };

  const handleDeleteUser = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    if (targetUser.role === 'admin') return;
    try {
      await adminService.deleteUser(currentUser.uid, currentUser.email, targetUser.uid);
      await loadAllAdminData();
    } catch {
      console.warn("Failed to delete user.");
    }
  };

  // Handlers for Listing Management in Admin
  const handleConfirmAdminDeleteRoom = async () => {
    if (!roomToDeleteInAdmin || !currentUser) return;
    const rId = roomToDeleteInAdmin.id;
    const rTitle = roomToDeleteInAdmin.title;
    setDeletingRoomId(rId);
    try {
      await roomService.deleteRoomListing(rId);
      await adminService.logAdminAction(
        currentUser.uid,
        currentUser.email,
        'DELETE_ROOM',
        'room',
        rId,
        `Room "${rTitle}" deleted by admin.`
      );
      setRoomToDeleteInAdmin(null);
      await loadAllAdminData();
    } catch {
      console.warn("Failed to delete room.");
    } finally {
      setDeletingRoomId(null);
    }
  };

  const handleOpenEditRoom = (room: Room) => {
    setEditingRoom(room);
    setEditTitle(room.title);
    setEditRent(room.rent);
    setEditStatus(room.status);
  };

  const handleSaveRoomEdit = async () => {
    if (!editingRoom || !currentUser) return;
    setSavingEdit(true);
    try {
      await roomService.updateRoomListing(editingRoom.id, {
        title: editTitle.trim(),
        rent: editRent,
        status: editStatus
      });
      await adminService.logAdminAction(
        currentUser.uid,
        currentUser.email,
        'UPDATE_ROOM',
        'room',
        editingRoom.id,
        `Updated room title to "${editTitle}", rent to NPR ${editRent}, status to ${editStatus}`
      );
      setEditingRoom(null);
      await loadAllAdminData();
    } catch (err) {
      console.warn("Failed to update listing:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  // Filtering users
  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q)
    );
  });

  // Filtering rooms
  const filteredRooms = rooms.filter(r => {
    if (roomStatusFilter !== 'All' && r.status !== roomStatusFilter) {
      return false;
    }
    const q = roomSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      r.title.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      r.ownerName?.toLowerCase().includes(q) ||
      r.ownerEmail?.toLowerCase().includes(q)
    );
  });

  // If unauthorized access
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F5E9E7] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-[#ECC5C6] text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">Admin Authorization Required</h2>
          <p className="text-xs text-stone-500 mt-2 leading-relaxed">
            {currentUser 
              ? `You are signed in as ${currentUser.email}, which does not have administrator privileges. Please sign in with an authorized administrator account (e.g., ${adminRoleService.getRealAdminEmail()}).`
              : `This area is restricted to authorized system administrators. Please sign in with an administrator account (e.g., ${adminRoleService.getRealAdminEmail()}).`}
          </p>
          <div className="mt-5 space-y-2">
            {onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="w-full py-2.5 px-4 rounded-xl bg-[#4A282A] hover:bg-[#3D1E20] text-white font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <Key className="w-4 h-4 text-amber-300" />
                <span>Sign In with Administrator Account</span>
              </button>
            )}
            <button
              onClick={onBackToApp}
              className="w-full py-2 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs cursor-pointer transition-colors"
            >
              Return to User Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5E9E7] flex flex-col antialiased w-full max-w-full overflow-x-hidden">
      {/* Admin Top Header */}
      <header className="bg-stone-900 text-white border-b border-stone-800 px-4 sm:px-6 py-3.5 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToApp}
              className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to App</span>
            </button>
            <div className="h-5 w-px bg-stone-700 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div 
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#4A282A] border-2 border-[#ECC5C6] text-white flex items-center justify-center font-bold shadow-xs overflow-hidden shrink-0 transition-transform hover:scale-105 cursor-pointer"
                title="Khojamm App Logo"
              >
                {customLogoUrl ? (
                  <img src={customLogoUrl} alt="App Logo" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 2.5L26.5 11.2L24.8 13.2L16 6L7.2 13.2L5.5 11.2L16 2.5Z" fill="#ECC5C6" />
                    <path d="M8.5 7.5C8.5 6.67 9.17 6 10 6H12C12.83 6 13.5 6.67 13.5 7.5V26.5C13.5 27.33 12.83 28 12 28H10C9.17 28 8.5 27.33 8.5 26.5V7.5Z" fill="#FFFFFF" />
                    <path d="M14 17.5L21.5 8C22.1 7.2 23.1 7.1 23.8 7.7L24.9 8.7C25.6 9.3 25.6 10.3 25 11L17.2 19L25.3 26C25.9 26.6 25.9 27.6 25.2 28.3L24 29.3C23.3 29.9 22.3 29.8 21.7 29.1L14 19.8V17.5Z" fill="#FFFFFF" />
                    <circle cx="23.5" cy="5" r="2" fill="#ECC5C6" />
                  </svg>
                )}
              </div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight">
                Khojamm Admin Control Panel
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#ECC5C6]/20 text-[#ECC5C6] border border-[#ECC5C6]/30">
                Production Backend
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAllAdminData}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Refresh Real Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <div className="text-right text-xs">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-stone-400 hidden xs:inline">Admin: </span>
                <span className="font-semibold text-teal-400 max-w-[120px] sm:max-w-none truncate block sm:inline">{currentUser?.email}</span>
              </div>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 mt-0.5 rounded-md ${
                isRealAdmin 
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' 
                  : 'bg-teal-400/20 text-teal-300 border border-teal-400/40'
              }`}>
                {isRealAdmin ? 'Super Admin' : 'Assigned Admin'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Body with Navigation & Views */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-60 shrink-0">
          <nav className="bg-white rounded-2xl border border-[#ECC5C6] p-2 shadow-xs flex md:flex-col overflow-x-auto gap-1.5 md:gap-1 md:space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`shrink-0 md:w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer gap-2 ${
                activeTab === 'dashboard'
                  ? 'bg-[#4A282A] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-[#F5E9E7] hover:text-[#4A282A]'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Dashboard</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60 hidden md:block" />
            </button>

            {/* Admins & Logo Management Tab */}
            <button
              onClick={() => setActiveTab('admins')}
              className={`shrink-0 md:w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer gap-2 ${
                activeTab === 'admins'
                  ? 'bg-[#4A282A] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-[#F5E9E7] hover:text-[#4A282A]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="whitespace-nowrap">Admins &amp; Logo</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold shrink-0">
                {assignedAdmins.filter(a => a.status === 'active').length + 1}
              </span>
            </button>

            {/* Showcase Sliding Photos Tab */}
            <button
              onClick={() => setActiveTab('showcase')}
              className={`shrink-0 md:w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer gap-2 ${
                activeTab === 'showcase'
                  ? 'bg-[#4A282A] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-[#F5E9E7] hover:text-[#4A282A]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="whitespace-nowrap">Showcase Photos</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold shrink-0">
                {showcasePhotos.length}/5
              </span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`shrink-0 md:w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer gap-2 ${
                activeTab === 'users'
                  ? 'bg-[#4A282A] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-[#F5E9E7] hover:text-[#4A282A]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Manage Users</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 shrink-0">
                {users.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('listings')}
              className={`shrink-0 md:w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer gap-2 ${
                activeTab === 'listings'
                  ? 'bg-[#4A282A] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-[#F5E9E7] hover:text-[#4A282A]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Manage Rooms</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 shrink-0">
                {rooms.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`shrink-0 md:w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer gap-2 ${
                activeTab === 'logs'
                  ? 'bg-[#4A282A] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-[#F5E9E7] hover:text-[#4A282A]'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Audit Logs</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 shrink-0">
                {logs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('inquiries')}
              className={`shrink-0 md:w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer gap-2 ${
                activeTab === 'inquiries'
                  ? 'bg-[#4A282A] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-[#F5E9E7] hover:text-[#4A282A]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Inquiry</span>
              </div>
              {unreadInquiriesCount > 0 ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold shrink-0 animate-pulse">
                  {unreadInquiriesCount} new
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 shrink-0">
                  {inquiries.length}
                </span>
              )}
            </button>
          </nav>
        </aside>

        {/* Tab Main Content */}
        <main className="flex-1 min-w-0">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">System Overview</h2>
                <p className="text-xs text-stone-500 mt-0.5">Real-time statistics from Firebase Firestore</p>
              </div>

              {/* Stats Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                  <p className="text-xs text-stone-500 font-semibold uppercase tracking-wider">Total Users</p>
                  <p className="text-2xl font-extrabold text-stone-900 mt-1">{totalUsers}</p>
                  <p className="text-[11px] text-[#4A282A] font-medium mt-1">{activeUsers} active</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                  <p className="text-xs text-stone-500 font-semibold uppercase tracking-wider">Active Users</p>
                  <p className="text-2xl font-extrabold text-emerald-800 mt-1">{activeUsers}</p>
                  <p className="text-[11px] text-stone-400 mt-1">Normal standing</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                  <p className="text-xs text-stone-500 font-semibold uppercase tracking-wider">Blocked Users</p>
                  <p className="text-2xl font-extrabold text-rose-700 mt-1">{blockedUsers}</p>
                  <p className="text-[11px] text-rose-500 mt-1">Suspended access</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                  <p className="text-xs text-stone-500 font-semibold uppercase tracking-wider">Active Listings</p>
                  <p className="text-2xl font-extrabold text-[#4A282A] mt-1">{activeListings}</p>
                  <p className="text-[11px] text-stone-400 mt-1">Live in search</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                  <p className="text-xs text-stone-500 font-semibold uppercase tracking-wider">Expiring Listings</p>
                  <p className="text-2xl font-extrabold text-amber-700 mt-1">{expiringListings}</p>
                  <p className="text-[11px] text-amber-600 mt-1">&lt; 72 hours left</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                  <p className="text-xs text-stone-500 font-semibold uppercase tracking-wider">Expired / Closed</p>
                  <p className="text-2xl font-extrabold text-stone-600 mt-1">{expiredListings}</p>
                  <p className="text-[11px] text-stone-400 mt-1">Removed from search</p>
                </div>

                <div 
                  onClick={() => setActiveTab('inquiries')}
                  className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-[#8A4A4D] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-stone-500 font-semibold uppercase tracking-wider">Inquiries</p>
                    <Mail className="w-4 h-4 text-[#8A4A4D] group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-2xl font-extrabold text-stone-900 mt-1">{inquiries.length}</p>
                  <p className="text-[11px] text-[#8A4A4D] font-bold mt-1">
                    {unreadInquiriesCount > 0 ? `${unreadInquiriesCount} new unread` : 'All reviewed'}
                  </p>
                </div>
              </div>

              {/* Quick Actions & Recent Activity */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
                <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wider">
                  Recent Administrative Actions
                </h3>
                {logs.length === 0 ? (
                  <p className="text-xs text-stone-400">No moderation actions recorded yet.</p>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {logs.slice(0, 5).map((log) => (
                      <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-stone-800">{log.action}</span>
                          <span className="text-stone-500 ml-2">{log.details}</span>
                        </div>
                        <span className="text-stone-400 text-[11px] shrink-0 ml-4">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ADMINS & BRAND LOGO MANAGEMENT */}
          {activeTab === 'admins' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
                  Admin Roles, Access &amp; App Logo
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Manage administrator privileges, temporary duration access, and upload brand logos
                </p>
              </div>

              {/* Status Alert Banner */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                isRealAdmin 
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950' 
                  : 'bg-stone-100 border-stone-300 text-stone-800'
              }`}>
                <Shield className={`w-5 h-5 shrink-0 mt-0.5 ${isRealAdmin ? 'text-amber-600' : 'text-stone-500'}`} />
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">
                    {isRealAdmin ? 'Super Admin' : 'Assigned Administrator'}
                  </h4>
                  <p className="text-xs mt-0.5 leading-relaxed">
                    {isRealAdmin 
                      ? 'You are signed in as Super Admin. You have exclusive authority to assign new administrators with time limits, remove admin access at any time, change the Super Admin account, and update the application logo.'
                      : `You have administrative access to moderate users and rooms. Only the Super Admin (${realAdminEmail}) has permission to assign or revoke other administrators or change the primary admin account.`}
                  </p>
                </div>
              </div>

              {/* Row: Assign New Admin + Change Super Admin */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Assign Admin Role by Entering Gmail ID */}
                <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm">Assign Admin Role</h3>
                        <p className="text-[11px] text-stone-500">Grant admin privileges by entering Gmail ID with duration limit</p>
                      </div>
                    </div>

                    <form onSubmit={handleAssignAdminRole} className="space-y-3.5 mt-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          User Gmail ID *
                        </label>
                        <input
                          type="email"
                          required
                          disabled={!isRealAdmin}
                          value={assignGmail}
                          onChange={(e) => setAssignGmail(e.target.value)}
                          placeholder="e.g. newadmin@gmail.com"
                          className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#4A282A] disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Access Duration *
                        </label>
                        <select
                          disabled={!isRealAdmin}
                          value={assignDurationHours}
                          onChange={(e) => setAssignDurationHours(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#4A282A] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value={1}>1 Hour (Quick Trial / Testing)</option>
                          <option value={24}>24 Hours (1 Day)</option>
                          <option value={72}>3 Days (72 Hours)</option>
                          <option value={168}>7 Days (1 Week)</option>
                          <option value={720}>30 Days (1 Month)</option>
                          <option value={0}>Permanent (Until Super Admin Removes)</option>
                        </select>
                        <p className="text-[10px] text-stone-400 mt-1">
                          Super Admin can revoke or extend access at any time before or after expiration.
                        </p>
                      </div>

                      {assignFeedback && (
                        <div className={`p-2.5 rounded-xl text-xs font-medium ${
                          assignFeedback.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {assignFeedback.text}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={!isRealAdmin || !assignGmail.trim() || isAssigning}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#4A282A] hover:bg-[#381E20] disabled:bg-stone-300 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {isAssigning ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving to Firestore...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Assign Admin Role</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {!isRealAdmin && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-3">
                      * Only the Super Admin ({realAdminEmail}) can assign admin roles.
                    </p>
                  )}
                </div>

                {/* 2. Change Super Admin Gmail Account */}
                <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm">Change Super Admin Account</h3>
                        <p className="text-[11px] text-stone-500">Super Admin can transfer the primary admin role to another Gmail</p>
                      </div>
                    </div>

                    <div className="p-3 bg-[#FBFBFA] rounded-xl border border-stone-200/80 mb-3.5 text-xs">
                      <span className="text-stone-500 block text-[11px]">Current Super Admin:</span>
                      <strong className="text-stone-900 font-mono text-xs">{realAdminEmail}</strong>
                    </div>

                    <form onSubmit={handleChangeRealAdmin} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          New Super Admin Gmail Address *
                        </label>
                        <input
                          type="email"
                          required
                          disabled={!isRealAdmin || isTransferring}
                          value={newRealAdminInput}
                          onChange={(e) => setNewRealAdminInput(e.target.value)}
                          placeholder="e.g. mynewaccount@gmail.com"
                          className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>

                      {transferFeedback && (
                        <div className={`p-2.5 rounded-xl text-xs font-medium ${
                          transferFeedback.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {transferFeedback.text}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={!isRealAdmin || !newRealAdminInput.trim() || isTransferring}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#4A282A] hover:bg-[#381E20] disabled:bg-stone-300 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {isTransferring ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Updating in Firestore...</span>
                          </>
                        ) : (
                          <>
                            <Key className="w-3.5 h-3.5" />
                            <span>Update Super Admin Gmail</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {!isRealAdmin && (
                    <p className="text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-200 mt-3">
                      * Super Admin account can only be changed by {realAdminEmail}.
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Active Administrators List & Access Control */}
              <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm">Active Administrator Accounts</h3>
                    <p className="text-[11px] text-stone-500">
                      Synchronized with Firestore backend collection • Super Admin can revoke access anytime
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCheckExpirations}
                      disabled={isCheckingExpirations}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-60"
                      title="Run backend auto-expiration audit and demote expired accounts in Firestore"
                    >
                      <Clock className={`w-3 h-3 ${isCheckingExpirations ? 'animate-spin' : ''}`} />
                      <span>{isCheckingExpirations ? 'Checking...' : 'Check Expirations'}</span>
                    </button>
                    <button
                      onClick={loadAdminRoles}
                      disabled={isRefreshingRoles}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Fetch fresh roles from Firestore database"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingRoles ? 'animate-spin' : ''}`} />
                      <span>{isRefreshingRoles ? 'Syncing...' : 'Sync Roles'}</span>
                    </button>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F5E9E7] text-[#4A282A] border border-[#ECC5C6]">
                      {assignedAdmins.filter(a => a.status === 'active').length + 1} Total Admins
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-stone-100 border border-stone-100 rounded-2xl overflow-hidden">
                  {/* Master Super Admin Row */}
                  <div className="p-3.5 sm:p-4 bg-amber-50/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        ★
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 text-xs">{realAdminEmail}</span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-900 font-extrabold text-[10px] uppercase">
                            Super Admin
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500">Permanent Super Administrator • Master Access Control</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-stone-400 italic">
                      Protected (Cannot be removed)
                    </span>
                  </div>

                  {/* Assigned Admins Rows */}
                  {assignedAdmins.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-400">
                      No temporary or assigned administrators currently added. Enter a Gmail ID above to grant access.
                    </div>
                  ) : (
                    assignedAdmins.map((admin) => {
                      const expiryTime = admin.expiresAtMillis || (admin.expiresAt ? new Date(admin.expiresAt).getTime() : null);
                      const isExpired = admin.status === 'expired' || (expiryTime ? expiryTime <= Date.now() : false);
                      const isRevokingThis = revokingEmail === admin.email;
                      const timeLeftStr = expiryTime && !isExpired ? (() => {
                        const diffMins = Math.max(0, Math.floor((expiryTime - Date.now()) / 60000));
                        if (diffMins < 60) return `${diffMins}m left`;
                        const hours = Math.floor(diffMins / 60);
                        const mins = diffMins % 60;
                        if (hours < 24) return `${hours}h ${mins}m left`;
                        const days = Math.floor(hours / 24);
                        return `${days}d left`;
                      })() : null;

                      return (
                        <div key={admin.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-stone-50/60 transition-colors">
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#4A282A] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0">
                              A
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-stone-900 text-xs break-all sm:break-normal">{admin.email}</span>
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider shrink-0 ${
                                  isExpired 
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {isExpired ? 'Auto-Expired & Revoked' : (timeLeftStr ? `Active (${timeLeftStr})` : 'Active (Permanent)')}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                                <span>Duration: <strong>{admin.durationLabel}</strong></span>
                                <span>•</span>
                                <span>Expires: {admin.expiresAt ? new Date(admin.expiresAt).toLocaleString() : 'Permanent (No expiry)'}</span>
                                <span>•</span>
                                <span>Assigned by: {admin.assignedBy}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Button: ONLY Super Admin can remove admin */}
                          <div>
                            {isRealAdmin ? (
                              <button
                                onClick={() => handleRemoveAdmin(admin.email)}
                                disabled={isRevokingThis}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                title="Revoke admin access immediately"
                              >
                                {isRevokingThis ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Revoking...</span>
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove Access</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-[11px] text-stone-400">
                                Super Admin Only
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 4. Application Logo Upload & Management */}
              <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center font-bold">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm">App Logo Picture &amp; Branding</h3>
                    <p className="text-[11px] text-stone-500">
                      Upload a custom picture logo so that the logo updates dynamically across the entire application and persists in Firebase
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-[#FBFBFA] rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#4A282A] text-white flex items-center justify-center font-bold shadow-md border-2 border-[#ECC5C6] overflow-hidden shrink-0">
                      {customLogoUrl ? (
                        <img src={customLogoUrl} alt="Custom Logo Preview" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-9 h-9 text-white" viewBox="0 0 32 32" fill="none">
                          <path d="M16 2.5L26.5 11.2L24.8 13.2L16 6L7.2 13.2L5.5 11.2L16 2.5Z" fill="#ECC5C6" />
                          <path d="M8.5 7.5C8.5 6.67 9.17 6 10 6H12C12.83 6 13.5 6.67 13.5 7.5V26.5C13.5 27.33 12.83 28 12 28H10C9.17 28 8.5 27.33 8.5 26.5V7.5Z" fill="#FFFFFF" />
                          <path d="M14 17.5L21.5 8C22.1 7.2 23.1 7.1 23.8 7.7L24.9 8.7C25.6 9.3 25.6 10.3 25 11L17.2 19L25.3 26C25.9 26.6 25.9 27.6 25.2 28.3L24 29.3C23.3 29.9 22.3 29.8 21.7 29.1L14 19.8V17.5Z" fill="#FFFFFF" />
                          <circle cx="23.5" cy="5" r="2" fill="#ECC5C6" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-stone-800">
                        {customLogoUrl ? 'Custom Picture Logo Active' : 'Modern Khojamm Room-Finder Logo'}
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {customLogoUrl 
                          ? 'This custom picture is currently rendered across headers, navigation, and logos.' 
                          : 'You can upload your brand image file (PNG, JPG, SVG, WebP) to replace it anytime.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="px-4 py-2.5 rounded-xl bg-[#4A282A] hover:bg-[#381E20] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload New Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {customLogoUrl && (
                      <button
                        onClick={handleResetLogo}
                        className="px-3 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        title="Reset to default logo"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                {logoFeedback && (
                  <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 animate-in fade-in flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{logoFeedback}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SHOWCASE SLIDING PHOTOS MANAGEMENT */}
          {activeTab === 'showcase' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
                      Home Showcase Sliding Photos
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ECC5C6] text-[#4A282A] border border-[#DEACAE]">
                      {showcasePhotos.length}/5 Limit
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Only photos uploaded here from the admin dashboard will be shown in the sliding image showcase on the Home screen.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetShowcase}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Reset to default curated photos"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Defaults</span>
                </button>
              </div>

              {/* Feedback Alert */}
              {showcaseFeedback && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  showcaseFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {showcaseFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{showcaseFeedback.text}</span>
                </div>
              )}

              {/* Upload & Edit Form Card */}
              <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#4A282A] text-white flex items-center justify-center font-bold text-xs">
                      {editingShowcaseId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm">
                        {editingShowcaseId ? 'Edit Showcase Photo' : 'Upload New Showcase Photo'}
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        {editingShowcaseId 
                          ? 'Modify image, title, or location details' 
                          : `Add a photo to the home sliding photos (Maximum 5 images allowed)`}
                      </p>
                    </div>
                  </div>
                  {editingShowcaseId && (
                    <button
                      type="button"
                      onClick={handleCancelEditShowcase}
                      className="text-xs text-stone-500 hover:text-stone-800 font-semibold px-2.5 py-1 rounded-lg border border-stone-200 cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                {!editingShowcaseId && showcasePhotos.length >= 5 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      Maximum 5 Showcase Photos Limit Reached
                    </p>
                    <p className="mt-1 text-[11px] text-amber-800">
                      You currently have 5 sliding photos. To add a new photo, please edit or delete an existing photo from the list below.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSaveShowcasePhoto} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                          <span>Room Image *</span>
                          <span className="text-[10px] text-stone-400 font-normal">File upload or URL</span>
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="px-3.5 py-2 rounded-xl bg-[#ECC5C6] hover:bg-[#DEACAE] text-[#4A282A] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{uploadingShowcaseImg ? 'Processing...' : 'Upload Image File'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleShowcaseImageUpload}
                                className="hidden"
                                disabled={uploadingShowcaseImg}
                              />
                            </label>
                            <span className="text-[11px] text-stone-400">or enter image URL</span>
                          </div>
                          <input
                            type="url"
                            value={showcaseImageInput.startsWith('data:') ? '' : showcaseImageInput}
                            onChange={(e) => setShowcaseImageInput(e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A282A]/20"
                          />
                        </div>
                        {showcaseImageInput && (
                          <div className="mt-2.5 relative aspect-video w-full max-w-xs rounded-xl overflow-hidden border border-stone-200 bg-stone-900 shadow-xs">
                            <img
                              src={showcaseImageInput}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold">
                              Preview
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                            <span>Room / Listing Title (Optional)</span>
                            <span className="text-[10px] text-stone-400 font-normal">Can upload photo only</span>
                          </label>
                          <input
                            type="text"
                            value={showcaseTitle}
                            onChange={(e) => setShowcaseTitle(e.target.value)}
                            placeholder="e.g. Modern 2BHK Apartment (or leave blank)"
                            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#4A282A]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center justify-between">
                            <span>Location / Caption (Optional)</span>
                            <span className="text-[10px] text-stone-400 font-normal">Optional</span>
                          </label>
                          <input
                            type="text"
                            value={showcaseCaption}
                            onChange={(e) => setShowcaseCaption(e.target.value)}
                            placeholder="e.g. Baluwatar, Kathmandu"
                            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#4A282A]"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={!showcaseImageInput.trim() || uploadingShowcaseImg}
                            className="px-6 py-2.5 rounded-xl bg-[#4A282A] hover:bg-[#381E20] disabled:bg-stone-300 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{editingShowcaseId ? 'Save Changes' : 'Add to Home Sliding Photos'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Showcase Photos List */}
              <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-stone-900 text-sm">
                    Current Sliding Photos ({showcasePhotos.length}/5)
                  </h3>
                  <span className="text-[11px] text-stone-400">
                    Sliding in serial order on Home screen
                  </span>
                </div>

                {showcasePhotos.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 text-xs">
                    No showcase photos uploaded yet. Use the form above to add sliding photos.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {showcasePhotos.map((photo, idx) => (
                      <div
                        key={photo.id}
                        className="group relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-50 flex flex-col shadow-2xs hover:shadow-md transition-shadow"
                      >
                        <div className="relative aspect-video w-full overflow-hidden bg-stone-900">
                          <img
                            src={photo.url}
                            alt={photo.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#4A282A] text-white text-[10px] font-bold shadow-xs">
                            Slide #{idx + 1}
                          </div>
                        </div>

                        <div className="p-3.5 flex-1 flex flex-col justify-between bg-white">
                          <div>
                            <h4 className="font-bold text-stone-900 text-xs line-clamp-1">
                              {photo.title || photo.caption || `Showcase Photo #${idx + 1}`}
                            </h4>
                            {photo.caption && photo.title && (
                              <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                                📍 {photo.caption}
                              </p>
                            )}
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-end gap-1.5 relative z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditShowcase(photo);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Edit Photo"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteShowcase(photo.id, photo.title);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
                              title="Delete Photo"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: USERS MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">User Management</h2>
                  <p className="text-xs text-stone-500">View, search, block, and manage registered accounts</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A282A]/20"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FBFBFA] border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-stone-400">
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isUserBlocked = u.status === 'blocked';
                          return (
                            <tr key={u.uid} className="hover:bg-stone-50/60 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.email)}`}
                                    alt={u.name}
                                    className="w-8 h-8 rounded-lg object-cover bg-stone-100"
                                  />
                                  <div>
                                    <p className="font-bold text-stone-900">{u.name || 'Unnamed'}</p>
                                    <p className="text-stone-400 text-[11px]">{u.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                  u.role === 'admin' ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                  isUserBlocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {isUserBlocked ? 'BLOCKED' : 'ACTIVE'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-stone-500">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isUserBlocked ? (
                                    <button
                                      onClick={() => handleUnblockUser(u)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                      title="Unblock user"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Unblock</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleBlockUser(u)}
                                      disabled={u.role === 'admin'}
                                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold flex items-center gap-1 disabled:opacity-30 cursor-pointer"
                                      title="Block user"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                      <span>Block</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    disabled={u.role === 'admin'}
                                    className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 disabled:opacity-30 cursor-pointer"
                                    title="Permanently delete user"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MANAGE ROOMS / LISTINGS */}
          {activeTab === 'listings' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Room Listings Management</h2>
                  <p className="text-xs text-stone-500">Edit, activate, deactivate, or delete room listings across Nepal</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={roomStatusFilter}
                    onChange={(e) => setRoomStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="expiring_soon">Expiring Soon</option>
                    <option value="expired">Expired</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                  <div className="relative flex-1 sm:w-60">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={roomSearch}
                      onChange={(e) => setRoomSearch(e.target.value)}
                      placeholder="Search listings..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FBFBFA] border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Room</th>
                        <th className="py-3 px-4">Rent</th>
                        <th className="py-3 px-4">Owner</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Expires</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredRooms.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-stone-400">
                            No listings match filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRooms.map((room) => {
                          const isExpiring = room.status === 'expiring_soon';
                          const isExpired = room.status === 'expired' || room.status === 'unavailable';
                          return (
                            <tr key={room.id} className="hover:bg-stone-50/60 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={room.coverImageUrl || room.imageUrls[0]}
                                    alt={room.title}
                                    className="w-10 h-10 rounded-lg object-cover bg-stone-100 shrink-0"
                                  />
                                  <div className="min-w-0 max-w-xs">
                                    <p className="font-bold text-stone-900 truncate">{room.title}</p>
                                    <p className="text-stone-400 text-[11px] truncate">{room.location}, {room.city}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-bold text-[#4A282A]">
                                NPR {new Intl.NumberFormat('en-NP').format(room.rent)}
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-semibold text-stone-800">{room.ownerName}</p>
                                <p className="text-stone-400 text-[11px] truncate">{room.contactNumber}</p>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                  isExpiring 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : isExpired 
                                    ? 'bg-rose-100 text-rose-800' 
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {room.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-stone-500">
                                {new Date(room.expiresAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {onViewRoomInApp && (
                                    <button
                                      onClick={() => {
                                        onBackToApp();
                                        onViewRoomInApp(room);
                                      }}
                                      className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 cursor-pointer"
                                      title="Preview in App"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenEditRoom(room)}
                                    className="p-1.5 rounded-lg bg-[#F5E9E7] hover:bg-[#ECC5C6] border border-[#ECC5C6] text-[#4A282A] cursor-pointer"
                                    title="Edit listing"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setRoomToDeleteInAdmin(room)}
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                                    title="Delete listing"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Administrative Audit Logs</h2>
                <p className="text-xs text-stone-500">Track all moderations, user blocks, unblocks, and listing updates</p>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="divide-y divide-stone-100">
                  {logs.length === 0 ? (
                    <div className="py-8 text-center text-stone-400 text-xs">
                      No audit events recorded yet.
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="p-4 flex items-start justify-between gap-4 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#4A282A] uppercase tracking-wider text-[11px] px-2 py-0.5 bg-[#F5E9E7] rounded-md border border-[#ECC5C6]">
                              {log.action}
                            </span>
                            <span className="text-stone-400">•</span>
                            <span className="text-stone-600 font-medium">By: {log.adminEmail}</span>
                          </div>
                          <p className="text-stone-800 font-medium mt-1">{log.details}</p>
                          <p className="text-stone-400 text-[10px] mt-0.5">Target ID: {log.targetId}</p>
                        </div>
                        <span className="text-stone-400 text-[11px] shrink-0">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: INQUIRY MANAGEMENT (Real Database & Backend Email Inbox) */}
          {activeTab === 'inquiries' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Inquiry Management</h2>
                    {unreadInquiriesCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-xs">
                        {unreadInquiriesCount} New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Real-time contact messages submitted through Khojamm Contact Us
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadInquiries}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#8A4A4D]" />
                  <span>Refresh Inquiries</span>
                </button>
              </div>

              {/* Feedback toast for retry actions */}
              {retryFeedback && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in ${
                  retryFeedback.success 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {retryFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{retryFeedback.message}</span>
                  </div>
                  <button 
                    onClick={() => setRetryFeedback(null)} 
                    className="text-stone-400 hover:text-stone-700 text-xs cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Search & Filter Controls */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email, subject, or message..."
                      value={inquirySearch}
                      onChange={(e) => setInquirySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#8A4A4D]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={inquiryStatusFilter}
                      onChange={(e) => setInquiryStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Statuses ({inquiries.length})</option>
                      <option value="New">New ({inquiries.filter(i => i.status === 'New').length})</option>
                      <option value="Read">Read ({inquiries.filter(i => i.status === 'Read').length})</option>
                      <option value="Replied">Replied ({inquiries.filter(i => i.status === 'Replied').length})</option>
                      <option value="Resolved">Resolved ({inquiries.filter(i => i.status === 'Resolved').length})</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={inquiryDeliveryFilter}
                      onChange={(e) => setInquiryDeliveryFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Email Deliveries</option>
                      <option value="Sent">Delivered (Sent)</option>
                      <option value="Failed">Failed Delivery</option>
                      <option value="Pending">Pending Delivery</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Inquiries List View */}
              {(() => {
                const q = inquirySearch.toLowerCase().trim();
                const filteredInquiries = inquiries.filter((inq) => {
                  const matchesSearch = !q || 
                    inq.senderName.toLowerCase().includes(q) ||
                    inq.senderEmail.toLowerCase().includes(q) ||
                    inq.id.toLowerCase().includes(q) ||
                    inq.subject.toLowerCase().includes(q) ||
                    inq.message.toLowerCase().includes(q);

                  const matchesStatus = inquiryStatusFilter === 'All' || inq.status === inquiryStatusFilter;
                  const matchesDelivery = inquiryDeliveryFilter === 'All' || inq.emailDeliveryStatus === inquiryDeliveryFilter;

                  return matchesSearch && matchesStatus && matchesDelivery;
                });

                if (filteredInquiries.length === 0) {
                  return (
                    <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-2">
                      <Inbox className="w-10 h-10 text-stone-300 mx-auto" />
                      <h3 className="text-sm font-bold text-stone-700">No Inquiries Found</h3>
                      <p className="text-xs text-stone-400">
                        {inquiries.length === 0 
                          ? 'No contact inquiries have been submitted yet.' 
                          : 'No inquiries match the current search or filter criteria.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {/* Desktop & Tablet Table View */}
                    <div className="hidden md:block bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                              <th className="py-3 px-4">Status &amp; ID</th>
                              <th className="py-3 px-4">Sender</th>
                              <th className="py-3 px-4">Subject &amp; Message</th>
                              <th className="py-3 px-4">Email Delivery</th>
                              <th className="py-3 px-4">Submitted At</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {filteredInquiries.map((inq) => {
                              const isUnread = inq.status === 'New';
                              return (
                                <tr 
                                  key={inq.id}
                                  className={`hover:bg-stone-50/70 transition-colors ${
                                    isUnread ? 'bg-[#F5E9E7]/30 font-medium' : ''
                                  }`}
                                >
                                  {/* Status & ID */}
                                  <td className="py-3 px-4 align-top whitespace-nowrap">
                                    <div className="space-y-1">
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                        inq.status === 'New'
                                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                          : inq.status === 'Read'
                                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                          : inq.status === 'Replied'
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                          : 'bg-stone-100 text-stone-700 border border-stone-200'
                                      }`}>
                                        {inq.status}
                                      </span>
                                      <p className="font-mono text-[10px] text-stone-400">{inq.id}</p>
                                    </div>
                                  </td>

                                  {/* Sender Details */}
                                  <td className="py-3 px-4 align-top">
                                    <div className="space-y-0.5">
                                      <p className="font-bold text-stone-900">{inq.senderName}</p>
                                      <p className="text-stone-500 text-[11px]">{inq.senderEmail}</p>
                                      {inq.senderPhone && (
                                        <p className="text-stone-400 text-[10px]">{inq.senderPhone}</p>
                                      )}
                                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                        inq.senderType === 'registered'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-stone-100 text-stone-600'
                                      }`}>
                                        {inq.senderType === 'registered' ? 'Registered User' : 'Guest'}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Subject & Preview */}
                                  <td className="py-3 px-4 align-top max-w-xs">
                                    <div className="space-y-1">
                                      <p className="font-bold text-stone-800 line-clamp-1">{inq.subject}</p>
                                      <p className="text-stone-500 text-[11px] line-clamp-2 leading-relaxed">
                                        {inq.message}
                                      </p>
                                    </div>
                                  </td>

                                  {/* Email Delivery Status */}
                                  <td className="py-3 px-4 align-top whitespace-nowrap">
                                    <div className="space-y-1">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        inq.emailDeliveryStatus === 'Sent'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : inq.emailDeliveryStatus === 'Failed'
                                          ? 'bg-rose-100 text-rose-700'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {inq.emailDeliveryStatus === 'Sent' && <Check className="w-3 h-3 text-emerald-700" />}
                                        {inq.emailDeliveryStatus === 'Failed' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                                        {inq.emailDeliveryStatus === 'Pending' && <Clock className="w-3 h-3 text-amber-600" />}
                                        <span>{inq.emailDeliveryStatus}</span>
                                      </span>

                                      {inq.emailDeliveryStatus === 'Failed' && (
                                        <button
                                          type="button"
                                          disabled={retryingInquiryId === inq.id}
                                          onClick={() => handleRetryInquiryEmail(inq)}
                                          className="block text-[10px] font-bold text-[#8A4A4D] hover:underline cursor-pointer disabled:opacity-50"
                                        >
                                          {retryingInquiryId === inq.id ? 'Retrying...' : 'Retry Email'}
                                        </button>
                                      )}
                                    </div>
                                  </td>

                                  {/* Date & Time */}
                                  <td className="py-3 px-4 align-top whitespace-nowrap text-stone-500 text-[11px]">
                                    {new Date(inq.createdAt).toLocaleDateString([], {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                    <span className="block text-[10px] text-stone-400">
                                      {new Date(inq.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenInquiry(inq)}
                                        className="px-2.5 py-1 rounded-lg bg-[#4A282A] text-white hover:bg-[#381E20] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                      >
                                        View
                                      </button>

                                      <select
                                        value={inq.status}
                                        disabled={updatingStatusId === inq.id}
                                        onChange={(e) => handleUpdateInquiryStatus(inq.id, e.target.value as InquiryStatus)}
                                        className="px-2 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg text-[11px] font-medium text-stone-700 cursor-pointer focus:outline-none"
                                      >
                                        <option value="New">New</option>
                                        <option value="Read">Read</option>
                                        <option value="Replied">Replied</option>
                                        <option value="Resolved">Resolved</option>
                                      </select>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden space-y-3">
                      {filteredInquiries.map((inq) => {
                        const isUnread = inq.status === 'New';
                        return (
                          <div
                            key={inq.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              isUnread 
                                ? 'bg-white border-rose-300 shadow-xs' 
                                : 'bg-white border-stone-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  inq.status === 'New'
                                    ? 'bg-rose-100 text-rose-700'
                                    : inq.status === 'Read'
                                    ? 'bg-blue-100 text-blue-700'
                                    : inq.status === 'Replied'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-stone-100 text-stone-700'
                                }`}>
                                  {inq.status}
                                </span>
                                <span className="text-[10px] text-stone-400 font-mono">
                                  {inq.id}
                                </span>
                              </div>

                              <span className="text-[10px] text-stone-400">
                                {new Date(inq.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>

                            <div className="space-y-1 mb-3">
                              <h4 className="font-extrabold text-stone-900 text-sm">{inq.subject}</h4>
                              <p className="text-xs text-stone-600 font-medium">
                                From: <strong className="text-stone-900">{inq.senderName}</strong> ({inq.senderEmail})
                              </p>
                              <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mt-1">
                                {inq.message}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inq.emailDeliveryStatus === 'Sent'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : inq.emailDeliveryStatus === 'Failed'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}>
                                <span>Email: {inq.emailDeliveryStatus}</span>
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenInquiry(inq)}
                                  className="px-3 py-1.5 rounded-xl bg-[#4A282A] text-white text-xs font-bold cursor-pointer shadow-2xs"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </main>
      </div>

      {/* VIEW INQUIRY DETAILS MODAL */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F5E9E7] text-[#8A4A4D] flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">
                    Inquiry Details
                  </h3>
                  <p className="font-mono text-[10px] text-stone-500">
                    ID: {selectedInquiry.id} • {new Date(selectedInquiry.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-stone-700 flex-1">
              {/* Sender Information Card */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Sender Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-stone-400 block text-[11px]">Full Name</span>
                    <strong className="text-stone-900 text-sm font-bold">{selectedInquiry.senderName}</strong>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[11px]">Email Address</span>
                    <a 
                      href={`mailto:${selectedInquiry.senderEmail}?subject=Re: ${encodeURIComponent(selectedInquiry.subject)}`}
                      className="text-[#8A4A4D] hover:underline font-bold text-xs inline-flex items-center gap-1"
                    >
                      <span>{selectedInquiry.senderEmail}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[11px]">Phone Number</span>
                    {selectedInquiry.senderPhone ? (
                      <a href={`tel:${selectedInquiry.senderPhone}`} className="text-stone-900 font-semibold hover:underline">
                        {selectedInquiry.senderPhone}
                      </a>
                    ) : (
                      <span className="text-stone-400">Not provided</span>
                    )}
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[11px]">Account Type</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedInquiry.senderType === 'registered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-200 text-stone-700'
                    }`}>
                      {selectedInquiry.senderType === 'registered' 
                        ? `Registered User (${selectedInquiry.userId || ''})` 
                        : 'Guest Visitor'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subject & Full Message */}
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Topic / Subject</span>
                  <h4 className="text-base font-extrabold text-[#382022] mt-0.5">
                    {selectedInquiry.subject}
                  </h4>
                </div>

                <div className="p-4 rounded-2xl bg-[#F5E9E7]/40 border border-[#ECC5C6] space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A4A4D]">Message Content</span>
                  <p className="text-stone-800 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                    {selectedInquiry.message}
                  </p>
                </div>
              </div>

              {/* Real Email Delivery Diagnostics */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Backend Email Delivery Status
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    selectedInquiry.emailDeliveryStatus === 'Sent'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedInquiry.emailDeliveryStatus === 'Failed'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedInquiry.emailDeliveryStatus}
                  </span>
                </div>

                {selectedInquiry.emailSentAt && (
                  <p className="text-[11px] text-stone-500">
                    Delivered on: <strong>{new Date(selectedInquiry.emailSentAt).toLocaleString()}</strong>
                  </p>
                )}

                {selectedInquiry.recipients && selectedInquiry.recipients.length > 0 && (
                  <p className="text-[11px] text-stone-500">
                    Notified Admins: <strong>{selectedInquiry.recipients.join(', ')}</strong>
                  </p>
                )}

                {selectedInquiry.lastEmailError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] leading-relaxed">
                    <strong>Error Diagnostic:</strong> {selectedInquiry.lastEmailError}
                  </div>
                )}

                {/* Retry Email Action */}
                <div className="pt-1 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-stone-400">
                    Notifications are sent to Superadmin and permanent active admins.
                  </p>
                  <button
                    type="button"
                    disabled={retryingInquiryId === selectedInquiry.id}
                    onClick={() => handleRetryInquiryEmail(selectedInquiry)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${retryingInquiryId === selectedInquiry.id ? 'animate-spin' : ''}`} />
                    <span>{retryingInquiryId === selectedInquiry.id ? 'Sending...' : 'Retry Email Delivery'}</span>
                  </button>
                </div>
              </div>

              {/* Status Update Control */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Manage Status</span>
                  <span className="text-xs text-stone-600">Update inquiry workflow status in database</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedInquiry.status}
                    disabled={updatingStatusId === selectedInquiry.id}
                    onChange={(e) => handleUpdateInquiryStatus(selectedInquiry.id, e.target.value as InquiryStatus)}
                    className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-800 cursor-pointer focus:outline-none"
                  >
                    <option value="New">Mark as New</option>
                    <option value="Read">Mark as Read</option>
                    <option value="Replied">Mark as Replied</option>
                    <option value="Resolved">Mark as Resolved</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50/80 gap-3">
              <a
                href={`mailto:${selectedInquiry.senderEmail}?subject=Re: ${encodeURIComponent(selectedInquiry.subject)}`}
                className="px-4 py-2 rounded-xl bg-[#4A282A] text-white font-bold text-xs hover:bg-[#381E20] inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[#ECC5C6]" />
                <span>Reply via Email Client</span>
              </a>

              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                className="px-5 py-2 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room Modal in Admin */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-sm">Edit Listing (Admin)</h3>
              <button onClick={() => setEditingRoom(null)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Monthly Rent (NPR)</label>
              <input
                type="number"
                value={editRent}
                onChange={(e) => setEditRent(Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as RoomStatus)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              >
                <option value="active">Active (Visible)</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="expired">Expired</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setEditingRoom(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={savingEdit}
                onClick={handleSaveRoomEdit}
                className="px-5 py-2 rounded-xl bg-[#4A282A] text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Room Confirmation Modal: Exactly 'Are you sure want to delete this post?' */}
      {roomToDeleteInAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-stone-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900">
              Are you sure want to delete this post?
            </h3>
            <p className="text-xs text-stone-500">
              Listing: &ldquo;{roomToDeleteInAdmin.title}&rdquo; will be deleted from Firebase.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoomToDeleteInAdmin(null)}
                disabled={Boolean(deletingRoomId)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAdminDeleteRoom}
                disabled={Boolean(deletingRoomId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deletingRoomId ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
