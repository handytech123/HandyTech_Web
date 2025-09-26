import { pgTable, text, serial, integer, boolean, timestamp, real, date, varchar, time } from "drizzle-orm/pg-core";
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
  message: text("message"),
  status: text("status").notNull().default("pending"), // 'pending', 'contacted', 'converted', 'declined'
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  status: true,
}).extend({
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
});

export const insertProjectGallerySchema = createInsertSchema(projectGallery).omit({
  id: true,
  createdAt: true,
}).extend({
  imageUrl: z.string().optional(), // Allow imageUrl for backend processing
  beforeImageUrl: z.string().optional(), // Allow beforeImageUrl for backend processing  
  imageUrls: z.array(z.string()).optional(), // Allow array of image URLs for multiple finished images
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
