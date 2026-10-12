import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Heart, 
  Layers, 
  LogOut, 
  Edit3, 
  Sparkles,
  AlertTriangle 
} from 'lucide-react';

interface UserProfileViewProps {
  onOpenMyListings: () => void;
  onOpenSavedRooms: () => void;
  onOpenAuth: () => void;
  onOpenAdmin?: () => void;
  savedCount: number;
  myListingsCount: number;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  onOpenMyListings,
  onOpenSavedRooms,
  onOpenAuth,
  onOpenAdmin,
  savedCount,
  myListingsCount
}) => {
  const { currentUser, updateUserProfile, logout, isBlocked, isAdmin } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [diet, setDiet] = useState<'Vegetarian' | 'Non-Vegetarian' | 'Vegan'>(currentUser?.lifestyle?.diet || 'Non-Vegetarian');
  const [smoking, setSmoking] = useState<'Non-Smoker' | 'Smoker'>(currentUser?.lifestyle?.smoking || 'Non-Smoker');
  const [drinking, setDrinking] = useState<'Non-Drinker' | 'Occasional' | 'Regular'>(currentUser?.lifestyle?.drinking || 'Occasional');
  const [cleanliness, setCleanliness] = useState<'Clean' | 'Average' | 'Moderate'>(currentUser?.lifestyle?.cleanliness || 'Clean');
  const [saving, setSaving] = useState(false);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-[#ECC5C6] text-[#4A282A] flex items-center justify-center mx-auto mb-4 shadow-sm">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#382022]">Sign in to your profile</h2>
        <p className="text-xs text-[#7A595B] max-w-xs mx-auto mt-2 leading-relaxed">
          Manage your posted rental rooms, view saved wishlist items, and update your tenant lifestyle profile.
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        lifestyle: {
          diet,
          smoking,
          drinking,
          cleanliness
        }
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
      {/* Account Status Alert if Blocked */}
      {isBlocked && (
        <div className="p-4 bg-red-100 border border-red-300 rounded-2xl flex items-center gap-3 text-red-900">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Account Suspended</p>
            <p>Your account has been blocked by an administrator. You cannot post or modify listings.</p>
          </div>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECC5C6] p-6 shadow-xs relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#ECC5C6] bg-stone-100 shadow-sm shrink-0">
              <img
                src={currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.email)}`}
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#382022]">{currentUser.name}</h2>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  currentUser.role === 'admin' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-[#F5E9E7] text-[#4A282A] border border-[#ECC5C6]'
                }`}>
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-[#7A595B] mt-0.5 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-stone-400" />
                <span>{currentUser.email}</span>
              </p>
              {currentUser.phone && (
                <p className="text-xs text-[#7A595B] mt-0.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>{currentUser.phone}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isEditing ? 'Cancel' : 'Edit'}</span>
          </button>
        </div>

        {/* Admin Dashboard Entry for Authorized Admins */}
        {isAdmin && onOpenAdmin && (
          <div className="mt-5 pt-4 border-t border-[#ECC5C6]">
            <button
              onClick={onOpenAdmin}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#4A282A] hover:bg-[#381E20] text-white font-bold text-xs flex items-center justify-between shadow-xs transition-transform active:scale-98 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#ECC5C6]" />
                <span>Open Admin Control Panel</span>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-extrabold uppercase">
                Authorized
              </span>
            </button>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-stone-100">
          <button
            onClick={onOpenMyListings}
            className="p-3 bg-[#F5E9E7]/60 hover:bg-[#F5E9E7] rounded-2xl border border-[#ECC5C6] text-left transition-colors flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="text-[11px] text-[#7A595B] uppercase font-semibold">My Listings</p>
              <p className="text-xl font-extrabold text-[#4A282A] mt-0.5">{myListingsCount}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#4A282A] text-white flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </button>

          <button
            onClick={onOpenSavedRooms}
            className="p-3 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200/60 text-left transition-colors flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="text-[11px] text-stone-500 uppercase font-semibold">Saved Rooms</p>
              <p className="text-xl font-extrabold text-stone-900 mt-0.5">{savedCount}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>

      {/* Edit Form or Lifestyle Overview */}
      {isEditing ? (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-[#ECC5C6] p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
            Edit Profile &amp; Lifestyle
          </h3>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Contact Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+977 98XXXXXXXX"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm"
            />
          </div>

          

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#4A282A] hover:bg-[#381E20] text-white text-xs font-bold shadow-sm cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : null}
     

      {/* Account Actions */}
      <div className="bg-white rounded-3xl border border-[#ECC5C6] p-4 shadow-xs">
        <button
          onClick={logout}
          className="w-full py-2.5 px-4 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
