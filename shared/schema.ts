import { pgTable, text, serial, integer, boolean, timestamp, real, date, varchar, time, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  company: text("company"),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastEmailSent: timestamp("last_email_sent"),
});

export const maintenancePlans = pgTable("maintenance_plans", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  planType: text("plan_type").notNull(), // 'basic', 'professional', 'enterprise'
  price: real("price").notNull(),
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'cancelled', 'pending_cancellation'
  startDate: timestamp("start_date").defaultNow().notNull(),
  nextBillingDate: timestamp("next_billing_date").notNull(),
  endDate: timestamp("end_date"), // When subscription actually ends (for end-of-period cancellations)
  cancelledAt: timestamp("cancelled_at"), // When cancellation was requested
  cancellationReason: text("cancellation_reason"), // Optional reason for cancellation
  cancellationType: text("cancellation_type"), // 'immediate' or 'end_of_period'
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  rating: integer("rating").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  city: text("city"),
  state: text("state"),
  photoUrls: text("photo_urls").array(),
  videoUrl: text("video_url"),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  serviceNeeded: text("service_needed").notNull(),
  selectedServices: text("selected_services").array(),
  estimatedPrice: real("estimated_price"),
  photoUrls: text("photo_urls").array(),
  videoUrl: text("video_url"),
  videoUrls: text("video_urls").array(),
  message: text("message"),
  status: text("status").notNull().default("pending"), // 'pending', 'contacted', 'converted', 'declined'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  topic: text("topic").notNull(),
  message: text("message"),
  status: text("status").notNull().default("new"), // new, contacted, closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type QuoteLineItem = { description: string; quantity: number; rate: number };

export const quoteProposals = pgTable("quote_proposals", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id, { onDelete: "cascade" }).notNull().unique(),
  quoteNumber: varchar("quote_number", { length: 32 }).notNull().unique(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  lineItems: jsonb("line_items").$type<QuoteLineItem[]>().notNull(),
  discount: real("discount").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(0),
  subtotal: real("subtotal").notNull(),
  tax: real("tax").notNull().default(0),
  total: real("total").notNull(),
  notes: text("notes"),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("sent"), // sent, viewed, accepted, changes_requested, declined
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  signerName: text("signer_name"),
  signatureUrl: text("signature_url"),
  acceptedTerms: boolean("accepted_terms").default(false).notNull(),
  customerMessage: text("customer_message"),
  decisionIp: text("decision_ip"),
  decisionUserAgent: text("decision_user_agent"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type InvoiceLineItem = { description: string; quantity: number; rate: number };

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  quoteProposalId: integer("quote_proposal_id").references(() => quoteProposals.id),
  invoiceNumber: varchar("invoice_number", { length: 32 }).notNull().unique(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  lineItems: jsonb("line_items").$type<InvoiceLineItem[]>().notNull(),
  discount: real("discount").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(0),
  subtotal: real("subtotal").notNull(),
  tax: real("tax").notNull().default(0),
  total: real("total").notNull(),
  amountPaid: real("amount_paid").notNull().default(0),
  depositRequired: real("deposit_required").notNull().default(0),
  paymentUrl: text("payment_url"),
  notes: text("notes"),
  terms: text("terms"),
  status: text("status").notNull().default("draft"), // draft, sent, viewed, partial, paid, overdue, void
  issueDate: timestamp("issue_date", { withTimezone: true }).defaultNow().notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invoicePayments = pgTable("invoice_payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  amount: real("amount").notNull(),
  method: text("method").notNull(), // cash, check, card, bank_transfer, other
  reference: text("reference"),
  notes: text("notes"),
  paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
  quoteProposalId: integer("quote_proposal_id").references(() => quoteProposals.id, { onDelete: "set null" }),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  appointmentId: integer("appointment_id"),
  jobNumber: varchar("job_number", { length: 32 }).notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  address: text("address"),
  status: text("status").notNull().default("lead"), // lead, quoted, approved, scheduled, in_progress, completed, invoiced, paid, closed
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const jobExpenses = pgTable("job_expenses", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "cascade" }).notNull(),
  category: text("category").notNull().default("materials"),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  vendor: text("vendor"),
  receiptUrl: text("receipt_url"),
  laborHours: real("labor_hours"),
  hourlyRate: real("hourly_rate"),
  expenseDate: timestamp("expense_date", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const changeOrders = pgTable("change_orders", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft, sent, accepted, declined
  tokenHash: varchar("token_hash", { length: 64 }).unique(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  signerName: text("signer_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const automationLog = pgTable("automation_log", {
  id: serial("id").primaryKey(),
  automationType: text("automation_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  outcome: text("outcome").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  campaignType: text("campaign_type").notNull(), // 'maintenance', 'promotional', 'follow_up'
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  bookingType: text("booking_type").notNull().default("service"), // 'consultation' or 'service'
  serviceType: text("service_type").notNull(),
  serviceId: integer("service_id"), // Optional reference to service catalog
  appointmentDate: timestamp("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  address: text("address"), // Service address (keep for compatibility)
  street: text("street"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  startTimestamptz: timestamp("start_timestamptz", { withTimezone: true }),
  endTimestamptz: timestamp("end_timestamptz", { withTimezone: true }),
  rescheduleToken: varchar("reschedule_token", { length: 64 }),
  rescheduleExpires: timestamp("reschedule_expires", { withTimezone: true }),
  sequence: integer("sequence").default(0),
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'confirmed', 'completed', 'cancelled'
  source: text("source").notNull().default("manual"), // 'manual', 'chatbot'
  notes: text("notes"),
  googleEventId: text("google_event_id"), // Google Calendar event ID for sync functionality
  // Auditable SMS consent. Consent is optional and never required to book.
  smsConsent: boolean("sms_consent").default(false).notNull(),
  smsConsentAt: timestamp("sms_consent_at", { withTimezone: true }),
  smsConsentSource: text("sms_consent_source"),
  smsDisclosureVersion: text("sms_disclosure_version"),
  smsConsentIp: text("sms_consent_ip"),
  smsConsentUserAgent: text("sms_consent_user_agent"),
  // Reminder tracking fields to prevent duplicates
  reminder24hSent: timestamp("reminder_24h_sent"),
  reminder2hSent: timestamp("reminder_2h_sent"), 
  followUpSent: timestamp("follow_up_sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectGallery = pgTable("project_gallery", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'plumbing', 'electrical', 'carpentry', 'tech', 'general'
  imageUrl: text("image_url").notNull(),
  beforeImageUrl: text("before_image_url"),
  imageUrls: text("image_urls").array(), // Array of multiple finished result images
  beforeImageUrls: text("before_image_urls").array(), // URLs explicitly classified as Before
  videoUrls: text("video_urls").array(), // Optional project videos, usually before/after clips
  completionDate: timestamp("completion_date").notNull(),
  location: text("location"),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  lastEmailSent: true,
}).extend({
  phone: z.string().min(1, "Phone number is required"),
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(1, "ZIP code is required"),
});

// Customer profile update schema for portal - allows partial updates and validates fields
export const updateCustomerProfileSchema = createInsertSchema(customers)
  .omit({
    id: true,
    createdAt: true,
    lastEmailSent: true,
  })
  .partial()
  .extend({
    email: z.string().email("Please enter a valid email address").optional(),
    firstName: z.string().min(1, "First name is required").optional(),
    lastName: z.string().min(1, "Last name is required").optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be updated"
  });

export const insertMaintenancePlanSchema = createInsertSchema(maintenancePlans).omit({
  id: true,
  startDate: true,
  cancelledAt: true,
  endDate: true,
});

// SECURITY: Secure portal maintenance plan creation schema - only accepts planType
// All sensitive fields (price, customerId, etc.) are computed server-side
export const portalCreateMaintenancePlanSchema = z.object({
  planType: z.enum(['basic', 'professional', 'enterprise'], {
    errorMap: () => ({ message: "Plan type must be 'basic', 'professional', or 'enterprise'" })
  }),
});

// Cancellation request schema
export const cancelMaintenancePlanSchema = z.object({
  cancellationType: z.enum(['immediate', 'end_of_period'], {
    errorMap: () => ({ message: "Cancellation type must be 'immediate' or 'end_of_period'" })
  }),
  cancellationReason: z.string().min(1, "Please provide a reason for cancellation").max(500, "Reason must be less than 500 characters").optional(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  isApproved: true,
}).extend({
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  status: true,
}).extend({
  phone: z.string().min(1, "Phone number is required"),
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(1, "ZIP code is required"),
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({
  id: true,
  sentAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
}).extend({
  bookingType: z.enum(["consultation", "service"]).default("service"),
  appointmentDate: z.coerce.date(),
  startTimestamptz: z.coerce.date().optional(),
  endTimestamptz: z.coerce.date().optional(),
  rescheduleExpires: z.coerce.date().optional(),
  durationHours: z.number().min(1).max(12).optional(),
  serviceId: z.number().optional(),
  phone: z.string().min(1, "Phone number is required"),
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(1, "ZIP code is required"),
  smsConsent: z.boolean().optional().default(false),
});

export const insertConsultationSchema = createInsertSchema(consultations).omit({
  id: true,
  status: true,
  createdAt: true,
}).extend({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  topic: z.string().trim().min(2).max(200),
  message: z.string().trim().max(3000).optional().nullable(),
});

export const insertProjectGallerySchema = createInsertSchema(projectGallery).omit({
  id: true,
  createdAt: true,
}).extend({
  imageUrl: z.string().optional(), // Allow imageUrl for backend processing
  beforeImageUrl: z.string().optional(), // Allow beforeImageUrl for backend processing  
  imageUrls: z.array(z.string()).optional(), // Allow array of image URLs for multiple finished images
  videoUrls: z.array(z.string()).optional(),
});

// Partial update schema for PATCH operations on project gallery items
export const updateProjectGallerySchema = createInsertSchema(projectGallery)
  .omit({
    id: true,
    createdAt: true,
    imageUrl: true, // Images are handled separately via upload endpoints
    beforeImageUrl: true
  })
  .partial()
  .extend({
    title: z.string().min(1, "Title is required").optional(),
    description: z.string().min(1, "Description is required").optional(),
    category: z.enum(['plumbing', 'electrical', 'carpentry', 'tech', 'general'], {
      errorMap: () => ({ message: "Category must be one of: plumbing, electrical, carpentry, tech, general" })
    }).optional(),
    completionDate: z.coerce.date().optional(),
    imageUrls: z.array(z.string()).optional(),
    beforeImageUrls: z.array(z.string()).optional(),
    videoUrls: z.array(z.string()).optional(),
    location: z.string().optional(),
    featured: z.boolean().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be updated"
  });

export const blockedTimes = pgTable("blocked_times", {
  id: serial("id").primaryKey(),
  startTimestamptz: timestamp("start_timestamptz", { withTimezone: true }).notNull(),
  endTimestamptz: timestamp("end_timestamptz", { withTimezone: true }).notNull(),
  reason: text("reason"),
  isFullDay: boolean("is_full_day").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const availabilityRules = pgTable("availability_rules", {
  id: serial("id").primaryKey(),
  weekday: integer("weekday").notNull(), // 0=Sunday to 6=Saturday
  startTime: varchar("start_time", { length: 5 }).notNull(), // format like "09:00"
  endTime: varchar("end_time", { length: 5 }).notNull(), // format like "17:00"
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBlockedTimeSchema = createInsertSchema(blockedTimes).omit({
  id: true,
  createdAt: true,
}).extend({
  startTimestamptz: z.coerce.date(),
  endTimestamptz: z.coerce.date(),
});

export const insertAvailabilityRuleSchema = createInsertSchema(availabilityRules).omit({
  id: true,
  createdAt: true,
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(), // 'electrical', 'plumbing', 'tech', 'carpentry', 'general'
  basePrice: real("base_price").notNull(),
  priceUnit: varchar("price_unit", { length: 50 }).default("per hour"), // 'per hour', 'flat rate', 'per square foot'
  isActive: boolean("is_active").default(true),
  estimatedDuration: varchar("estimated_duration", { length: 50 }), // '1-2 hours', '2-4 hours', etc.
  skillLevel: varchar("skill_level", { length: 50 }).default("standard"), // 'basic', 'standard', 'expert'
  includedInQuoteCalculator: boolean("included_in_quote_calculator").default(true),
  showAsQuickPick: boolean("show_as_quick_pick").default(false),
  quickPickOrder: integer("quick_pick_order").default(0),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const serviceAddons = pgTable("service_addons", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  additionalPrice: real("additional_price").notNull(),
  isOptional: boolean("is_optional").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceAddonSchema = createInsertSchema(serviceAddons).omit({
  id: true,
  createdAt: true,
});

// Portal login tokens for magic link authentication
export const portalLoginTokens = pgTable("portal_login_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  email: text("email").notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPortalLoginTokenSchema = createInsertSchema(portalLoginTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
}).extend({
  expiresAt: z.coerce.date(),
});

// Chat system tables
export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id").primaryKey(), // UUID-based conversation ID
  status: varchar("status", { length: 20 }).notNull().default("bot"), // bot, pending_handoff, human
  customerId: integer("customer_id").references(() => customers.id),
  customerName: varchar("customer_name", { length: 100 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: varchar("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, admin, system
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
  lastMessageAt: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

// Reschedule validation schema
export const rescheduleRequestSchema = z.object({
  startISO: z.string().datetime("Invalid ISO datetime format"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type MaintenancePlan = typeof maintenancePlans.$inferSelect;
export type InsertMaintenancePlan = z.infer<typeof insertMaintenancePlanSchema>;
export type PortalCreateMaintenancePlan = z.infer<typeof portalCreateMaintenancePlanSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type QuoteProposal = typeof quoteProposals.$inferSelect;
export type InsertQuoteProposal = typeof quoteProposals.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;
export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type InsertInvoicePayment = typeof invoicePayments.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type JobExpense = typeof jobExpenses.$inferSelect;
export type ChangeOrder = typeof changeOrders.$inferSelect;

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type ProjectGallery = typeof projectGallery.$inferSelect;
export type InsertProjectGallery = z.infer<typeof insertProjectGallerySchema>;

export type BlockedTime = typeof blockedTimes.$inferSelect;
export type InsertBlockedTime = z.infer<typeof insertBlockedTimeSchema>;

export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type InsertAvailabilityRule = z.infer<typeof insertAvailabilityRuleSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type ServiceAddon = typeof serviceAddons.$inferSelect;
export type InsertServiceAddon = z.infer<typeof insertServiceAddonSchema>;

export type PortalLoginToken = typeof portalLoginTokens.$inferSelect;
export type InsertPortalLoginToken = z.infer<typeof insertPortalLoginTokenSchema>;

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Service History Types - combines appointment data with service pricing
export interface ServiceHistoryItem {
  id: number;
  appointmentDate: Date;
  serviceType: string;
  status: string;
  startTimestamptz: Date | null;
  endTimestamptz: Date | null;
  duration: number | null; // in hours
  notes: string | null;
  createdAt: Date;
  
  // Service pricing information
  serviceName: string | null;
  serviceDescription: string | null;
  basePrice: number | null;
  priceUnit: string | null;
  calculatedCost: number | null;
  
  // Customer portal specific fields
  serviceDate: string; // Service completion date
  cost: number; // Final cost paid by customer
  technician?: string; // Technician name
  description?: string; // Service description
  invoiceUrl?: string; // Link to invoice PDF
  
  // Customer info (for admin views)
  customerName?: string;
  customerEmail?: string;
}

// Service history query filters
export const serviceHistoryFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  serviceType: z.string().optional(),
  limit: z.number().min(1).max(100).default(50).optional(),
  offset: z.number().min(0).default(0).optional(),
});

export type ServiceHistoryFilters = z.infer<typeof serviceHistoryFiltersSchema>;

// Public review submission schema - includes customer information for auto-creation
export const publicReviewSubmissionSchema = z.object({
  // Review fields
  rating: z.number().min(1).max(5),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Review content is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  
  // Customer fields for auto-creation
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  
  // Optional service information
  serviceType: z.string().optional(),
});
