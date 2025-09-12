import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertCustomerSchema, 
  insertMaintenancePlanSchema, 
  insertReviewSchema, 
  insertQuoteSchema,
  insertEmailCampaignSchema,
  insertAppointmentSchema,
  insertProjectGallerySchema,
  insertBlockedTimeSchema,
  insertAvailabilityRuleSchema,
  insertServiceSchema,
  insertServiceAddonSchema,
  insertPortalLoginTokenSchema,
  rescheduleRequestSchema,
  type InsertCustomer
} from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import { EmailService } from "./utils/mail";
import axios from "axios";
import crypto from "crypto";
import { getOpenSlots } from "./utils/availability";
import { fromZonedTime } from "date-fns-tz";
import { ADMIN_CREDENTIALS } from "./utils/auth";
import { requireAdmin, requireCustomer, setCustomerSession, clearCustomerSession, rlAuth, rlSensitive } from "./security";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize OpenAI client
  const openai = process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  }) : null;

  // Initialize email service
  const emailService = new EmailService();
  
  // SECURITY: Setup automated token cleanup
  const TOKEN_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  setInterval(async () => {
    try {
      await storage.deleteExpiredPortalLoginTokens();
      console.log('[SECURITY] Expired portal login tokens cleaned up');
    } catch (error) {
      console.error('[SECURITY] Token cleanup failed:', error);
    }
  }, TOKEN_CLEANUP_INTERVAL);
  
  // Run initial cleanup on startup
  setTimeout(async () => {
    try {
      await storage.deleteExpiredPortalLoginTokens();
      console.log('[SECURITY] Initial token cleanup completed');
    } catch (error) {
      console.error('[SECURITY] Initial token cleanup failed:', error);
    }
  }, 5000); // 5 seconds after startup

  // Initialize Calendly API client
  const CALENDLY_PAT = process.env.CALENDLY_PAT;
  let CALENDLY_USER_URI = process.env.CALENDLY_USER_URI || "";
  let CALENDLY_ORG_URI = process.env.CALENDLY_ORG_URI || "";
  const CALENDLY_SIGNING_KEY = process.env.CALENDLY_SIGNING_KEY || "";

  const calendly = axios.create({
    baseURL: "https://api.calendly.com",
    headers: CALENDLY_PAT ? { Authorization: `Bearer ${CALENDLY_PAT}` } : {}
  });

  // Bootstrap to fetch user/org if not provided
  async function ensureUserAndOrg() {
    if (CALENDLY_PAT && (!CALENDLY_USER_URI || !CALENDLY_ORG_URI)) {
      try {
        const { data } = await calendly.get("/users/me");
        CALENDLY_USER_URI = data?.resource?.uri || CALENDLY_USER_URI;
        CALENDLY_ORG_URI = data?.resource?.current_organization || CALENDLY_ORG_URI;
        console.log("Calendly user/org URIs fetched:", { CALENDLY_USER_URI, CALENDLY_ORG_URI });
      } catch (error: any) {
        console.error("Failed to fetch Calendly user/org:", error.message);
      }
    }
  }

  // Verify Calendly webhook signature
  function verifyCalendlySignature(signingKey: string, signatureHeader: string, bodyBuffer: Buffer): boolean {
    if (!signingKey || !signatureHeader) return false;
    
    const parts = signatureHeader.split(",").reduce((acc: any, kv: string) => {
      const [k, v] = kv.split("=");
      acc[k.trim()] = (v || "").trim();
      return acc;
    }, {});

    const ts = parts["t"];
    const v1 = parts["v1"];
    if (!ts || !v1) return false;

    const payload = `${ts}.${bodyBuffer.toString("utf8")}`;
    const expected = crypto.createHmac("sha256", signingKey).update(payload).digest("hex");

    // Compare safely
    return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  }

  // Calendly API: Get event types dynamically (disabled)
  app.get("/api/calendly/event-types", async (req, res) => {
    // Return empty event types - Calendly integration disabled
    res.json({ 
      user: "", 
      organization: "", 
      event_types: [] 
    });
  });

  // Admin authentication routes with session-based auth
  app.post("/api/admin/login", rlAuth, async (req, res) => {
    try {
      const { password } = req.body;
      
      // Validate input
      if (!password) {
        return res.status(400).json({ 
          success: false, 
          message: "Password is required" 
        });
      }
      
      // Get admin password from environment variable
      const adminPassword = process.env.ADMIN_PASS;
      if (!adminPassword) {
        console.error("ADMIN_PASS environment variable is not set");
        return res.status(500).json({ 
          success: false, 
          message: "Server configuration error" 
        });
      }
      
      // Check password
      if (password === adminPassword) {
        // Set admin session
        (req.session as any).isAdmin = true;
        
        res.json({ 
          success: true, 
          message: "Login successful"
        });
        
        console.log("[AUTH] Admin logged in successfully");
      } else {
        res.status(401).json({ 
          success: false, 
          message: "Invalid password" 
        });
        
        console.warn("[AUTH] Failed admin login attempt");
      }
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Login failed" 
      });
    }
  });

  // Admin logout route
  app.post("/api/admin/logout", (req, res) => {
    try {
      if (req.session) {
        // Destroy the session
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destroy error:", err);
            return res.status(500).json({ 
              success: false, 
              message: "Logout failed" 
            });
          }
          
          // Clear the session cookie
          res.clearCookie("ht.sid", {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
          });
          
          res.json({ 
            success: true, 
            message: "Logged out successfully" 
          });
          
          console.log("[AUTH] Admin logged out successfully");
        });
      } else {
        res.json({ 
          success: true, 
          message: "Already logged out" 
        });
      }
    } catch (error) {
      console.error("Admin logout error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Logout failed" 
      });
    }
  });

  // Customer Portal Authentication Routes
  
  // Portal login - Generate magic link token and send email
  app.post("/api/portal/login", rlAuth, async (req, res) => {
    try {
      const { email } = req.body;
      
      // Validate input
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email is required" 
        });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false, 
          message: "Please enter a valid email address" 
        });
      }
      
      // Check if customer exists (or create them if not)
      let customer = await storage.getCustomerByEmail(email);
      if (!customer) {
        // For now, only allow existing customers to login
        // In production, you might want to auto-create or require registration
        return res.status(404).json({ 
          success: false, 
          message: "No account found with this email address" 
        });
      }
      
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      
      console.log(`[DEBUG] Creating token for ${email}, expires at: ${expiresAt.toISOString()}, current time: ${new Date().toISOString()}`);
      
      // Store hashed token in database for security
      await storage.createPortalLoginToken(
        token,
        email,
        customer.id,
        expiresAt
      );
      
      // Send magic link email
      const baseUrl = process.env.PUBLIC_BASE_URL || req.get('origin') || 'http://localhost:5000';
      const magicLink = `${baseUrl}/portal/callback?token=${token}`;
      
      // Use EmailService to send magic link email
      await emailService.sendMagicLinkEmail({
        to: email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        magicLink
      });
      
      res.json({ 
        success: true, 
        message: "Magic link sent! Please check your email and click the link to sign in." 
      });
      
      console.log(`[PORTAL_AUTH] Magic link sent to ${email}`);
      
      // SECURITY: Opportunistic cleanup of expired tokens
      setTimeout(async () => {
        try {
          await storage.deleteExpiredPortalLoginTokens();
        } catch (error) {
          console.error('[SECURITY] Opportunistic token cleanup failed:', error);
        }
      }, 1000); // Clean up after 1 second (non-blocking)
      
    } catch (error) {
      console.error("Portal login error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Unable to send login link. Please try again." 
      });
    }
  });

  // Portal callback - Verify token and set session
  app.get("/api/portal/callback", rlSensitive, async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid login link" 
        });
      }
      
      // Get and verify hashed token
      console.log(`[DEBUG] Checking token at ${new Date().toISOString()}`);
      const tokenRecord = await storage.getPortalLoginTokenByHash(token);
      if (!tokenRecord) {
        console.log(`[DEBUG] Token not found or expired for token: ${token}`);
        return res.status(401).json({ 
          success: false, 
          message: "Login link is invalid or has expired" 
        });
      }
      console.log(`[DEBUG] Token found, expires at: ${tokenRecord.expiresAt?.toISOString()}, used at: ${tokenRecord.usedAt?.toISOString()}`)
      
      // Check if token has been used
      if (tokenRecord.usedAt) {
        return res.status(401).json({ 
          success: false, 
          message: "Login link has already been used" 
        });
      }
      
      // Get customer
      const customer = await storage.getCustomer(tokenRecord.customerId!);
      if (!customer) {
        return res.status(404).json({ 
          success: false, 
          message: "Customer account not found" 
        });
      }
      
      // Mark token as used
      await storage.markPortalLoginTokenUsed(token);
      
      // Set customer session with security hardening (session regeneration)
      try {
        await setCustomerSession(req, customer.id, customer.email);
      } catch (sessionError) {
        console.error('[SECURITY] Session setup failed:', sessionError);
        return res.status(500).json({ 
          success: false, 
          message: "Login failed due to session error" 
        });
      }
      
      res.json({ 
        success: true, 
        message: "Login successful",
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email
        }
      });
      
      console.log(`[PORTAL_AUTH] Customer ${customer.email} logged in successfully`);
      
    } catch (error) {
      console.error("Portal callback error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Login failed. Please try again." 
      });
    }
  });

  // Portal verify - Secure CSRF-protected token verification
  app.post("/api/portal/verify", rlSensitive, async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid login link" 
        });
      }
      
      // Get and verify hashed token
      console.log(`[DEBUG] Checking token at ${new Date().toISOString()}`);
      const tokenRecord = await storage.getPortalLoginTokenByHash(token);
      if (!tokenRecord) {
        console.log(`[DEBUG] Token not found or expired for token: ${token}`);
        return res.status(401).json({ 
          success: false, 
          message: "Login link is invalid or has expired" 
        });
      }
      console.log(`[DEBUG] Token found, expires at: ${tokenRecord.expiresAt?.toISOString()}, used at: ${tokenRecord.usedAt?.toISOString()}`)
      
      // Check if token has been used
      if (tokenRecord.usedAt) {
        return res.status(401).json({ 
          success: false, 
          message: "Login link has already been used" 
        });
      }
      
      // Get customer
      const customer = await storage.getCustomer(tokenRecord.customerId!);
      if (!customer) {
        return res.status(404).json({ 
          success: false, 
          message: "Customer account not found" 
        });
      }
      
      // Mark token as used
      await storage.markPortalLoginTokenUsed(token);
      
      // Set customer session with security hardening (session regeneration and CSRF rotation)
      try {
        await setCustomerSession(req, customer.id, customer.email);
      } catch (sessionError) {
        console.error('[SECURITY] Session setup failed:', sessionError);
        return res.status(500).json({ 
          success: false, 
          message: "Login failed due to session error" 
        });
      }
      
      res.json({ 
        success: true, 
        message: "Login successful",
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email
        }
      });
      
      console.log(`[PORTAL_AUTH] Customer ${customer.email} logged in successfully via CSRF-protected flow`);
      
    } catch (error) {
      console.error("Portal verify error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Login failed. Please try again." 
      });
    }
  });

  // Portal logout - Clear customer session with security hardening
  app.post("/api/portal/logout", async (req, res) => {
    try {
      // Securely destroy customer session
      await clearCustomerSession(req);
      
      // Clear session cookie
      res.clearCookie("ht.sid", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });
      
      res.json({ 
        success: true, 
        message: "Logged out successfully" 
      });
      
      console.log("[PORTAL_AUTH] Customer logged out successfully with secure session cleanup");
      
    } catch (error) {
      console.error("Portal logout error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Logout failed" 
      });
    }
  });

  // Portal profile - Get authenticated customer data
  app.get("/api/portal/profile", requireCustomer, async (req, res) => {
    try {
      const { customer } = req as any;
      
      // Get full customer data
      const customerData = await storage.getCustomer(customer.id);
      if (!customerData) {
        return res.status(404).json({ 
          success: false, 
          message: "Customer profile not found" 
        });
      }

      // Get customer's maintenance plans
      const maintenancePlans = await storage.getMaintenancePlansByCustomer(customer.id);
      
      // Get customer's email campaigns (communication history)
      const emailCampaigns = await storage.getEmailCampaignsByCustomer(customer.id);
      
      // Get customer's appointments
      const appointments = await storage.getAppointmentsByCustomer(customer.id);

      res.json({
        success: true,
        customer: {
          id: customerData.id,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          email: customerData.email,
          phone: customerData.phone,
          company: customerData.company,
          createdAt: customerData.createdAt,
          lastEmailSent: customerData.lastEmailSent
        },
        maintenancePlans,
        emailCampaigns,
        appointments
      });
      
      console.log(`[PORTAL_PROFILE] Profile data retrieved for customer ${customer.email}`);
      
    } catch (error) {
      console.error("Portal profile error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Unable to load profile data. Please try again." 
      });
    }
  });

  // Admin schedule endpoint - Get comprehensive schedule view (Protected)
  app.get("/api/admin/schedule", requireAdmin, async (req, res) => {
    try {
      // Fetch all appointments and blocked times for admin view
      const [appointments, blockedTimes] = await Promise.all([
        storage.getAllAppointments(),
        storage.getBlockedTimes()
      ]);

      // Sort appointments by start time for better admin viewing
      const sortedAppointments = appointments.sort((a, b) => 
        new Date(a.startTimestamptz || a.appointmentDate).getTime() - 
        new Date(b.startTimestamptz || b.appointmentDate).getTime()
      );

      // Sort blocked times by start time
      const sortedBlockedTimes = blockedTimes.sort((a, b) =>
        new Date(a.startTimestamptz).getTime() - new Date(b.startTimestamptz).getTime()
      );

      res.json({
        appointments: sortedAppointments,
        blockedTimes: sortedBlockedTimes
      });
    } catch (error) {
      console.error("Failed to fetch admin schedule:", error);
      res.status(500).json({ message: "Failed to fetch schedule data" });
    }
  });

  // Admin Appointment Management Endpoints (Protected)
  
  // Update appointment status
  app.put("/api/admin/appointments/:id/status", requireAdmin, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { status, notes } = req.body;

      // Validate status
      const validStatuses = ["scheduled", "completed", "cancelled", "no-show", "in-progress"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status. Must be one of: " + validStatuses.join(", ") 
        });
      }

      // Check if appointment exists
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Update appointment status
      await storage.adminUpdateAppointmentStatus(appointmentId, status, notes);

      res.json({ 
        success: true, 
        message: `Appointment status updated to ${status}${notes ? ' with notes' : ''}` 
      });
    } catch (error) {
      console.error("Admin appointment status update error:", error);
      res.status(500).json({ message: "Failed to update appointment status" });
    }
  });

  // Admin reschedule appointment
  app.put("/api/admin/appointments/:id/reschedule", requireAdmin, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { startTime, endTime, checkAvailability = true } = req.body;

      // Validate input
      if (!startTime || !endTime) {
        return res.status(400).json({ 
          message: "Both startTime and endTime are required" 
        });
      }

      const startTimestamp = new Date(startTime);
      const endTimestamp = new Date(endTime);

      // Validate dates
      if (isNaN(startTimestamp.getTime()) || isNaN(endTimestamp.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      if (startTimestamp >= endTimestamp) {
        return res.status(400).json({ message: "End time must be after start time" });
      }

      // Check if appointment exists
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Optional availability check (admin can override)
      if (checkAvailability) {
        const durationMinutes = (endTimestamp.getTime() - startTimestamp.getTime()) / (1000 * 60);
        const searchStart = new Date(startTimestamp.getTime() - (24 * 60 * 60 * 1000));
        const searchEnd = new Date(startTimestamp.getTime() + (24 * 60 * 60 * 1000));

        try {
          const availableSlots = await getOpenSlots(
            storage,
            searchStart,
            searchEnd,
            durationMinutes,
            30, // 30-minute steps
            15  // 15-minute buffer
          );

          // Check if the requested time slot is available
          const isAvailable = availableSlots.some(slotISO => {
            const slotStart = new Date(slotISO);
            const slotEnd = new Date(slotStart.getTime() + (durationMinutes * 60 * 1000));
            return slotStart <= startTimestamp && slotEnd >= endTimestamp;
          });

          if (!isAvailable) {
            return res.status(409).json({ 
              message: "Time slot is not available. Use 'checkAvailability: false' to override." 
            });
          }
        } catch (availabilityError) {
          console.warn("Availability check failed:", availabilityError);
          // Continue with reschedule even if availability check fails
        }
      }

      // Perform the reschedule
      await storage.adminRescheduleAppointment(appointmentId, startTimestamp, endTimestamp);

      res.json({ 
        success: true, 
        message: "Appointment rescheduled successfully" 
      });
    } catch (error) {
      console.error("Admin appointment reschedule error:", error);
      res.status(500).json({ message: "Failed to reschedule appointment" });
    }
  });

  // Cancel/Delete appointment
  app.delete("/api/admin/appointments/:id", requireAdmin, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { action = "cancel" } = req.body; // "cancel" or "delete"

      // Check if appointment exists
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      if (action === "delete") {
        // Permanently delete the appointment
        await storage.deleteAppointment(appointmentId);
        res.json({ 
          success: true, 
          message: "Appointment deleted permanently" 
        });
      } else {
        // Cancel the appointment (change status)
        await storage.adminCancelAppointment(appointmentId);
        res.json({ 
          success: true, 
          message: "Appointment cancelled" 
        });
      }
    } catch (error) {
      console.error("Admin appointment cancel/delete error:", error);
      res.status(500).json({ message: "Failed to cancel/delete appointment" });
    }
  });

  // Update appointment customer details
  app.put("/api/admin/appointments/:id/customer", requireAdmin, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const customerUpdates = req.body;

      // Check if appointment exists
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Validate customer data (partial validation)
      const validFields = ["firstName", "lastName", "email", "phone", "company"];
      const updates: Partial<InsertCustomer> = {};
      
      for (const field of validFields) {
        if (customerUpdates[field] !== undefined) {
          updates[field as keyof InsertCustomer] = customerUpdates[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ 
          message: "No valid customer fields provided for update" 
        });
      }

      // Update customer details
      await storage.adminUpdateAppointmentCustomer(appointmentId, updates);

      res.json({ 
        success: true, 
        message: "Customer details updated successfully" 
      });
    } catch (error) {
      console.error("Admin appointment customer update error:", error);
      res.status(500).json({ message: "Failed to update customer details" });
    }
  });

  // Customer routes
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      
      // Check if customer already exists
      const existingCustomer = await storage.getCustomerByEmail(customerData.email);
      if (existingCustomer) {
        return res.status(400).json({ message: "Customer with this email already exists" });
      }

      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create customer" });
      }
    }
  });

  // Maintenance plan routes
  app.get("/api/maintenance-plans", async (req, res) => {
    try {
      const plans = await storage.getAllActiveMaintenancePlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance plans" });
    }
  });

  app.get("/api/customers/:id/maintenance-plans", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const plans = await storage.getMaintenancePlansByCustomer(customerId);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer maintenance plans" });
    }
  });

  // SECURITY: Customer-only maintenance plan creation - prevents IDOR vulnerability
  app.post("/api/maintenance-plans", requireCustomer, async (req, res) => {
    try {
      // Extract customer ID from authenticated session - NEVER trust client data
      const { customer } = req as any;
      
      // Parse request body but override customerId with authenticated customer
      const planData = insertMaintenancePlanSchema.parse(req.body);
      const securePlanData = {
        ...planData,
        customerId: customer.id // Use authenticated customer ID, not from request body
      };
      
      const plan = await storage.createMaintenancePlan(securePlanData);
      res.status(201).json(plan);
      
      console.log(`[SECURITY] Customer ${customer.id} created maintenance plan`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid maintenance plan data", errors: error.errors });
      } else {
        console.error("Maintenance plan creation error:", error);
        res.status(500).json({ message: "Failed to create maintenance plan" });
      }
    }
  });

  // Review routes
  app.get("/api/reviews", async (req, res) => {
    try {
      const reviews = await storage.getApprovedReviews();
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid review data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create review" });
      }
    }
  });

  app.patch("/api/reviews/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.approveReview(id);
      res.json({ message: "Review approved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve review" });
    }
  });

  // Customer review submission endpoint
  app.post("/api/reviews/submit", async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        serviceType,
        rating,
        title,
        content
      } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !rating || !title || !content) {
        return res.status(400).json({ 
          message: "Missing required fields: firstName, lastName, email, rating, title, and content are required" 
        });
      }

      // Validate rating
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      // Auto-create customer if they don't exist
      let customer = await storage.getCustomerByEmail(email);
      if (!customer) {
        customer = await storage.createCustomer({
          firstName,
          lastName,
          email,
          phone: phone || null,
          company: null,
        });
      }

      // Create the review
      const reviewData = {
        customerId: customer.id,
        rating: parseInt(rating),
        title,
        content,
      };

      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating customer review:", error);
      res.status(500).json({ message: "Failed to submit review" });
    }
  });

  // Quote routes
  app.get("/api/quotes", async (req, res) => {
    try {
      const quotes = await storage.getAllQuotes();
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.post("/api/quotes", async (req, res) => {
    try {
      const quoteData = insertQuoteSchema.parse(req.body);
      const quote = await storage.createQuote(quoteData);
      
      // Auto-create customer if they don't exist
      const existingCustomer = await storage.getCustomerByEmail(quote.email);
      if (!existingCustomer) {
        await storage.createCustomer({
          firstName: quote.firstName,
          lastName: quote.lastName,
          email: quote.email,
          phone: null,
          company: quote.company || null,
        });
      }

      res.status(201).json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create quote" });
      }
    }
  });

  // Appointments routes
  app.post("/api/appointments", async (req, res) => {
    try {
      // Parse and validate appointment data
      const appointmentData = insertAppointmentSchema.parse(req.body);
      
      // Use provided duration hours or fallback to service-based duration
      const serviceDurations: Record<string, number> = {
        "Plumbing": 2,
        "Electrical": 3,
        "Carpentry": 4,
        "Technology Setup": 2,
        "Appliance Installation": 3,
        "Appliance Repair": 2,
        "General Handyman": 2,
        "Emergency Repair": 1,
        "Home Security": 3,
        "Custom Project": 4
      };

      // Get duration from request (user-selected) or fallback to service type mapping
      const durationHours = appointmentData.durationHours || serviceDurations[appointmentData.serviceType] || 2;
      
      // Compute timestamps from appointmentDate and appointmentTime in Central Time
      const [timeStr, period] = appointmentData.appointmentTime.split(' ');
      const [hoursStr, minutesStr] = timeStr.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      // Create appointment time in Central Time, then convert to UTC
      const businessTz = 'America/Chicago';
      const appointmentDate = new Date(appointmentData.appointmentDate);
      const year = appointmentDate.getFullYear();
      const month = (appointmentDate.getMonth() + 1).toString().padStart(2, '0');
      const day = appointmentDate.getDate().toString().padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const timeStr24 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
      const startTimestamptz = fromZonedTime(`${dateStr}T${timeStr24}`, businessTz);
      const endTimestamptz = new Date(startTimestamptz.getTime() + (durationHours * 60 * 60 * 1000));
      
      // Generate reschedule token (24-byte hex)
      const rescheduleToken = crypto.randomBytes(24).toString('hex');
      const rescheduleExpires = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days
      
      // Final overlap check using availability engine
      try {
        console.log(`Checking availability for ${startTimestamptz.toISOString()} to ${endTimestamptz.toISOString()}`);
        
        // Check availability for the specific time slot
        const searchStart = new Date(startTimestamptz.getTime() - (60 * 60 * 1000)); // 1 hour before
        const searchEnd = new Date(endTimestamptz.getTime() + (60 * 60 * 1000)); // 1 hour after
        const durationMinutes = durationHours * 60;
        
        const availableSlots = await getOpenSlots(
          storage,
          searchStart,
          searchEnd,
          durationMinutes,
          30, // step minutes
          15  // buffer minutes
        );
        
        // Check if our requested start time is available (exact match required)
        const requestedSlot = startTimestamptz.toISOString();
        const slotAvailable = availableSlots.some(slot => {
          const slotTime = new Date(slot);
          return slotTime.getTime() === startTimestamptz.getTime(); // Exact match required
        });
        
        if (!slotAvailable) {
          console.log(`Time slot ${requestedSlot} is not available. Available slots:`, availableSlots);
          return res.status(409).json({
            ok: false,
            error: "TIME_UNAVAILABLE",
            message: "That time was just taken. Please choose another slot.",
            availableSlots: availableSlots.slice(0, 10) // Show first 10 alternatives
          });
        }
        
      } catch (availabilityError) {
        console.error('Availability check failed:', availabilityError);
        // Continue with appointment creation but log the error
      }
      
      // Create appointment with computed timestamps and reschedule token
      const enhancedAppointmentData = {
        ...appointmentData,
        startTimestamptz,
        endTimestamptz,
        rescheduleToken,
        rescheduleExpires,
        sequence: 0,
        status: "scheduled" as const,
        source: appointmentData.source || "manual" as const
      };
      
      const appointment = await storage.createAppointment(enhancedAppointmentData);

      // Auto-create customer if they don't exist
      const existingCustomer = await storage.getCustomerByEmail(appointmentData.email);
      if (!existingCustomer) {
        await storage.createCustomer({
          firstName: appointmentData.firstName,
          lastName: appointmentData.lastName,
          email: appointmentData.email,
          phone: appointmentData.phone || null,
          company: null,
        });
      }

      // Send emails with proper integration
      try {
        // Send customer confirmation email with ICS attachment and reschedule link
        await emailService.sendAppointmentConfirmation(appointment, rescheduleToken);
        
        // Send admin notification with appointment details
        await emailService.sendAdminNotification(appointment);
        
        console.log(`Appointment ${appointment.id} created successfully with emails sent`);
      } catch (emailError) {
        console.error('Failed to send emails:', emailError);
        // Don't fail the appointment creation if email fails
      }

      res.status(201).json({
        ...appointment,
        rescheduleToken, // Include reschedule token in response
        duration: durationHours
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid appointment data", 
          errors: error.errors 
        });
      } else {
        console.error("Appointment creation error:", error);
        res.status(500).json({ 
          message: "Failed to create appointment",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  app.get("/api/appointments", async (req, res) => {
    try {
      const appointments = await storage.getAllAppointments();
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  // Reschedule endpoints
  app.get("/api/reschedule/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Look up appointment by reschedule token
      const appointment = await storage.getAppointmentByRescheduleToken(token);
      
      if (!appointment) {
        return res.status(404).json({ 
          message: "Invalid or expired reschedule token" 
        });
      }
      
      // Check if token has expired
      if (appointment.rescheduleExpires && new Date() > appointment.rescheduleExpires) {
        return res.status(404).json({ 
          message: "Reschedule token has expired" 
        });
      }
      
      // Calculate duration from existing appointment
      let durationHours = 2; // Default duration
      if (appointment.startTimestamptz && appointment.endTimestamptz) {
        const durationMs = appointment.endTimestamptz.getTime() - appointment.startTimestamptz.getTime();
        durationHours = durationMs / (1000 * 60 * 60);
      }
      
      // Return appointment details
      res.json({
        id: appointment.id,
        title: `${appointment.serviceType} - ${appointment.firstName} ${appointment.lastName}`,
        start: appointment.startTimestamptz?.toISOString() || appointment.appointmentDate?.toISOString(),
        end: appointment.endTimestamptz?.toISOString(),
        hours: durationHours
      });
    } catch (error) {
      console.error("Reschedule lookup error:", error);
      res.status(500).json({ message: "Failed to lookup appointment for rescheduling" });
    }
  });

  app.post("/api/reschedule/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      // Validate request body - handle ZodError at the top level
      let validatedData;
      try {
        validatedData = rescheduleRequestSchema.parse(req.body);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid request data", 
            errors: validationError.errors 
          });
        }
        throw validationError;
      }
      
      const { startISO } = validatedData;
      const newStartTime = new Date(startISO);
      
      // Look up appointment by reschedule token
      const appointment = await storage.getAppointmentByRescheduleToken(token);
      
      if (!appointment) {
        return res.status(404).json({ 
          message: "Invalid or expired reschedule token" 
        });
      }
      
      // Check if token has expired
      if (appointment.rescheduleExpires && new Date() > appointment.rescheduleExpires) {
        return res.status(404).json({ 
          message: "Reschedule token has expired" 
        });
      }
      
      // Enforce 12-hour minimum notice
      const now = new Date();
      const twelveHoursFromNow = new Date(now.getTime() + (12 * 60 * 60 * 1000));
      
      if (newStartTime < twelveHoursFromNow) {
        return res.status(409).json({ 
          message: "Appointments must be rescheduled at least 12 hours in advance" 
        });
      }
      
      // Calculate duration and new end time
      let durationMs = 2 * 60 * 60 * 1000; // Default 2 hours
      if (appointment.startTimestamptz && appointment.endTimestamptz) {
        durationMs = appointment.endTimestamptz.getTime() - appointment.startTimestamptz.getTime();
      }
      const newEndTime = new Date(newStartTime.getTime() + durationMs);
      
      // Perform conflict check using availability engine
      const durationMinutes = durationMs / (1000 * 60);
      const searchStart = new Date(newStartTime.getTime() - (24 * 60 * 60 * 1000)); // Search 1 day before
      const searchEnd = new Date(newStartTime.getTime() + (24 * 60 * 60 * 1000)); // Search 1 day after
      
      try {
        const availableSlots = await getOpenSlots(
          storage, 
          searchStart, 
          searchEnd, 
          durationMinutes,
          30, // 30-minute steps
          15  // 15-minute buffer
        );
        
        // FIXED: Require exact match with available slots instead of 30-minute tolerance
        const requestedSlotTime = newStartTime.getTime();
        const isSlotAvailable = availableSlots.some(slot => {
          const slotTime = new Date(slot).getTime();
          return slotTime === requestedSlotTime; // Exact match required
        });
        
        if (!isSlotAvailable) {
          return res.status(409).json({ 
            message: "The requested time slot conflicts with existing appointments or blocked times",
            availableSlots: availableSlots.slice(0, 10) // Return first 10 alternative slots
          });
        }
        
      } catch (availabilityError) {
        console.error("Availability check error:", availabilityError);
        return res.status(500).json({ 
          message: "Failed to check availability for the requested time slot" 
        });
      }
      
      // Generate new reschedule token and extend expiration
      const newRescheduleToken = crypto.randomBytes(24).toString('hex');
      const newRescheduleExpires = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // +30 days
      
      // Update appointment with new times and token
      await storage.updateAppointmentTime(
        appointment.id,
        newStartTime,
        newEndTime,
        newRescheduleToken,
        newRescheduleExpires
      );
      
      // Enhanced response with updated appointment details
      res.json({
        success: true,
        message: "Appointment rescheduled successfully",
        appointment: {
          id: appointment.id,
          newStartTime: newStartTime.toISOString(),
          newEndTime: newEndTime.toISOString(),
          serviceType: appointment.serviceType,
          customerName: `${appointment.firstName} ${appointment.lastName}`,
          rescheduleToken: newRescheduleToken,
          rescheduleExpires: newRescheduleExpires.toISOString()
        }
      });
      
    } catch (error) {
      console.error("Reschedule error:", error);
      res.status(500).json({ message: "Failed to reschedule appointment" });
    }
  });

  app.patch("/api/quotes/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      await storage.updateQuoteStatus(id, status);
      res.json({ message: "Quote status updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update quote status" });
    }
  });

  // Email campaign routes
  app.post("/api/email-campaigns", async (req, res) => {
    try {
      const campaignData = insertEmailCampaignSchema.parse(req.body);
      const campaign = await storage.createEmailCampaign(campaignData);
      
      // Update customer's last email sent timestamp
      await storage.updateCustomerLastEmail(campaign.customerId, new Date());
      
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid email campaign data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create email campaign" });
      }
    }
  });

  app.get("/api/customers/:id/email-campaigns", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const campaigns = await storage.getEmailCampaignsByCustomer(customerId);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email campaigns" });
    }
  });

  // Email automation endpoint
  app.post("/api/email-automation/send-batch", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      const sentEmails = [];
      
      for (const customer of customers) {
        const daysSinceLastEmail = customer.lastEmailSent 
          ? Math.floor((Date.now() - customer.lastEmailSent.getTime()) / (1000 * 60 * 60 * 24))
          : 999; // If never sent, treat as very old
        
        if (daysSinceLastEmail >= 45) {
          const campaign = await storage.createEmailCampaign({
            customerId: customer.id,
            subject: "Stay Connected with HandyTech Solutions",
            content: `Hi ${customer.firstName}, we wanted to check in and see how your technology systems are performing. Our team is here to help with any IT needs you may have.`,
            campaignType: "promotional",
          });
          
          await storage.updateCustomerLastEmail(customer.id, new Date());
          sentEmails.push({ customerId: customer.id, campaignId: campaign.id });
        }
      }
      
      res.json({ 
        message: `Sent ${sentEmails.length} promotional emails`,
        sentEmails 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to send batch emails" });
    }
  });

  // Intelligent conversation generator with context awareness and natural name usage
  function generateFallbackResponse(message: string): string {
    // Extract customer name from message (common patterns)
    const nameMatch = message.match(/(?:my name is|i'm|i am|this is|call me)\s+([a-z]+)/i);
    const customerName = nameMatch ? nameMatch[1] : null;
    
    // Context detection patterns
    const specificDetails = {
      faucetLeak: /faucet.*leak|leak.*faucet|dripping.*faucet|faucet.*drip/i,
      kitchenIssue: /kitchen.*leak|kitchen.*faucet|kitchen.*water|under.*sink/i,
      timeframe: /days?|weeks?|months?|yesterday|today|few.*days|several/i,
      location: /underneath|under.*sink|basement|crawl space|cabinet/i,
      costConcern: /charge|cost|price|expensive|estimate|how much|fee/i,
      urgentWords: /urgent|emergency|asap|right away|immediately|help/i,
      humanRequest: /human|person|live person|real person|speak to someone|talk to someone|representative|agent|operator|manager|owner/i
    };
    
    // Priority triggers
    const scheduling = ["schedule", "appointment", "book", "when", "available", "time", "meet", "visit", "come out"];
    const greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"];
    const electrical = ["electrical", "electric", "wiring", "outlet", "switch", "panel", "breaker", "power", "lights"];
    const plumbing = ["plumbing", "plumber", "pipe", "leak", "drain", "faucet", "toilet", "water", "bathroom", "kitchen"];
    const tech = ["smart home", "automation", "security", "tech", "installation", "setup", "wifi", "network", "theater"];
    const painting = ["paint", "painting", "wall", "color", "interior", "exterior", "room", "house"];

    // Priority 1: Human handoff request (highest priority)
    if (specificDetails.humanRequest.test(message)) {
      // This will trigger admin notification
      return "I completely understand wanting to speak with someone directly! Let me connect you with our team right away. One moment please while I get someone on the line for you.";
    }

    // Context-aware responses for specific situations
    if (specificDetails.faucetLeak.test(message) && specificDetails.kitchenIssue.test(message)) {
      return "Ah, kitchen faucet leak under the sink - that's pretty common actually. The good news is it's usually something we can fix pretty quickly. Is the water pooling in the cabinet, or is it dripping into a bucket? Also, do you see where exactly it's coming from - the supply lines or the faucet base itself?";
    }
    
    if (specificDetails.faucetLeak.test(message) && specificDetails.timeframe.test(message)) {
      return "A few days of dripping can definitely add up on your water bill. Kitchen faucet leaks under the sink are usually either loose connections or worn gaskets. Have you tried turning the water supply valves under the sink to see if that stops it temporarily? I can walk you through that if you want, or we can get someone out there today to take a look.";
    }
    
    if (specificDetails.location.test(message) && plumbing.some(word => message.includes(word))) {
      const urgentResponse = specificDetails.urgentWords.test(message) 
        ? "You're absolutely right to be concerned about that. " 
        : "Smart of you to catch it! ";
      return `Underneath leaks are tricky because they can cause damage if they go too long. ${urgentResponse}Is this something that just started, or has it been building up? And is the cabinet floor getting wet or warped at all? We should probably get someone out there sooner rather than later.`;
    }
    
    if (specificDetails.costConcern.test(message) && (greetings.some(word => message.includes(word)) || customerName)) {
      const greeting = customerName ? `Hi ${customerName}! Nice to meet you.` : "Hi there! Good to hear from you.";
      return `${greeting} I totally understand wanting to know what you're looking at cost-wise before we get started. What kind of project are we talking about? For most basic repairs we can give you a pretty good idea over the phone, and we always do free estimates for bigger jobs.`;
    }

    // Standard priority responses with natural name usage
    if (scheduling.some(word => message.includes(word))) {
      const nameResponse = customerName ? `Absolutely, ${customerName}! ` : "Absolutely! ";
      return `${nameResponse}I can help you get that taken care of. What kind of project are you working on? Is this something urgent, or are you planning ahead? For urgent issues we'll work with you to get out there as quickly as possible, and for bigger projects we like to schedule a time that works best for you.`;
    }

    if (greetings.some(word => message.includes(word))) {
      const greeting = customerName ? `Hi ${customerName}! Good to hear from you.` : "Hi there! Good to hear from you.";
      return `${greeting} I'm with HandyTech Solutions here in Missouri. What's going on with your home today - anything I can help you figure out?`;
    }
    
    if (electrical.some(word => message.includes(word))) {
      return "Oh, electrical work - I can definitely help you with that. What's happening exactly? Are we talking about outlets not working, lights flickering, or maybe you're looking to upgrade something? Also, just to be safe - if anything's sparking or you smell something burning, you'll want to turn off that breaker right away.";
    }
    
    if (plumbing.some(word => message.includes(word))) {
      return "Plumbing issues can be such a headache, can't they? Tell me what's going on - is it a leak somewhere, drain backing up, or something else? And how long has this been happening? Sometimes the timeline helps us figure out what we're dealing with.";
    }
    
    if (tech.some(word => message.includes(word))) {
      return "Smart home stuff is really taking off these days! What are you looking to set up? Are you thinking security cameras, smart thermostats, whole home automation, or maybe having trouble with something you already have? I'd love to hear what you have in mind.";
    }
    
    if (painting.some(word => message.includes(word))) {
      return "Painting project, huh? Those can really transform a space. What rooms are you thinking about? Interior or exterior work? And are you dealing with any prep work like cracks or peeling, or is everything pretty smooth and ready to go?";
    }

    return "Hey there! What's going on with your home today? We handle all kinds of stuff - electrical, plumbing, smart home tech, painting, you name it. What can I help you figure out?";
  }

  // Live chat sessions storage
  const liveChatSessions = new Map();
  
  // Chatbot endpoint with intelligent fallback system and live handoff
  app.post("/api/chatbot", async (req, res) => {
    try {
      const { message, sessionId = 'default' } = req.body;
      let botResponse = "";
      let needsHumanHandoff = false;

      // Check if this session is in live mode
      const liveSession = liveChatSessions.get(sessionId);
      if (liveSession && liveSession.isLive) {
        // Store message for admin to see, but don't respond
        liveSession.messages.push({ 
          type: 'customer', 
          message, 
          timestamp: new Date() 
        });
        
        return res.json({
          response: "Please hold, you're speaking with our team member...",
          isLiveMode: true,
          shouldShowScheduling: false
        });
      }

      // Try OpenAI first, then fallback
      if (openai) {
        try {
          console.log("Using OpenAI for message:", message);
          // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
          const response = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [
              {
                role: "system",
                content: "You are a friendly customer service representative for HandyTech Solutions, a Missouri-based handyman service. We specialize in electrical work, plumbing, smart home technology, painting, and general maintenance. Be helpful, professional, and knowledgeable about home improvement services. If customers need to schedule an appointment or want a quote, encourage them to do so. Keep responses conversational and under 150 words."
              },
              {
                role: "user",
                content: message
              }
            ],
            max_tokens: 150,
            temperature: 0.7,
          });
          
          botResponse = response.choices[0].message.content || "";
          console.log("OpenAI response generated:", botResponse);
        } catch (error) {
          console.error("OpenAI API error:", error);
          console.log("Falling back to local response system");
          botResponse = generateFallbackResponse(message.toLowerCase());
        }
      } else {
        // Use fallback response system
        console.log("Using fallback chatbot system for message:", message);
        botResponse = generateFallbackResponse(message.toLowerCase());
        console.log("Fallback response generated:", botResponse);
      }

      // Check if human handoff was requested
      const humanRequest = /human|person|live person|real person|speak to someone|talk to someone|representative|agent|operator|manager|owner/i;
      if (humanRequest.test(message.toLowerCase())) {
        needsHumanHandoff = true;
        
        // Create or update live chat session
        liveChatSessions.set(sessionId, {
          isLive: false, // Admin hasn't taken over yet
          needsHandoff: true,
          customerMessage: message,
          messages: [
            { type: 'customer', message, timestamp: new Date() }
          ],
          startTime: new Date()
        });
        
        console.log(`🚨 HUMAN HANDOFF REQUEST - Session: ${sessionId}, Message: "${message}"`);
      }

      // If no response was generated, provide a default
      if (!botResponse) {
        console.log("No response generated, using default");
        botResponse = "Hello! I'm here to help with HandyTech Solutions services. We offer electrical work, plumbing, smart home tech, painting, and general maintenance. How may I assist you today?";
      }

      // Determine if we should show scheduling
      const shouldShowScheduling = /schedule|appointment|meet|consultation|quote|call|speak|visit|come out|book|when can you|cost|price|estimate/i.test(message);

      res.json({
        response: botResponse,
        shouldShowScheduling,
        needsHumanHandoff,
        sessionId
      });
    } catch (error) {
      console.error("Final chatbot error:", error);
      res.json({ 
        response: "Hello! I'm here to help with HandyTech Solutions services. We offer electrical work, plumbing, smart home tech, painting, and general maintenance. How may I assist you today? Call us at (314) 325-4575 for immediate help.",
        shouldShowScheduling: true 
      });
    }
  });

  // Admin endpoints for live chat management
  app.get("/api/admin/live-chats", requireAdmin, (req, res) => {
    const sessions = Array.from(liveChatSessions.entries()).map(([id, session]) => ({
      sessionId: id,
      ...session,
      messages: session.messages || []
    }));
    res.json(sessions);
  });

  app.post("/api/admin/take-chat", requireAdmin, (req, res) => {
    const { sessionId } = req.body;
    const session = liveChatSessions.get(sessionId);
    
    if (session) {
      session.isLive = true;
      session.adminTakeoverTime = new Date();
      console.log(`👤 Admin took over chat session: ${sessionId}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Session not found" });
    }
  });

  app.post("/api/admin/send-message", requireAdmin, (req, res) => {
    const { sessionId, message } = req.body;
    const session = liveChatSessions.get(sessionId);
    
    if (session && session.isLive) {
      session.messages.push({ 
        type: 'admin', 
        message, 
        timestamp: new Date() 
      });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Session not found or not live" });
    }
  });

  app.post("/api/admin/end-chat", requireAdmin, (req, res) => {
    const { sessionId } = req.body;
    liveChatSessions.delete(sessionId);
    console.log(`🔚 Admin ended chat session: ${sessionId}`);
    res.json({ success: true });
  });

  // Service calculator endpoint
  app.post("/api/service-quote-calculator", async (req, res) => {
    try {
      const { serviceType, companySize, complexity } = req.body;
      
      let basePrice = 0;
      const multipliers = {
        small: 1,
        medium: 1.5,
        large: 2,
        enterprise: 3
      };
      
      const complexityMultipliers = {
        low: 1,
        medium: 1.3,
        high: 1.6
      };
      
      switch (serviceType) {
        case "IT Support & Maintenance":
        case "Tech Setup":
          basePrice = 150;
          break;
        case "Electrical Work":
          basePrice = 200;
          break;
        case "Plumbing":
          basePrice = 180;
          break;
        case "Carpentry":
          basePrice = 160;
          break;
        case "General Handyman":
          basePrice = 120;
          break;
        case "Home Repair":
          basePrice = 140;
          break;
        default:
          basePrice = 130;
      }
      
      const sizeMultiplier = multipliers[companySize as keyof typeof multipliers] || 1;
      const complexityMultiplier = complexityMultipliers[complexity as keyof typeof complexityMultipliers] || 1;
      
      const estimatedPrice = Math.round(basePrice * sizeMultiplier * complexityMultiplier);
      
      res.json({ 
        estimatedPrice,
        breakdown: {
          basePrice,
          sizeMultiplier,
          complexityMultiplier,
          serviceType,
          companySize,
          complexity
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate quote" });
    }
  });

  // Appointment routes
  app.get("/api/appointments", async (req, res) => {
    try {
      const appointments = await storage.getAllAppointments();
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(appointmentData);

      // Auto-create customer if they don't exist
      const existingCustomer = await storage.getCustomerByEmail(appointment.email);
      if (!existingCustomer) {
        await storage.createCustomer({
          firstName: appointment.firstName,
          lastName: appointment.lastName,
          email: appointment.email,
          phone: appointment.phone,
          company: null,
        });
      }

      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create appointment" });
      }
    }
  });

  app.get("/api/appointments/upcoming", async (req, res) => {
    try {
      const appointments = await storage.getUpcomingAppointments();
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming appointments" });
    }
  });

  // Project gallery routes
  app.get("/api/gallery", async (req, res) => {
    try {
      const { category } = req.query;
      let projects;
      
      if (category && typeof category === 'string') {
        projects = await storage.getProjectGalleryByCategory(category);
      } else {
        projects = await storage.getAllProjectGalleryItems();
      }
      
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch gallery items" });
    }
  });

  app.get("/api/gallery/featured", async (req, res) => {
    try {
      const projects = await storage.getFeaturedProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured projects" });
    }
  });

  app.post("/api/gallery", async (req, res) => {
    try {
      const projectData = insertProjectGallerySchema.parse(req.body);
      const project = await storage.createProjectGalleryItem(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid project data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create project" });
      }
    }
  });

  // Blocked Times routes (updated from blocked dates)
  app.get("/api/blocked-times", async (req, res) => {
    try {
      const blockedTimes = await storage.getBlockedTimes();
      res.json(blockedTimes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blocked times" });
    }
  });

  app.post("/api/blocked-times", async (req, res) => {
    try {
      const validatedData = insertBlockedTimeSchema.parse(req.body);
      const blockedTime = await storage.createBlockedTime(validatedData);
      res.status(201).json(blockedTime);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid blocked time data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create blocked time" });
      }
    }
  });

  app.delete("/api/blocked-times/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBlockedTime(id);
      res.json({ message: "Blocked time deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete blocked time" });
    }
  });

  // Availability Rules routes
  app.get("/api/availability-rules", async (req, res) => {
    try {
      const rules = await storage.getAvailabilityRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability rules" });
    }
  });

  app.get("/api/availability-rules/active", async (req, res) => {
    try {
      const rules = await storage.getActiveAvailabilityRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active availability rules" });
    }
  });

  app.post("/api/availability-rules", async (req, res) => {
    try {
      const validatedData = insertAvailabilityRuleSchema.parse(req.body);
      const rule = await storage.createAvailabilityRule(validatedData);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid availability rule data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create availability rule" });
      }
    }
  });

  app.patch("/api/availability-rules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      await storage.updateAvailabilityRule(id, updates);
      res.json({ message: "Availability rule updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update availability rule" });
    }
  });

  app.delete("/api/availability-rules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAvailabilityRule(id);
      res.json({ message: "Availability rule deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete availability rule" });
    }
  });

  app.patch("/api/availability-rules/:id/toggle", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { active } = req.body;
      await storage.toggleAvailabilityRuleStatus(id, active);
      res.json({ message: "Availability rule status updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle availability rule status" });
    }
  });

  // Services Management routes
  app.get("/api/services", async (req, res) => {
    try {
      const { category, active } = req.query;
      let services;
      
      if (category && typeof category === 'string') {
        services = await storage.getServicesByCategory(category);
      } else if (active === 'true') {
        services = await storage.getActiveServices();
      } else {
        services = await storage.getAllServices();
      }
      
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const service = await storage.getService(id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(validatedData);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid service data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create service" });
      }
    }
  });

  app.put("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertServiceSchema.partial().parse(req.body);
      await storage.updateService(id, validatedData);
      res.json({ message: "Service updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid service data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update service" });
      }
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteService(id);
      res.json({ message: "Service deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  app.patch("/api/services/:id/toggle", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive } = req.body;
      await storage.toggleServiceStatus(id, isActive);
      res.json({ message: "Service status updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update service status" });
    }
  });

  // Service Add-ons routes
  app.get("/api/services/:serviceId/addons", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const addons = await storage.getServiceAddons(serviceId);
      res.json(addons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service addons" });
    }
  });

  app.post("/api/services/:serviceId/addons", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const validatedData = insertServiceAddonSchema.parse({ ...req.body, serviceId });
      const addon = await storage.createServiceAddon(validatedData);
      res.status(201).json(addon);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid addon data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create service addon" });
      }
    }
  });

  app.put("/api/service-addons/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertServiceAddonSchema.partial().parse(req.body);
      await storage.updateServiceAddon(id, validatedData);
      res.json({ message: "Service addon updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid addon data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update service addon" });
      }
    }
  });

  app.delete("/api/service-addons/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteServiceAddon(id);
      res.json({ message: "Service addon deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete service addon" });
    }
  });

  // Placeholder image route
  app.get("/api/placeholder/:width/:height", (req, res) => {
    const { width, height } = req.params;
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6b7280" font-family="Arial, sans-serif" font-size="16">
          ${width} × ${height}
        </text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(svg);
  });

  // Raw body middleware for webhook signature verification
  app.use("/api/webhooks/calendly", async (req, res, next) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      (req as any).rawBody = Buffer.concat(chunks);
      next();
    });
  });

  // Enhanced Calendly Webhook Endpoint with signature verification
  app.post("/api/webhooks/calendly", async (req, res) => {
    try {
      const sig = req.get("Calendly-Webhook-Signature");
      const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));

      // Verify signature if signing key is configured
      if (CALENDLY_SIGNING_KEY) {
        const isValid = verifyCalendlySignature(CALENDLY_SIGNING_KEY, sig || "", rawBody);
        if (!isValid) {
          console.warn("❌ Invalid Calendly webhook signature");
          return res.status(400).send("Invalid signature");
        }
        console.log("✅ Calendly webhook signature verified");
      } else {
        console.log("⚠️ Calendly webhook received (no signature verification - add CALENDLY_SIGNING_KEY for security)");
      }

      // Parse the JSON payload
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.log("📅 Calendly webhook event:", payload?.event, payload?.payload?.invitee?.email);
      
      // Handle different Calendly event types
      if (payload?.event === "invitee.created") {
        const event = payload;
        const invitee = event.invitee;
        const eventType = event.event_type;
        
        // Extract appointment details
        const appointmentData = {
          firstName: invitee.name.split(' ')[0] || 'Unknown',
          lastName: invitee.name.split(' ').slice(1).join(' ') || '',
          email: invitee.email,
          phone: invitee.text_reminder_number || '',
          serviceType: eventType.name || 'Calendly Booking',
          appointmentDate: new Date(event.start_time),
          appointmentTime: new Date(event.start_time).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }),
          source: 'calendly',
          calendlyEventId: event.uri,
          notes: `Calendly booking - ${eventType.name}. Location: ${event.location?.location || 'TBD'}`
        };

        console.log("📋 Processing appointment data:", appointmentData);

        // Create or find customer
        let customer = null;
        try {
          const existingCustomers = await storage.getAllCustomers();
          customer = existingCustomers.find(c => c.email.toLowerCase() === invitee.email.toLowerCase());
          
          if (!customer) {
            const newCustomer = await storage.createCustomer({
              firstName: appointmentData.firstName,
              lastName: appointmentData.lastName,
              email: appointmentData.email,
              phone: appointmentData.phone || ''
            });
            customer = newCustomer;
            console.log("👤 Created new customer:", customer);
          } else {
            console.log("👤 Found existing customer:", customer);
          }
        } catch (customerError) {
          console.error("❌ Customer creation/lookup failed:", customerError);
        }

        // Create appointment
        const appointment = await storage.createAppointment({
          ...appointmentData,
          customerId: customer?.id || null
        });

        console.log("✅ Created appointment:", appointment);

        // Send confirmation email
        try {
          // Generate reschedule token for Calendly appointments
          const rescheduleToken = crypto.randomBytes(24).toString('hex');
          
          const emailSuccess = await emailService.sendAppointmentConfirmation(appointment, rescheduleToken);

          if (emailSuccess) {
            console.log("📧 Confirmation email sent successfully");
          } else {
            console.log("📧 Confirmation email skipped (email service not configured)");
          }
        } catch (emailError) {
          console.error("📧 Failed to send confirmation email:", emailError);
        }

        res.json({ 
          success: true, 
          message: "Appointment processed successfully",
          appointmentId: appointment.id
        });
      } else {
        console.log("ℹ️ Ignoring Calendly event type:", payload?.event);
        res.json({ success: true, message: "Event type not handled" });
      }
    } catch (error) {
      console.error("❌ Calendly webhook error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process Calendly webhook" 
      });
    }
  });

  // Test Webhook Simulator - Admin Only
  app.post("/api/admin/test-calendly-webhook", requireAdmin, async (req, res) => {
    try {
      console.log("🧪 Testing Calendly webhook simulation");
      
      const testWebhookData = {
        payload: {
          event: "invitee.created",
          invitee: {
            name: req.body.name || "Test Customer",
            email: req.body.email || "test@example.com",
            text_reminder_number: req.body.phone || "(555) 123-4567"
          },
          event_type: {
            name: req.body.serviceType || "Home Repair Consultation"
          },
          start_time: req.body.appointmentDateTime || new Date().toISOString(),
          uri: `calendly://events/test-${Date.now()}`,
          location: {
            location: "Customer's Home"
          }
        }
      };

      console.log("🧪 Simulating webhook with data:", testWebhookData);

      // Call our own webhook endpoint
      const response = await fetch(`${req.protocol}://${req.get('host')}/api/webhooks/calendly`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testWebhookData)
      });

      const result = await response.json();
      
      res.json({
        success: true,
        message: "Test webhook processed successfully",
        result: result
      });
    } catch (error) {
      console.error("❌ Test webhook error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to test webhook" 
      });
    }
  });

  // Availability endpoint for scheduler system
  app.get("/api/availability", async (req, res) => {
    try {
      // Define validation schema for query parameters
      const querySchema = z.object({
        from: z.string().refine((val) => {
          const date = new Date(val);
          return !isNaN(date.getTime());
        }, { message: "Invalid ISO datetime string for 'from'" }),
        to: z.string().refine((val) => {
          const date = new Date(val);
          return !isNaN(date.getTime());
        }, { message: "Invalid ISO datetime string for 'to'" }),
        hours: z.enum(["2", "4", "6"], {
          errorMap: () => ({ message: "Hours must be one of: 2, 4, 6" })
        })
      });

      // Validate query parameters
      const validatedQuery = querySchema.parse(req.query);
      
      // Convert strings to dates and validate date range
      const fromDate = new Date(validatedQuery.from);
      const toDate = new Date(validatedQuery.to);
      
      if (fromDate >= toDate) {
        return res.status(400).json({ 
          error: "Invalid date range: 'from' must be before 'to'" 
        });
      }
      
      // Convert hours to minutes
      const hoursToMinutes = {
        "2": 120,
        "4": 240,
        "6": 360
      };
      const blockMinutes = hoursToMinutes[validatedQuery.hours];
      
      // Use default values as specified
      const stepMinutes = 30;
      const bufferMinutes = 15;
      
      // Get available slots using the availability engine
      const slots = await getOpenSlots(
        storage,
        fromDate,
        toDate,
        blockMinutes,
        stepMinutes,
        bufferMinutes
      );
      
      res.json({ slots });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid query parameters", 
          details: error.errors 
        });
      }
      
      console.error("Availability endpoint error:", error);
      res.status(500).json({ 
        error: "Failed to fetch availability slots" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
