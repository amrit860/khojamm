import React, { useState } from 'react';
import { Room } from '../../types';
import { 
  Building, 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  MapPin, 
  Layers,
  AlertTriangle,
  X
} from 'lucide-react';

interface MyListingsViewProps {
  currentUser: any;
  listings: Room[];
  loading: boolean;
  onRefresh: () => void;
  onOpenPostRoom: (roomToEdit?: Room) => void;
  onViewRoomDetails: (room: Room) => void;
  onMarkAsBooked: (room: Room) => Promise<void>;
  onDeleteListing: (roomId: string) => Promise<void>;
  onOpenAuth: () => void;
}

export const MyListingsView: React.FC<MyListingsViewProps> = ({
  currentUser,
  listings,
  loading,
  onRefresh,
  onOpenPostRoom,
  onViewRoomDetails,
  onMarkAsBooked,
  onDeleteListing,
  onOpenAuth
}) => {
  // Confirmation Modal States
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [roomToBook, setRoomToBook] = useState<Room | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-[#ECC5C6] text-[#4A282A] flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Layers className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h2 className="text-xl font-extrabold text-[#382022] tracking-tight">
          Sign In to View Your Listings
        </h2>
        <p className="text-xs text-[#7A595B] max-w-xs mx-auto mt-1.5 leading-relaxed">
          Sign in to manage your posted rental rooms in Nepal, track availability, edit photos, and update rent terms.
        </p>
        <button
          onClick={onOpenAuth}
          className="mt-6 px-6 py-3 rounded-2xl bg-[#4A282A] hover:bg-[#381E20] text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!roomToDelete || actionProcessing) return;
    setActionProcessing(true);
    try {
      await onDeleteListing(roomToDelete.id);
      setFeedbackMessage({ type: 'success', text: 'Listing deleted successfully.' });
      setRoomToDelete(null);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to delete listing. Please retry.' });
    } finally {
      setActionProcessing(false);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  // Handle Booked Confirmation
  const handleConfirmBooked = async () => {
    if (!roomToBook || actionProcessing) return;
    setActionProcessing(true);
    try {
      await onMarkAsBooked(roomToBook);
      setFeedbackMessage({ type: 'success', text: 'Room marked as booked and removed successfully.' });
      setRoomToBook(null);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to mark room as booked. Please retry.' });
    } finally {
      setActionProcessing(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="p-1 hover:opacity-70 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#ECC5C6] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#8A4A4D] uppercase tracking-wider">
            Owner Dashboard
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#382022] tracking-tight mt-0.5">
            My Room Listings ({listings.length})
          </h2>
          <p className="text-xs text-[#7A595B] mt-1">
            Manage your active vacancies, edit details, or mark rooms as booked.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer"
            title="Refresh listings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onOpenPostRoom()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#4A282A] hover:bg-[#381E20] text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Post a Room</span>
          </button>
        </div>
      </div>

      {/* Listings List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#4A282A] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#7A595B]">Loading your room listings...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-[#ECC5C6] p-8 shadow-xs">
          <Building className="w-12 h-12 text-[#ECC5C6] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#382022]">You haven&apos;t posted any rooms yet</h3>
          <p className="text-xs text-[#7A595B] max-w-sm mx-auto mt-1.5 leading-relaxed">
            Have a vacant room or flat in Nepal? Publish your listing with clear photos and direct contact numbers.
          </p>
          <button
            onClick={() => onOpenPostRoom()}
            style={{ backgroundColor: '#ECC5C6' }}
            className="mt-5 px-6 py-2.5 rounded-xl text-[#4A282A] font-bold text-xs shadow-sm border border-[#DEACAE] hover:bg-[#DEACAE] cursor-pointer"
          >
            Post a Room
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((room) => {
            const isExpiring = room.status === 'expiring_soon';
            const isUnavailable = room.status === 'unavailable';
            const formattedRent = new Intl.NumberFormat('en-NP').format(room.rent);

            return (
              <div
                key={room.id}
                className="bg-white border border-[#ECC5C6] rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Media Thumbnail & Details */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 bg-stone-100 border border-stone-200">
                    <img
                      src={room.coverImageUrl || (room.imageUrls && room.imageUrls[0]) || ''}
                      alt={room.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        isExpiring 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : isUnavailable 
                          ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {isExpiring ? 'Expiring Soon' : room.status}
                      </span>
                      <span className="text-xs font-extrabold text-[#4A282A]">
                        NPR {formattedRent} / month
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#F5E9E7] text-[#4A282A] text-[10px] font-bold border border-[#ECC5C6]">
                        {room.roomType}
                      </span>
                    </div>

                    <h4 className="font-bold text-[#382022] text-sm sm:text-base truncate">
                      {room.title}
                    </h4>

                    <div className="flex items-center gap-1.5 text-xs text-[#7A595B] mt-0.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#8A4A4D] shrink-0" />
                      <span className="truncate">{room.location}, {room.city}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400 mt-2">
                      <span>Posted: {new Date(room.createdAt).toLocaleDateString()}</span>
                      <span>Expires: {new Date(room.expiresAt).toLocaleDateString()}</span>
                      <span>Contact: <strong className="text-stone-700">{room.contactNumber}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right Side Action Controls: View, Edit, Mark Booked, Delete */}
                <div className="flex flex-wrap items-center gap-2 self-stretch md:self-center justify-end shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
                  {/* VIEW */}
                  <button
                    type="button"
                    onClick={() => onViewRoomDetails(room)}
                    className="px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="View public details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>

                  {/* EDIT */}
                  <button
                    type="button"
                    onClick={() => onOpenPostRoom(room)}
                    className="px-3.5 py-2 rounded-xl bg-[#F5E9E7] hover:bg-[#ECC5C6] border border-[#ECC5C6] text-[#4A282A] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Edit listing details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {/* MARK BOOKED / BOOKED ROOM (triggers confirmation popup) */}
                  <button
                    type="button"
                    onClick={() => setRoomToBook(room)}
                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Mark room as booked (permanently removes listing)"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Booked Room</span>
                  </button>

                  {/* DELETE (triggers confirmation popup: 'Are you sure want to delete this post?') */}
                  <button
                    type="button"
                    onClick={() => setRoomToDelete(room)}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                    title="Delete post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRMATION POPUP FOR DELETE: Exactly "Are you sure want to delete this post?" */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-stone-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900">
              Are you sure want to delete this post?
            </h3>
            <p className="text-xs text-stone-500">
              Listing: &ldquo;{roomToDelete.title}&rdquo; will be deleted.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                disabled={actionProcessing}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionProcessing}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {actionProcessing ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION POPUP FOR BOOKED ROOM: Exactly Section 23 specifications */}
      {roomToBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-stone-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 leading-snug">
              Are you sure you want to mark this room as booked? This will permanently remove the listing.
            </h3>
            <p className="text-xs text-stone-500">
              The room will be permanently deleted from the database and will no longer appear on Home, Search, or Admin Panel.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRoomToBook(null)}
                disabled={actionProcessing}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBooked}
                disabled={actionProcessing}
                className="flex-1 py-2.5 rounded-xl bg-[#4A282A] hover:bg-[#381E20] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {actionProcessing ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Confirm</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
