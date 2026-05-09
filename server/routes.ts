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
  updateProjectGallerySchema,
  insertBlockedTimeSchema,
  insertAvailabilityRuleSchema,
  insertServiceSchema,
  insertServiceAddonSchema,
  insertPortalLoginTokenSchema,
  rescheduleRequestSchema,
  updateCustomerProfileSchema,
  cancelMaintenancePlanSchema,
  portalCreateMaintenancePlanSchema,
  serviceHistoryFiltersSchema,
  publicReviewSubmissionSchema,
  type InsertCustomer,
  type InsertMaintenancePlan
} from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import { notificationService } from './utils/notification-service';
import { EmailService } from "./utils/mail";
import crypto from "crypto";
import { getOpenSlots } from "./utils/availability";
import { fromZonedTime } from "date-fns-tz";
import { ADMIN_CREDENTIALS } from "./utils/auth";
import { requireAdmin, requireCustomer, setCustomerSession, clearCustomerSession, rlAuth, rlSensitive } from "./security";
import { createEvent, updateEvent, deleteEvent } from "./utils/google.js";
import { handleImageUpload, cleanupUploadedFiles, type ProcessedImage } from "./utils/upload";
import fs from "fs/promises";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount Google Calendar admin routes
  const { default: googleAdminRoutes } = await import("./routes/google-admin.js");
  app.use("/api/admin/google", requireAdmin, googleAdminRoutes);
  // Lazy-loaded OpenAI client - only initialize when needed
  let openai: OpenAI | null = null;
  const getOpenAI = () => {
    if (!openai && process.env.OPENAI_API_KEY) {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
  };

  // Lazy-loaded email service - only initialize when needed
  let emailService: EmailService | null = null;
  const getEmailService = () => {
    if (!emailService) {
      emailService = new EmailService();
    }
    return emailService;
  };
  
  // SECURITY: Server-side maintenance plan catalog with canonical pricing
  // This prevents price tampering by enforcing server-controlled pricing
  const MAINTENANCE_PLAN_CATALOG = {
    basic: {
      planType: 'basic' as const,
      price: 29.99,
      features: ['Monthly system check', 'Basic maintenance', 'Email support'],
      billingCycle: 30 // days
    },
    professional: {
      planType: 'professional' as const,
      price: 59.99,
      features: ['Weekly system check', 'Priority maintenance', 'Phone & email support', 'Performance optimization'],
      billingCycle: 30 // days
    },
    enterprise: {
      planType: 'enterprise' as const,
      price: 99.99,
      features: ['24/7 monitoring', 'Instant response', 'Dedicated support', 'Custom maintenance plans', 'SLA guarantee'],
      billingCycle: 30 // days
    }
  } as const;
  
  // Business rule: Calculate next billing date
  function calculateNextBillingDate(planType: keyof typeof MAINTENANCE_PLAN_CATALOG): Date {
    const plan = MAINTENANCE_PLAN_CATALOG[planType];
    const nextBilling = new Date();
    nextBilling.setDate(nextBilling.getDate() + plan.billingCycle);
    return nextBilling;
  }
  
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
  
  // Delay initial cleanup to improve startup performance
  setTimeout(async () => {
    try {
      await storage.deleteExpiredPortalLoginTokens();
      console.log('[SECURITY] Initial token cleanup completed');
    } catch (error) {
      console.error('[SECURITY] Initial token cleanup failed:', error);
    }
  }, 15000); // 15 seconds after startup to allow deployment readiness


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
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        console.error("ADMIN_PASSWORD environment variable is not set");
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
      await getEmailService().sendMagicLinkEmail({
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
      const tokenRecord = await storage.getPortalLoginTokenByHash(token);
      if (!tokenRecord) {
        return res.status(401).json({ 
          success: false, 
          message: "Login link is invalid or has expired" 
        });
      }
      
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
      const tokenRecord = await storage.getPortalLoginTokenByHash(token);
      if (!tokenRecord) {
        return res.status(401).json({ 
          success: false, 
          message: "Login link is invalid or has expired" 
        });
      }
      
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

  // Portal service history route - SECURITY: Rate limited and validated
  app.get("/api/portal/service-history", requireCustomer, rlSensitive, async (req, res) => {
    try {
      const { customer } = req as any;
      
      // SECURITY: Validate all query parameters with Zod schema
      const queryParams = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        serviceType: req.query.serviceType,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };

      // Remove undefined values for validation
      Object.keys(queryParams).forEach(key => 
        queryParams[key as keyof typeof queryParams] === undefined && delete queryParams[key as keyof typeof queryParams]
      );

      // Validate with Zod schema
      const validatedFilters = serviceHistoryFiltersSchema.parse(queryParams);
      
      console.log(`[SERVICE_HISTORY] Request from customer ${customer.email} with filters:`, validatedFilters);

      // Get service history for the authenticated customer using validated filters
      const serviceHistory = await storage.getServiceHistoryByCustomer(customer.id, validatedFilters);

      // Calculate summary statistics
      const totalServices = serviceHistory.length;
      const totalCost = serviceHistory.reduce((sum, item) => sum + (item.calculatedCost || 0), 0);
      const averageCost = totalServices > 0 ? totalCost / totalServices : 0;

      res.json({
        success: true,
        serviceHistory,
        summary: {
          totalServices,
          totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
          averageCost: Math.round(averageCost * 100) / 100,
          dateRange: {
            earliest: serviceHistory.length > 0 ? serviceHistory[serviceHistory.length - 1].appointmentDate : null,
            latest: serviceHistory.length > 0 ? serviceHistory[0].appointmentDate : null
          }
        },
        pagination: {
          limit: validatedFilters.limit || 50,
          offset: validatedFilters.offset || 0,
          hasMore: serviceHistory.length === (validatedFilters.limit || 50) // Indicate if there might be more records
        }
      });

      console.log(`[PORTAL_SERVICE_HISTORY] Service history retrieved for customer ${customer.email}: ${totalServices} services, $${totalCost.toFixed(2)} total`);

    } catch (error) {
      console.error("Portal service history error:", error);
      res.status(500).json({
        success: false,
        message: "Unable to load service history. Please try again later.",
        serviceHistory: [],
        summary: {
          totalServices: 0,
          totalCost: 0,
          averageCost: 0,
          dateRange: { earliest: null, latest: null }
        },
        pagination: { limit: 50, offset: 0, hasMore: false }
      });
    }
  });

  // Portal profile - Update authenticated customer data
  app.put("/api/portal/profile", requireCustomer, rlSensitive, async (req, res) => {
    try {
      const { customer } = req as any;
      
      // Validate the update data
      const updateData = updateCustomerProfileSchema.parse(req.body);
      
      // Check if email is being updated and if it already exists (for other customers)
      if (updateData.email) {
        const existingCustomer = await storage.getCustomerByEmail(updateData.email);
        if (existingCustomer && existingCustomer.id !== customer.id) {
          return res.status(400).json({
            success: false,
            message: "Email address is already registered to another account"
          });
        }
      }
      
      // Update the customer profile
      await storage.updateCustomer(customer.id, updateData);
      
      // Fetch the updated customer data to return
      const updatedCustomer = await storage.getCustomer(customer.id);
      if (!updatedCustomer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found after update"
        });
      }
      
      res.json({
        success: true,
        message: "Profile updated successfully",
        customer: {
          id: updatedCustomer.id,
          firstName: updatedCustomer.firstName,
          lastName: updatedCustomer.lastName,
          email: updatedCustomer.email,
          phone: updatedCustomer.phone,
          company: updatedCustomer.company,
          createdAt: updatedCustomer.createdAt,
          lastEmailSent: updatedCustomer.lastEmailSent
        }
      });
      
      console.log(`[PORTAL_PROFILE] Profile updated for customer ${updatedCustomer.email}`);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid profile data",
          errors: error.errors
        });
      }
      
      console.error("Portal profile update error:", error);
      res.status(500).json({
        success: false,
        message: "Unable to update profile. Please try again."
      });
    }
  });

  // Portal appointment reschedule - Customer reschedule their own appointments
  // Note: CSRF temporarily bypassed due to customer session timing issues, but still has:
  // - Customer authentication (requireCustomer)
  // - Customer ownership verification 
  // - Rate limiting (rlAuth)
  app.put("/api/portal/appointments/:id/reschedule", requireCustomer, rlAuth, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { customer } = req as any;
      
      if (isNaN(appointmentId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid appointment ID" 
        });
      }
      
      // Validate request body
      let validatedData;
      try {
        validatedData = rescheduleRequestSchema.parse(req.body);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid request data", 
            errors: validationError.errors 
          });
        }
        throw validationError;
      }
      
      const { startISO } = validatedData;
      const newStartTime = new Date(startISO);
      
      // Get the appointment and verify customer ownership
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ 
          success: false, 
          message: "Appointment not found" 
        });
      }
      
      // SECURITY: Verify customer owns this appointment
      if (appointment.customerId !== customer.id) {
        return res.status(403).json({ 
          success: false, 
          message: "You can only reschedule your own appointments" 
        });
      }
      
      // Only allow rescheduling of scheduled/confirmed appointments
      if (!['scheduled', 'confirmed'].includes(appointment.status)) {
        return res.status(400).json({ 
          success: false, 
          message: "Only scheduled or confirmed appointments can be rescheduled" 
        });
      }
      
      // Enforce 24-hour minimum notice (more strict than the token-based 12-hour)
      const now = new Date();
      const twentyFourHoursFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      
      if (newStartTime < twentyFourHoursFromNow) {
        return res.status(409).json({ 
          success: false, 
          message: "Appointments must be rescheduled at least 24 hours in advance" 
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
        
        // Check if the requested time slot is available
        const requestedSlot = newStartTime.toISOString();
        const slotAvailable = availableSlots.some(slot => {
          const slotTime = new Date(slot);
          return slotTime.getTime() === newStartTime.getTime();
        });
        
        if (!slotAvailable) {
          return res.status(409).json({ 
            success: false, 
            message: "The selected time slot is not available. Please choose another time." 
          });
        }
        
      } catch (availabilityError) {
        console.error('Availability check failed during customer reschedule:', availabilityError);
        return res.status(500).json({ 
          success: false, 
          message: "Unable to verify appointment availability. Please try again." 
        });
      }
      
      // Store original appointment times for email notification
      const originalStart = appointment.startTimestamptz || appointment.appointmentDate;
      const originalEnd = appointment.endTimestamptz;
      
      // Update the appointment
      await storage.updateAppointmentTime(
        appointmentId,
        newStartTime,
        newEndTime
      );

      // Google Calendar integration - Update calendar event
      if (appointment.googleEventId) {
        try {
          await updateEvent(appointment.googleEventId, {
            summary: `${appointment.serviceType} — ${Math.round(durationMs / (1000 * 60 * 60))}h Block`,
            description: [
              `Customer: ${appointment.firstName} ${appointment.lastName} (${appointment.email}${appointment.phone ? ", " + appointment.phone : ""})`,
              appointment.notes ? `Notes: ${appointment.notes}` : null
            ].filter(Boolean).join("\n"),
            start: newStartTime,
            end: newEndTime,
            attendees: [appointment.email]
          });
          console.log(`Google Calendar event updated for appointment ${appointmentId}: ${appointment.googleEventId}`);
        } catch (googleError) {
          console.error("Google Calendar sync (update) failed:", googleError instanceof Error ? googleError.message : googleError);
          // Do NOT fail the reschedule; log only
        }
      }
      
      // Get the updated appointment for response
      const updatedAppointment = await storage.getAppointment(appointmentId);
      
      // Send reschedule confirmation emails
      if (originalStart && originalEnd && updatedAppointment) {
        // Send customer confirmation email
        try {
          await getEmailService().sendRescheduleConfirmation(
            updatedAppointment,
            new Date(originalStart),
            new Date(originalEnd)
          );
          console.log(`[PORTAL_RESCHEDULE] Confirmation email sent for appointment ${appointmentId}`);
        } catch (emailError) {
          console.error(`[PORTAL_RESCHEDULE] Failed to send confirmation email for appointment ${appointmentId}:`, emailError);
          // Continue even if customer email fails
        }
        
        // Send internal admin notification
        try {
          await getEmailService().sendAdminRescheduleNotification(
            updatedAppointment,
            new Date(originalStart),
            new Date(originalEnd)
          );
          console.log(`[PORTAL_RESCHEDULE] Admin notification sent for appointment ${appointmentId}`);
        } catch (adminEmailError) {
          console.error(`[PORTAL_RESCHEDULE] Failed to send admin notification for appointment ${appointmentId}:`, adminEmailError);
          // Continue even if admin email fails
        }
      }
      
      res.json({
        success: true,
        message: "Appointment rescheduled successfully",
        appointment: {
          id: updatedAppointment?.id,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          serviceType: updatedAppointment?.serviceType,
          status: updatedAppointment?.status
        }
      });
      
      console.log(`[PORTAL_RESCHEDULE] Customer ${customer.id} rescheduled appointment ${appointmentId} to ${newStartTime.toISOString()}`);
      
    } catch (error) {
      console.error("Portal appointment reschedule error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to reschedule appointment. Please try again." 
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

      // Google Calendar integration - Update calendar event
      if (appointment.googleEventId) {
        try {
          const durationMs = endTimestamp.getTime() - startTimestamp.getTime();
          await updateEvent(appointment.googleEventId, {
            summary: `${appointment.serviceType} — ${Math.round(durationMs / (1000 * 60 * 60))}h Block`,
            description: [
              `Customer: ${appointment.firstName} ${appointment.lastName} (${appointment.email}${appointment.phone ? ", " + appointment.phone : ""})`,
              appointment.notes ? `Notes: ${appointment.notes}` : null
            ].filter(Boolean).join("\n"),
            start: startTimestamp,
            end: endTimestamp,
            attendees: [appointment.email]
          });
          console.log(`Google Calendar event updated for appointment ${appointmentId}: ${appointment.googleEventId}`);
        } catch (googleError) {
          console.error("Google Calendar sync (update) failed:", googleError instanceof Error ? googleError.message : googleError);
          // Do NOT fail the reschedule; log only
        }
      }

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

      // Google Calendar integration - Delete calendar event for both cancel and delete
      if (appointment.googleEventId) {
        try {
          await deleteEvent(appointment.googleEventId);
          console.log(`Google Calendar event deleted for appointment ${appointmentId}: ${appointment.googleEventId}`);
        } catch (googleError) {
          console.error("Google Calendar sync (delete) failed:", googleError instanceof Error ? googleError.message : googleError);
          // Do NOT fail the cancellation; log only
        }
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

  // Admin: Create a new appointment (admin-only)
  app.post("/api/admin/appointments", requireAdmin, async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        phone,
        email,
        address,
        serviceType,
        appointmentDate,
        appointmentTime,
        notes,
        status,
      } = req.body;

      if (!firstName || !lastName || !email || !serviceType || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ message: "Missing required fields: firstName, lastName, email, serviceType, appointmentDate, appointmentTime" });
      }

      // Find existing customer by email or create a new one
      let customer = await storage.getCustomerByEmail(email);
      if (!customer) {
        customer = await storage.createCustomer({
          firstName,
          lastName,
          email,
          phone: phone || "",
          company: "",
          street: address || "",
          city: "",
          state: "MO",
          zip: "",
        });
      }

      const appointment = await storage.createAppointment({
        customerId: customer.id,
        firstName,
        lastName,
        email,
        phone: phone || null,
        serviceType,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        address: address || null,
        notes: notes || null,
        status: status || "scheduled",
        source: "manual",
      });

      res.status(201).json(appointment);
    } catch (error) {
      console.error("Admin create appointment error:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  // Customer routes with admin authentication
  app.get("/api/customers", requireAdmin, async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", requireAdmin, async (req, res) => {
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

  app.post("/api/customers", requireAdmin, async (req, res) => {
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

  app.put("/api/customers/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }

      // Check if customer exists
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Validate request body
      const customerData = insertCustomerSchema.parse(req.body);
      
      // Check if email is being updated and if it already exists (for other customers)
      if (customerData.email !== customer.email) {
        const existingCustomer = await storage.getCustomerByEmail(customerData.email);
        if (existingCustomer && existingCustomer.id !== id) {
          return res.status(400).json({ message: "Another customer with this email already exists" });
        }
      }

      // Update the customer
      await storage.updateCustomer(id, customerData);
      
      // Return updated customer data
      const updatedCustomer = await storage.getCustomer(id);
      res.json(updatedCustomer);
    } catch (error) {
      console.error("Update customer error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update customer" });
      }
    }
  });

  app.delete("/api/customers/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }

      // Check if customer exists
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Delete the customer
      await storage.deleteCustomer(id);
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Delete customer error:", error);
      res.status(500).json({ message: "Failed to delete customer" });
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

  // SECURITY REMOVED: Legacy endpoint removed to prevent security bypass
  // All maintenance plan creation now goes through secure /api/portal/maintenance-plans endpoint only

  // SECURITY: Secure portal maintenance plan creation endpoint
  // Uses requireCustomer + rlSensitive middleware for CSRF protection and rate limiting
  app.post("/api/portal/maintenance-plans", requireCustomer, rlSensitive, async (req, res) => {
    try {
      const { customer } = req as any;
      
      // SECURITY: Use secure schema that only accepts planType (no price tampering)
      const { planType } = portalCreateMaintenancePlanSchema.parse(req.body);
      
      // SECURITY: Get canonical pricing from server-side catalog
      const planConfig = MAINTENANCE_PLAN_CATALOG[planType];
      if (!planConfig) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid plan type" 
        });
      }
      
      // BUSINESS RULE: Check if customer already has an active plan
      const existingPlans = await storage.getMaintenancePlansByCustomer(customer.id);
      const activePlans = existingPlans.filter(plan => plan.status === 'active');
      
      if (activePlans.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: "You already have an active maintenance plan. Please cancel your current plan before creating a new one." 
        });
      }
      
      // SECURITY: Create plan with server-controlled values (never trust client)
      const securePlanData: InsertMaintenancePlan = {
        customerId: customer.id, // From authenticated session, not client
        planType: planConfig.planType,
        price: planConfig.price, // Server-controlled pricing
        status: 'active',
        nextBillingDate: calculateNextBillingDate(planType)
      };
      
      const newPlan = await storage.createMaintenancePlan(securePlanData);
      
      // Send confirmation email (temporarily commented out until method is implemented)
      try {
        // TODO: Implement sendMaintenancePlanWelcomeEmail in EmailService
        console.log(`[EMAIL] Maintenance plan created for ${customer.email} - email notification skipped`);
      } catch (emailError) {
        console.error(`[EMAIL] Failed to send maintenance plan welcome email to ${customer.email}:`, emailError);
        // Don't fail the subscription creation if email fails
      }
      
      res.status(201).json({ 
        success: true, 
        message: "Maintenance plan created successfully",
        plan: newPlan
      });
      
      console.log(`[SECURITY] Customer ${customer.id} (${customer.email}) created ${planType} maintenance plan with server-controlled pricing $${planConfig.price}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid plan data", 
          errors: error.errors 
        });
      } else {
        console.error("Secure maintenance plan creation error:", error);
        res.status(500).json({ 
          success: false, 
          message: "Failed to create maintenance plan" 
        });
      }
    }
  });

  // Portal maintenance plan cancellation - Customer-only endpoint
  app.put("/api/portal/maintenance-plans/:id/cancel", requireCustomer, rlSensitive, async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      const { customer } = req as any;
      
      if (isNaN(planId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid plan ID" 
        });
      }
      
      // Validate request body
      let validatedData;
      try {
        validatedData = cancelMaintenancePlanSchema.parse(req.body);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid cancellation data", 
            errors: validationError.errors 
          });
        }
        throw validationError;
      }
      
      const { cancellationType, cancellationReason } = validatedData;
      
      // Cancel the maintenance plan
      const cancelledPlan = await storage.cancelMaintenancePlan(
        planId, 
        customer.id, 
        cancellationType, 
        cancellationReason
      );
      
      // Send cancellation confirmation email
      try {
        await getEmailService().sendSubscriptionCancellationConfirmation({
          to: customer.email,
          customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
          planType: cancelledPlan.planType,
          cancellationType,
          endDate: cancelledPlan.endDate,
          cancellationReason
        });
        console.log(`[PORTAL_CANCEL] Cancellation email sent for plan ${planId}`);
      } catch (emailError) {
        console.error(`[PORTAL_CANCEL] Failed to send cancellation email for plan ${planId}:`, emailError);
        // Continue even if email fails
      }
      
      res.json({
        success: true,
        message: cancellationType === 'immediate' 
          ? "Subscription cancelled immediately" 
          : "Subscription will be cancelled at the end of your current billing period",
        plan: {
          id: cancelledPlan.id,
          status: cancelledPlan.status,
          endDate: cancelledPlan.endDate,
          cancellationType: cancelledPlan.cancellationType
        }
      });
      
      console.log(`[PORTAL_CANCEL] Customer ${customer.id} cancelled plan ${planId} (${cancellationType})`);
      
    } catch (error: any) {
      console.error("Portal plan cancellation error:", error);
      
      if (error.message.includes("not found")) {
        return res.status(404).json({ 
          success: false, 
          message: "Maintenance plan not found" 
        });
      } else if (error.message.includes("Unauthorized")) {
        return res.status(403).json({ 
          success: false, 
          message: "You can only cancel your own maintenance plans" 
        });
      } else if (error.message.includes("already cancelled")) {
        return res.status(400).json({ 
          success: false, 
          message: "This maintenance plan is already cancelled" 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Failed to cancel subscription. Please try again." 
      });
    }
  });

  // Portal maintenance plan reactivation - Customer-only endpoint
  app.put("/api/portal/maintenance-plans/:id/reactivate", requireCustomer, rlSensitive, async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      const { customer } = req as any;
      
      if (isNaN(planId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid plan ID" 
        });
      }
      
      // Reactivate the maintenance plan
      const reactivatedPlan = await storage.reactivateMaintenancePlan(planId, customer.id);
      
      // Send reactivation confirmation email
      try {
        await getEmailService().sendSubscriptionReactivationConfirmation({
          to: customer.email,
          customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
          planType: reactivatedPlan.planType,
          nextBillingDate: reactivatedPlan.nextBillingDate
        });
        console.log(`[PORTAL_REACTIVATE] Reactivation email sent for plan ${planId}`);
      } catch (emailError) {
        console.error(`[PORTAL_REACTIVATE] Failed to send reactivation email for plan ${planId}:`, emailError);
        // Continue even if email fails
      }
      
      res.json({
        success: true,
        message: "Subscription reactivated successfully",
        plan: {
          id: reactivatedPlan.id,
          status: reactivatedPlan.status,
          nextBillingDate: reactivatedPlan.nextBillingDate
        }
      });
      
      console.log(`[PORTAL_REACTIVATE] Customer ${customer.id} reactivated plan ${planId}`);
      
    } catch (error: any) {
      console.error("Portal plan reactivation error:", error);
      
      if (error.message.includes("not found")) {
        return res.status(404).json({ 
          success: false, 
          message: "Maintenance plan not found" 
        });
      } else if (error.message.includes("Unauthorized")) {
        return res.status(403).json({ 
          success: false, 
          message: "You can only reactivate your own maintenance plans" 
        });
      } else if (error.message.includes("already active")) {
        return res.status(400).json({ 
          success: false, 
          message: "This maintenance plan is already active" 
        });
      } else if (error.message.includes("30 days")) {
        return res.status(400).json({ 
          success: false, 
          message: "Cannot reactivate plans cancelled more than 30 days ago" 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Failed to reactivate subscription. Please try again." 
      });
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
      
      // Send admin notification email for new review
      try {
        const customer = await storage.getCustomer(reviewData.customerId);
        if (customer) {
          await getEmailService().sendReviewNotification({
            customerName: `${customer.firstName} ${customer.lastName}`,
            customerEmail: customer.email,
            serviceType: undefined, // serviceType not available in regular review schema
            rating: reviewData.rating,
            title: reviewData.title,
            content: reviewData.content,
            submittedAt: new Date()
          });
          console.log(`Review notification email sent for new review from ${customer.firstName} ${customer.lastName} (${reviewData.rating} stars)`);
        }
      } catch (emailError) {
        console.error('Failed to send review notification email:', emailError);
        // Don't fail the request if email fails
      }
      
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

  // Admin reviews endpoint - shows all reviews (pending and approved)
  app.get("/api/admin/reviews", requireAdmin, async (req, res) => {
    try {
      const reviews = await storage.getAllReviews();
      res.json(reviews);
    } catch (error) {
      console.error("Admin reviews fetch error:", error);
      res.status(500).json({ message: "Failed to fetch admin reviews" });
    }
  });

  // Customer review submission endpoint
  app.post("/api/reviews/submit", async (req, res) => {
    try {
      // Parse and validate review data using publicReviewSubmissionSchema
      const validatedData = publicReviewSubmissionSchema.parse(req.body);
      
      // Auto-create customer if they don't exist
      let customer = await storage.getCustomerByEmail(validatedData.email);
      if (!customer) {
        customer = await storage.createCustomer({
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          phone: validatedData.phone || "",
          company: "",
          street: "",
          city: validatedData.city,
          state: validatedData.state,
          zip: "",
        });
      }

      // Create the review with validated data
      const reviewData = {
        customerId: customer.id,
        rating: validatedData.rating,
        title: validatedData.title,
        content: validatedData.content,
        city: validatedData.city,
        state: validatedData.state,
      };

      const review = await storage.createReview(reviewData);
      
      // Send admin notification email for new review
      try {
        await getEmailService().sendReviewNotification({
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerEmail: customer.email,
          serviceType: validatedData.serviceType || undefined,
          rating: validatedData.rating,
          title: validatedData.title,
          content: validatedData.content,
          submittedAt: new Date()
        });
        console.log(`Review notification email sent for new review from ${customer.firstName} ${customer.lastName} (${validatedData.rating} stars)`);
      } catch (emailError) {
        console.error('Failed to send review notification email:', emailError);
        // Don't fail the request if email fails
      }
      
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid review data", 
          errors: error.errors 
        });
      } else {
        console.error("Error creating customer review:", error);
        res.status(500).json({ message: "Failed to submit review" });
      }
    }
  });

  // Email debugging and testing routes (admin only)
  app.get("/api/admin/email/config", requireAdmin, async (req, res) => {
    try {
      const config = getEmailService().getEmailConfig();
      res.json({
        success: true,
        config
      });
    } catch (error) {
      console.error("Email config fetch error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch email configuration" 
      });
    }
  });

  app.post("/api/admin/email/test", requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email address is required" 
        });
      }
      
      const result = await getEmailService().sendTestEmail(email);
      res.json({
        success: result,
        message: result ? "Test email sent successfully" : "Failed to send test email"
      });
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send test email" 
      });
    }
  });

  app.post("/api/admin/email/verify", requireAdmin, async (req, res) => {
    try {
      const result = await getEmailService().verifyConnection();
      res.json({
        success: result,
        message: result ? "Email service connection verified" : "Email service connection failed"
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to verify email connection" 
      });
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
          phone: quote.phone || "",
          company: quote.company || "",
          street: quote.street || "",
          city: quote.city || "",
          state: quote.state || "",
          zip: quote.zip || "",
        });
      }

      // Send email notification for quote request
      try {
        await getEmailService().sendQuoteNotification({
          customerName: `${quote.firstName} ${quote.lastName}`,
          customerEmail: quote.email,
          serviceNeeded: quote.serviceNeeded,
          message: quote.message || undefined,
          company: quote.company || undefined,
          submittedAt: new Date()
        });
        console.log(`Quote notification email sent for ${quote.firstName} ${quote.lastName} (${quote.serviceNeeded})`);
      } catch (emailError) {
        console.error('Failed to send quote notification email:', emailError);
        // Don't fail the request if email fails
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
      // Import service utilities
      const { getServiceById } = await import("./utils/services");
      
      // Parse and validate appointment data
      const appointmentData = insertAppointmentSchema.parse(req.body);
      
      // Determine appointment duration and service information
      let durationHours: number;
      let serviceInfo: { id: number; name: string; description: string } | null = null;
      
      if (appointmentData.durationHours) {
        // Explicit duration provided - use it (legacy behavior)
        durationHours = appointmentData.durationHours;
      } else if (appointmentData.serviceId) {
        // Service ID provided - infer duration from catalog
        const service = getServiceById(appointmentData.serviceId);
        if (!service) {
          return res.status(400).json({
            ok: false,
            error: "SERVICE_NOT_FOUND",
            message: "Service not found or not active"
          });
        }
        
        // Validate that service suggestedHours is in allowed set
        if (![2, 4, 6].includes(service.suggestedHours)) {
          return res.status(400).json({ 
            error: "INVALID_SERVICE_DURATION",
            message: `Service duration ${service.suggestedHours}h is not supported. Allowed durations: 2, 4, 6 hours`
          });
        }
        
        durationHours = service.suggestedHours;
        serviceInfo = {
          id: service.id,
          name: service.name,
          description: service.description
        };
      } else {
        // Fallback to legacy service type mapping
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
        durationHours = serviceDurations[appointmentData.serviceType] || 2;
      }
      
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
      
      // Auto-create customer if they don't exist (BEFORE creating appointment)
      let customer = await storage.getCustomerByEmail(appointmentData.email);
      if (!customer) {
        customer = await storage.createCustomer({
          firstName: appointmentData.firstName,
          lastName: appointmentData.lastName,
          email: appointmentData.email,
          phone: appointmentData.phone || "",
          company: "",
          street: appointmentData.street || "",
          city: appointmentData.city || "",
          state: appointmentData.state || "",
          zip: appointmentData.zip || "",
        });
      }

      // Add customer ID to appointment data
      enhancedAppointmentData.customerId = customer.id;

      const appointment = await storage.createAppointment(enhancedAppointmentData);

      // Google Calendar integration - Create calendar event
      try {
        const event = await createEvent({
          summary: `${appointmentData.serviceType} — ${durationHours}h Block`,
          description: [
            `Customer: ${appointmentData.firstName} ${appointmentData.lastName} (${appointmentData.email}${appointmentData.phone ? ", " + appointmentData.phone : ""})`,
            appointmentData.notes ? `Notes: ${appointmentData.notes}` : null
          ].filter(Boolean).join("\n"),
          start: new Date(startTimestamptz),
          end: new Date(endTimestamptz),
          attendees: [appointmentData.email]
        });

        // Update appointment with Google event ID
        await storage.updateAppointmentGoogleEventId(appointment.id, event.id);
        console.log(`Google Calendar event created for appointment ${appointment.id}: ${event.id}`);
      } catch (googleError) {
        console.error("Google Calendar sync (create) failed:", googleError instanceof Error ? googleError.message : googleError);
        // Do NOT fail the booking; log only
      }

      // Send emails with proper integration
      try {
        // Send customer confirmation email with ICS attachment and reschedule link
        await getEmailService().sendAppointmentConfirmation(appointment, rescheduleToken);
        
        // Send admin notification with appointment details
        await getEmailService().sendAdminNotification(appointment);
        
        console.log(`Appointment ${appointment.id} created successfully with emails sent`);
      } catch (emailError) {
        console.error('Failed to send emails:', emailError);
        // Don't fail the appointment creation if email fails
      }

      res.status(201).json({
        ...appointment,
        rescheduleToken, // Include reschedule token in response
        duration: durationHours,
        serviceInfo // Include service catalog info if available
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

      // Google Calendar integration - Update calendar event
      if (appointment.googleEventId) {
        try {
          const durationHours = Math.round(durationMs / (1000 * 60 * 60));
          await updateEvent(appointment.googleEventId, {
            summary: `${appointment.serviceType} — ${durationHours}h Block`,
            description: [
              `Customer: ${appointment.firstName} ${appointment.lastName} (${appointment.email}${appointment.phone ? ", " + appointment.phone : ""})`,
              appointment.notes ? `Notes: ${appointment.notes}` : null
            ].filter(Boolean).join("\n"),
            start: newStartTime,
            end: newEndTime,
            attendees: [appointment.email]
          });
          console.log(`Google Calendar event updated for appointment ${appointment.id}: ${appointment.googleEventId}`);
        } catch (googleError) {
          console.error("Google Calendar sync (update) failed:", googleError instanceof Error ? googleError.message : googleError);
          // Do NOT fail the reschedule; log only
        }
      }
      
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

  app.patch("/api/quotes/:id/status", requireAdmin, async (req, res) => {
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

  // ====================================
  // CHAT API ENDPOINTS
  // ====================================

  // Admin chat authentication
  app.post("/api/admin/chat/login", (req, res) => {
    const { password } = req.body || {};
    if (!password || password !== (process.env.ADMIN_PASSWORD || 'changeme')) {
      return res.status(401).json({ ok: false, message: "Invalid password" });
    }
    
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    // Store admin token (in production, use Redis or database)
    res.json({ ok: true, token });
  });

  // Get all chat conversations for admin (exclude terminated)
  app.get("/api/admin/chat/conversations", requireAdmin, async (req, res) => {
    try {
      const allConversations = await storage.getRecentChatConversations(100);
      // Filter out terminated conversations 
      const activeConversations = allConversations.filter(c => c.status !== 'terminated');
      const conversationList = activeConversations.map(c => ({
        id: c.id,
        status: c.status,
        customerName: c.customerName,
        customerEmail: c.customerEmail,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt
      }));
      res.json({ ok: true, conversations: conversationList });
    } catch (error) {
      console.error("Failed to get conversations:", error);
      res.status(500).json({ ok: false, message: "Failed to get conversations" });
    }
  });

  // Get chat history for a specific conversation
  app.get("/api/admin/chat/history/:conversationId", requireAdmin, async (req, res) => {
    try {
      const { conversationId } = req.params;
      const conversation = await storage.getChatConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ ok: false, message: "Conversation not found" });
      }
      
      const messages = await storage.getChatMessages(conversationId);
      res.json({ ok: true, messages });
    } catch (error) {
      console.error("Failed to get chat history:", error);
      res.status(500).json({ ok: false, message: "Failed to get chat history" });
    }
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


  app.get("/api/appointments/upcoming", async (req, res) => {
    try {
      const appointments = await storage.getUpcomingAppointments();
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming appointments" });
    }
  });

  // Project gallery routes with pagination support
  app.get("/api/gallery", async (req, res) => {
    try {
      const { category, page } = req.query;
      
      // Parse and validate page parameter
      const pageNumber = page && typeof page === 'string' ? Math.max(1, parseInt(page, 10)) || 1 : 1;
      const limit = 12; // Items per page to match frontend ITEMS_PER_PAGE
      
      // Parse and validate category parameter
      const categoryFilter = category && typeof category === 'string' && category !== 'all' ? category : undefined;
      
      // Use paginated method for consistent behavior
      const result = await storage.getProjectGalleryPaginated(pageNumber, limit, categoryFilter);
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(result.total / limit);
      const hasMore = pageNumber < totalPages;
      
      // Return proper response structure expected by frontend
      const response = {
        projects: result.items,
        totalCount: result.total,
        totalPages,
        currentPage: pageNumber,
        hasMore
      };
      
      res.json(response);
    } catch (error) {
      console.error('Gallery API error:', error);
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

  // Add new availability rules endpoints under /api/availability/ path (for deployment compatibility)
  app.get("/api/availability/rules", async (req, res) => {
    try {
      const rules = await storage.getAvailabilityRules();
      res.json({ rules });
    } catch (error) {
      console.error('availability rules error:', error);
      res.status(500).json({ error: 'Failed to load rules' });
    }
  });

  app.get("/api/availability/rules/active", async (req, res) => {
    try {
      const rules = await storage.getActiveAvailabilityRules();
      res.json({ rules });
    } catch (error) {
      console.error('active rules error:', error);
      res.status(500).json({ error: 'Failed to load active rules' });
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

  // Public Services catalog endpoint
  app.get("/api/services", async (req, res) => {
    try {
      const { category, active, quickPick } = req.query;
      let services = await storage.getAllServices();

      if (active === "true") {
        services = services.filter((s) => s.isActive);
      }

      if (category && typeof category === 'string') {
        services = services.filter((s) => s.category === category);
      }

      if (quickPick === "true") {
        services = services.filter((s) => s.isActive && s.showAsQuickPick);
      }

      res.json(services);
    } catch (error) {
      console.error('Services endpoint error:', error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid service ID" });
      }

      const service = await storage.getService(id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      res.json(service);
    } catch (error) {
      console.error('Service by ID endpoint error:', error);
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
      const validatedData = insertServiceSchema.partial().parse({
        ...req.body,
        basePrice: req.body.basePrice !== undefined ? Number(req.body.basePrice) : undefined,
        displayOrder: req.body.displayOrder !== undefined ? Number(req.body.displayOrder) : undefined,
        quickPickOrder: req.body.quickPickOrder !== undefined ? Number(req.body.quickPickOrder) : undefined,
      });
      await storage.updateService(id, validatedData);
      res.json({ message: "Service updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid service data", errors: error.errors });
      } else {
        console.error("Service update error:", error);
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


  // Availability endpoint for scheduler system
  app.get("/api/availability", async (req, res) => {
    try {
      // Import service utilities
      const { getServiceById } = await import("./utils/services");
      
      // Define validation schema for query parameters
      // Support both legacy hours parameter and new serviceId parameter
      const querySchema = z.object({
        from: z.string().refine((val) => {
          const date = new Date(val);
          return !isNaN(date.getTime());
        }, { message: "Invalid ISO datetime string for 'from'" }),
        to: z.string().refine((val) => {
          const date = new Date(val);
          return !isNaN(date.getTime());
        }, { message: "Invalid ISO datetime string for 'to'" }),
        // Legacy parameter - takes precedence for backward compatibility
        hours: z.enum(["2", "4", "6"], {
          errorMap: () => ({ message: "Hours must be one of: 2, 4, 6" })
        }).optional(),
        // New parameter - service ID from catalog
        serviceId: z.string().refine((val) => {
          const parsed = parseInt(val);
          return !isNaN(parsed) && parsed > 0;
        }, { message: "Service ID must be a positive integer" }).optional()
      }).refine((data) => {
        // Require either hours OR serviceId
        return data.hours || data.serviceId;
      }, { message: "Either 'hours' or 'serviceId' parameter is required" });

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
      
      let blockMinutes: number;
      let suggestedHours: number;
      
      // Determine block duration - hours parameter takes precedence
      if (validatedQuery.hours) {
        // Legacy behavior - use explicit hours
        const hoursToMinutes = {
          "2": 120,
          "4": 240,
          "6": 360
        };
        blockMinutes = hoursToMinutes[validatedQuery.hours];
        suggestedHours = parseInt(validatedQuery.hours);
      } else if (validatedQuery.serviceId) {
        // New behavior - infer from service catalog
        const serviceId = parseInt(validatedQuery.serviceId);
        const service = getServiceById(serviceId);
        
        if (!service) {
          return res.status(400).json({ 
            error: "SERVICE_NOT_FOUND",
            message: "Service not found or not active"
          });
        }
        
        // Validate that service suggestedHours is in allowed set
        if (![2, 4, 6].includes(service.suggestedHours)) {
          return res.status(400).json({ 
            error: "INVALID_SERVICE_DURATION",
            message: `Service duration ${service.suggestedHours}h is not supported. Allowed durations: 2, 4, 6 hours`
          });
        }
        
        blockMinutes = service.suggestedHours * 60;
        suggestedHours = service.suggestedHours;
      } else {
        // This shouldn't happen due to Zod validation, but handle it safely
        return res.status(400).json({ 
          error: "MISSING_DURATION",
          message: "Either 'hours' or 'serviceId' parameter is required"
        });
      }
      
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
      
      // Enhanced response with service information
      res.json({ 
        slots,
        suggestedHours
      });
      
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



  // ====================================
  // ADMIN GALLERY MANAGEMENT ENDPOINTS
  // ====================================

  // Helper function to extract file URLs from gallery item for cleanup
  function extractFileUrls(item: any): string[] {
    const urls: string[] = [];
    if (item.imageUrl) urls.push(item.imageUrl);
    if (item.beforeImageUrl) urls.push(item.beforeImageUrl);
    if (item.imageUrls && Array.isArray(item.imageUrls)) {
      urls.push(...item.imageUrls);
    }
    return urls;
  }

  // Helper function to delete physical files from disk
  async function deletePhysicalFiles(urls: string[]): Promise<void> {
    for (const url of urls) {
      try {
        // Extract file path from URL (remove '/uploads/' prefix)
        const relativePath = url.replace(/^\/uploads\//, '');
        const fullPath = path.join(process.cwd(), 'server', 'public', 'uploads', relativePath);
        
        await fs.unlink(fullPath);
        console.log(`🗑️ Deleted file: ${relativePath}`);
      } catch (error) {
        console.warn(`⚠️ Failed to delete file: ${url}`, error);
        // Continue with other files even if one fails
      }
    }
  }

  // POST /api/admin/gallery - Create gallery item with image upload
  app.post("/api/admin/gallery", requireAdmin, rlSensitive, handleImageUpload('images'), async (req: any, res: any) => {
    try {
      console.log(`[ADMIN_GALLERY] POST /api/admin/gallery - Creating new gallery item`);
      
      const processedImages = (req as any).processedImages as ProcessedImage[];
      
      if (!processedImages || processedImages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'NO_IMAGES_UPLOADED',
          message: 'At least one image is required for gallery items'
        });
      }

      // Organize images by type (main, before, and multiple finished images)
      const imageUrls = processedImages.map(img => img.sizes.large.url);
      
      // Validate form fields
      const formData = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        location: req.body.location,
        completionDate: req.body.completionDate ? new Date(req.body.completionDate) : new Date(),
        featured: req.body.featured === 'true' || req.body.featured === true,
        imageUrl: processedImages[0].sizes.large.url, // Use first image as main image
        beforeImageUrl: processedImages[1]?.sizes.large.url || null, // Use second image as before image if provided
        imageUrls: processedImages.length > 2 ? imageUrls.slice(2) : undefined // Store remaining images as finished results
      };

      // Validate using schema
      const validatedData = insertProjectGallerySchema.parse(formData);
      
      // Create gallery item in database
      const createdItem = await storage.createProjectGalleryItem(validatedData);
      
      console.log(`[ADMIN_GALLERY] Successfully created gallery item ${createdItem.id}`);
      
      res.json({
        success: true,
        message: 'Gallery item created successfully',
        item: createdItem,
        processedImages: processedImages.length
      });

    } catch (error) {
      console.error('Gallery creation error:', error);
      
      // Clean up uploaded files if database creation failed
      if ((req as any).processedImages) {
        try {
          await cleanupUploadedFiles((req as any).processedImages);
          console.log('🗑️ Cleaned up uploaded files due to creation failure');
        } catch (cleanupError) {
          console.error('Failed to cleanup files:', cleanupError);
        }
      }
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'GALLERY_CREATION_ERROR',
        message: 'Failed to create gallery item'
      });
    }
  });

  // GET /api/admin/gallery - List gallery items with pagination
  app.get("/api/admin/gallery", requireAdmin, async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 12));
      const category = req.query.category as string | undefined;

      console.log(`[ADMIN_GALLERY] GET /api/admin/gallery - page: ${page}, limit: ${limit}, category: ${category || 'all'}`);

      const result = await storage.getProjectGalleryPaginated(page, limit, category);
      const hasMore = (page * limit) < result.total;

      res.json({
        success: true,
        items: result.items,
        total: result.total,
        page,
        limit,
        hasMore,
        totalPages: Math.ceil(result.total / limit)
      });

    } catch (error) {
      console.error('Gallery listing error:', error);
      res.status(500).json({
        success: false,
        error: 'GALLERY_LISTING_ERROR',
        message: 'Failed to fetch gallery items'
      });
    }
  });

  // GET /api/admin/gallery/:id - Get single gallery item
  app.get("/api/admin/gallery/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ID',
          message: 'Invalid gallery item ID'
        });
      }

      console.log(`[ADMIN_GALLERY] GET /api/admin/gallery/${id}`);

      const item = await storage.getProjectGalleryItem(id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'GALLERY_ITEM_NOT_FOUND',
          message: 'Gallery item not found'
        });
      }

      res.json({
        success: true,
        item
      });

    } catch (error) {
      console.error('Gallery item retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'GALLERY_RETRIEVAL_ERROR',
        message: 'Failed to retrieve gallery item'
      });
    }
  });

  // PATCH /api/admin/gallery/:id - Update gallery item (text fields only)
  app.patch("/api/admin/gallery/:id", requireAdmin, rlSensitive, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ID',
          message: 'Invalid gallery item ID'
        });
      }

      console.log(`[ADMIN_GALLERY] PATCH /api/admin/gallery/${id}`, req.body);

      // Check if item exists
      const existingItem = await storage.getProjectGalleryItem(id);
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          error: 'GALLERY_ITEM_NOT_FOUND',
          message: 'Gallery item not found'
        });
      }

      // Validate update data
      const validatedData = updateProjectGallerySchema.parse(req.body);
      
      // Update gallery item
      await storage.updateProjectGalleryItem(id, validatedData);
      
      console.log(`[ADMIN_GALLERY] Successfully updated gallery item ${id}`);
      
      res.json({
        success: true,
        message: 'Gallery item updated successfully'
      });

    } catch (error) {
      console.error('Gallery update error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid update data',
          details: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'GALLERY_UPDATE_ERROR',
        message: 'Failed to update gallery item'
      });
    }
  });

  // PUT /api/admin/gallery/:id/image - Replace image for existing gallery item
  app.put("/api/admin/gallery/:id/image", requireAdmin, rlSensitive, handleImageUpload('images'), async (req: any, res: any) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ID',
          message: 'Invalid gallery item ID'
        });
      }

      console.log(`[ADMIN_GALLERY] PUT /api/admin/gallery/${id}/image - Replacing images`);

      // Check if item exists and get current image URLs for cleanup
      const existingItem = await storage.getProjectGalleryItem(id);
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          error: 'GALLERY_ITEM_NOT_FOUND',
          message: 'Gallery item not found'
        });
      }

      const processedImages = (req as any).processedImages as ProcessedImage[];
      
      if (!processedImages || processedImages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'NO_IMAGES_UPLOADED',
          message: 'At least one image is required for replacement'
        });
      }

      // Prepare update data with new image URLs
      const updateData = {
        imageUrl: processedImages[0].sizes.large.url,
        beforeImageUrl: processedImages[1]?.sizes.large.url || null
      };

      // Update database with new image URLs
      await storage.updateProjectGalleryItem(id, updateData);
      
      // Clean up old image files after successful database update
      const oldImageUrls = extractFileUrls(existingItem);
      if (oldImageUrls.length > 0) {
        try {
          await deletePhysicalFiles(oldImageUrls);
          console.log(`🗑️ Cleaned up ${oldImageUrls.length} old image files`);
        } catch (cleanupError) {
          console.warn('Failed to cleanup some old files:', cleanupError);
          // Continue since database update was successful
        }
      }
      
      console.log(`[ADMIN_GALLERY] Successfully replaced images for gallery item ${id}`);
      
      res.json({
        success: true,
        message: 'Gallery item images replaced successfully',
        newImageUrls: {
          main: updateData.imageUrl,
          before: updateData.beforeImageUrl
        }
      });

    } catch (error) {
      console.error('Gallery image replacement error:', error);
      
      // Clean up newly uploaded files if database update failed
      if ((req as any).processedImages) {
        try {
          await cleanupUploadedFiles((req as any).processedImages);
          console.log('🗑️ Cleaned up new uploaded files due to replacement failure');
        } catch (cleanupError) {
          console.error('Failed to cleanup new files:', cleanupError);
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'IMAGE_REPLACEMENT_ERROR',
        message: 'Failed to replace gallery item images'
      });
    }
  });

  // DELETE /api/admin/gallery/:id - Delete gallery item with file cleanup
  app.delete("/api/admin/gallery/:id", requireAdmin, rlSensitive, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ID',
          message: 'Invalid gallery item ID'
        });
      }

      console.log(`[ADMIN_GALLERY] DELETE /api/admin/gallery/${id}`);

      // Delete from database first and get the deleted item data for file cleanup
      const deletedItem = await storage.deleteProjectGalleryItem(id);
      
      if (!deletedItem) {
        return res.status(404).json({
          success: false,
          error: 'GALLERY_ITEM_NOT_FOUND',
          message: 'Gallery item not found'
        });
      }

      // Clean up associated image files after successful database deletion
      const imageUrls = extractFileUrls(deletedItem);
      if (imageUrls.length > 0) {
        try {
          await deletePhysicalFiles(imageUrls);
          console.log(`🗑️ Cleaned up ${imageUrls.length} image files`);
        } catch (cleanupError) {
          console.warn('Failed to cleanup some files:', cleanupError);
          // Continue since database deletion was successful
        }
      }
      
      console.log(`[ADMIN_GALLERY] Successfully deleted gallery item ${id} and associated files`);
      
      res.json({
        success: true,
        message: 'Gallery item deleted successfully',
        deletedItem: {
          id: deletedItem.id,
          title: deletedItem.title
        }
      });

    } catch (error) {
      console.error('Gallery deletion error:', error);
      res.status(500).json({
        success: false,
        error: 'GALLERY_DELETION_ERROR',
        message: 'Failed to delete gallery item'
      });
    }
  });

  // ====================================
  // PUBLIC GALLERY VIEWING ENDPOINT
  // ====================================

  // GET /api/gallery - Public endpoint for customer gallery viewing
  app.get("/api/gallery", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
      const category = req.query.category as string | undefined;

      console.log(`[PUBLIC_GALLERY] GET /api/gallery - page: ${page}, limit: ${limit}, category: ${category || 'all'}`);

      const result = await storage.getProjectGalleryPaginated(page, limit, category);

      res.json({
        success: true,
        items: result.items,
        total: result.total,
        hasMore: (page * limit) < result.total
      });

    } catch (error) {
      console.error('Public gallery listing error:', error);
      res.status(500).json({
        success: false,
        error: 'GALLERY_LISTING_ERROR',
        message: 'Failed to fetch gallery items'
      });
    }
  });

  // Test upload endpoint for photo gallery system - Admin only
  app.post("/api/admin/test-upload", requireAdmin, rlSensitive, handleImageUpload('images'), async (req: any, res: any) => {
    try {
      const processedImages = (req as any).processedImages as ProcessedImage[];
      
      if (!processedImages || processedImages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'NO_IMAGES_PROCESSED',
          message: 'No images were successfully processed'
        });
      }

      // Return processed image metadata for client use
      const imageData = processedImages.map(image => ({
        originalName: image.originalName,
        secureFilename: image.secureFilename,
        fileSize: image.fileSize,
        dimensions: image.dimensions,
        sizes: {
          thumbnail: {
            url: image.sizes.thumbnail.url,
            width: image.sizes.thumbnail.width,
            height: image.sizes.thumbnail.height,
            fileSize: image.sizes.thumbnail.fileSize
          },
          medium: {
            url: image.sizes.medium.url,
            width: image.sizes.medium.width,
            height: image.sizes.medium.height,
            fileSize: image.sizes.medium.fileSize
          },
          large: {
            url: image.sizes.large.url,
            width: image.sizes.large.width,
            height: image.sizes.large.height,
            fileSize: image.sizes.large.fileSize
          }
        },
        createdAt: image.createdAt
      }));

      console.log(`✅ Successfully processed ${processedImages.length} image(s) for admin test upload`);

      res.json({
        success: true,
        message: `Successfully processed ${processedImages.length} image(s)`,
        images: imageData,
        uploadedCount: processedImages.length
      });

    } catch (error) {
      console.error('Test upload error:', error);
      res.status(500).json({
        success: false,
        error: 'UPLOAD_PROCESSING_ERROR',
        message: 'Failed to process uploaded images'
      });
    }
  });

  // Enhanced appointment endpoint with SMS/Email notifications
  app.post('/api/appointment', async (req, res) => {
    try {
      const { convId, name, phone, email, address, description, preferred } = req.body;
      
      // Basic validation
      if (!name || !phone || !email || !description || !preferred) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Missing required fields: name, phone, email, description, preferred' 
        });
      }

      // Generate conversation ID if not provided
      const conversationId = convId || `appt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      // Send notifications via SMS and email
      try {
        await notificationService.notifyAppointmentRequest({
          convId: conversationId,
          name,
          phone,
          email,
          address,
          description,
          preferred
        });
        
        console.log(`✓ Appointment notifications sent for ${name}`);
      } catch (error) {
        console.error('Failed to send appointment notifications:', error);
      }

      res.json({ ok: true, conversationId });
    } catch (error) {
      console.error('Appointment endpoint error:', error);
      res.status(500).json({ ok: false, error: 'Failed to process appointment request' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
