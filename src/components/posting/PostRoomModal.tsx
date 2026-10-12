import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { roomService } from '../../services/roomService';
import { notificationService } from '../../services/notificationService';
import { NEPAL_CITIES } from '../../constants/nepalCities';
import { SearchableLocationSelect } from './SearchableLocationSelect';
import { Room, FurnishedStatus, BathroomType, GenderPreference } from '../../types';
import { 
  X, 
  Upload, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  MapPin,
  RefreshCw
} from 'lucide-react';

interface PostRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomSaved?: () => void;
  onNavigateToMyListings?: () => void;
  editingRoom?: Room | null;
}

export const PostRoomModal: React.FC<PostRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomSaved,
  onNavigateToMyListings,
  editingRoom
}) => {
  const { currentUser, isBlocked } = useAuth();
  const [isPreview, setIsPreview] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rent, setRent] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState(NEPAL_CITIES[0] || 'Kathmandu');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const contactCleanDigits = contactNumber.replace(/\D/g, '');
  const [roomType, setRoomType] = useState('1BHK');
  const [floor, setFloor] = useState('1st Floor');
  const [furnishedStatus, setFurnishedStatus] = useState<FurnishedStatus>('Semi-Furnished');
  const [bathroomType, setBathroomType] = useState<BathroomType>('Attached');
  const [genderPreference, setGenderPreference] = useState<GenderPreference>('Any');

  // Facilities
  const [wifiAvailable, setWifiAvailable] = useState<boolean>(true);
  const [waterAvailable, setWaterAvailable] = useState<boolean>(true);
  const [parkingAvailable, setParkingAvailable] = useState<boolean>(true);

  // Photos: Maximum 5 photos
  const [photos, setPhotos] = useState<string[]>([]);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsPreview(false);
    setError(null);
    setSuccessMsg(null);
    setLoading(false);

    if (editingRoom) {
      setTitle(editingRoom.title);
      setDescription(editingRoom.description);
      setRent(editingRoom.rent);
      setLocation(editingRoom.location);
      setCity(editingRoom.city || 'Kathmandu');
      setArea(editingRoom.area || '');
      setLandmark(editingRoom.landmark || '');
      setContactNumber(editingRoom.contactNumber);
      setRoomType(editingRoom.roomType);
      setFloor(editingRoom.floor || '1st Floor');
      setFurnishedStatus(editingRoom.furnishedStatus);
      setBathroomType(editingRoom.bathroomType);
      setGenderPreference(editingRoom.genderPreference);
      setWifiAvailable(editingRoom.wifiAvailable);
      setWaterAvailable(editingRoom.waterAvailable);
      setParkingAvailable(editingRoom.parkingAvailable);
      setPhotos(editingRoom.imageUrls && editingRoom.imageUrls.length > 0 ? editingRoom.imageUrls.slice(0, 5) : [editingRoom.coverImageUrl]);
    } else {
      setTitle('');
      setDescription('');
      setRent('');
      setLocation('');
      setCity('Kathmandu');
      setArea('');
      setLandmark('');
      setContactNumber(currentUser?.phone || '');
      setRoomType('1BHK');
      setFloor('1st Floor');
      setFurnishedStatus('Semi-Furnished');
      setBathroomType('Attached');
      setGenderPreference('Any');
      setWifiAvailable(true);
      setWaterAvailable(true);
      setParkingAvailable(true);
      setPhotos([]);
    }
  }, [isOpen, editingRoom, currentUser]);

  if (!isOpen) return null;

  // Ultra-efficient image compression utility ensuring photos fit in Firestore easily (~30-50KB each)
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 900;
          const MAX_HEIGHT = 675;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.65));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    if (photos.length + files.length > 5) {
      setError(`You can upload a maximum of 5 photos. You currently have ${photos.length}.`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newUrls: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const compressed = await compressImageFile(file);
        newUrls.push(compressed);
      }
      setPhotos(prev => [...prev, ...newUrls].slice(0, 5));
    } catch {
      setError('Could not process some images. Please try again.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSetCover = (index: number) => {
    if (index === 0) return;
    const target = photos[index];
    const remaining = photos.filter((_, i) => i !== index);
    setPhotos([target, ...remaining]);
  };

  const validateForm = () => {
    if (photos.length === 0) {
      setError('Uploading at least 1 room photo is mandatory (*).');
      return false;
    }
    if (!title.trim()) {
      setError('Please enter a room title (*).');
      return false;
    }
    if (!city.trim()) {
      setError('Please select a city (*).');
      return false;
    }
    if (!area.trim()) {
      setError('Please enter your Tole / Local area (*).');
      return false;
    }
    if (!rent || Number(rent) <= 0) {
      setError('Please enter a valid monthly rent in NPR (*).');
      return false;
    }
    const cleanDigits = contactNumber.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
      setError('Enter 10 digit number');
      return false;
    }
    if (!description.trim()) {
      setError('Please enter a short description for prospective tenants.');
      return false;
    }
    return true;
  };

  const handleGoToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;
    setIsPreview(true);
  };

  // Submit to Firebase Firestore with proper confirmation and navigation to "My Listing"
  const handlePublishListing = async () => {
    if (loading) return; // Prevent duplicate submissions
    if (!currentUser) {
      setError('Please sign in to publish your room.');
      return;
    }
    if (isBlocked) {
      setError('Your account is currently suspended. You cannot publish listings.');
      return;
    }

    const cleanDigits = contactNumber.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
      setError('Enter 10 digit number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resolvedLocation = area.trim() 
        ? `${area.trim()}, ${city.trim()}` 
        : (location.trim() || city.trim());

      const ownerEmail = (currentUser.email || '').trim();
      const ownerName = (currentUser.name || (ownerEmail ? ownerEmail.split('@')[0] : 'Room Owner')).trim();

      const roomPayload = {
        ownerId: currentUser.uid,
        ownerName,
        ownerEmail,
        contactNumber: contactNumber.trim(),
        title: title.trim(),
        description: description.trim(),
        rent: Number(rent),
        currency: 'NPR' as const,
        location: resolvedLocation,
        city: city.trim(),
        area: area.trim() || city.trim(),
        landmark: landmark.trim(),
        roomType,
        floor,
        furnishedStatus,
        bathroomType,
        wifiAvailable: Boolean(wifiAvailable),
        waterAvailable: Boolean(waterAvailable),
        parkingAvailable: Boolean(parkingAvailable),
        kitchenAccess: false,
        genderPreference,
        coverImageUrl: photos[0] || 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
        imageUrls: photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80']
      };

      if (editingRoom?.id) {
        await roomService.updateRoomListing(editingRoom.id, roomPayload);
        notificationService.add(
          'notice',
          'Listing Updated',
          `Your room "${title.trim()}" has been updated.`
        );
      } else {
        await roomService.createRoomListing(roomPayload);
        notificationService.add(
          'room_listed',
          'Room Listed Successfully',
          `Your room "${title.trim()}" in ${city.trim()} (${area.trim()}) is now live on Khojamm.`
        );
      }

      setLoading(false);
      onRoomSaved?.();
      onClose();
      // Navigate to My Listing after successful creation
      onNavigateToMyListings?.();
    } catch (err: any) {
      console.error('Room listing save error:', err);
      setLoading(false);
      setError(err?.message || 'Failed to save listing to database. Please check your connection and retry.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-[#ECC5C6] flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#ECC5C6] flex items-center justify-between bg-[#F5E9E7]/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#4A282A] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#382022] text-sm sm:text-base">
                {editingRoom ? 'Edit Room Listing' : 'Post a Room'}
              </h3>
              <p className="text-[11px] text-[#7A595B]">
                {isPreview ? 'Review your listing details before publishing' : 'Provide room details, photos, and monthly rent'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isPreview ? (
            /* CREATE / EDIT FORM */
            <form onSubmit={handleGoToPreview} className="space-y-6">
              {/* 1. Photos Section */}
              <div className="p-4 sm:p-5 bg-[#F5E9E7]/40 rounded-2xl border border-[#ECC5C6]">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#382022] uppercase tracking-wider flex items-center gap-1">
                    <span>Room photos</span>
                    <span className="text-rose-600 font-extrabold text-sm">*</span>
                    <span className="text-[11px] font-normal text-rose-600 lowercase">(mandatory)</span>
                  </label>
                  <span className="text-xs text-[#7A595B] font-medium">
                    {photos.length}/5 photos {photos.length === 0 ? '(0/1 required)' : '✓'}
                  </span>
                </div>
                <p className="text-xs text-[#7A595B] mb-3 leading-relaxed">
                  Upload up to 5 clear room photos. The first photo will be used as the cover.
                </p>

                {/* Uploaded Photos Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-stone-200 group bg-stone-100 shadow-xs">
                      <img src={url} alt={`Room photo ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-[#4A282A] text-white text-[9px] font-bold shadow-xs">
                          Cover
                        </span>
                      )}
                      <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetCover(idx)}
                            className="px-1.5 py-0.5 rounded-md bg-white text-stone-800 text-[10px] font-bold cursor-pointer"
                            title="Set as Cover Image"
                          >
                            Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="p-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {photos.length < 5 && (
                    <label className="aspect-video rounded-xl border-2 border-dashed border-[#ECC5C6] hover:border-[#8A4A4D] bg-white hover:bg-[#ECC5C6]/30 flex flex-col items-center justify-center cursor-pointer transition-colors text-[#4A282A]">
                      <Upload className="w-4 h-4 mb-0.5 text-[#8A4A4D]" />
                      <span className="text-[10px] font-bold">+ Add Photo</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* 2. Room Title & Description */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                    Listing Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sunny 2BHK Flat with Balcony in Baluwatar"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A4A4D]/20 focus:border-[#8A4A4D]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the room, sunlight, water timing, floor, environment, and terms for tenants."
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A4A4D]/20 focus:border-[#8A4A4D]"
                    required
                  />
                </div>
              </div>

              {/* 3. Rent & Direct Contact Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                    Monthly Rent (NPR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8A4A4D]">
                      NPR
                    </span>
                    <input
                      type="number"
                      min={100}
                      step={100}
                      value={rent}
                      onChange={(e) => setRent(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="12000"
                      className="w-full pl-13 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#8A4A4D]/20 focus:border-[#8A4A4D]"
                      required
                    />
                  </div>
                  {typeof rent === 'number' && rent > 0 && (
                    <p className="text-[11px] text-[#8A4A4D] font-semibold mt-1">
                      NPR {new Intl.NumberFormat('en-NP').format(rent)} / month
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Contact Phone Number *</span>
                    {((contactCleanDigits.length > 0 && contactCleanDigits.length <= 9) || (error === 'Enter 10 digit number' && contactCleanDigits.length <= 9)) && (
                      <span className="text-[10px] text-[#8A4A4D] font-bold animate-in fade-in">
                        10 Digit Number Required
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={contactNumber}
                      onChange={(e) => {
                        setContactNumber(e.target.value);
                        if (error === 'Enter 10 digit number') setError(null);
                      }}
                      placeholder="98XXXXXXXX (10 digits)"
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A4A4D]/20 focus:border-[#8A4A4D]"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Compulsory minimum 10 digits (e.g. 9841234567)
                  </p>
                </div>
              </div>

              {/* 4. Location Details */}
              <div className="space-y-3 relative z-30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>City *</span>
                      <span className="text-[10px] text-stone-400 font-normal">Searchable Nepal city</span>
                    </label>
                    <SearchableLocationSelect
                      value={city}
                      onChange={(newCity) => {
                        setCity(newCity);
                        setLocation(area.trim() ? `${area.trim()}, ${newCity}` : newCity);
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Tole / Local Area *</span>
                      <span className="text-[10px] text-[#8A4A4D] font-bold">Searchable by tenants</span>
                    </label>
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => {
                        const newArea = e.target.value;
                        setArea(newArea);
                        setLocation(newArea.trim() ? `${newArea.trim()}, ${city}` : city);
                      }}
                      placeholder="e.g. Banke Gaun, Baluwatar, Lakeside"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A4A4D]/20 focus:border-[#8A4A4D]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                    Nearby Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Russian Embassy, 2 mins from Chowk"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8A4A4D]/20 focus:border-[#8A4A4D]"
                  />
                </div>
              </div>

              {/* 5. Room Type, Floor, Bathroom & Furnishing */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                    Floor *
                  </label>
                  <select
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none"
                  >
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="1st Floor">1st Floor</option>
                    <option value="2nd Floor">2nd Floor</option>
                    <option value="3rd Floor">3rd Floor</option>
                    <option value="Top / Rooftop">Top / Rooftop</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                    Room Type *
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none"
                  >
                    <option value="Single Room">Single Room</option>
                    <option value="Double Room">Double Room</option>
                    <option value="Master Bedroom">Master Bedroom</option>
                    <option value="1BHK">1BHK</option>
                    <option value="2BHK">2BHK</option>
                    <option value="3BHK">3BHK</option>
                    <option value="Flat">Full Flat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                    Bathroom *
                  </label>
                  <select
                    value={bathroomType}
                    onChange={(e) => setBathroomType(e.target.value as BathroomType)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none"
                  >
                    <option value="Attached">Attached</option>
                    <option value="Common">Common</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                    Furnishing *
                  </label>
                  <select
                    value={furnishedStatus}
                    onChange={(e) => setFurnishedStatus(e.target.value as FurnishedStatus)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none"
                  >
                    <option value="Furnished">Furnished</option>
                    <option value="Semi-Furnished">Semi-Furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                </div>
              </div>

              {/* 6. Facilities */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-2.5">
                  Facilities Available
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWifiAvailable(!wifiAvailable)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      wifiAvailable 
                        ? 'bg-[#4A282A] text-white border-[#4A282A]' 
                        : 'bg-white text-stone-500 border-stone-200'
                    }`}
                  >
                    <span>Wi-Fi {wifiAvailable ? '✓' : ''}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaterAvailable(!waterAvailable)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      waterAvailable 
                        ? 'bg-[#4A282A] text-white border-[#4A282A]' 
                        : 'bg-white text-stone-500 border-stone-200'
                    }`}
                  >
                    <span>Water {waterAvailable ? '✓' : ''}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setParkingAvailable(!parkingAvailable)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      parkingAvailable 
                        ? 'bg-[#4A282A] text-white border-[#4A282A]' 
                        : 'bg-white text-stone-500 border-stone-200'
                    }`}
                  >
                    <span>Parking {parkingAvailable ? '✓' : ''}</span>
                  </button>
                </div>
              </div>

              {/* Submit to Preview Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-semibold text-xs hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#4A282A] hover:bg-[#381E20] text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Review Listing Details
                </button>
              </div>
            </form>
          ) : (
            /* PREVIEW CARD BEFORE PUBLISHING */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between">
                <span>Please verify all details before publishing to Khojamm.</span>
                <button
                  type="button"
                  onClick={() => setIsPreview(false)}
                  className="font-bold underline text-emerald-800 cursor-pointer"
                >
                  Edit details
                </button>
              </div>

              {/* Preview Card */}
              <div className="bg-white border border-[#ECC5C6] rounded-3xl overflow-hidden shadow-md">
                <div className="relative h-44 sm:h-52 w-full bg-stone-900">
                  <img
                    src={photos[0]}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-xs font-bold text-[#4A282A]">
                    {roomType} • {furnishedStatus}
                  </div>
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-[#4A282A]/90 backdrop-blur-md rounded-xl text-white text-sm font-extrabold">
                    NPR {new Intl.NumberFormat('en-NP').format(Number(rent))} / month
                  </div>
                </div>

                <div className="p-4 space-y-2.5">
                  <h3 className="text-base sm:text-lg font-bold text-stone-900">{title}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-stone-600">
                    <MapPin className="w-3.5 h-3.5 text-[#8A4A4D]" />
                    <span>{area ? `${area}, ${city}` : (location || city)}</span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl">
                    {description}
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {wifiAvailable && (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                        Wi-Fi ✓
                      </span>
                    )}
                    {waterAvailable && (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                        Water ✓
                      </span>
                    )}
                    {parkingAvailable && (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                        Parking ✓
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-[#F5E9E7]/60 rounded-xl border border-[#ECC5C6] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#7A595B] block">Direct Contact</span>
                      <span className="font-bold text-[#382022] text-sm">{contactNumber}</span>
                    </div>
                    <span className="px-2.5 py-1 bg-[#ECC5C6] text-[#4A282A] rounded-lg font-bold text-xs">
                      Owner Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Button remains named "Post a Room" */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPreview(false)}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-semibold text-xs hover:bg-stone-50 cursor-pointer disabled:opacity-50"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handlePublishListing}
                  disabled={loading}
                  className="px-7 py-2.5 rounded-xl bg-[#4A282A] hover:bg-[#381E20] text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-75 flex items-center gap-2 cursor-pointer"
                >
                  {loading && (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  )}
                  <span>{editingRoom ? 'Update Room Listing' : 'Post a Room'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
