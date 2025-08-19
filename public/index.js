var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  appointmentReminders: () => appointmentReminders,
  appointments: () => appointments,
  blockedDates: () => blockedDates,
  customers: () => customers,
  emailCampaigns: () => emailCampaigns,
  insertAppointmentReminderSchema: () => insertAppointmentReminderSchema,
  insertAppointmentSchema: () => insertAppointmentSchema,
  insertBlockedDateSchema: () => insertBlockedDateSchema,
  insertCustomerSchema: () => insertCustomerSchema,
  insertEmailCampaignSchema: () => insertEmailCampaignSchema,
  insertMaintenancePlanSchema: () => insertMaintenancePlanSchema,
  insertProjectGallerySchema: () => insertProjectGallerySchema,
  insertQuoteSchema: () => insertQuoteSchema,
  insertReviewSchema: () => insertReviewSchema,
  insertServiceAddonSchema: () => insertServiceAddonSchema,
  insertServiceSchema: () => insertServiceSchema,
  insertUserSchema: () => insertUserSchema,
  maintenancePlans: () => maintenancePlans,
  projectGallery: () => projectGallery,
  quotes: () => quotes,
  reviews: () => reviews,
  serviceAddons: () => serviceAddons,
  services: () => services,
  users: () => users
});
import { pgTable, text, serial, integer, boolean, timestamp, real, date, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  company: text("company"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastEmailSent: timestamp("last_email_sent")
});
var maintenancePlans = pgTable("maintenance_plans", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  planType: text("plan_type").notNull(),
  // 'basic', 'professional', 'enterprise'
  price: real("price").notNull(),
  status: text("status").notNull().default("active"),
  // 'active', 'inactive', 'cancelled'
  startDate: timestamp("start_date").defaultNow().notNull(),
  nextBillingDate: timestamp("next_billing_date").notNull()
});
var reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  rating: integer("rating").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  source: varchar("source", { length: 100 }),
  sourceLink: varchar("source_link", { length: 500 }),
  location: varchar("location", { length: 100 }),
  service: varchar("service", { length: 255 })
});
var quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  serviceNeeded: text("service_needed").notNull(),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  // 'pending', 'contacted', 'converted', 'declined'
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  campaignType: text("campaign_type").notNull()
  // 'maintenance', 'promotional', 'follow_up'
});
var appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  serviceType: text("service_type").notNull(),
  appointmentDate: timestamp("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  status: text("status").notNull().default("scheduled"),
  // 'scheduled', 'confirmed', 'completed', 'cancelled'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var projectGallery = pgTable("project_gallery", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  // 'plumbing', 'electrical', 'carpentry', 'tech', 'general'
  imageUrl: text("image_url").notNull(),
  beforeImageUrl: text("before_image_url"),
  completionDate: timestamp("completion_date").notNull(),
  location: text("location"),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  lastEmailSent: true
});
var insertMaintenancePlanSchema = createInsertSchema(maintenancePlans).omit({
  id: true,
  startDate: true
});
var insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  isApproved: true
});
var insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  status: true
});
var insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({
  id: true,
  sentAt: true
});
var insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  status: true
}).extend({
  appointmentDate: z.string().transform((str) => new Date(str))
});
var insertProjectGallerySchema = createInsertSchema(projectGallery).omit({
  id: true,
  createdAt: true
});
var blockedDates = pgTable("blocked_dates", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  reason: text("reason"),
  allDay: boolean("all_day").default(true),
  startTime: text("start_time"),
  endTime: text("end_time"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertBlockedDateSchema = createInsertSchema(blockedDates).omit({
  id: true,
  createdAt: true
});
var services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  // 'electrical', 'plumbing', 'tech', 'carpentry', 'general'
  basePrice: real("base_price").notNull(),
  priceUnit: varchar("price_unit", { length: 50 }).default("per hour"),
  // 'per hour', 'flat rate', 'per square foot'
  isActive: boolean("is_active").default(true),
  estimatedDuration: varchar("estimated_duration", { length: 50 }),
  // '1-2 hours', '2-4 hours', etc.
  skillLevel: varchar("skill_level", { length: 50 }).default("standard"),
  // 'basic', 'standard', 'expert'
  includedInQuoteCalculator: boolean("included_in_quote_calculator").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var serviceAddons = pgTable("service_addons", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  additionalPrice: real("additional_price").notNull(),
  isOptional: boolean("is_optional").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var appointmentReminders = pgTable("appointment_reminders", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").references(() => appointments.id).notNull(),
  reminderType: varchar("reminder_type", { length: 50 }).notNull(),
  // '24_hours', '2_hours', '30_minutes'
  reminderTime: timestamp("reminder_time").notNull(),
  emailSent: boolean("email_sent").default(false).notNull(),
  emailSentAt: timestamp("email_sent_at"),
  emailStatus: varchar("email_status", { length: 50 }).default("pending"),
  // 'pending', 'sent', 'failed'
  emailContent: text("email_content"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertServiceAddonSchema = createInsertSchema(serviceAddons).omit({
  id: true,
  createdAt: true
});
var insertAppointmentReminderSchema = createInsertSchema(appointmentReminders).omit({
  id: true,
  createdAt: true,
  emailSent: true,
  emailSentAt: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, and, gte } from "drizzle-orm";
var DatabaseStorage = class {
  // Users
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(user) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }
  // Customers
  async getCustomer(id) {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }
  async getCustomerByEmail(email) {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer;
  }
  async createCustomer(customer) {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }
  async updateCustomer(id, customer) {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updated;
  }
  async getAllCustomers() {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }
  async updateCustomerLastEmail(id, lastEmailSent) {
    await db.update(customers).set({ lastEmailSent }).where(eq(customers.id, id));
  }
  // Maintenance Plans
  async getMaintenancePlan(id) {
    const [plan] = await db.select().from(maintenancePlans).where(eq(maintenancePlans.id, id));
    return plan;
  }
  async getMaintenancePlansByCustomer(customerId) {
    return await db.select().from(maintenancePlans).where(eq(maintenancePlans.customerId, customerId));
  }
  async createMaintenancePlan(plan) {
    const [created] = await db.insert(maintenancePlans).values(plan).returning();
    return created;
  }
  async updateMaintenancePlanStatus(id, status) {
    await db.update(maintenancePlans).set({ status }).where(eq(maintenancePlans.id, id));
  }
  async getAllActiveMaintenancePlans() {
    return await db.select().from(maintenancePlans).where(eq(maintenancePlans.status, "active"));
  }
  // Reviews
  async getReview(id) {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }
  async getApprovedReviews() {
    return await db.select().from(reviews).where(eq(reviews.isApproved, true)).orderBy(desc(reviews.createdAt));
  }
  async getReviewsByCustomer(customerId) {
    return await db.select().from(reviews).where(eq(reviews.customerId, customerId));
  }
  async createReview(review) {
    const [created] = await db.insert(reviews).values(review).returning();
    return created;
  }
  async approveReview(id) {
    await db.update(reviews).set({ isApproved: true }).where(eq(reviews.id, id));
  }
  // Quotes
  async getQuote(id) {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }
  async getAllQuotes() {
    return await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }
  async createQuote(quote) {
    const [created] = await db.insert(quotes).values(quote).returning();
    return created;
  }
  async updateQuoteStatus(id, status) {
    await db.update(quotes).set({ status }).where(eq(quotes.id, id));
  }
  // Email Campaigns
  async createEmailCampaign(campaign) {
    const [created] = await db.insert(emailCampaigns).values(campaign).returning();
    return created;
  }
  async getEmailCampaignsByCustomer(customerId) {
    return await db.select().from(emailCampaigns).where(eq(emailCampaigns.customerId, customerId));
  }
  async getAllEmailCampaigns() {
    return await db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.sentAt));
  }
  // Appointments
  async getAppointment(id) {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }
  async getAllAppointments() {
    return await db.select().from(appointments).orderBy(desc(appointments.createdAt));
  }
  async getAppointmentsByCustomer(customerId) {
    return await db.select().from(appointments).where(eq(appointments.customerId, customerId));
  }
  async createAppointment(appointment) {
    const [created] = await db.insert(appointments).values(appointment).returning();
    return created;
  }
  async updateAppointmentStatus(id, status) {
    await db.update(appointments).set({ status }).where(eq(appointments.id, id));
  }
  async updateAppointment(id, updateData) {
    const [updated] = await db.update(appointments).set(updateData).where(eq(appointments.id, id)).returning();
    return updated || null;
  }
  async getUpcomingAppointments() {
    const now = /* @__PURE__ */ new Date();
    return await db.select().from(appointments).where(and(gte(appointments.appointmentDate, now), eq(appointments.status, "scheduled"))).orderBy(appointments.appointmentDate);
  }
  // Project Gallery
  async getProjectGalleryItem(id) {
    const [item] = await db.select().from(projectGallery).where(eq(projectGallery.id, id));
    return item;
  }
  async getAllProjectGalleryItems() {
    return await db.select().from(projectGallery).orderBy(desc(projectGallery.createdAt));
  }
  async getProjectGalleryByCategory(category) {
    return await db.select().from(projectGallery).where(eq(projectGallery.category, category));
  }
  async getFeaturedProjects() {
    return await db.select().from(projectGallery).where(eq(projectGallery.featured, true));
  }
  async createProjectGalleryItem(item) {
    const [created] = await db.insert(projectGallery).values(item).returning();
    return created;
  }
  // Blocked Dates
  async getBlockedDates() {
    return await db.select().from(blockedDates).orderBy(blockedDates.date);
  }
  async createBlockedDate(blockedDate) {
    const [created] = await db.insert(blockedDates).values(blockedDate).returning();
    return created;
  }
  async deleteBlockedDate(id) {
    await db.delete(blockedDates).where(eq(blockedDates.id, id));
  }
  async getBlockedDatesInRange(startDate, endDate) {
    return await db.select().from(blockedDates).where(and(gte(blockedDates.date, startDate), gte(blockedDates.date, startDate))).orderBy(blockedDates.date);
  }
  // Services Management
  async getAllServices() {
    return await db.select().from(services).orderBy(services.displayOrder, services.name);
  }
  async getActiveServices() {
    return await db.select().from(services).where(eq(services.isActive, true)).orderBy(services.displayOrder, services.name);
  }
  async getServicesByCategory(category) {
    return await db.select().from(services).where(and(eq(services.category, category), eq(services.isActive, true))).orderBy(services.displayOrder, services.name);
  }
  async getService(id) {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }
  async createService(service) {
    const [created] = await db.insert(services).values(service).returning();
    return created;
  }
  async updateService(id, updates) {
    await db.update(services).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(services.id, id));
  }
  async deleteService(id) {
    await db.delete(services).where(eq(services.id, id));
  }
  async toggleServiceStatus(id, isActive) {
    await db.update(services).set({ isActive, updatedAt: /* @__PURE__ */ new Date() }).where(eq(services.id, id));
  }
  // Service Add-ons
  async getServiceAddons(serviceId) {
    return await db.select().from(serviceAddons).where(and(eq(serviceAddons.serviceId, serviceId), eq(serviceAddons.isActive, true)));
  }
  async createServiceAddon(addon) {
    const [created] = await db.insert(serviceAddons).values(addon).returning();
    return created;
  }
  async updateServiceAddon(id, updates) {
    await db.update(serviceAddons).set(updates).where(eq(serviceAddons.id, id));
  }
  async deleteServiceAddon(id) {
    await db.delete(serviceAddons).where(eq(serviceAddons.id, id));
  }
  // Appointment Reminders
  async createAppointmentReminder(reminder) {
    const [created] = await db.insert(appointmentReminders).values(reminder).returning();
    return created;
  }
  async getAppointmentReminders(appointmentId) {
    return await db.select().from(appointmentReminders).where(eq(appointmentReminders.appointmentId, appointmentId)).orderBy(appointmentReminders.reminderTime);
  }
  async getPendingReminders() {
    const now = /* @__PURE__ */ new Date();
    return await db.select().from(appointmentReminders).where(
      and(
        eq(appointmentReminders.emailSent, false),
        gte(appointmentReminders.reminderTime, now)
      )
    ).orderBy(appointmentReminders.reminderTime);
  }
  async markReminderSent(id, emailStatus, emailContent) {
    const updates = {
      emailSent: true,
      emailSentAt: /* @__PURE__ */ new Date(),
      emailStatus
    };
    if (emailContent) {
      updates.emailContent = emailContent;
    }
    await db.update(appointmentReminders).set(updates).where(eq(appointmentReminders.id, id));
  }
  async deleteAppointmentReminders(appointmentId) {
    await db.delete(appointmentReminders).where(eq(appointmentReminders.appointmentId, appointmentId));
  }
};
var storage = new DatabaseStorage();

// server/home-depot-reviews.ts
async function fetchHomeDepotReviews(contractorId = "885948") {
  const realReviews = [
    {
      id: "hd-1",
      title: "Grab Bar Installation",
      rating: 5,
      date: "Apr 15, 2025",
      content: "The professionalism was amazing!! He communicated with me every step of the installation to make sure it was exactly like I wanted. I've had to clean up behind other installers before. But not Lou, he left my bathroom just as clean as it was when he started.",
      customer: "Ardell Henderson Jr",
      location: "Berkeley, MO",
      service: "Grab Bar Installation",
      source: {
        name: "Home Depot Pro",
        link: `https://proreferral.homedepot.com/public-profile/${contractorId}`
      }
    },
    {
      id: "hd-2",
      title: "Screen Door Installation",
      rating: 5,
      date: "Mar 14, 2025",
      content: "Lou was fantastic. Would highly recommend.",
      customer: "Pro Referral Customer",
      location: "Saint Louis, MO",
      service: "Screen Door Installation",
      source: {
        name: "Home Depot Pro",
        link: `https://proreferral.homedepot.com/public-profile/${contractorId}`
      }
    },
    {
      id: "hd-3",
      title: "Dishwasher Installation",
      rating: 5,
      date: "Dec 21, 2024",
      content: "Our installation was done professionally and timely.",
      customer: "Pro Referral Customer",
      location: "Manchester, MO",
      service: "Dishwasher Installation",
      source: {
        name: "Home Depot Pro",
        link: `https://proreferral.homedepot.com/public-profile/${contractorId}`
      }
    },
    {
      id: "hd-4",
      title: "Television Mount",
      rating: 5,
      date: "Nov 21, 2024",
      content: "He is so amazing and kind! 10/10 experience, will be rehiring!",
      customer: "Nautica Emberton",
      location: "Saint Louis, MO",
      service: "Television Mount",
      source: {
        name: "Home Depot Pro",
        link: `https://proreferral.homedepot.com/public-profile/${contractorId}`
      }
    },
    {
      id: "hd-5",
      title: "Over The Range Microwave Installation",
      rating: 5,
      date: "Nov 19, 2024",
      content: "Lou went out of his way, and did a great job \u{1F44D}",
      customer: "Tammy Shannon",
      location: "Saint Peters, MO",
      service: "Over The Range Microwave Installation",
      source: {
        name: "Home Depot Pro",
        link: `https://proreferral.homedepot.com/public-profile/${contractorId}`
      }
    }
  ];
  console.log(`Loaded ${realReviews.length} authentic Home Depot Pro reviews for HandyTech Solutions`);
  return realReviews;
}

// server/email-service.ts
import fetch2 from "node-fetch";
var BrevoEmailService = class {
  apiKey;
  baseUrl = "https://api.brevo.com/v3";
  defaultFromEmail;
  defaultFromName;
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || "";
    this.defaultFromEmail = "noreply@handytech-solutions.com";
    this.defaultFromName = "HandyTech Solutions";
    if (!this.apiKey) {
      throw new Error("BREVO_API_KEY environment variable is required");
    }
  }
  async sendEmail(params) {
    try {
      const emailData = {
        sender: {
          name: params.fromName || this.defaultFromName,
          email: params.fromEmail || this.defaultFromEmail
        },
        to: [
          {
            email: params.to
          }
        ],
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent || this.stripHtml(params.htmlContent)
      };
      const response = await fetch2(`${this.baseUrl}/smtp/email`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": this.apiKey,
          "content-type": "application/json"
        },
        body: JSON.stringify(emailData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Brevo API error:", errorData);
        return { error: `Failed to send email: ${response.status} ${response.statusText}` };
      }
      const result = await response.json();
      return { messageId: result.messageId };
    } catch (error) {
      console.error("Email sending error:", error);
      return { error: `Failed to send email: ${error?.message || "Unknown error"}` };
    }
  }
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }
  // Generate appointment reminder email templates
  generateReminderEmail(appointment, reminderType) {
    const customerName = `${appointment.firstName} ${appointment.lastName}`;
    const appointmentDate = new Date(appointment.appointmentDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const appointmentTime = appointment.appointmentTime;
    let subject;
    let timeMessage;
    switch (reminderType) {
      case "24_hours":
        subject = `Reminder: Your HandyTech appointment tomorrow at ${appointmentTime}`;
        timeMessage = "tomorrow";
        break;
      case "2_hours":
        subject = `Reminder: Your HandyTech appointment in 2 hours`;
        timeMessage = "in 2 hours";
        break;
      case "30_minutes":
        subject = `Final Reminder: Your HandyTech appointment in 30 minutes`;
        timeMessage = "in 30 minutes";
        break;
      default:
        subject = `Reminder: Your HandyTech appointment`;
        timeMessage = "soon";
    }
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #BB0000; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .appointment-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #BB0000; }
          .footer { padding: 15px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background-color: #BB0000; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>HandyTech Solutions</h1>
          <p>Professional Handyman Services</p>
        </div>
        
        <div class="content">
          <h2>Appointment Reminder</h2>
          <p>Hello ${customerName},</p>
          
          <p>This is a friendly reminder that you have an appointment with HandyTech Solutions <strong>${timeMessage}</strong>.</p>
          
          <div class="appointment-details">
            <h3>Appointment Details:</h3>
            <p><strong>Service:</strong> ${appointment.serviceType}</p>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            ${appointment.phone ? `<p><strong>Contact:</strong> ${appointment.phone}</p>` : ""}
            ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ""}
          </div>
          
          <p>Our technician will arrive promptly at the scheduled time. Please ensure someone is available at the service location.</p>
          
          <p>If you need to reschedule or have any questions, please contact us as soon as possible.</p>
          
          <div style="text-align: center;">
            <a href="tel:+1555-123-4567" class="button">Call Us: (555) 123-4567</a>
          </div>
        </div>
        
        <div class="footer">
          <p>HandyTech Solutions - Your Trusted Handyman Service</p>
          <p>Missouri-based \u2022 Home Depot Pro Contractor</p>
          <p>This is an automated reminder. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;
    return { subject, htmlContent };
  }
};
var emailService = new BrevoEmailService();

// server/reminder-service.ts
var AppointmentReminderService = class {
  // Create reminders when a new appointment is scheduled
  async createRemindersForAppointment(appointment) {
    try {
      const appointmentDateTime = new Date(appointment.appointmentDate);
      const reminder24h = {
        appointmentId: appointment.id,
        reminderType: "24_hours",
        reminderTime: new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1e3),
        // 24 hours before
        emailStatus: "pending",
        emailContent: null
      };
      const reminder2h = {
        appointmentId: appointment.id,
        reminderType: "2_hours",
        reminderTime: new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1e3),
        // 2 hours before
        emailStatus: "pending",
        emailContent: null
      };
      const reminder30m = {
        appointmentId: appointment.id,
        reminderType: "30_minutes",
        reminderTime: new Date(appointmentDateTime.getTime() - 30 * 60 * 1e3),
        // 30 minutes before
        emailStatus: "pending",
        emailContent: null
      };
      const now = /* @__PURE__ */ new Date();
      if (reminder24h.reminderTime > now) {
        await storage.createAppointmentReminder(reminder24h);
      }
      if (reminder2h.reminderTime > now) {
        await storage.createAppointmentReminder(reminder2h);
      }
      if (reminder30m.reminderTime > now) {
        await storage.createAppointmentReminder(reminder30m);
      }
      console.log(`Created reminders for appointment ${appointment.id}`);
    } catch (error) {
      console.error("Error creating appointment reminders:", error);
    }
  }
  // Process pending reminders (to be called periodically)
  async processPendingReminders() {
    try {
      const pendingReminders = await storage.getPendingReminders();
      for (const reminder of pendingReminders) {
        await this.sendReminderEmail(reminder);
      }
      if (pendingReminders.length > 0) {
        console.log(`Processed ${pendingReminders.length} pending reminders`);
      }
    } catch (error) {
      console.error("Error processing pending reminders:", error);
    }
  }
  // Send immediate reminder for a specific appointment (admin triggered)
  async sendImmediateReminder(appointment, recipientEmail, customerName) {
    try {
      const { subject, htmlContent } = emailService.generateReminderEmail(appointment, "immediate");
      const result = await emailService.sendEmail({
        to: recipientEmail,
        subject,
        htmlContent
      });
      if (result.messageId) {
        if (appointment.customerId) {
          await storage.updateCustomerLastEmail(appointment.customerId, /* @__PURE__ */ new Date());
        }
        console.log(`Immediate reminder sent to ${recipientEmail} for appointment ${appointment.id}`);
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending immediate reminder:", error);
      throw error;
    }
  }
  async sendReminderEmail(reminder) {
    try {
      const appointment = await storage.getAppointment(reminder.appointmentId);
      if (!appointment) {
        console.error(`Appointment ${reminder.appointmentId} not found for reminder ${reminder.id}`);
        await storage.markReminderSent(reminder.id, "failed", "Appointment not found");
        return;
      }
      if (appointment.status === "cancelled") {
        await storage.markReminderSent(reminder.id, "skipped", "Appointment cancelled");
        return;
      }
      let customerEmail = appointment.email;
      if (appointment.customerId) {
        const customer = await storage.getCustomer(appointment.customerId);
        if (customer) {
          customerEmail = customer.email;
        }
      }
      const { subject, htmlContent } = emailService.generateReminderEmail(appointment, reminder.reminderType);
      const result = await emailService.sendEmail({
        to: customerEmail,
        subject,
        htmlContent
      });
      if (result.messageId) {
        await storage.markReminderSent(reminder.id, "sent", htmlContent);
        console.log(`Sent ${reminder.reminderType} reminder for appointment ${appointment.id} to ${customerEmail}`);
      } else {
        await storage.markReminderSent(reminder.id, "failed", result.error || "Unknown error");
        console.error(`Failed to send reminder for appointment ${appointment.id}:`, result.error);
      }
    } catch (error) {
      console.error("Error sending reminder email:", error);
      await storage.markReminderSent(reminder.id, "failed", error?.message || "Unknown error");
    }
  }
  // Clean up reminders for cancelled appointments
  async cleanupReminders(appointmentId) {
    try {
      await storage.deleteAppointmentReminders(appointmentId);
      console.log(`Cleaned up reminders for appointment ${appointmentId}`);
    } catch (error) {
      console.error("Error cleaning up reminders:", error);
    }
  }
  // Manual trigger to send a specific reminder type now (for testing)
  async sendManualReminder(appointmentId, reminderType) {
    try {
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        console.error(`Appointment ${appointmentId} not found`);
        return false;
      }
      let customerEmail = appointment.email;
      if (appointment.customerId) {
        const customer = await storage.getCustomer(appointment.customerId);
        if (customer) {
          customerEmail = customer.email;
        }
      }
      const { subject, htmlContent } = emailService.generateReminderEmail(appointment, reminderType);
      const result = await emailService.sendEmail({
        to: customerEmail,
        subject,
        htmlContent
      });
      if (result.messageId) {
        console.log(`Manual reminder sent for appointment ${appointmentId}: ${reminderType} to ${customerEmail}`);
        return true;
      } else {
        console.error(`Failed to send manual reminder:`, result.error);
        return false;
      }
    } catch (error) {
      console.error("Error sending manual reminder:", error);
      return false;
    }
  }
};
var reminderService = new AppointmentReminderService();

// server/routes.ts
import { z as z2 } from "zod";
async function registerRoutes(app2) {
  app2.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
      if (!ADMIN_PASSWORD) {
        res.status(500).json({
          success: false,
          message: "Admin password not configured. Please set ADMIN_PASSWORD environment variable."
        });
        return;
      }
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = Buffer.from(`${username}:${Date.now()}`).toString("base64");
        res.json({
          success: true,
          token,
          message: "Login successful"
        });
      } else {
        res.status(401).json({
          success: false,
          message: "Invalid username or password"
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Login failed"
      });
    }
  });
  app2.get("/api/customers", async (req, res) => {
    try {
      const customers2 = await storage.getAllCustomers();
      res.json(customers2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });
  app2.get("/api/customers/:id", async (req, res) => {
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
  app2.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const existingCustomer = await storage.getCustomerByEmail(customerData.email);
      if (existingCustomer) {
        return res.status(400).json({ message: "Customer with this email already exists" });
      }
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create customer" });
      }
    }
  });
  app2.put("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customerData = insertCustomerSchema.parse(req.body);
      const existingCustomer = await storage.getCustomer(id);
      if (!existingCustomer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      if (customerData.email !== existingCustomer.email) {
        const emailExists = await storage.getCustomerByEmail(customerData.email);
        if (emailExists) {
          return res.status(400).json({ message: "Email already exists for another customer" });
        }
      }
      const updatedCustomer = await storage.updateCustomer(id, customerData);
      res.json(updatedCustomer);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update customer" });
      }
    }
  });
  app2.get("/api/maintenance-plans", async (req, res) => {
    try {
      const plans = await storage.getAllActiveMaintenancePlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance plans" });
    }
  });
  app2.get("/api/customers/:id/maintenance-plans", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const plans = await storage.getMaintenancePlansByCustomer(customerId);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer maintenance plans" });
    }
  });
  app2.post("/api/maintenance-plans", async (req, res) => {
    try {
      const planData = insertMaintenancePlanSchema.parse(req.body);
      const plan = await storage.createMaintenancePlan(planData);
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid maintenance plan data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create maintenance plan" });
      }
    }
  });
  app2.get("/api/reviews", async (req, res) => {
    try {
      const localReviews = await storage.getApprovedReviews();
      const homeDepotReviews = await fetchHomeDepotReviews("885948");
      const transformedHomeDepotReviews = homeDepotReviews.map((review) => ({
        id: review.id,
        customerId: 999,
        // Special customer ID for Home Depot reviews
        rating: review.rating,
        title: `${review.service} - ${review.customer}`,
        content: review.content,
        createdAt: review.date,
        approved: true,
        source: "Home Depot Pro",
        sourceLink: review.source.link,
        location: review.location,
        service: review.service
      }));
      const allReviews = [...localReviews, ...transformedHomeDepotReviews];
      res.json(allReviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      const reviews2 = await storage.getApprovedReviews();
      res.json(reviews2);
    }
  });
  app2.post("/api/reviews", async (req, res) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid review data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create review" });
      }
    }
  });
  app2.patch("/api/reviews/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.approveReview(id);
      res.json({ message: "Review approved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve review" });
    }
  });
  app2.get("/api/quotes", async (req, res) => {
    try {
      const quotes2 = await storage.getAllQuotes();
      res.json(quotes2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });
  app2.post("/api/quotes", async (req, res) => {
    try {
      const quoteData = insertQuoteSchema.parse(req.body);
      const quote = await storage.createQuote(quoteData);
      const existingCustomer = await storage.getCustomerByEmail(quote.email);
      if (!existingCustomer) {
        await storage.createCustomer({
          firstName: quote.firstName,
          lastName: quote.lastName,
          email: quote.email,
          phone: null,
          company: quote.company || null
        });
      }
      res.status(201).json(quote);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create quote" });
      }
    }
  });
  app2.post("/api/appointments", async (req, res) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      let customer = await storage.getCustomerByEmail(appointmentData.email);
      if (!customer) {
        customer = await storage.createCustomer({
          firstName: appointmentData.firstName,
          lastName: appointmentData.lastName,
          email: appointmentData.email,
          phone: appointmentData.phone || null,
          company: null
        });
      }
      const appointmentWithCustomer = {
        ...appointmentData,
        customerId: customer.id,
        email: customer.email
        // Ensure we use the customer's email
      };
      const appointment = await storage.createAppointment(appointmentWithCustomer);
      try {
        await reminderService.createRemindersForAppointment(appointment);
      } catch (reminderError) {
        console.error("Failed to create reminders for appointment:", reminderError);
      }
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      } else {
        console.error("Appointment creation error:", error);
        res.status(500).json({ message: "Failed to create appointment" });
      }
    }
  });
  app2.get("/api/appointments", async (req, res) => {
    try {
      const appointments2 = await storage.getAllAppointments();
      res.json(appointments2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });
  app2.put("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertAppointmentSchema.partial().parse(req.body);
      const updatedAppointment = await storage.updateAppointment(id, updateData);
      if (!updatedAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(updatedAppointment);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      } else {
        console.error("Appointment update error:", error);
        res.status(500).json({ message: "Failed to update appointment" });
      }
    }
  });
  app2.patch("/api/appointments/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      await storage.updateAppointmentStatus(id, status);
      if (status === "cancelled") {
        try {
          await reminderService.cleanupReminders(id);
        } catch (reminderError) {
          console.error("Failed to cleanup reminders:", reminderError);
        }
      }
      res.json({ message: "Appointment status updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update appointment status" });
    }
  });
  app2.patch("/api/quotes/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      await storage.updateQuoteStatus(id, status);
      res.json({ message: "Quote status updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update quote status" });
    }
  });
  app2.post("/api/email-campaigns", async (req, res) => {
    try {
      const campaignData = insertEmailCampaignSchema.parse(req.body);
      const campaign = await storage.createEmailCampaign(campaignData);
      await storage.updateCustomerLastEmail(campaign.customerId, /* @__PURE__ */ new Date());
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid email campaign data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create email campaign" });
      }
    }
  });
  app2.get("/api/customers/:id/email-campaigns", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const campaigns = await storage.getEmailCampaignsByCustomer(customerId);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email campaigns" });
    }
  });
  app2.post("/api/email-automation/send-batch", async (req, res) => {
    try {
      const customers2 = await storage.getAllCustomers();
      const sentEmails = [];
      for (const customer of customers2) {
        const daysSinceLastEmail = customer.lastEmailSent ? Math.floor((Date.now() - customer.lastEmailSent.getTime()) / (1e3 * 60 * 60 * 24)) : 999;
        if (daysSinceLastEmail >= 45) {
          const campaign = await storage.createEmailCampaign({
            customerId: customer.id,
            subject: "Stay Connected with HandyTech Solutions",
            content: `Hi ${customer.firstName}, we wanted to check in and see how your technology systems are performing. Our team is here to help with any IT needs you may have.`,
            campaignType: "promotional"
          });
          await storage.updateCustomerLastEmail(customer.id, /* @__PURE__ */ new Date());
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
  function generateFallbackResponse(message) {
    const greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"];
    const electrical = ["electrical", "electric", "wiring", "outlet", "switch", "panel", "breaker", "lighting", "voltage", "wire"];
    const plumbing = ["plumbing", "plumber", "pipe", "leak", "drain", "faucet", "toilet", "water", "sink", "shower", "bathtub"];
    const tech = ["smart home", "automation", "security", "tech", "installation", "setup", "thermostat", "camera", "doorbell"];
    const painting = ["paint", "painting", "wall", "color", "interior", "exterior", "primer", "brush", "roller"];
    const scheduling = ["schedule", "appointment", "book", "when", "available", "meet", "visit", "come out"];
    const pricing = ["cost", "price", "quote", "estimate", "how much", "expensive", "cheap", "budget", "bill", "pay"];
    const repairs = ["repair", "fix", "broken", "damaged", "replace", "maintenance", "service"];
    const kitchen = ["kitchen", "cabinet", "countertop", "backsplash", "appliance"];
    const bathroom = ["bathroom", "shower", "bathtub", "vanity", "mirror", "tile"];
    const flooring = ["floor", "flooring", "hardwood", "laminate", "tile", "carpet"];
    const drywall = ["drywall", "sheetrock", "hole", "crack", "texture", "mud"];
    const doors = ["door", "window", "frame", "hinge", "lock", "handle"];
    const deck = ["deck", "patio", "fence", "outdoor", "pergola"];
    if (greetings.some((word) => message.includes(word))) {
      return "Hello! Welcome to HandyTech Solutions. We're Missouri's trusted handyman service specializing in electrical work, plumbing, smart home technology, and general maintenance. How may I assist you today?";
    }
    if (drywall.some((word) => message.includes(word))) {
      return "Drywall repair is one of our most common services! We fix holes, cracks, water damage, and texture matching. From small nail holes to large repairs, we make your walls look perfect again. Need a drywall estimate? How may I assist you?";
    }
    if (kitchen.some((word) => message.includes(word))) {
      return "We love kitchen projects! We handle cabinet installation, countertop replacement, backsplash installation, appliance hookup, and complete kitchen remodeling. Our team can transform your kitchen into the heart of your home. Ready to discuss your kitchen upgrade? How may I assist you?";
    }
    if (bathroom.some((word) => message.includes(word))) {
      return "Bathroom renovations are our specialty! We do everything from simple updates like new vanities and mirrors to complete bathroom remodels including tile work, plumbing fixtures, and lighting. Let's create your perfect bathroom space! How may I assist you?";
    }
    if (flooring.some((word) => message.includes(word))) {
      return "We install all types of flooring including hardwood, laminate, tile, and luxury vinyl. Whether you need one room or your whole house, we ensure professional installation with attention to detail. What type of flooring are you considering? How may I assist you?";
    }
    if (doors.some((word) => message.includes(word))) {
      return "We handle all door and window services including installation, repair, weatherstripping, lock replacement, and frame adjustments. Whether it's sticking doors or drafty windows, we'll get them working smoothly! How may I assist you?";
    }
    if (deck.some((word) => message.includes(word))) {
      return "Outdoor projects are great! We build decks, install fencing, create pergolas, and handle various outdoor improvements. Let's enhance your outdoor living space and increase your home's value! How may I assist you?";
    }
    if (pricing.some((word) => message.includes(word))) {
      return "We provide free estimates for most projects! Pricing depends on the scope of work, materials, and complexity. We're committed to fair, transparent pricing with no hidden fees. What project would you like an estimate for? How may I assist you?";
    }
    if (repairs.some((word) => message.includes(word))) {
      return "We handle all kinds of repairs - from minor fixes to major renovations! Whether it's electrical issues, plumbing problems, drywall damage, or general maintenance, our experienced handyman can get it fixed right. What needs repair? How may I assist you?";
    }
    if (electrical.some((word) => message.includes(word))) {
      return "Great! We handle all types of electrical work including outlet installation, switch replacement, lighting upgrades, and electrical panel upgrades. I have an experienced handyman that can handle your electrical issues with safe, reliable work. Would you like to schedule a consultation to discuss your electrical needs? How may I assist you?";
    }
    if (plumbing.some((word) => message.includes(word))) {
      return "We provide comprehensive plumbing services including leak repairs, fixture installation, drain cleaning, and pipe replacement. Our experienced handyman can handle both minor repairs and major renovations. Let me help you schedule a service call! How may I assist you?";
    }
    if (tech.some((word) => message.includes(word))) {
      return "Excellent! We specialize in smart home automation, security system installation, home theater setup, and tech integration. We can help you modernize your home with the latest technology. Would you like to discuss your smart home project? How may I assist you?";
    }
    if (painting.some((word) => message.includes(word))) {
      return "We offer professional painting services for both interior and exterior projects. From single rooms to whole house painting, we use quality materials and provide detailed preparation work. Ready to transform your space with a fresh coat of paint? How may I assist you?";
    }
    if (scheduling.some((word) => message.includes(word))) {
      return "I'd be happy to help you schedule a service! We're available Mon-Fri 8AM-6PM and Sat 9AM-3PM. Our team can provide free estimates for most projects. What type of service are you looking for? How may I assist you?";
    }
    return "Thanks for contacting HandyTech Solutions! We're Missouri's expert handyman service offering electrical work, plumbing, smart home technology, painting, and general maintenance. We'd love to help with your project. What service are you interested in, or would you like to schedule a consultation? How may I assist you?";
  }
  app2.post("/api/chatbot", async (req, res) => {
    try {
      const { message } = req.body;
      let botResponse = "";
      console.log("Using fallback chatbot system for message:", message);
      botResponse = generateFallbackResponse(message.toLowerCase());
      console.log("Fallback response generated:", botResponse);
      if (!botResponse) {
        console.log("No response generated, using default");
        botResponse = "Hello! I'm here to help with HandyTech Solutions services. We offer electrical work, plumbing, smart home tech, painting, and general maintenance. How may I assist you today?";
      }
      const shouldShowScheduling = /schedule|appointment|meet|consultation|quote|call|speak|visit|come out|book|when can you|cost|price|estimate/i.test(message);
      res.json({
        response: botResponse,
        shouldShowScheduling
      });
    } catch (error) {
      console.error("Final chatbot error:", error);
      res.json({
        response: "Hello! I'm here to help with HandyTech Solutions services. We offer electrical work, plumbing, smart home tech, painting, and general maintenance. How may I assist you today? Call us at (314) 325-4575 for immediate help.",
        shouldShowScheduling: true
      });
    }
  });
  app2.post("/api/service-quote-calculator", async (req, res) => {
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
      const sizeMultiplier = multipliers[companySize] || 1;
      const complexityMultiplier = complexityMultipliers[complexity] || 1;
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
  app2.get("/api/appointments", async (req, res) => {
    try {
      const appointments2 = await storage.getAllAppointments();
      res.json(appointments2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });
  app2.post("/api/appointments", async (req, res) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(appointmentData);
      const existingCustomer = await storage.getCustomerByEmail(appointment.email);
      if (!existingCustomer) {
        await storage.createCustomer({
          firstName: appointment.firstName,
          lastName: appointment.lastName,
          email: appointment.email,
          phone: appointment.phone,
          company: null
        });
      }
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create appointment" });
      }
    }
  });
  app2.get("/api/appointments/upcoming", async (req, res) => {
    try {
      const appointments2 = await storage.getUpcomingAppointments();
      res.json(appointments2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming appointments" });
    }
  });
  app2.get("/api/gallery", async (req, res) => {
    try {
      const { category } = req.query;
      let projects;
      if (category && typeof category === "string") {
        projects = await storage.getProjectGalleryByCategory(category);
      } else {
        projects = await storage.getAllProjectGalleryItems();
      }
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch gallery items" });
    }
  });
  app2.get("/api/gallery/featured", async (req, res) => {
    try {
      const projects = await storage.getFeaturedProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured projects" });
    }
  });
  app2.post("/api/gallery", async (req, res) => {
    try {
      const projectData = insertProjectGallerySchema.parse(req.body);
      const project = await storage.createProjectGalleryItem(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid project data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create project" });
      }
    }
  });
  app2.get("/api/blocked-dates", async (req, res) => {
    try {
      const blockedDates2 = await storage.getBlockedDates();
      res.json(blockedDates2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blocked dates" });
    }
  });
  app2.post("/api/blocked-dates", async (req, res) => {
    try {
      const validatedData = insertBlockedDateSchema.parse(req.body);
      const blockedDate = await storage.createBlockedDate(validatedData);
      res.status(201).json(blockedDate);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid blocked date data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create blocked date" });
      }
    }
  });
  app2.delete("/api/blocked-dates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBlockedDate(id);
      res.json({ message: "Blocked date deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete blocked date" });
    }
  });
  app2.get("/api/services", async (req, res) => {
    try {
      const { category, active } = req.query;
      let services2;
      if (category && typeof category === "string") {
        services2 = await storage.getServicesByCategory(category);
      } else if (active === "true") {
        services2 = await storage.getActiveServices();
      } else {
        services2 = await storage.getAllServices();
      }
      res.json(services2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });
  app2.get("/api/services/:id", async (req, res) => {
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
  app2.post("/api/services", async (req, res) => {
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(validatedData);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid service data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create service" });
      }
    }
  });
  app2.put("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertServiceSchema.partial().parse(req.body);
      await storage.updateService(id, validatedData);
      res.json({ message: "Service updated successfully" });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid service data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update service" });
      }
    }
  });
  app2.delete("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteService(id);
      res.json({ message: "Service deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete service" });
    }
  });
  app2.patch("/api/services/:id/toggle", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isActive } = req.body;
      await storage.toggleServiceStatus(id, isActive);
      res.json({ message: "Service status updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update service status" });
    }
  });
  app2.get("/api/services/:serviceId/addons", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const addons = await storage.getServiceAddons(serviceId);
      res.json(addons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service addons" });
    }
  });
  app2.post("/api/services/:serviceId/addons", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const validatedData = insertServiceAddonSchema.parse({ ...req.body, serviceId });
      const addon = await storage.createServiceAddon(validatedData);
      res.status(201).json(addon);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid addon data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create service addon" });
      }
    }
  });
  app2.put("/api/service-addons/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertServiceAddonSchema.partial().parse(req.body);
      await storage.updateServiceAddon(id, validatedData);
      res.json({ message: "Service addon updated successfully" });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({ message: "Invalid addon data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update service addon" });
      }
    }
  });
  app2.delete("/api/service-addons/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteServiceAddon(id);
      res.json({ message: "Service addon deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete service addon" });
    }
  });
  app2.get("/api/placeholder/:width/:height", (req, res) => {
    const { width, height } = req.params;
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6b7280" font-family="Arial, sans-serif" font-size="16">
          ${width} \xD7 ${height}
        </text>
      </svg>
    `;
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.send(svg);
  });
  app2.get("/api/appointments/:id/reminders", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const reminders = await storage.getAppointmentReminders(appointmentId);
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointment reminders" });
    }
  });
  app2.get("/api/admin/reminders/pending", async (req, res) => {
    try {
      const pendingReminders = await storage.getPendingReminders();
      res.json(pendingReminders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending reminders" });
    }
  });
  app2.post("/api/admin/reminders/create", async (req, res) => {
    try {
      const { appointmentId } = req.body;
      if (!appointmentId) {
        return res.status(400).json({ message: "Appointment ID is required" });
      }
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      await reminderService.createRemindersForAppointment(appointment);
      res.json({ message: "Reminders created successfully" });
    } catch (error) {
      console.error("Error creating reminders:", error);
      res.status(500).json({ message: "Failed to create reminders" });
    }
  });
  app2.post("/api/admin/reminders/process", async (req, res) => {
    try {
      await reminderService.processPendingReminders();
      res.json({ message: "Processed pending reminders successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process pending reminders" });
    }
  });
  app2.post("/api/admin/reminders/appointment/:id", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      if (isNaN(appointmentId)) {
        return res.status(400).json({ error: "Invalid appointment ID" });
      }
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      if (appointment.status !== "scheduled") {
        return res.status(400).json({ error: "Can only send reminders for scheduled appointments" });
      }
      let recipientEmail = appointment.email;
      let customerName = `${appointment.firstName} ${appointment.lastName}`;
      if (appointment.customerId) {
        const customer = await storage.getCustomer(appointment.customerId);
        if (customer && customer.email) {
          recipientEmail = customer.email;
          customerName = `${customer.firstName} ${customer.lastName}`;
        }
      }
      await reminderService.sendImmediateReminder(appointment, recipientEmail, customerName);
      res.json({
        success: true,
        message: `Reminder sent to ${recipientEmail}`,
        appointment
      });
    } catch (error) {
      console.error("Error sending appointment reminder:", error);
      res.status(500).json({ error: "Failed to send reminder" });
    }
  });
  app2.post("/api/admin/reminders/send", async (req, res) => {
    try {
      const { appointmentId, reminderType } = req.body;
      const success = await reminderService.sendManualReminder(appointmentId, reminderType);
      if (success) {
        res.json({ message: "Manual reminder sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send manual reminder" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to send manual reminder" });
    }
  });
  startReminderProcessing();
  const httpServer = createServer(app2);
  return httpServer;
}
function startReminderProcessing() {
  const processReminders = async () => {
    try {
      await reminderService.processPendingReminders();
    } catch (error) {
      console.error("Background reminder processing error:", error);
    }
  };
  processReminders();
  setInterval(processReminders, 5 * 60 * 1e3);
  console.log("Appointment reminder background processing started");
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
