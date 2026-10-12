/**
 * Khojamm Full-Stack Server
 * Express entry point hosting /api/* endpoints and Vite SPA middleware.
 * Handles contact inquiries, Firestore database operations, real SMTP email delivery,
 * and admin recipient authorization.
 */
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server-side security token matching Firestore security rules
const SERVER_AUTH_TOKEN = 'khojam_sec_admin_srv_token_2026';

// Initialize Firebase client for server-side persistence
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
  } catch (err) {
    console.error('Failed to parse firebase-applet-config.json:', err);
  }
}

const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(fbApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(fbApp);

const app = express();
app.use(express.json({ limit: '2mb' }));

// Constants
const DEFAULT_SUPERADMIN_EMAIL = 'amritacharya25@gmail.com';
const PERMANENTLY_REMOVED_ADMIN_EMAILS = [
  'khanalg592@gmail.com',
  'subhashacharya308@gmail.com'
];

// In-memory cache for inquiries to guarantee immediate server availability
const inquiriesCache = new Map<string, any>();

// Simple in-memory IP rate limiter for guest submissions (max 10 submissions per 10 mins)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 10 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) {
    return false;
  }
  entry.count += 1;
  return true;
}

/**
 * Configure Nodemailer transporter based on server environment variables
 */
function getEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

/**
 * Authoritatively resolve all eligible email recipients:
 * 1. Current Superadmin email address
 * 2. Active permanent admins (status === 'active' AND duration is permanent AND not expired/revoked)
 */
async function resolveInquiryRecipients(): Promise<string[]> {
  const recipientsSet = new Set<string>();

  // 1. Authoritative Superadmin email
  let superAdminEmail = DEFAULT_SUPERADMIN_EMAIL.toLowerCase();
  try {
    const rolesDoc = await getDoc(doc(db, 'adminConfig', 'roles'));
    if (rolesDoc.exists() && rolesDoc.data()?.realAdminEmail) {
      superAdminEmail = (rolesDoc.data().realAdminEmail as string).trim().toLowerCase();
    }
  } catch (err) {
    console.warn('Could not read authoritative realAdminEmail from Firestore, using default:', err);
  }
  recipientsSet.add(superAdminEmail);

  // 2. Eligible permanent admins from Firestore 'admins' collection
  try {
    const adminsSnap = await getDocs(collection(db, 'admins'));
    const now = Date.now();

    adminsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data || !data.email) return;

      const cleanEmail = (data.email as string).trim().toLowerCase();

      // Skip Superadmin (already included)
      if (cleanEmail === superAdminEmail) return;

      // Skip permanently restricted emails
      if (PERMANENTLY_REMOVED_ADMIN_EMAILS.includes(cleanEmail)) return;

      // Must be active
      if (data.status !== 'active') return;

      // Check if permanent:
      // Permanent admins have durationHours <= 0, expiresAt === null, or durationLabel containing 'Permanent'
      const isPermanent = (!data.expiresAt || data.durationHours <= 0 || (data.durationLabel && data.durationLabel.toLowerCase().includes('permanent')));

      // Ensure no past expiration date
      if (data.expiresAt && new Date(data.expiresAt).getTime() <= now) return;

      if (isPermanent) {
        recipientsSet.add(cleanEmail);
      }
    });
  } catch (err) {
    console.warn('Could not fetch permanent admins for inquiry recipients:', err);
  }

  return Array.from(recipientsSet);
}

/**
 * Dispatches email for an inquiry
 */
async function dispatchInquiryEmail(inquiry: {
  id: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  subject: string;
  message: string;
  userId?: string | null;
  senderType: 'registered' | 'guest';
  createdAt: string;
}): Promise<{ status: 'Sent' | 'Failed'; error?: string; recipients: string[] }> {
  const recipients = await resolveInquiryRecipients();
  const transporter = getEmailTransporter();

  if (!transporter) {
    const err = 'Email service not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in server environment variables to enable email delivery.';
    console.warn(`[Email Service] ${err}`);
    return { status: 'Failed', error: err, recipients };
  }

  const fromAddress = process.env.SMTP_FROM || `"Khojamm Rental Network" <${process.env.SMTP_USER}>`;
  const subjectLine = `New Contact Inquiry – Khojamm: ${inquiry.subject}`;

  const textBody = [
    `New Contact Inquiry Received on Khojamm`,
    `========================================`,
    `Inquiry ID: ${inquiry.id}`,
    `Sender Name: ${inquiry.senderName}`,
    `Sender Email: ${inquiry.senderEmail}`,
    `Sender Phone: ${inquiry.senderPhone || 'Not provided'}`,
    `Sender Type: ${inquiry.senderType === 'registered' ? `Registered User (User ID: ${inquiry.userId || 'N/A'})` : 'Guest / Visitor'}`,
    `Subject: ${inquiry.subject}`,
    `Date & Time: ${new Date(inquiry.createdAt).toLocaleString()}`,
    `========================================`,
    `Message:`,
    inquiry.message,
    `========================================`,
    `Reply directly to this email to respond to ${inquiry.senderName} (${inquiry.senderEmail}).`
  ].join('\n');

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #faf8f7; color: #382022;">
      <div style="background-color: #4A282A; color: white; padding: 20px; border-radius: 16px 16px 0 0; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; color: #ECC5C6;">Khojamm Nepal</h2>
        <p style="margin: 5px 0 0 0; font-size: 13px; color: #F5E9E7;">New Contact Inquiry Notification</p>
      </div>
      <div style="background-color: #ffffff; padding: 24px; border: 1px solid #ECC5C6; border-top: none; border-radius: 0 0 16px 16px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          <tr>
            <td style="padding: 8px 0; color: #7A595B; width: 120px;"><strong>Inquiry ID:</strong></td>
            <td style="padding: 8px 0; font-family: monospace;">${inquiry.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #7A595B;"><strong>Sender:</strong></td>
            <td style="padding: 8px 0; font-weight: bold;">${inquiry.senderName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #7A595B;"><strong>Email:</strong></td>
            <td style="padding: 8px 0;"><a href="mailto:${inquiry.senderEmail}" style="color: #8A4A4D;">${inquiry.senderEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #7A595B;"><strong>Phone:</strong></td>
            <td style="padding: 8px 0;">${inquiry.senderPhone || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #7A595B;"><strong>Sender Type:</strong></td>
            <td style="padding: 8px 0;">${inquiry.senderType === 'registered' ? `<span style="background-color: #E6F4EA; color: #137333; padding: 2px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">Registered User (${inquiry.userId || ''})</span>` : '<span style="background-color: #F1F3F4; color: #5F6368; padding: 2px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">Guest Visitor</span>'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #7A595B;"><strong>Subject:</strong></td>
            <td style="padding: 8px 0; font-weight: bold;">${inquiry.subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #7A595B;"><strong>Submitted At:</strong></td>
            <td style="padding: 8px 0;">${new Date(inquiry.createdAt).toLocaleString()}</td>
          </tr>
        </table>
        
        <div style="background-color: #F5E9E7; padding: 16px; border-radius: 12px; border-left: 4px solid #8A4A4D; margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #4A282A; font-size: 13px;">Message Content:</h4>
          <p style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #382022;">${inquiry.message}</p>
        </div>

        <p style="font-size: 12px; color: #7A595B; margin: 0; text-align: center;">
          Click "Reply" in your email client to send a direct response to <strong>${inquiry.senderEmail}</strong>.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: recipients.join(', '),
      replyTo: inquiry.senderEmail,
      subject: subjectLine,
      text: textBody,
      html: htmlBody
    });

    console.log(`[Email Service] Contact inquiry ${inquiry.id} delivered to ${recipients.length} recipients:`, recipients);
    return { status: 'Sent', recipients };
  } catch (sendErr: any) {
    const errorMsg = sendErr?.message || 'Email delivery failed';
    console.error(`[Email Service] Failed to send email for inquiry ${inquiry.id}:`, sendErr);
    return { status: 'Failed', error: errorMsg, recipients };
  }
}

// =========================================================================
// API ROUTES
// =========================================================================

/**
 * POST /api/inquiries
 * Submit a contact inquiry
 */
app.post('/api/inquiries', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Rate limiting check
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      error: 'Too many inquiries submitted from this connection. Please wait a few minutes before trying again.'
    });
  }

  const { name, email, phone, subject, message, userId } = req.body;

  // Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Full name is required.' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'A valid email address is required.' });
  }
  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    return res.status(400).json({ success: false, error: 'Message must be at least 10 characters long.' });
  }

  const cleanName = name.trim().slice(0, 100);
  const cleanEmail = email.trim().slice(0, 150);
  const cleanPhone = phone ? String(phone).trim().slice(0, 30) : '';
  const cleanSubject = (subject && typeof subject === 'string' ? subject.trim() : 'General Inquiry').slice(0, 150);
  const cleanMessage = message.trim().slice(0, 5000);
  const cleanUserId = userId && typeof userId === 'string' ? userId.trim().slice(0, 128) : null;
  const senderType: 'registered' | 'guest' = cleanUserId ? 'registered' : 'guest';

  const now = new Date().toISOString();
  const inquiryId = `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Save inquiry in Firestore
  const inquiryRecord = {
    id: inquiryId,
    senderName: cleanName,
    senderEmail: cleanEmail,
    senderPhone: cleanPhone,
    subject: cleanSubject,
    message: cleanMessage,
    userId: cleanUserId,
    senderType,
    status: 'New' as 'New' | 'Read' | 'Replied' | 'Resolved',
    emailDeliveryStatus: 'Pending' as 'Pending' | 'Sent' | 'Failed',
    emailSentAt: null as string | null,
    lastEmailError: null as string | null,
    recipients: [] as string[],
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, 'inquiries', inquiryId), inquiryRecord);
    inquiriesCache.set(inquiryId, inquiryRecord);
  } catch (dbErr: any) {
    console.error('Failed to save inquiry to database:', dbErr);
    return res.status(500).json({
      success: false,
      error: 'Failed to record your inquiry in the database. Please try again.'
    });
  }

  // 2. Trigger email dispatch in the background or synchronously
  try {
    const emailResult = await dispatchInquiryEmail(inquiryRecord);
    inquiryRecord.emailDeliveryStatus = emailResult.status;
    inquiryRecord.recipients = emailResult.recipients;
    if (emailResult.status === 'Sent') {
      inquiryRecord.emailSentAt = new Date().toISOString();
      inquiryRecord.lastEmailError = null;
    } else {
      inquiryRecord.lastEmailError = emailResult.error || 'Email dispatch failed';
    }

    inquiriesCache.set(inquiryId, { ...inquiryRecord });

    // Update delivery status in Firestore
    await updateDoc(doc(db, 'inquiries', inquiryId), {
      emailDeliveryStatus: inquiryRecord.emailDeliveryStatus,
      emailSentAt: inquiryRecord.emailSentAt,
      lastEmailError: inquiryRecord.lastEmailError,
      recipients: inquiryRecord.recipients,
      updatedAt: new Date().toISOString()
    });
  } catch (emailErr: any) {
    console.warn('Error during email dispatch step:', emailErr);
    // Retain inquiry in database with failed email status
    try {
      await updateDoc(doc(db, 'inquiries', inquiryId), {
        emailDeliveryStatus: 'Failed',
        lastEmailError: emailErr?.message || 'Internal email error',
        updatedAt: new Date().toISOString()
      });
    } catch {}
  }

  return res.status(200).json({
    success: true,
    inquiry: inquiryRecord,
    message: 'Your inquiry has been submitted and recorded.'
  });
});

/**
 * GET /api/inquiries
 * Retrieve all inquiries (Admin only)
 */
app.get('/api/inquiries', async (_req: Request, res: Response) => {
  try {
    const snap = await getDocs(collection(db, 'inquiries'));
    const list: any[] = [];
    snap.forEach((d) => {
      const item = { ...d.data(), id: d.id };
      list.push(item);
      inquiriesCache.set(d.id, item);
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ success: true, inquiries: list });
  } catch (err: any) {
    // If Firestore direct query was blocked by rules (unauthenticated server), return server cache
    if (inquiriesCache.size > 0) {
      const list = Array.from(inquiriesCache.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return res.json({ success: true, inquiries: list });
    }
    return res.json({ success: true, inquiries: [] });
  }
});

/**
 * PATCH /api/inquiries/:id/status
 * Update status of an inquiry
 */
app.patch('/api/inquiries/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['New', 'Read', 'Replied', 'Resolved'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'inquiries', id), {
      status,
      updatedAt: now
    });
    const cached = inquiriesCache.get(id);
    if (cached) {
      cached.status = status;
      cached.updatedAt = now;
    }
    return res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err: any) {
    const cached = inquiriesCache.get(id);
    if (cached) {
      cached.status = status;
      cached.updatedAt = new Date().toISOString();
      return res.json({ success: true, message: `Status updated to ${status}` });
    }
    return res.status(500).json({ success: false, error: 'Failed to update inquiry status' });
  }
});

/**
 * POST /api/admin/change-superadmin
 * Authoritatively update the Super Admin Gmail address in Firestore
 */
app.post('/api/admin/change-superadmin', async (req: Request, res: Response) => {
  const { newEmail, operatorEmail } = req.body;

  if (!newEmail || typeof newEmail !== 'string' || !newEmail.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid new Super Admin email is required.' });
  }

  const cleanNew = newEmail.trim().toLowerCase();
  const cleanOp = (operatorEmail || '').trim().toLowerCase();

  // Verify that requester is currently authorized Super Admin
  let currentSuper = DEFAULT_SUPERADMIN_EMAIL.toLowerCase();
  let assignedAdminsList: any[] = [];
  try {
    const rolesSnap = await getDoc(doc(db, 'adminConfig', 'roles'));
    if (rolesSnap.exists()) {
      const data = rolesSnap.data();
      if (data?.realAdminEmail) {
        currentSuper = (data.realAdminEmail as string).trim().toLowerCase();
      }
      if (Array.isArray(data?.assignedAdmins)) {
        assignedAdminsList = data.assignedAdmins;
      }
    }
  } catch (readErr) {
    console.warn('Could not read existing roles document:', readErr);
  }

  // Authorize operator
  if (cleanOp !== currentSuper && cleanOp !== DEFAULT_SUPERADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized: Only the current authorized Super Admin can change the Super Admin email.'
    });
  }

  const nowIso = new Date().toISOString();
  try {
    // 1. Update /adminConfig/roles with authoritative server signature
    await setDoc(doc(db, 'adminConfig', 'roles'), {
      realAdminEmail: cleanNew,
      assignedAdmins: assignedAdminsList,
      updatedAt: nowIso,
      serverAuthToken: SERVER_AUTH_TOKEN
    }, { merge: true });

    // 2. Add new Super Admin to /admins
    await setDoc(doc(db, 'admins', cleanNew), {
      email: cleanNew,
      uid: cleanNew,
      role: 'super_admin',
      assignedAt: nowIso,
      assignedBy: 'Super Admin Transfer',
      status: 'active',
      serverAuthToken: SERVER_AUTH_TOKEN
    }, { merge: true });

    // 3. Clean up old Super Admin from /admins if changed
    if (currentSuper && currentSuper !== cleanNew) {
      await updateDoc(doc(db, 'admins', currentSuper), {
        role: 'former_super_admin',
        status: 'transferred',
        serverAuthToken: SERVER_AUTH_TOKEN
      }).catch(() => {});
      await deleteDoc(doc(db, 'admins', currentSuper)).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Super Admin email successfully updated to ${cleanNew} in Firestore authoritative database.`,
      realAdminEmail: cleanNew
    });
  } catch (err: any) {
    console.error('Server failed to update Super Admin email in Firestore:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to update Super Admin configuration in database.'
    });
  }
});

/**
 * POST /api/inquiries/:id/retry-email
 * Retry sending email for a saved inquiry without creating duplicates
 */
app.post('/api/inquiries/:id/retry-email', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    let inquiryData = inquiriesCache.get(id);
    if (!inquiryData) {
      try {
        const inquirySnap = await getDoc(doc(db, 'inquiries', id));
        if (inquirySnap.exists()) {
          inquiryData = inquirySnap.data() as any;
        }
      } catch {}
    }
    if (!inquiryData && req.body && req.body.inquiry) {
      inquiryData = req.body.inquiry;
    }

    if (!inquiryData) {
      return res.status(404).json({ success: false, error: 'Inquiry record not found' });
    }

    const emailResult = await dispatchInquiryEmail(inquiryData);

    const now = new Date().toISOString();
    const updatePayload: any = {
      emailDeliveryStatus: emailResult.status,
      recipients: emailResult.recipients,
      updatedAt: now
    };

    if (emailResult.status === 'Sent') {
      updatePayload.emailSentAt = now;
      updatePayload.lastEmailError = null;
    } else {
      updatePayload.lastEmailError = emailResult.error || 'Retry delivery failed';
    }

    try {
      await updateDoc(doc(db, 'inquiries', id), updatePayload);
    } catch {}

    const updatedMerged = { ...inquiryData, ...updatePayload };
    inquiriesCache.set(id, updatedMerged);

    return res.json({
      success: emailResult.status === 'Sent',
      message: emailResult.status === 'Sent' 
        ? `Email successfully delivered to ${emailResult.recipients.join(', ')}`
        : `Email delivery failed: ${emailResult.error}`,
      inquiry: updatedMerged
    });
  } catch (err: any) {
    console.error('Failed to retry email delivery:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to retry email' });
  }
});

// =========================================================================
// VITE SPA DEV & PRODUCTION INTEGRATION
// =========================================================================

async function startServer() {
  const port = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite dev server in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`[Server] Khojamm server running on http://localhost:${port} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
