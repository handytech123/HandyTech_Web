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
  planType: text("plan_type").notNull(),
  price: real("price").notNull(),
  status: text("status").notNull().default("active"),
  startDate: timestamp("start_date").defaultNow().notNull(),
  nextBillingDate: timestamp("next_billing_date").notNull(),
  endDate: timestamp("end_date"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  cancellationType: text("cancellation_type"),
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
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  campaignType: text("campaign_type").notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  serviceType: text("service_type").notNull(),
  serviceId: integer("service_id"),
  appointmentDate: timestamp("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  address: text("address"),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  startTimestamptz: timestamp("start_timestamptz", { withTimezone: true }),
  endTimestamptz: timestamp("end_timestamptz", { withTimezone: true }),
  rescheduleToken: varchar("reschedule_token", { length: 64 }),
  rescheduleExpires: timestamp("reschedule_expires", { withTimezone: true }),
  sequence: integer("sequence").default(0),
  status: text("status").notNull().default("scheduled"),
  source: text("source").notNull().default("manual"),
  notes: text("notes"),
  googleEventId: text("google_event_id"),
  reminder24hSent: timestamp("reminder_24h_sent"),
  reminder2hSent: timestamp("reminder_2h_sent"), 
  followUpSent: timestamp("follow_up_sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectGallery = pgTable("project_gallery", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url").notNull(),
  beforeImageUrl: text("before_image_url"),
  imageUrls: text("image_urls").array(),
  completionDate: timestamp("completion_date").notNull(),
  location: text("location"),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  weekday: integer("weekday").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  basePrice: real("base_price").notNull(),
  priceUnit: varchar("price_unit", { length: 50 }).default("per hour"),
  isActive: boolean("is_active").default(true),
  showAsQuickPick: boolean("show_as_quick_pick").default(false),
  quickPickOrder: integer("quick_pick_order").default(0),
  estimatedDuration: varchar("estimated_duration", { length: 50 }),
  skillLevel: varchar("skill_level", { length: 50 }).default("standard"),
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

export const portalLoginTokens = pgTable("portal_login_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  email: text("email").notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id").primaryKey(),
  status: varchar("status", { length: 20 }).notNull().default("bot"),
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
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export const portalCreateMaintenancePlanSchema = z.object({
  planType: z.enum(['basic', 'professional', 'enterprise'], {
    errorMap: () => ({ message: "Plan type must be 'basic', 'professional', or 'enterprise'" })
  }),
});

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
  imageUrl: z.string().optional(),
  beforeImageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
});

export const updateProjectGallerySchema = createInsertSchema(projectGallery)
  .omit({
    id: true,
    createdAt: true,
    imageUrl: true,
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

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceAddonSchema = createInsertSchema(serviceAddons).omit({
  id: true,
  createdAt: true,
});

export const insertPortalLoginTokenSchema = createInsertSchema(portalLoginTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
}).extend({
  expiresAt: z.coerce.date(),
});

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
  lastMessageAt: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const rescheduleRequestSchema = z.object({
  startISO: z.string().datetime("Invalid ISO datetime format"),
});

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
export type UpdateProjectGallery = z.infer<typeof updateProjectGallerySchema>;
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
