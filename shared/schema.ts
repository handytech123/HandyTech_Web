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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastEmailSent: timestamp("last_email_sent"),
});

export const maintenancePlans = pgTable("maintenance_plans", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  planType: text("plan_type").notNull(), // 'basic', 'professional', 'enterprise'
  price: real("price").notNull(),
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'cancelled'
  startDate: timestamp("start_date").defaultNow().notNull(),
  nextBillingDate: timestamp("next_billing_date").notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  rating: integer("rating").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
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
  appointmentDate: timestamp("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  startTimestamptz: timestamp("start_timestamptz", { withTimezone: true }),
  endTimestamptz: timestamp("end_timestamptz", { withTimezone: true }),
  rescheduleToken: varchar("reschedule_token", { length: 64 }),
  rescheduleExpires: timestamp("reschedule_expires", { withTimezone: true }),
  sequence: integer("sequence").default(0),
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'confirmed', 'completed', 'cancelled'
  source: text("source").notNull().default("manual"), // 'calendly', 'manual', 'chatbot'
  calendlyEventId: text("calendly_event_id"), // Store Calendly's unique event ID
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectGallery = pgTable("project_gallery", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'plumbing', 'electrical', 'carpentry', 'tech', 'general'
  imageUrl: text("image_url").notNull(),
  beforeImageUrl: text("before_image_url"),
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
});

export const insertMaintenancePlanSchema = createInsertSchema(maintenancePlans).omit({
  id: true,
  startDate: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  isApproved: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  status: true,
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
});

export const insertProjectGallerySchema = createInsertSchema(projectGallery).omit({
  id: true,
  createdAt: true,
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
