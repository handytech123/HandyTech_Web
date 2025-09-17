import { 
  users, customers, maintenancePlans, reviews, quotes, emailCampaigns, appointments, projectGallery, blockedTimes, availabilityRules, services, serviceAddons, portalLoginTokens,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type MaintenancePlan, type InsertMaintenancePlan,
  type Review, type InsertReview,
  type Quote, type InsertQuote,
  type EmailCampaign, type InsertEmailCampaign,
  type Appointment, type InsertAppointment,
  type ProjectGallery, type InsertProjectGallery,
  type BlockedTime, type InsertBlockedTime,
  type AvailabilityRule, type InsertAvailabilityRule,
  type Service, type InsertService,
  type ServiceAddon, type InsertServiceAddon,
  type PortalLoginToken, type InsertPortalLoginToken
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, isNull } from "drizzle-orm";
import crypto from "crypto";

// Security utility functions for token hashing
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function verifyToken(token: string, hashedToken: string): boolean {
  const tokenHash = hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hashedToken));
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Customers
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getAllCustomers(): Promise<Customer[]>;
  updateCustomer(id: number, updates: Partial<InsertCustomer>): Promise<void>;
  updateCustomerLastEmail(id: number, lastEmailSent: Date): Promise<void>;

  // Maintenance Plans
  getMaintenancePlan(id: number): Promise<MaintenancePlan | undefined>;
  getMaintenancePlansByCustomer(customerId: number): Promise<MaintenancePlan[]>;
  createMaintenancePlan(plan: InsertMaintenancePlan): Promise<MaintenancePlan>;
  updateMaintenancePlanStatus(id: number, status: string): Promise<void>;
  getAllActiveMaintenancePlans(): Promise<MaintenancePlan[]>;
  cancelMaintenancePlan(planId: number, customerId: number, cancellationType: 'immediate' | 'end_of_period', cancellationReason?: string): Promise<MaintenancePlan>;
  reactivateMaintenancePlan(planId: number, customerId: number): Promise<MaintenancePlan>;

  // Reviews
  getReview(id: number): Promise<Review | undefined>;
  getAllReviews(): Promise<Review[]>;
  getApprovedReviews(): Promise<Review[]>;
  getReviewsByCustomer(customerId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  approveReview(id: number): Promise<void>;

  // Quotes
  getQuote(id: number): Promise<Quote | undefined>;
  getAllQuotes(): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuoteStatus(id: number, status: string): Promise<void>;

  // Email Campaigns
  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  getEmailCampaignsByCustomer(customerId: number): Promise<EmailCampaign[]>;
  getAllEmailCampaigns(): Promise<EmailCampaign[]>;

  // Appointments
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentByRescheduleToken(token: string): Promise<Appointment | undefined>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByCustomer(customerId: number): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: number, status: string): Promise<void>;
  updateAppointmentTime(id: number, startTimestamptz: Date, endTimestamptz: Date, rescheduleToken?: string, rescheduleExpires?: Date): Promise<void>;
  updateAppointmentGoogleEventId(id: number, googleEventId: string | null): Promise<void>;
  getUpcomingAppointments(): Promise<Appointment[]>;
  
  // Admin Appointment Management
  adminUpdateAppointmentStatus(id: number, status: string, notes?: string): Promise<void>;
  adminRescheduleAppointment(id: number, startTimestamptz: Date, endTimestamptz: Date): Promise<void>;
  adminCancelAppointment(id: number): Promise<void>;
  adminUpdateAppointmentCustomer(id: number, customerData: Partial<InsertCustomer>): Promise<void>;
  deleteAppointment(id: number): Promise<void>;

  // Reminder tracking methods
  markReminder24hSent(id: number): Promise<void>;
  markReminder2hSent(id: number): Promise<void>;
  markFollowUpSent(id: number): Promise<void>;

  // Project Gallery
  getProjectGalleryItem(id: number): Promise<ProjectGallery | undefined>;
  getAllProjectGalleryItems(): Promise<ProjectGallery[]>;
  getProjectGalleryByCategory(category: string): Promise<ProjectGallery[]>;
  getFeaturedProjects(): Promise<ProjectGallery[]>;
  createProjectGalleryItem(item: InsertProjectGallery): Promise<ProjectGallery>;

  // Blocked Times
  getBlockedTimes(): Promise<BlockedTime[]>;
  createBlockedTime(blockedTime: InsertBlockedTime): Promise<BlockedTime>;
  deleteBlockedTime(id: number): Promise<void>;
  getBlockedTimesInRange(startDate: string, endDate: string): Promise<BlockedTime[]>;

  // Availability Rules
  getAvailabilityRules(): Promise<AvailabilityRule[]>;
  getActiveAvailabilityRules(): Promise<AvailabilityRule[]>;
  createAvailabilityRule(rule: InsertAvailabilityRule): Promise<AvailabilityRule>;
  updateAvailabilityRule(id: number, updates: Partial<InsertAvailabilityRule>): Promise<void>;
  deleteAvailabilityRule(id: number): Promise<void>;
  toggleAvailabilityRuleStatus(id: number, active: boolean): Promise<void>;

  // Services Management
  getAllServices(): Promise<Service[]>;
  getActiveServices(): Promise<Service[]>;
  getServicesByCategory(category: string): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, updates: Partial<InsertService>): Promise<void>;
  deleteService(id: number): Promise<void>;
  toggleServiceStatus(id: number, isActive: boolean): Promise<void>;

  // Service Add-ons
  getServiceAddons(serviceId: number): Promise<ServiceAddon[]>;
  createServiceAddon(addon: InsertServiceAddon): Promise<ServiceAddon>;
  updateServiceAddon(id: number, updates: Partial<InsertServiceAddon>): Promise<void>;
  deleteServiceAddon(id: number): Promise<void>;

  // Service History
  getServiceHistoryByCustomer(customerId: number, filters?: { startDate?: string; endDate?: string; serviceType?: string; limit?: number; offset?: number }): Promise<import("@shared/schema").ServiceHistoryItem[]>;
  getAllServiceHistory(filters?: { startDate?: string; endDate?: string; serviceType?: string; limit?: number; offset?: number }): Promise<import("@shared/schema").ServiceHistoryItem[]>;

  // Portal Login Tokens - Enhanced security with hashed storage
  createPortalLoginToken(rawToken: string, email: string, customerId: number, expiresAt: Date): Promise<PortalLoginToken>;
  getPortalLoginTokenByHash(rawToken: string): Promise<PortalLoginToken | undefined>;
  markPortalLoginTokenUsed(rawToken: string): Promise<void>;
  deleteExpiredPortalLoginTokens(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private customers: Map<number, Customer> = new Map();
  private maintenancePlans: Map<number, MaintenancePlan> = new Map();
  private reviews: Map<number, Review> = new Map();
  private quotes: Map<number, Quote> = new Map();
  private emailCampaigns: Map<number, EmailCampaign> = new Map();
  private appointments: Map<number, Appointment> = new Map();
  private projectGallery: Map<number, ProjectGallery> = new Map();
  private currentUserId = 1;
  private currentCustomerId = 1;
  private currentMaintenancePlanId = 1;
  private currentReviewId = 1;
  private currentQuoteId = 1;
  private currentEmailCampaignId = 1;
  private currentAppointmentId = 1;
  private currentProjectGalleryId = 1;

  constructor() {
    // Seed with sample data
    this.seedData();
  }

  private seedData() {
    // Create sample customers
    const customer1: Customer = {
      id: this.currentCustomerId++,
      firstName: "David",
      lastName: "Wilson",
      email: "david.wilson@techstart.com",
      phone: "(555) 123-4567",
      company: "TechStart Inc.",
      createdAt: new Date("2024-01-15"),
      lastEmailSent: null,
    };
    this.customers.set(customer1.id, customer1);

    const customer2: Customer = {
      id: this.currentCustomerId++,
      firstName: "Lisa",
      lastName: "Rodriguez",
      email: "lisa@creativeagency.com",
      phone: "(555) 987-6543",
      company: "Creative Agency",
      createdAt: new Date("2024-02-10"),
      lastEmailSent: null,
    };
    this.customers.set(customer2.id, customer2);

    // Create sample reviews
    const review1: Review = {
      id: this.currentReviewId++,
      customerId: customer1.id,
      rating: 5,
      title: "Outstanding IT Support",
      content: "HandyTech transformed our entire IT infrastructure. Their maintenance plan has saved us countless hours and prevented major issues.",
      isApproved: true,
      createdAt: new Date("2024-03-01"),
    };
    this.reviews.set(review1.id, review1);

    const review2: Review = {
      id: this.currentReviewId++,
      customerId: customer2.id,
      rating: 5,
      title: "Exceptional Service",
      content: "Exceptional service and support. The team is knowledgeable, responsive, and always goes above and beyond.",
      isApproved: true,
      createdAt: new Date("2024-03-15"),
    };
    this.reviews.set(review2.id, review2);

    // Create sample maintenance plans
    const plan1: MaintenancePlan = {
      id: this.currentMaintenancePlanId++,
      customerId: customer1.id,
      planType: "professional",
      price: 199,
      status: "active",
      startDate: new Date("2024-01-20"),
      nextBillingDate: new Date("2024-12-20"),
      endDate: null,
      cancelledAt: null,
      cancellationReason: null,
      cancellationType: null,
    };
    this.maintenancePlans.set(plan1.id, plan1);

    // Create sample project gallery items
    const project1: ProjectGallery = {
      id: this.currentProjectGalleryId++,
      title: "Complete Home Office Tech Setup",
      description: "Full technology overhaul including network setup, computer installation, and smart home integration for a home office.",
      category: "tech",
      imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      beforeImageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      completionDate: new Date("2024-02-15"),
      location: "Springfield",
      featured: true,
      createdAt: new Date("2024-02-15"),
    };
    this.projectGallery.set(project1.id, project1);

    const project2: ProjectGallery = {
      id: this.currentProjectGalleryId++,
      title: "Kitchen Electrical Upgrade",
      description: "Updated kitchen electrical system with new outlets, under-cabinet lighting, and smart switches.",
      category: "electrical",
      imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      beforeImageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      completionDate: new Date("2024-01-10"),
      location: "Downtown",
      featured: true,
      createdAt: new Date("2024-01-10"),
    };
    this.projectGallery.set(project2.id, project2);

    const project3: ProjectGallery = {
      id: this.currentProjectGalleryId++,
      title: "Bathroom Plumbing Repair",
      description: "Complete bathroom plumbing overhaul including new fixtures, pipes, and water-efficient installations.",
      category: "plumbing",
      imageUrl: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
      beforeImageUrl: null,
      completionDate: new Date("2024-03-05"),
      location: "Riverside",
      featured: false,
      createdAt: new Date("2024-03-05"),
    };
    this.projectGallery.set(project3.id, project3);

    // Create sample completed appointments for service history
    const completedAppointment1: Appointment = {
      id: this.currentAppointmentId++,
      customerId: customer1.id,
      firstName: customer1.firstName,
      lastName: customer1.lastName,
      email: customer1.email,
      phone: customer1.phone,
      address: "123 Main St",
      serviceType: "IT Support",
      serviceId: null,
      appointmentDate: new Date("2024-02-20"),
      appointmentTime: "10:00 AM",
      startTimestamptz: new Date("2024-02-20T10:00:00Z"),
      endTimestamptz: new Date("2024-02-20T12:30:00Z"), // 2.5 hours
      rescheduleToken: null,
      rescheduleExpires: null,
      sequence: 0,
      status: "completed",
      source: "manual",

      googleEventId: null,
      notes: "Resolved network connectivity issues and updated system security. Installed new antivirus software and configured automatic backups.",
      reminder24hSent: null,
      reminder2hSent: null,
      followUpSent: null,
      createdAt: new Date("2024-02-18"),
    };
    this.appointments.set(completedAppointment1.id, completedAppointment1);

    const completedAppointment2: Appointment = {
      id: this.currentAppointmentId++,
      customerId: customer1.id,
      firstName: customer1.firstName,
      lastName: customer1.lastName,
      email: customer1.email,
      phone: customer1.phone,
      address: "123 Main St",
      serviceType: "Network Setup",
      serviceId: null,
      appointmentDate: new Date("2024-01-25"),
      appointmentTime: "2:00 PM",
      startTimestamptz: new Date("2024-01-25T14:00:00Z"),
      endTimestamptz: new Date("2024-01-25T17:00:00Z"), // 3 hours
      rescheduleToken: null,
      rescheduleExpires: null,
      sequence: 0,
      status: "completed",
      source: "manual",

      googleEventId: null,
      notes: "Complete network infrastructure setup including router configuration, Wi-Fi optimization, and cable management.",
      reminder24hSent: null,
      reminder2hSent: null,
      followUpSent: null,
      createdAt: new Date("2024-01-23"),
    };
    this.appointments.set(completedAppointment2.id, completedAppointment2);

    const completedAppointment3: Appointment = {
      id: this.currentAppointmentId++,
      customerId: customer2.id,
      firstName: customer2.firstName,
      lastName: customer2.lastName,
      email: customer2.email,
      phone: customer2.phone,
      address: "456 Oak Ave",
      serviceType: "Smart Home Installation",
      serviceId: null,
      appointmentDate: new Date("2024-03-10"),
      appointmentTime: "9:00 AM",
      startTimestamptz: new Date("2024-03-10T09:00:00Z"),
      endTimestamptz: new Date("2024-03-10T13:00:00Z"), // 4 hours
      rescheduleToken: null,
      rescheduleExpires: null,
      sequence: 0,
      status: "completed",
      source: "manual",

      googleEventId: null,
      notes: "Installed smart thermostats, door locks, and lighting system. Set up central control hub and mobile app configuration.",
      reminder24hSent: null,
      reminder2hSent: null,
      followUpSent: null,
      createdAt: new Date("2024-03-08"),
    };
    this.appointments.set(completedAppointment3.id, completedAppointment3);

    const completedAppointment4: Appointment = {
      id: this.currentAppointmentId++,
      customerId: customer2.id,
      firstName: customer2.firstName,
      lastName: customer2.lastName,
      email: customer2.email,
      phone: customer2.phone,
      address: "456 Oak Ave",
      serviceType: "System Maintenance",
      serviceId: null,
      appointmentDate: new Date("2024-02-15"),
      appointmentTime: "11:00 AM",
      startTimestamptz: new Date("2024-02-15T11:00:00Z"),
      endTimestamptz: new Date("2024-02-15T13:30:00Z"), // 2.5 hours
      rescheduleToken: null,
      rescheduleExpires: null,
      sequence: 0,
      status: "completed",
      source: "manual",

      googleEventId: null,
      notes: "Performed regular system maintenance including software updates, disk cleanup, and security patches.",
      reminder24hSent: null,
      reminder2hSent: null,
      followUpSent: null,
      createdAt: new Date("2024-02-13"),
    };
    this.appointments.set(completedAppointment4.id, completedAppointment4);

    const completedAppointment5: Appointment = {
      id: this.currentAppointmentId++,
      customerId: customer1.id,
      firstName: customer1.firstName,
      lastName: customer1.lastName,
      email: customer1.email,
      phone: customer1.phone,
      address: "123 Main St",
      serviceType: "Data Recovery",
      serviceId: null,
      appointmentDate: new Date("2024-01-12"),
      appointmentTime: "1:00 PM",
      startTimestamptz: new Date("2024-01-12T13:00:00Z"),
      endTimestamptz: new Date("2024-01-12T15:00:00Z"), // 2 hours
      rescheduleToken: null,
      rescheduleExpires: null,
      sequence: 0,
      status: "completed",
      source: "manual",

      googleEventId: null,
      notes: "Successfully recovered data from corrupted hard drive and set up automated backup system.",
      reminder24hSent: null,
      reminder2hSent: null,
      followUpSent: null,
      createdAt: new Date("2024-01-10"),
    };
    this.appointments.set(completedAppointment5.id, completedAppointment5);
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = { ...insertUser, id: this.currentUserId++ };
    this.users.set(user.id, user);
    return user;
  }

  // Customers
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.email === email);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const customer: Customer = {
      ...insertCustomer,
      id: this.currentCustomerId++,
      phone: insertCustomer.phone || null,
      company: insertCustomer.company || null,
      createdAt: new Date(),
      lastEmailSent: null,
    };
    this.customers.set(customer.id, customer);
    return customer;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async updateCustomer(id: number, updates: Partial<InsertCustomer>): Promise<void> {
    const customer = this.customers.get(id);
    if (customer) {
      const updatedCustomer = { ...customer, ...updates };
      this.customers.set(id, updatedCustomer);
    }
  }

  async updateCustomerLastEmail(id: number, lastEmailSent: Date): Promise<void> {
    const customer = this.customers.get(id);
    if (customer) {
      customer.lastEmailSent = lastEmailSent;
      this.customers.set(id, customer);
    }
  }

  // Maintenance Plans
  async getMaintenancePlan(id: number): Promise<MaintenancePlan | undefined> {
    return this.maintenancePlans.get(id);
  }

  async getMaintenancePlansByCustomer(customerId: number): Promise<MaintenancePlan[]> {
    return Array.from(this.maintenancePlans.values()).filter(plan => plan.customerId === customerId);
  }

  async createMaintenancePlan(insertPlan: InsertMaintenancePlan): Promise<MaintenancePlan> {
    // SECURITY: Storage-level single-active-plan enforcement (failsafe)
    const existingPlans = await this.getMaintenancePlansByCustomer(insertPlan.customerId);
    const activePlans = existingPlans.filter(plan => plan.status === 'active');
    
    if (activePlans.length > 0) {
      throw new Error(`SECURITY_VIOLATION: Customer ${insertPlan.customerId} already has ${activePlans.length} active maintenance plan(s). Cannot create duplicate subscriptions.`);
    }
    
    const plan: MaintenancePlan = {
      ...insertPlan,
      id: this.currentMaintenancePlanId++,
      status: insertPlan.status || "active",
      startDate: new Date(),
      endDate: null,
      cancelledAt: null,
      cancellationReason: null,
      cancellationType: null,
    };
    this.maintenancePlans.set(plan.id, plan);
    console.log(`[STORAGE_SECURITY] Created maintenance plan ${plan.id} for customer ${insertPlan.customerId} - verified no active duplicates`);
    return plan;
  }

  async updateMaintenancePlanStatus(id: number, status: string): Promise<void> {
    const plan = this.maintenancePlans.get(id);
    if (plan) {
      plan.status = status;
      this.maintenancePlans.set(id, plan);
    }
  }

  async getAllActiveMaintenancePlans(): Promise<MaintenancePlan[]> {
    return Array.from(this.maintenancePlans.values()).filter(plan => plan.status === "active");
  }

  async cancelMaintenancePlan(planId: number, customerId: number, cancellationType: 'immediate' | 'end_of_period', cancellationReason?: string): Promise<MaintenancePlan> {
    const plan = this.maintenancePlans.get(planId);
    if (!plan) {
      throw new Error("Maintenance plan not found");
    }
    
    if (plan.customerId !== customerId) {
      throw new Error("Unauthorized access to maintenance plan");
    }
    
    if (plan.status === 'cancelled') {
      throw new Error("Plan is already cancelled");
    }
    
    const now = new Date();
    const updatedPlan = {
      ...plan,
      status: cancellationType === 'immediate' ? 'cancelled' : 'pending_cancellation',
      cancelledAt: now,
      cancellationType,
      cancellationReason: cancellationReason || null,
      endDate: cancellationType === 'immediate' ? now : plan.nextBillingDate
    };
    
    this.maintenancePlans.set(planId, updatedPlan);
    return updatedPlan;
  }

  async reactivateMaintenancePlan(planId: number, customerId: number): Promise<MaintenancePlan> {
    const plan = this.maintenancePlans.get(planId);
    if (!plan) {
      throw new Error("Maintenance plan not found");
    }
    
    if (plan.customerId !== customerId) {
      throw new Error("Unauthorized access to maintenance plan");
    }
    
    if (plan.status === 'active') {
      throw new Error("Plan is already active");
    }
    
    // Only allow reactivation if cancelled within 30 days
    if (plan.cancelledAt && plan.cancelledAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      throw new Error("Cannot reactivate plan cancelled more than 30 days ago");
    }
    
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    
    const updatedPlan = {
      ...plan,
      status: 'active',
      cancelledAt: null,
      cancellationType: null,
      cancellationReason: null,
      endDate: null,
      nextBillingDate
    };
    
    this.maintenancePlans.set(planId, updatedPlan);
    return updatedPlan;
  }

  // Reviews
  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }

  async getAllReviews(): Promise<Review[]> {
    return Array.from(this.reviews.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getApprovedReviews(): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(review => review.isApproved);
  }

  async getReviewsByCustomer(customerId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(review => review.customerId === customerId);
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const review: Review = {
      ...insertReview,
      id: this.currentReviewId++,
      isApproved: false,
      createdAt: new Date(),
    };
    this.reviews.set(review.id, review);
    return review;
  }

  async approveReview(id: number): Promise<void> {
    const review = this.reviews.get(id);
    if (review) {
      review.isApproved = true;
      this.reviews.set(id, review);
    }
  }

  // Quotes
  async getQuote(id: number): Promise<Quote | undefined> {
    return this.quotes.get(id);
  }

  async getAllQuotes(): Promise<Quote[]> {
    return Array.from(this.quotes.values());
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const quote: Quote = {
      ...insertQuote,
      id: this.currentQuoteId++,
      company: insertQuote.company || null,
      message: insertQuote.message || null,
      status: "pending",
      createdAt: new Date(),
    };
    this.quotes.set(quote.id, quote);
    return quote;
  }

  async updateQuoteStatus(id: number, status: string): Promise<void> {
    const quote = this.quotes.get(id);
    if (quote) {
      quote.status = status;
      this.quotes.set(id, quote);
    }
  }

  // Email Campaigns
  async createEmailCampaign(insertCampaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const campaign: EmailCampaign = {
      ...insertCampaign,
      id: this.currentEmailCampaignId++,
      sentAt: new Date(),
    };
    this.emailCampaigns.set(campaign.id, campaign);
    return campaign;
  }

  async getEmailCampaignsByCustomer(customerId: number): Promise<EmailCampaign[]> {
    return Array.from(this.emailCampaigns.values()).filter(campaign => campaign.customerId === customerId);
  }

  async getAllEmailCampaigns(): Promise<EmailCampaign[]> {
    return Array.from(this.emailCampaigns.values());
  }

  // Appointments
  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }

  async getAppointmentsByCustomer(customerId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(appointment => appointment.customerId === customerId);
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    // Helper function to create timezone-aware timestamp from legacy date/time
    const createTimestampFromLegacy = (date: Date, timeString: string): Date => {
      const safeDate = new Date(date);
      
      // Parse time string like "9:00 AM" or "2:00 PM"
      const [time, period] = timeString.split(' ');
      const [hoursStr, minutesStr] = time.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      // Set the time safely using setHours/setMinutes
      safeDate.setHours(hours, minutes, 0, 0);
      return safeDate;
    };

    // Auto-populate timezone-aware fields if not provided but legacy fields exist
    let startTimestamp = insertAppointment.startTimestamptz;
    let endTimestamp = insertAppointment.endTimestamptz;

    if (!startTimestamp && insertAppointment.appointmentDate && insertAppointment.appointmentTime) {
      startTimestamp = createTimestampFromLegacy(insertAppointment.appointmentDate, insertAppointment.appointmentTime);
      
      // If no end timestamp provided, estimate based on service type (default 2 hours)
      if (!endTimestamp) {
        endTimestamp = new Date(startTimestamp.getTime() + (2 * 60 * 60 * 1000)); // Add 2 hours
      }
    }

    const appointment: Appointment = {
      ...insertAppointment,
      id: this.currentAppointmentId++,
      customerId: insertAppointment.customerId || null,
      phone: insertAppointment.phone || null,
      address: insertAppointment.address || null,
      notes: insertAppointment.notes || null,
      serviceId: insertAppointment.serviceId || null,
      startTimestamptz: startTimestamp || null,
      endTimestamptz: endTimestamp || null,
      rescheduleToken: insertAppointment.rescheduleToken || null,
      rescheduleExpires: insertAppointment.rescheduleExpires || null,
      sequence: insertAppointment.sequence || 0,
      source: insertAppointment.source || "manual",
      status: "scheduled",
      googleEventId: insertAppointment.googleEventId || null,
      reminder24hSent: null,
      reminder2hSent: null,
      followUpSent: null,
      createdAt: new Date(),
    };
    this.appointments.set(appointment.id, appointment);
    return appointment;
  }

  async updateAppointmentStatus(id: number, status: string): Promise<void> {
    const appointment = this.appointments.get(id);
    if (appointment) {
      appointment.status = status;
      this.appointments.set(id, appointment);
    }
  }

  async markReminder24hSent(id: number): Promise<void> {
    const appointment = this.appointments.get(id);
    if (appointment) {
      (appointment as any).reminder24hSent = new Date();
      this.appointments.set(id, appointment);
    }
  }

  async markReminder2hSent(id: number): Promise<void> {
    const appointment = this.appointments.get(id);
    if (appointment) {
      (appointment as any).reminder2hSent = new Date();
      this.appointments.set(id, appointment);
    }
  }

  async markFollowUpSent(id: number): Promise<void> {
    const appointment = this.appointments.get(id);
    if (appointment) {
      (appointment as any).followUpSent = new Date();
      this.appointments.set(id, appointment);
    }
  }

  async getAppointmentByRescheduleToken(token: string): Promise<Appointment | undefined> {
    return Array.from(this.appointments.values()).find(appointment => 
      appointment.rescheduleToken === token
    );
  }

  async updateAppointmentTime(
    id: number, 
    startTimestamptz: Date, 
    endTimestamptz: Date, 
    rescheduleToken?: string, 
    rescheduleExpires?: Date
  ): Promise<void> {
    const appointment = this.appointments.get(id);
    if (appointment) {
      appointment.startTimestamptz = startTimestamptz;
      appointment.endTimestamptz = endTimestamptz;
      appointment.sequence = (appointment.sequence || 0) + 1;
      
      if (rescheduleToken !== undefined) {
        appointment.rescheduleToken = rescheduleToken;
      }
      if (rescheduleExpires !== undefined) {
        appointment.rescheduleExpires = rescheduleExpires;
      }
      
      this.appointments.set(id, appointment);
    }
  }

  async updateAppointmentGoogleEventId(id: number, googleEventId: string | null): Promise<void> {
    const appointment = this.appointments.get(id);
    if (appointment) {
      appointment.googleEventId = googleEventId;
      this.appointments.set(id, appointment);
    }
  }

  async getUpcomingAppointments(): Promise<Appointment[]> {
    const now = new Date();
    return Array.from(this.appointments.values()).filter(appointment => 
      appointment.appointmentDate > now && appointment.status === "scheduled"
    );
  }

  // Admin Appointment Management Methods
  async adminUpdateAppointmentStatus(id: number, status: string, notes?: string): Promise<void> {
    const appointment = this.appointments.get(id);
    if (appointment) {
      appointment.status = status;
      if (notes) {
        appointment.notes = appointment.notes ? `${appointment.notes}\n\nAdmin Update: ${notes}` : `Admin Update: ${notes}`;
      }
      this.appointments.set(id, appointment);
    }
  }

  async adminRescheduleAppointment(id: number, startTimestamptz: Date, endTimestamptz: Date): Promise<void> {
    const appointment = this.appointments.get(id);
    if (appointment) {
      appointment.startTimestamptz = startTimestamptz;
      appointment.endTimestamptz = endTimestamptz;
      appointment.sequence = (appointment.sequence || 0) + 1;
      
      // Update legacy fields for compatibility
      appointment.appointmentDate = startTimestamptz;
      
      // Format time in 12-hour format for appointmentTime
      const hours = startTimestamptz.getHours();
      const minutes = startTimestamptz.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      appointment.appointmentTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      
      // Generate new reschedule token for customer self-service
      const crypto = require('crypto');
      appointment.rescheduleToken = crypto.randomBytes(24).toString('hex');
      appointment.rescheduleExpires = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days
      
      this.appointments.set(id, appointment);
    }
  }

  async adminCancelAppointment(id: number): Promise<void> {
    const appointment = this.appointments.get(id);
    if (appointment) {
      appointment.status = "cancelled";
      this.appointments.set(id, appointment);
    }
  }

  async adminUpdateAppointmentCustomer(id: number, customerData: Partial<InsertCustomer>): Promise<void> {
    const appointment = this.appointments.get(id);
    if (appointment) {
      // Update appointment fields
      if (customerData.firstName) appointment.firstName = customerData.firstName;
      if (customerData.lastName) appointment.lastName = customerData.lastName;
      if (customerData.email) appointment.email = customerData.email;
      if (customerData.phone) appointment.phone = customerData.phone;
      
      // Also update the customer record if one exists
      if (appointment.customerId) {
        const customer = this.customers.get(appointment.customerId);
        if (customer) {
          if (customerData.firstName) customer.firstName = customerData.firstName;
          if (customerData.lastName) customer.lastName = customerData.lastName;
          if (customerData.email) customer.email = customerData.email;
          if (customerData.phone) customer.phone = customerData.phone;
          if (customerData.company) customer.company = customerData.company;
          this.customers.set(customer.id, customer);
        }
      }
      
      this.appointments.set(id, appointment);
    }
  }

  async deleteAppointment(id: number): Promise<void> {
    this.appointments.delete(id);
  }

  // Project Gallery
  async getProjectGalleryItem(id: number): Promise<ProjectGallery | undefined> {
    return this.projectGallery.get(id);
  }

  async getAllProjectGalleryItems(): Promise<ProjectGallery[]> {
    return Array.from(this.projectGallery.values());
  }

  async getProjectGalleryByCategory(category: string): Promise<ProjectGallery[]> {
    return Array.from(this.projectGallery.values()).filter(item => item.category === category);
  }

  async getFeaturedProjects(): Promise<ProjectGallery[]> {
    return Array.from(this.projectGallery.values()).filter(item => item.featured);
  }

  async createProjectGalleryItem(insertItem: InsertProjectGallery): Promise<ProjectGallery> {
    const item: ProjectGallery = {
      ...insertItem,
      id: this.currentProjectGalleryId++,
      beforeImageUrl: insertItem.beforeImageUrl || null,
      location: insertItem.location || null,
      featured: insertItem.featured || false,
      createdAt: new Date(),
    };
    this.projectGallery.set(item.id, item);
    return item;
  }

  // Blocked Times (MemStorage placeholder - not used since we use DatabaseStorage)
  async getBlockedTimes(): Promise<BlockedTime[]> {
    return [];
  }

  async createBlockedTime(blockedTime: InsertBlockedTime): Promise<BlockedTime> {
    throw new Error("MemStorage not implemented for blocked times");
  }

  async deleteBlockedTime(id: number): Promise<void> {
    throw new Error("MemStorage not implemented for blocked times");
  }

  async getBlockedTimesInRange(startDate: string, endDate: string): Promise<BlockedTime[]> {
    return [];
  }

  // Availability Rules (MemStorage placeholder - not used since we use DatabaseStorage)
  async getAvailabilityRules(): Promise<AvailabilityRule[]> {
    return [];
  }

  async getActiveAvailabilityRules(): Promise<AvailabilityRule[]> {
    return [];
  }

  async createAvailabilityRule(rule: InsertAvailabilityRule): Promise<AvailabilityRule> {
    throw new Error("MemStorage not implemented for availability rules");
  }

  async updateAvailabilityRule(id: number, updates: Partial<InsertAvailabilityRule>): Promise<void> {
    throw new Error("MemStorage not implemented for availability rules");
  }

  async deleteAvailabilityRule(id: number): Promise<void> {
    throw new Error("MemStorage not implemented for availability rules");
  }

  async toggleAvailabilityRuleStatus(id: number, active: boolean): Promise<void> {
    throw new Error("MemStorage not implemented for availability rules");
  }

  // Services Management (MemStorage placeholder - not used since we use DatabaseStorage)
  async getAllServices(): Promise<Service[]> {
    return [];
  }

  async getActiveServices(): Promise<Service[]> {
    return [];
  }

  async getServicesByCategory(category: string): Promise<Service[]> {
    return [];
  }

  async getService(id: number): Promise<Service | undefined> {
    throw new Error("MemStorage not implemented for services");
  }

  async createService(service: InsertService): Promise<Service> {
    throw new Error("MemStorage not implemented for services");
  }

  async updateService(id: number, updates: Partial<InsertService>): Promise<void> {
    throw new Error("MemStorage not implemented for services");
  }

  async deleteService(id: number): Promise<void> {
    throw new Error("MemStorage not implemented for services");
  }

  async toggleServiceStatus(id: number, isActive: boolean): Promise<void> {
    throw new Error("MemStorage not implemented for services");
  }

  async getServiceAddons(serviceId: number): Promise<ServiceAddon[]> {
    return [];
  }

  async createServiceAddon(addon: InsertServiceAddon): Promise<ServiceAddon> {
    throw new Error("MemStorage not implemented for service addons");
  }

  async updateServiceAddon(id: number, updates: Partial<InsertServiceAddon>): Promise<void> {
    throw new Error("MemStorage not implemented for service addons");
  }

  async deleteServiceAddon(id: number): Promise<void> {
    throw new Error("MemStorage not implemented for service addons");
  }

  // Portal Login Tokens - Not implemented for MemStorage (use DatabaseStorage in production)
  async createPortalLoginToken(rawToken: string, email: string, customerId: number, expiresAt: Date): Promise<PortalLoginToken> {
    throw new Error("MemStorage not implemented for portal login tokens");
  }

  async getPortalLoginTokenByHash(rawToken: string): Promise<PortalLoginToken | undefined> {
    throw new Error("MemStorage not implemented for portal login tokens");
  }

  async markPortalLoginTokenUsed(rawToken: string): Promise<void> {
    throw new Error("MemStorage not implemented for portal login tokens");
  }

  async deleteExpiredPortalLoginTokens(): Promise<void> {
    throw new Error("MemStorage not implemented for portal login tokens");
  }

  // Service History Implementation
  async getServiceHistoryByCustomer(customerId: number, filters?: { startDate?: string; endDate?: string; serviceType?: string; limit?: number; offset?: number }): Promise<import("@shared/schema").ServiceHistoryItem[]> {
    const appointments = Array.from(this.appointments.values()).filter(apt => 
      apt.customerId === customerId && apt.status === 'completed'
    );
    
    return this.processServiceHistory(appointments, filters);
  }

  async getAllServiceHistory(filters?: { startDate?: string; endDate?: string; serviceType?: string; limit?: number; offset?: number }): Promise<import("@shared/schema").ServiceHistoryItem[]> {
    const appointments = Array.from(this.appointments.values()).filter(apt => 
      apt.status === 'completed'
    );
    
    return this.processServiceHistory(appointments, filters);
  }

  private processServiceHistory(appointments: Appointment[], filters?: { startDate?: string; endDate?: string; serviceType?: string; limit?: number; offset?: number }): import("@shared/schema").ServiceHistoryItem[] {
    let filteredAppointments = appointments;

    // SECURITY: Apply filters with proper validation
    if (filters?.startDate && filters.startDate.trim()) {
      try {
        const startDate = new Date(filters.startDate);
        // Validate date is not NaN
        if (!isNaN(startDate.getTime())) {
          filteredAppointments = filteredAppointments.filter(apt => apt.appointmentDate >= startDate);
        }
      } catch (error) {
        console.warn('[STORAGE] Invalid startDate filter:', filters.startDate);
      }
    }
    
    if (filters?.endDate && filters.endDate.trim()) {
      try {
        const endDate = new Date(filters.endDate);
        // Validate date is not NaN
        if (!isNaN(endDate.getTime())) {
          filteredAppointments = filteredAppointments.filter(apt => apt.appointmentDate <= endDate);
        }
      } catch (error) {
        console.warn('[STORAGE] Invalid endDate filter:', filters.endDate);
      }
    }
    
    if (filters?.serviceType && filters.serviceType.trim()) {
      const serviceTypeFilter = filters.serviceType.trim().toLowerCase();
      filteredAppointments = filteredAppointments.filter(apt => 
        apt.serviceType && apt.serviceType.toLowerCase().includes(serviceTypeFilter)
      );
    }

    // Sort by date (most recent first)
    filteredAppointments.sort((a, b) => b.appointmentDate.getTime() - a.appointmentDate.getTime());

    // Map to service history items with robust cost calculations
    const serviceHistoryItems = filteredAppointments.map(apt => {
      // SECURITY: Safely handle customer lookup
      const customer = apt.customerId ? this.customers.get(apt.customerId) : undefined;
      
      // Calculate duration in hours with validation
      let duration: number | null = null;
      if (apt.startTimestamptz && apt.endTimestamptz && 
          apt.startTimestamptz instanceof Date && apt.endTimestamptz instanceof Date) {
        const durationMs = apt.endTimestamptz.getTime() - apt.startTimestamptz.getTime();
        if (durationMs > 0) {
          duration = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
        }
      }

      // Get service pricing with error handling
      const servicePricing = this.getServicePricing(apt.serviceType || '');
      
      // Robust cost calculation with validation
      let calculatedCost: number | null = null;
      try {
        if (servicePricing.basePrice && servicePricing.basePrice > 0) {
          if (servicePricing.priceUnit === 'per hour' && duration && duration > 0) {
            calculatedCost = Math.round(duration * servicePricing.basePrice * 100) / 100;
          } else if (servicePricing.priceUnit === 'flat rate') {
            calculatedCost = servicePricing.basePrice;
          }
        }
      } catch (error) {
        console.warn('[STORAGE] Cost calculation error for appointment:', apt.id, error);
      }

      const historyItem: import("@shared/schema").ServiceHistoryItem = {
        id: apt.id,
        appointmentDate: apt.appointmentDate,
        serviceDate: apt.appointmentDate.toISOString().split('T')[0], // Convert Date to string (YYYY-MM-DD)
        serviceType: apt.serviceType,
        status: apt.status,
        startTimestamptz: apt.startTimestamptz,
        endTimestamptz: apt.endTimestamptz,
        duration,
        notes: apt.notes,
        cost: calculatedCost || 0, // Ensure cost is always a number
        createdAt: apt.createdAt,
        serviceName: servicePricing.serviceName,
        serviceDescription: servicePricing.serviceDescription,
        basePrice: servicePricing.basePrice,
        priceUnit: servicePricing.priceUnit,
        calculatedCost,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : undefined,
        customerEmail: customer?.email,
      };

      return historyItem;
    });

    // Apply pagination with proper validation
    const offset = Math.max(0, filters?.offset || 0);
    const limit = Math.min(100, Math.max(1, filters?.limit || 50)); // Enforce max 100, min 1
    
    return serviceHistoryItems.slice(offset, offset + limit);
  }

  private getServicePricing(serviceType: string): {
    serviceName: string | null;
    serviceDescription: string | null;
    basePrice: number | null;
    priceUnit: string | null;
  } {
    // Mock service pricing - in real implementation this would query the services table
    const servicePricingMap: Record<string, any> = {
      'IT Support': {
        serviceName: 'IT Support & Troubleshooting',
        serviceDescription: 'Computer troubleshooting and technical support services',
        basePrice: 85,
        priceUnit: 'per hour'
      },
      'Network Setup': {
        serviceName: 'Network Installation & Configuration',
        serviceDescription: 'Professional network setup and configuration',
        basePrice: 120,
        priceUnit: 'per hour'
      },
      'Smart Home Installation': {
        serviceName: 'Smart Home Device Installation',
        serviceDescription: 'Installation and configuration of smart home devices',
        basePrice: 95,
        priceUnit: 'per hour'
      },
      'System Maintenance': {
        serviceName: 'System Maintenance & Updates',
        serviceDescription: 'Regular system maintenance and software updates',
        basePrice: 75,
        priceUnit: 'per hour'
      },
      'Security System Setup': {
        serviceName: 'Security System Installation',
        serviceDescription: 'Installation and configuration of security systems',
        basePrice: 110,
        priceUnit: 'per hour'
      },
      'Data Recovery': {
        serviceName: 'Data Recovery Service',
        serviceDescription: 'Professional data recovery and backup services',
        basePrice: 150,
        priceUnit: 'per hour'
      }
    };

    // Try to match service type
    const exactMatch = servicePricingMap[serviceType];
    if (exactMatch) return exactMatch;

    // Try partial matching
    for (const [key, value] of Object.entries(servicePricingMap)) {
      if (serviceType.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(serviceType.toLowerCase())) {
        return value;
      }
    }

    // Default pricing for unknown services
    return {
      serviceName: serviceType,
      serviceDescription: `Professional ${serviceType} service`,
      basePrice: 85,
      priceUnit: 'per hour'
    };
  }
}

// Reusable appointment column selection to avoid calendly_event_id errors
const appointmentColumns = {
  id: appointments.id,
  customerId: appointments.customerId,
  firstName: appointments.firstName,
  lastName: appointments.lastName,
  email: appointments.email,
  phone: appointments.phone,
  serviceType: appointments.serviceType,
  serviceId: appointments.serviceId,
  appointmentDate: appointments.appointmentDate,
  appointmentTime: appointments.appointmentTime,
  address: appointments.address,
  startTimestamptz: appointments.startTimestamptz,
  endTimestamptz: appointments.endTimestamptz,
  rescheduleToken: appointments.rescheduleToken,
  rescheduleExpires: appointments.rescheduleExpires,
  sequence: appointments.sequence,
  status: appointments.status,
  source: appointments.source,
  notes: appointments.notes,
  googleEventId: appointments.googleEventId,
  reminder24hSent: appointments.reminder24hSent,
  reminder2hSent: appointments.reminder2hSent,
  followUpSent: appointments.followUpSent,
  createdAt: appointments.createdAt,
};

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  // Customers
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async updateCustomer(id: number, updates: Partial<InsertCustomer>): Promise<void> {
    await db.update(customers).set(updates).where(eq(customers.id, id));
  }

  async updateCustomerLastEmail(id: number, lastEmailSent: Date): Promise<void> {
    await db.update(customers).set({ lastEmailSent }).where(eq(customers.id, id));
  }

  // Maintenance Plans
  async getMaintenancePlan(id: number): Promise<MaintenancePlan | undefined> {
    const [plan] = await db.select().from(maintenancePlans).where(eq(maintenancePlans.id, id));
    return plan;
  }

  async getMaintenancePlansByCustomer(customerId: number): Promise<MaintenancePlan[]> {
    return await db.select().from(maintenancePlans).where(eq(maintenancePlans.customerId, customerId));
  }

  async createMaintenancePlan(plan: InsertMaintenancePlan): Promise<MaintenancePlan> {
    // SECURITY: Storage-level single-active-plan enforcement (failsafe)
    const existingPlans = await this.getMaintenancePlansByCustomer(plan.customerId);
    const activePlans = existingPlans.filter(p => p.status === 'active');
    
    if (activePlans.length > 0) {
      throw new Error(`SECURITY_VIOLATION: Customer ${plan.customerId} already has ${activePlans.length} active maintenance plan(s). Cannot create duplicate subscriptions.`);
    }
    
    const [created] = await db.insert(maintenancePlans).values(plan).returning();
    console.log(`[STORAGE_SECURITY] Created maintenance plan ${created.id} for customer ${plan.customerId} - verified no active duplicates`);
    return created;
  }

  async updateMaintenancePlanStatus(id: number, status: string): Promise<void> {
    await db.update(maintenancePlans).set({ status }).where(eq(maintenancePlans.id, id));
  }

  async getAllActiveMaintenancePlans(): Promise<MaintenancePlan[]> {
    return await db.select().from(maintenancePlans).where(eq(maintenancePlans.status, "active"));
  }

  async cancelMaintenancePlan(planId: number, customerId: number, cancellationType: 'immediate' | 'end_of_period', cancellationReason?: string): Promise<MaintenancePlan> {
    const plan = await this.getMaintenancePlan(planId);
    if (!plan) {
      throw new Error("Maintenance plan not found");
    }
    
    if (plan.customerId !== customerId) {
      throw new Error("Unauthorized access to maintenance plan");
    }
    
    if (plan.status === 'cancelled') {
      throw new Error("Plan is already cancelled");
    }
    
    const now = new Date();
    const updateData = {
      status: cancellationType === 'immediate' ? 'cancelled' : 'pending_cancellation',
      cancelledAt: now,
      cancellationType,
      cancellationReason: cancellationReason || null,
      endDate: cancellationType === 'immediate' ? now : plan.nextBillingDate
    };
    
    await db.update(maintenancePlans).set(updateData).where(eq(maintenancePlans.id, planId));
    
    const [updatedPlan] = await db.select().from(maintenancePlans).where(eq(maintenancePlans.id, planId));
    return updatedPlan;
  }

  async reactivateMaintenancePlan(planId: number, customerId: number): Promise<MaintenancePlan> {
    const plan = await this.getMaintenancePlan(planId);
    if (!plan) {
      throw new Error("Maintenance plan not found");
    }
    
    if (plan.customerId !== customerId) {
      throw new Error("Unauthorized access to maintenance plan");
    }
    
    if (plan.status === 'active') {
      throw new Error("Plan is already active");
    }
    
    // Only allow reactivation if cancelled within 30 days
    if (plan.cancelledAt && plan.cancelledAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      throw new Error("Cannot reactivate plan cancelled more than 30 days ago");
    }
    
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    
    const updateData = {
      status: 'active',
      cancelledAt: null,
      cancellationType: null,
      cancellationReason: null,
      endDate: null,
      nextBillingDate
    };
    
    await db.update(maintenancePlans).set(updateData).where(eq(maintenancePlans.id, planId));
    
    const [updatedPlan] = await db.select().from(maintenancePlans).where(eq(maintenancePlans.id, planId));
    return updatedPlan;
  }

  // Reviews
  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }

  async getAllReviews(): Promise<Review[]> {
    return await db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }

  async getApprovedReviews(): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.isApproved, true)).orderBy(desc(reviews.createdAt));
  }

  async getReviewsByCustomer(customerId: number): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.customerId, customerId));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(review).returning();
    return created;
  }

  async approveReview(id: number): Promise<void> {
    await db.update(reviews).set({ isApproved: true }).where(eq(reviews.id, id));
  }

  // Quotes
  async getQuote(id: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async getAllQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [created] = await db.insert(quotes).values(quote).returning();
    return created;
  }

  async updateQuoteStatus(id: number, status: string): Promise<void> {
    await db.update(quotes).set({ status }).where(eq(quotes.id, id));
  }

  // Email Campaigns
  async createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const [created] = await db.insert(emailCampaigns).values(campaign).returning();
    return created;
  }

  async getEmailCampaignsByCustomer(customerId: number): Promise<EmailCampaign[]> {
    return await db.select().from(emailCampaigns).where(eq(emailCampaigns.customerId, customerId));
  }

  async getAllEmailCampaigns(): Promise<EmailCampaign[]> {
    return await db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.sentAt));
  }

  // Appointments
  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select(appointmentColumns).from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await db.select(appointmentColumns).from(appointments).orderBy(desc(appointments.createdAt));
  }

  async getAppointmentsByCustomer(customerId: number): Promise<Appointment[]> {
    return await db.select(appointmentColumns).from(appointments).where(eq(appointments.customerId, customerId));
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    // Helper function to create timezone-aware timestamp from legacy date/time
    const createTimestampFromLegacy = (date: Date, timeString: string): Date => {
      const safeDate = new Date(date);
      
      // Parse time string like "9:00 AM" or "2:00 PM"
      const [time, period] = timeString.split(' ');
      const [hoursStr, minutesStr] = time.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      // Set the time safely using setHours/setMinutes
      safeDate.setHours(hours, minutes, 0, 0);
      return safeDate;
    };

    // Auto-populate timezone-aware fields if not provided but legacy fields exist
    let appointmentData = { ...insertAppointment };

    if (!appointmentData.startTimestamptz && appointmentData.appointmentDate && appointmentData.appointmentTime) {
      appointmentData.startTimestamptz = createTimestampFromLegacy(appointmentData.appointmentDate, appointmentData.appointmentTime);
      
      // If no end timestamp provided, estimate based on service type (default 2 hours)
      if (!appointmentData.endTimestamptz) {
        appointmentData.endTimestamptz = new Date(appointmentData.startTimestamptz.getTime() + (2 * 60 * 60 * 1000)); // Add 2 hours
      }
    }

    const [created] = await db.insert(appointments).values(appointmentData).returning();
    return created;
  }

  async updateAppointmentStatus(id: number, status: string): Promise<void> {
    await db.update(appointments).set({ status }).where(eq(appointments.id, id));
  }

  async markReminder24hSent(id: number): Promise<void> {
    await db.update(appointments).set({ reminder24hSent: new Date() }).where(eq(appointments.id, id));
  }

  async markReminder2hSent(id: number): Promise<void> {
    await db.update(appointments).set({ reminder2hSent: new Date() }).where(eq(appointments.id, id));
  }

  async markFollowUpSent(id: number): Promise<void> {
    await db.update(appointments).set({ followUpSent: new Date() }).where(eq(appointments.id, id));
  }

  async getUpcomingAppointments(): Promise<Appointment[]> {
    const now = new Date();
    return await db.select(appointmentColumns).from(appointments)
      .where(and(gte(appointments.appointmentDate, now), eq(appointments.status, "scheduled")))
      .orderBy(appointments.appointmentDate);
  }

  async getAppointmentByRescheduleToken(token: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select(appointmentColumns).from(appointments).where(eq(appointments.rescheduleToken, token));
    return appointment;
  }

  async updateAppointmentTime(
    id: number, 
    startTimestamptz: Date, 
    endTimestamptz: Date, 
    rescheduleToken?: string, 
    rescheduleExpires?: Date
  ): Promise<void> {
    const updateData: any = {
      startTimestamptz,
      endTimestamptz,
    };

    // Get current appointment to increment sequence
    const [currentAppointment] = await db.select(appointmentColumns).from(appointments).where(eq(appointments.id, id));
    if (currentAppointment) {
      updateData.sequence = (currentAppointment.sequence || 0) + 1;
    }
    
    if (rescheduleToken !== undefined) {
      updateData.rescheduleToken = rescheduleToken;
    }
    if (rescheduleExpires !== undefined) {
      updateData.rescheduleExpires = rescheduleExpires;
    }
    
    await db.update(appointments).set(updateData).where(eq(appointments.id, id));
  }

  async updateAppointmentGoogleEventId(id: number, googleEventId: string | null): Promise<void> {
    await db.update(appointments).set({ googleEventId }).where(eq(appointments.id, id));
  }

  // Admin Appointment Management Methods
  async adminUpdateAppointmentStatus(id: number, status: string, notes?: string): Promise<void> {
    const updateData: any = { status };
    
    if (notes) {
      // Get current appointment to append admin notes
      const [currentAppointment] = await db.select(appointmentColumns).from(appointments).where(eq(appointments.id, id));
      if (currentAppointment) {
        const existingNotes = currentAppointment.notes || "";
        updateData.notes = existingNotes ? `${existingNotes}\n\nAdmin Update: ${notes}` : `Admin Update: ${notes}`;
      }
    }
    
    await db.update(appointments).set(updateData).where(eq(appointments.id, id));
  }

  async adminRescheduleAppointment(id: number, startTimestamptz: Date, endTimestamptz: Date): Promise<void> {
    // Get current appointment to increment sequence
    const [currentAppointment] = await db.select(appointmentColumns).from(appointments).where(eq(appointments.id, id));
    
    // Format time in 12-hour format for appointmentTime
    const hours = startTimestamptz.getHours();
    const minutes = startTimestamptz.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const appointmentTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    
    // Generate new reschedule token for customer self-service
    const { randomBytes } = await import('crypto');
    const rescheduleToken = randomBytes(24).toString('hex');
    const rescheduleExpires = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days
    
    const updateData = {
      startTimestamptz,
      endTimestamptz,
      appointmentDate: startTimestamptz, // Update legacy field for compatibility
      appointmentTime,
      rescheduleToken,
      rescheduleExpires,
      sequence: (currentAppointment?.sequence || 0) + 1
    };
    
    await db.update(appointments).set(updateData).where(eq(appointments.id, id));
  }

  async adminCancelAppointment(id: number): Promise<void> {
    await db.update(appointments).set({ status: "cancelled" }).where(eq(appointments.id, id));
  }

  async adminUpdateAppointmentCustomer(id: number, customerData: Partial<InsertCustomer>): Promise<void> {
    // First update the appointment fields
    const appointmentUpdates: any = {};
    if (customerData.firstName) appointmentUpdates.firstName = customerData.firstName;
    if (customerData.lastName) appointmentUpdates.lastName = customerData.lastName;
    if (customerData.email) appointmentUpdates.email = customerData.email;
    if (customerData.phone) appointmentUpdates.phone = customerData.phone;
    
    if (Object.keys(appointmentUpdates).length > 0) {
      await db.update(appointments).set(appointmentUpdates).where(eq(appointments.id, id));
    }
    
    // Also update the customer record if one exists
    const [appointment] = await db.select(appointmentColumns).from(appointments).where(eq(appointments.id, id));
    if (appointment?.customerId) {
      const customerUpdates: any = {};
      if (customerData.firstName) customerUpdates.firstName = customerData.firstName;
      if (customerData.lastName) customerUpdates.lastName = customerData.lastName;
      if (customerData.email) customerUpdates.email = customerData.email;
      if (customerData.phone) customerUpdates.phone = customerData.phone;
      if (customerData.company) customerUpdates.company = customerData.company;
      
      if (Object.keys(customerUpdates).length > 0) {
        await db.update(customers).set(customerUpdates).where(eq(customers.id, appointment.customerId));
      }
    }
  }

  async deleteAppointment(id: number): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  // Project Gallery
  async getProjectGalleryItem(id: number): Promise<ProjectGallery | undefined> {
    const [item] = await db.select().from(projectGallery).where(eq(projectGallery.id, id));
    return item;
  }

  async getAllProjectGalleryItems(): Promise<ProjectGallery[]> {
    return await db.select().from(projectGallery).orderBy(desc(projectGallery.createdAt));
  }

  async getProjectGalleryByCategory(category: string): Promise<ProjectGallery[]> {
    return await db.select().from(projectGallery).where(eq(projectGallery.category, category));
  }

  async getFeaturedProjects(): Promise<ProjectGallery[]> {
    return await db.select().from(projectGallery).where(eq(projectGallery.featured, true));
  }

  async createProjectGalleryItem(item: InsertProjectGallery): Promise<ProjectGallery> {
    const [created] = await db.insert(projectGallery).values(item).returning();
    return created;
  }

  // Blocked Times
  async getBlockedTimes(): Promise<BlockedTime[]> {
    return await db.select().from(blockedTimes).orderBy(blockedTimes.startTimestamptz);
  }

  async createBlockedTime(blockedTime: InsertBlockedTime): Promise<BlockedTime> {
    const [created] = await db.insert(blockedTimes).values(blockedTime).returning();
    return created;
  }

  async deleteBlockedTime(id: number): Promise<void> {
    await db.delete(blockedTimes).where(eq(blockedTimes.id, id));
  }

  async getBlockedTimesInRange(startDate: string, endDate: string): Promise<BlockedTime[]> {
    return await db.select().from(blockedTimes)
      .where(and(
        gte(blockedTimes.startTimestamptz, new Date(startDate)),
        lte(blockedTimes.endTimestamptz, new Date(endDate))
      ))
      .orderBy(blockedTimes.startTimestamptz);
  }

  // Availability Rules
  async getAvailabilityRules(): Promise<AvailabilityRule[]> {
    return await db.select().from(availabilityRules).orderBy(availabilityRules.weekday, availabilityRules.startTime);
  }

  async getActiveAvailabilityRules(): Promise<AvailabilityRule[]> {
    return await db.select().from(availabilityRules)
      .where(eq(availabilityRules.active, true))
      .orderBy(availabilityRules.weekday, availabilityRules.startTime);
  }

  async createAvailabilityRule(rule: InsertAvailabilityRule): Promise<AvailabilityRule> {
    const [created] = await db.insert(availabilityRules).values(rule).returning();
    return created;
  }

  async updateAvailabilityRule(id: number, updates: Partial<InsertAvailabilityRule>): Promise<void> {
    await db.update(availabilityRules).set(updates).where(eq(availabilityRules.id, id));
  }

  async deleteAvailabilityRule(id: number): Promise<void> {
    await db.delete(availabilityRules).where(eq(availabilityRules.id, id));
  }

  async toggleAvailabilityRuleStatus(id: number, active: boolean): Promise<void> {
    await db.update(availabilityRules)
      .set({ active })
      .where(eq(availabilityRules.id, id));
  }

  // Services Management
  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services).orderBy(services.displayOrder, services.name);
  }

  async getActiveServices(): Promise<Service[]> {
    return await db.select().from(services)
      .where(eq(services.isActive, true))
      .orderBy(services.displayOrder, services.name);
  }

  async getServicesByCategory(category: string): Promise<Service[]> {
    return await db.select().from(services)
      .where(and(eq(services.category, category), eq(services.isActive, true)))
      .orderBy(services.displayOrder, services.name);
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [created] = await db.insert(services).values(service).returning();
    return created;
  }

  async updateService(id: number, updates: Partial<InsertService>): Promise<void> {
    await db.update(services)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(services.id, id));
  }

  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async toggleServiceStatus(id: number, isActive: boolean): Promise<void> {
    await db.update(services)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(services.id, id));
  }

  // Service Add-ons
  async getServiceAddons(serviceId: number): Promise<ServiceAddon[]> {
    return await db.select().from(serviceAddons)
      .where(and(eq(serviceAddons.serviceId, serviceId), eq(serviceAddons.isActive, true)));
  }

  async createServiceAddon(addon: InsertServiceAddon): Promise<ServiceAddon> {
    const [created] = await db.insert(serviceAddons).values(addon).returning();
    return created;
  }

  async updateServiceAddon(id: number, updates: Partial<InsertServiceAddon>): Promise<void> {
    await db.update(serviceAddons).set(updates).where(eq(serviceAddons.id, id));
  }

  async deleteServiceAddon(id: number): Promise<void> {
    await db.delete(serviceAddons).where(eq(serviceAddons.id, id));
  }

  // Service History
  async getServiceHistoryByCustomer(customerId: number, filters?: { startDate?: string; endDate?: string; serviceType?: string; limit?: number; offset?: number }): Promise<import("@shared/schema").ServiceHistoryItem[]> {
    return this.getAllServiceHistory({
      ...filters,
      customerId, // Pass customerId as an internal filter
    } as any);
  }

  async getAllServiceHistory(filters?: { startDate?: string; endDate?: string; serviceType?: string; limit?: number; offset?: number; customerId?: number }): Promise<import("@shared/schema").ServiceHistoryItem[]> {
    // Build query conditions
    const conditions = [eq(appointments.status, "completed")];
    
    // Add customer filter if provided
    if ((filters as any)?.customerId) {
      conditions.push(eq(appointments.customerId, (filters as any).customerId));
    }
    
    // Add date filters
    if (filters?.startDate && filters.startDate.trim()) {
      try {
        const startDate = new Date(filters.startDate);
        if (!isNaN(startDate.getTime())) {
          conditions.push(gte(appointments.appointmentDate, startDate));
        }
      } catch (error) {
        console.warn('[STORAGE] Invalid startDate filter:', filters.startDate);
      }
    }
    
    if (filters?.endDate && filters.endDate.trim()) {
      try {
        const endDate = new Date(filters.endDate);
        if (!isNaN(endDate.getTime())) {
          conditions.push(lte(appointments.appointmentDate, endDate));
        }
      } catch (error) {
        console.warn('[STORAGE] Invalid endDate filter:', filters.endDate);
      }
    }
    
    // Add service type filter (we'll filter in JavaScript for now, or could be implemented with SQL ILIKE)
    const serviceTypeFilter = filters?.serviceType && filters.serviceType.trim() ? filters.serviceType.trim().toLowerCase() : null;

    // Query appointments with customer data
    const appointmentsData = await db
      .select({
        appointment: appointments,
        customer: customers,
      })
      .from(appointments)
      .leftJoin(customers, eq(appointments.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(appointments.appointmentDate))
      .limit(Math.min(100, Math.max(1, filters?.limit || 50)))
      .offset(Math.max(0, filters?.offset || 0));

    // Filter by service type in JavaScript if specified
    let filteredAppointmentsData = appointmentsData;
    if (serviceTypeFilter) {
      filteredAppointmentsData = appointmentsData.filter(({ appointment }) => 
        appointment.serviceType && appointment.serviceType.toLowerCase().includes(serviceTypeFilter)
      );
    }

    // Map to service history items
    const serviceHistoryItems = filteredAppointmentsData.map(({ appointment, customer }) => {
      // Calculate duration in hours with validation
      let duration: number | null = null;
      if (appointment.startTimestamptz && appointment.endTimestamptz) {
        const durationMs = appointment.endTimestamptz.getTime() - appointment.startTimestamptz.getTime();
        if (durationMs > 0) {
          duration = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
        }
      }

      // Get service pricing
      const servicePricing = this.getServicePricing(appointment.serviceType || '');
      
      // Robust cost calculation
      let calculatedCost: number | null = null;
      try {
        if (servicePricing.basePrice && servicePricing.basePrice > 0) {
          if (servicePricing.priceUnit === 'per hour' && duration && duration > 0) {
            calculatedCost = Math.round(duration * servicePricing.basePrice * 100) / 100;
          } else if (servicePricing.priceUnit === 'flat rate') {
            calculatedCost = servicePricing.basePrice;
          }
        }
      } catch (error) {
        console.warn('[STORAGE] Cost calculation error for appointment:', appointment.id, error);
      }

      const historyItem: import("@shared/schema").ServiceHistoryItem = {
        id: appointment.id,
        appointmentDate: appointment.appointmentDate,
        serviceDate: appointment.appointmentDate.toISOString().split('T')[0], // Convert Date to string (YYYY-MM-DD)
        serviceType: appointment.serviceType,
        status: appointment.status,
        startTimestamptz: appointment.startTimestamptz,
        endTimestamptz: appointment.endTimestamptz,
        duration,
        notes: appointment.notes,
        cost: calculatedCost || 0, // Ensure cost is always a number
        createdAt: appointment.createdAt,
        serviceName: servicePricing.serviceName,
        serviceDescription: servicePricing.serviceDescription,
        basePrice: servicePricing.basePrice,
        priceUnit: servicePricing.priceUnit,
        calculatedCost,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : undefined,
        customerEmail: customer?.email,
      };

      return historyItem;
    });

    return serviceHistoryItems;
  }

  private getServicePricing(serviceType: string): {
    serviceName: string | null;
    serviceDescription: string | null;
    basePrice: number | null;
    priceUnit: string | null;
  } {
    // Mock service pricing - in real implementation this would query the services table
    const servicePricingMap: Record<string, any> = {
      'IT Support': {
        serviceName: 'IT Support & Troubleshooting',
        serviceDescription: 'Computer troubleshooting and technical support services',
        basePrice: 85,
        priceUnit: 'per hour'
      },
      'Network Setup': {
        serviceName: 'Network Installation & Configuration',
        serviceDescription: 'Professional network setup and configuration',
        basePrice: 120,
        priceUnit: 'per hour'
      },
      'Smart Home Installation': {
        serviceName: 'Smart Home Device Installation',
        serviceDescription: 'Installation and configuration of smart home devices',
        basePrice: 95,
        priceUnit: 'per hour'
      },
      'System Maintenance': {
        serviceName: 'System Maintenance & Updates',
        serviceDescription: 'Regular system maintenance and software updates',
        basePrice: 75,
        priceUnit: 'per hour'
      },
      'Security System Setup': {
        serviceName: 'Security System Installation',
        serviceDescription: 'Installation and configuration of security systems',
        basePrice: 110,
        priceUnit: 'per hour'
      },
      'Data Recovery': {
        serviceName: 'Data Recovery Service',
        serviceDescription: 'Professional data recovery and backup services',
        basePrice: 150,
        priceUnit: 'per hour'
      }
    };

    // Try to match service type
    const exactMatch = servicePricingMap[serviceType];
    if (exactMatch) return exactMatch;

    // Try partial matching
    for (const [key, value] of Object.entries(servicePricingMap)) {
      if (serviceType.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(serviceType.toLowerCase())) {
        return value;
      }
    }

    // Default pricing for unknown services
    return {
      serviceName: serviceType,
      serviceDescription: `Professional ${serviceType} service`,
      basePrice: 85,
      priceUnit: 'per hour'
    };
  }

  // Portal Login Tokens - Enhanced security with hashed storage
  async createPortalLoginToken(rawToken: string, email: string, customerId: number, expiresAt: Date): Promise<PortalLoginToken> {
    const hashedToken = hashToken(rawToken);
    const tokenData = {
      token: hashedToken,
      email,
      customerId,
      expiresAt
    };
    const [created] = await db.insert(portalLoginTokens).values(tokenData).returning();
    return created;
  }

  async getPortalLoginTokenByHash(rawToken: string): Promise<PortalLoginToken | undefined> {
    // Get all valid tokens for comparison (we need to hash-compare each one)
    const validTokens = await db.select().from(portalLoginTokens)
      .where(and(
        gte(portalLoginTokens.expiresAt, new Date()),
        isNull(portalLoginTokens.usedAt) // Only unused tokens
      ));
    
    // Find matching token using secure hash comparison
    for (const token of validTokens) {
      if (verifyToken(rawToken, token.token)) {
        return token;
      }
    }
    return undefined;
  }

  async markPortalLoginTokenUsed(rawToken: string): Promise<void> {
    const tokenRecord = await this.getPortalLoginTokenByHash(rawToken);
    if (tokenRecord) {
      await db.update(portalLoginTokens)
        .set({ usedAt: new Date() })
        .where(eq(portalLoginTokens.id, tokenRecord.id));
    }
  }

  async deleteExpiredPortalLoginTokens(): Promise<void> {
    await db.delete(portalLoginTokens)
      .where(lte(portalLoginTokens.expiresAt, new Date()));
  }
}

export const storage = new DatabaseStorage();
