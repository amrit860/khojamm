import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Home, 
  Search, 
  ShieldCheck, 
  Phone, 
  CheckCircle2, 
  MapPin, 
  Mail, 
  Clock, 
  HeartHandshake,
  Building,
  PlusCircle,
  Send,
  MessageSquare,
  User,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Lock
} from 'lucide-react';
import { AppLogo } from '../common/AppLogo';
import { inquiryService } from '../../services/inquiryService';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';

interface AboutUsViewProps {
  onNavigateHome: () => void;
  onOpenPostRoom?: () => void;
  onOpenAuth?: () => void;
  customLogoUrl?: string;
  focusContact?: boolean;
}

export const AboutUsView: React.FC<AboutUsViewProps> = ({
  onNavigateHome,
  onOpenPostRoom,
  onOpenAuth,
  customLogoUrl,
  focusContact = false
}) => {
  const { currentUser } = useAuth();

  // Contact Form state - Initialized empty for logged-out visitors, populated for logged-in users
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    subject: 'General Inquiry',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedInquiryId, setSubmittedInquiryId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync profile when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        name: currentUser.name || prev.name,
        email: currentUser.email || prev.email,
        phone: currentUser.phone || prev.phone
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        name: '',
        email: '',
        phone: ''
      }));
    }
  }, [currentUser]);

  // If navigated with focus on contact section, scroll smoothly to it
  useEffect(() => {
    if (focusContact) {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [focusContact]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submissions

    setErrorMessage(null);

    // Form validation
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedMessage = formData.message.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address so we can reply to you.');
      return;
    }
    if (!trimmedMessage || trimmedMessage.length < 10) {
      setErrorMessage('Please enter a message of at least 10 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Real backend API submission + Firestore persistence
      const result = await inquiryService.submitInquiry({
        name: trimmedName,
        email: trimmedEmail,
        phone: formData.phone.trim(),
        subject: formData.subject.trim(),
        message: trimmedMessage,
        userId: currentUser?.uid || null
      });

      if (result.success && result.inquiry) {
        setSubmittedInquiryId(result.inquiry.id);
        setSubmitSuccess(true);
        notificationService.add(
          'notice',
          'Inquiry Submitted',
          `Your inquiry regarding "${formData.subject}" has been successfully received by Khojamm support.`
        );
      } else {
        setErrorMessage(result.error || 'Failed to submit inquiry. Please try again.');
      }
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setErrorMessage(err?.message || 'A network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      subject: 'General Inquiry',
      message: ''
    });
    setSubmitSuccess(false);
    setSubmittedInquiryId(null);
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 sm:space-y-10 animate-in fade-in duration-300 pb-12 px-3 sm:px-6 overflow-x-hidden">
      {/* Top Breadcrumb & Return to Home Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2 rounded-2xl bg-white hover:bg-stone-50 border border-[#ECC5C6] text-[#4A282A] font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-[#8A4A4D]" />
          <span>Back to Explore Rooms</span>
        </button>

        <span className="text-xs font-semibold text-[#7A595B] flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-[#8A4A4D] shrink-0" />
          <span className="truncate">Nepal Rental Network</span>
        </span>
      </div>

      {/* Main About Khojamm Content Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 md:p-10 border border-[#ECC5C6] shadow-sm relative overflow-hidden space-y-7 sm:space-y-8">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#ECC5C6]/30 via-[#F5E9E7]/40 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        {/* Header Section */}
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5E9E7] border border-[#DEACAE] text-[#4A282A] text-xs font-bold">
            <AppLogo iconUrl={customLogoUrl} size="sm" showName={false} />
            <span>Official Information</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#382022] tracking-tight">
            About Khojamm
          </h1>

          <h3 className="text-lg sm:text-2xl font-extrabold text-[#8A4A4D] tracking-tight">
            Find Your Space. Make It Home.
          </h3>
        </div>

        {/* Introduction Paragraphs */}
        <div className="relative z-10 space-y-4 text-stone-700 text-sm sm:text-base leading-relaxed">
          <p className="font-medium text-[#382022]">
            <strong className="text-[#4A282A] font-extrabold">Khojamm</strong> is a room-finding platform designed to make finding and renting rooms easier, faster, and more convenient. We connect people looking for a place to stay with people who have rooms available for rent.
          </p>

          <p className="text-[#7A595B]">
            We understand that finding the right room in a new city can be challenging. Searching through different sources, comparing rental prices, and finding a suitable location can take valuable time. That&apos;s why Khojamm brings room listings together in one convenient place.
          </p>
        </div>

        {/* Our Mission */}
        <div className="relative z-10 bg-[#F5E9E7]/40 rounded-2xl p-4 sm:p-6 border border-[#ECC5C6] space-y-2">
          <h3 className="text-base sm:text-xl font-extrabold text-[#382022] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#8A4A4D] shrink-0" />
            <span>Our Mission</span>
          </h3>
          <p className="text-stone-700 text-sm sm:text-base leading-relaxed">
            Our mission is to simplify the room-finding experience by making room information more accessible and helping room seekers connect with room owners more easily.
          </p>
        </div>

        {/* What We Offer */}
        <div className="relative z-10 space-y-4">
          <h3 className="text-base sm:text-xl font-extrabold text-[#382022] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>What We Offer</span>
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:gap-3.5">
            <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#ECC5C6] shadow-2xs">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#F5E9E7] text-[#8A4A4D] flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                1
              </div>
              <div className="text-xs sm:text-sm leading-relaxed">
                <span className="font-extrabold text-[#382022]">Easy Room Search:</span>{' '}
                <span className="text-stone-700">Explore available rooms according to your preferred location, budget, and needs.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#ECC5C6] shadow-2xs">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#F5E9E7] text-[#8A4A4D] flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                2
              </div>
              <div className="text-xs sm:text-sm leading-relaxed">
                <span className="font-extrabold text-[#382022]">Post a Room:</span>{' '}
                <span className="text-stone-700">Allow room owners to share their available rooms and reach potential tenants.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#ECC5C6] shadow-2xs">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#F5E9E7] text-[#8A4A4D] flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                3
              </div>
              <div className="text-xs sm:text-sm leading-relaxed">
                <span className="font-extrabold text-[#382022]">Location-Based Discovery:</span>{' '}
                <span className="text-stone-700">Find rooms in areas that are convenient for your work, studies, or daily life.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#ECC5C6] shadow-2xs">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#F5E9E7] text-[#8A4A4D] flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                4
              </div>
              <div className="text-xs sm:text-sm leading-relaxed">
                <span className="font-extrabold text-[#382022]">Room Details:</span>{' '}
                <span className="text-stone-700">Explore available information about rent, facilities, water, Wi-Fi, parking, and other amenities.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#ECC5C6] shadow-2xs">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#F5E9E7] text-[#8A4A4D] flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                5
              </div>
              <div className="text-xs sm:text-sm leading-relaxed">
                <span className="font-extrabold text-[#382022]">Direct Connection:</span>{' '}
                <span className="text-stone-700">Make it easier for room seekers and room owners to communicate about available listings.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Our Vision */}
        <div className="relative z-10 bg-[#F5E9E7]/40 rounded-2xl p-4 sm:p-6 border border-[#ECC5C6] space-y-2">
          <h3 className="text-base sm:text-xl font-extrabold text-[#382022] flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-[#8A4A4D] shrink-0" />
            <span>Our Vision</span>
          </h3>
          <p className="text-stone-700 text-sm sm:text-base leading-relaxed">
            We envision a future where finding a room is no longer a stressful process. Khojamm aims to become a convenient and accessible platform where people can discover suitable places to live and room owners can connect with potential tenants.
          </p>
        </div>

        {/* Our Commitment */}
        <div className="relative z-10 bg-[#F5E9E7]/40 rounded-2xl p-4 sm:p-6 border border-[#ECC5C6] space-y-2">
          <h3 className="text-base sm:text-xl font-extrabold text-[#382022] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>Our Commitment</span>
          </h3>
          <p className="text-stone-700 text-sm sm:text-base leading-relaxed">
            At Khojamm, we believe finding a place to live should be simple and convenient. We are committed to continuously improving our platform to provide a better experience for both room seekers and room owners.
          </p>
        </div>

        {/* Highlight Callout Footer */}
        <div className="relative z-10 bg-[#4A282A] text-white rounded-2xl p-5 sm:p-8 space-y-2 text-center shadow-md">
          <h4 className="text-sm sm:text-lg font-black text-[#ECC5C6] tracking-wide">
            Khojamm — Your Search for the Right Room Starts Here.
          </h4>
          <p className="text-xs sm:text-sm text-stone-200 font-medium">
            Whether you are looking for your next room or have a room to rent out, Khojamm is here to help you connect.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onNavigateHome}
              className="px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl bg-white text-[#4A282A] hover:bg-stone-100 font-bold text-xs shadow-xs transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[#8A4A4D]" />
              <span>Explore Rooms</span>
            </button>

            {onOpenPostRoom && (
              <button
                type="button"
                onClick={onOpenPostRoom}
                className="px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl bg-[#ECC5C6] text-[#4A282A] hover:bg-[#DEACAE] font-bold text-xs shadow-xs transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#6E3639]" />
                <span>Post a Room</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          DEDICATED CONTACT US SECTION & RESPONSIVE FORM
          Requirements:
          - Fully responsive across desktop, tablet, and mobile
          - Empty fields for guests; auto-populated for logged-in users
          - Real backend submission & database persistence
          - Send button labeled exactly "Send"
          - Privacy: admin email is strictly never displayed on screen
      ======================================================== */}
      <div id="contact" className="bg-white rounded-3xl p-5 sm:p-8 md:p-10 border border-[#ECC5C6] shadow-sm space-y-6 sm:space-y-8 scroll-mt-20">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5E9E7] border border-[#DEACAE] text-[#4A282A] text-xs font-bold mb-2">
            <Mail className="w-3.5 h-3.5 text-[#8A4A4D]" />
            <span>Direct Communication</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-[#382022] tracking-tight">
            Contact Us
          </h2>

          <p className="text-xs sm:text-sm text-[#7A595B] mt-1.5 leading-relaxed">
            Have questions about room listings, need assistance posting a room, or want to send feedback? Send a message directly to the Khojamm administrative team.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Information & Help Guidelines */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F5E9E7]/60 border border-[#ECC5C6] space-y-4">
              <h4 className="text-xs sm:text-sm font-black text-[#382022] uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-[#8A4A4D]" />
                <span>Khojamm Support</span>
              </h4>

              <div className="space-y-3 text-xs text-[#7A595B]">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#8A4A4D] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#382022] block font-bold">Nationwide Coverage</strong>
                    <span>Serving all 7 Provinces in Nepal (Kathmandu, Pokhara, Lalitpur, Nepalgunj &amp; more)</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-[#8A4A4D] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#382022] block font-bold">Response Time</strong>
                    <span>Messages are reviewed promptly within 24 hours.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#382022] block font-bold">Privacy Protected</strong>
                    <span>Your inquiry is saved in the database and delivered directly to the administration inbox.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-dashed border-[#DEACAE] bg-white text-xs text-[#7A595B] space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[#4A282A]">
                <HelpCircle className="w-4 h-4 text-[#8A4A4D]" />
                <span>Need Instant Answers?</span>
              </div>
              <p className="leading-relaxed">
                If you are looking to rent a room immediately, visit any listing to view the room owner&apos;s phone number for direct calling.
              </p>
            </div>
          </div>

          {/* Right Column: Interactive Working Contact Form */}
          <div className="lg:col-span-7">
            {submitSuccess ? (
              <div className="p-6 sm:p-8 rounded-3xl bg-emerald-50 border border-emerald-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-black text-emerald-900">
                    Message Sent Successfully!
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed max-w-md mx-auto">
                    Thank you, <strong className="font-bold">{formData.name}</strong>. Your message has been recorded and submitted to the Khojamm administration team.
                    {submittedInquiryId && (
                      <span className="block mt-1 text-[11px] font-mono text-emerald-700">
                        Inquiry Reference: {submittedInquiryId}
                      </span>
                    )}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100/50 font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    Send Another Message
                  </button>

                  <button
                    type="button"
                    onClick={onNavigateHome}
                    className="px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl bg-[#4A282A] text-white hover:bg-[#381E20] font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    Return to Home
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {/* User Authentication Status Banner */}
                {currentUser ? (
                  <div className="p-3 rounded-xl bg-[#F5E9E7] border border-[#DEACAE] text-[#4A282A] text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="truncate">
                        Submitting as <strong className="font-bold">{currentUser.name || 'Member'}</strong> ({currentUser.email})
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white text-[#8A4A4D] font-bold text-[10px] shrink-0 border border-[#ECC5C6]">
                      Verified User
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 text-xs flex items-center justify-between gap-2">
                    <span className="text-[11px]">Submitting as a guest visitor.</span>
                    {onOpenAuth && (
                      <button
                        type="button"
                        onClick={onOpenAuth}
                        className="text-[#8A4A4D] hover:underline font-bold text-[11px] cursor-pointer"
                      >
                        Sign in to link account
                      </button>
                    )}
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Name & Email Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#382022] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#8A4A4D]" />
                      <span>Your Full Name</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Ramesh Thapa"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEACAE] bg-white text-xs text-[#382022] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8A4A4D] transition-all min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#382022] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#8A4A4D]" />
                      <span>Your Email Address</span>
                      <span className="text-red-500">*</span>
                      {currentUser && (
                        <span className="text-[10px] text-emerald-700 flex items-center gap-0.5 ml-auto">
                          <Lock className="w-3 h-3" /> Account
                        </span>
                      )}
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="e.g. yourname@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEACAE] bg-white text-xs text-[#382022] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8A4A4D] transition-all min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Phone & Subject Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#382022] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#8A4A4D]" />
                      <span>Phone Number (Optional)</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g. 98XXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEACAE] bg-white text-xs text-[#382022] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8A4A4D] transition-all min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#382022] flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#8A4A4D]" />
                      <span>Subject / Topic</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEACAE] bg-white text-xs text-[#382022] focus:outline-none focus:ring-2 focus:ring-[#8A4A4D] transition-all cursor-pointer min-h-[44px]"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Post a Room / Listing Support">Post a Room / Listing Support</option>
                      <option value="Report an Issue or Incorrect Listing">Report an Issue or Incorrect Listing</option>
                      <option value="Feedback & Suggestions">Feedback &amp; Suggestions</option>
                      <option value="Partnership / Other">Partnership / Other</option>
                    </select>
                  </div>
                </div>

                {/* Message Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#382022] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#8A4A4D]" />
                      <span>Your Message</span>
                      <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[10px] text-stone-400">Min 10 characters</span>
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Describe your inquiry, question, or feedback in detail..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEACAE] bg-white text-xs sm:text-sm text-[#382022] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8A4A4D] transition-all resize-y min-h-[100px]"
                  />
                </div>

                {/* Privacy Assurance Note */}
                

                {/* Submit Button labeled exactly "Send" */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#4A282A] hover:bg-[#381E20] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-[#ECC5C6]" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Return to Home Action */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onNavigateHome}
          className="px-6 py-3 sm:px-8 sm:py-3.5 rounded-2xl bg-[#4A282A] hover:bg-[#381E20] text-white font-extrabold text-xs shadow-md transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer min-h-[44px]"
        >
          <Home className="w-4 h-4 text-[#ECC5C6]" />
          <span>Return to  Home</span>
        </button>
      </div>
    </div>
  );
};
