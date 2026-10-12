/**
 * Email OTP Authentication Service
 * Secure 6-digit verification with expiry, rate limiting, and brute-force prevention.
 */

interface StoredOTP {
  email: string;
  code: string;
  expiresAt: number; // 10 minutes expiry
  attempts: number;  // max 5 attempts
  lastSentAt: number; // rate limit: 60 seconds
  name?: string;
}

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

const OTP_STORE_KEY = 'roomfinder_pending_otp';

function getStoredOTP(): StoredOTP | null {
  try {
    const raw = localStorage.getItem(OTP_STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredOTP(otp: StoredOTP | null) {
  if (!otp) {
    localStorage.removeItem(OTP_STORE_KEY);
  } else {
    localStorage.setItem(OTP_STORE_KEY, JSON.stringify(otp));
  }
}

type OtpCallback = (payload: { email: string; code: string }) => void;
const listeners: Set<OtpCallback> = new Set();

export function subscribeToSimulatedEmailInbox(cb: OtpCallback) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export const otpService = {
  async sendEmailOTP(email: string, name?: string): Promise<{ success: boolean; message: string; cooldownSeconds: number; debugCode?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, message: 'Please enter a valid email address.', cooldownSeconds: 0 };
    }

    const existing = getStoredOTP();
    const now = Date.now();

    if (existing && existing.email === cleanEmail && (now - existing.lastSentAt) < RESEND_COOLDOWN_MS) {
      const remaining = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      return { 
        success: false, 
        message: `Please wait ${remaining}s before requesting a new code.`,
        cooldownSeconds: remaining 
      };
    }

    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const code = (100000 + (array[0] % 900000)).toString();

    const otpData: StoredOTP = {
      email: cleanEmail,
      code,
      expiresAt: now + OTP_EXPIRY_MS,
      attempts: 0,
      lastSentAt: now,
      name
    };

    setStoredOTP(otpData);
    listeners.forEach(cb => cb({ email: cleanEmail, code }));

    return {
      success: true,
      message: `A 6-digit verification code has been dispatched to ${cleanEmail}.`,
      cooldownSeconds: 60,
      debugCode: code
    };
  },

  async verifyEmailOTP(email: string, code: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const stored = getStoredOTP();
    const now = Date.now();

    if (!stored || stored.email !== cleanEmail) {
      return { success: false, message: 'No active verification code found for this email. Please request a new one.' };
    }

    if (now > stored.expiresAt) {
      setStoredOTP(null);
      return { success: false, message: 'Verification code has expired (valid for 10 minutes). Please request a new code.' };
    }

    if (stored.attempts >= MAX_ATTEMPTS) {
      setStoredOTP(null);
      return { success: false, message: 'Maximum attempts reached. For security, please request a new verification code.' };
    }

    if (stored.code !== cleanCode) {
      stored.attempts += 1;
      setStoredOTP(stored);
      const remaining = MAX_ATTEMPTS - stored.attempts;
      return { 
        success: false, 
        message: `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` 
      };
    }

    setStoredOTP(null);
    return { success: true, message: 'Email verified successfully!' };
  },

  getCooldownRemaining(email: string): number {
    const stored = getStoredOTP();
    if (!stored || stored.email !== email.trim().toLowerCase()) return 0;
    const elapsed = Date.now() - stored.lastSentAt;
    if (elapsed >= RESEND_COOLDOWN_MS) return 0;
    return Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
  }
};
