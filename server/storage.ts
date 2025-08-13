import { 
  users, customers, maintenancePlans, reviews, quotes, emailCampaigns, appointments, projectGallery, blockedDates, services, serviceAddons, appointmentReminders,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type MaintenancePlan, type InsertMaintenancePlan,
  type Review, type InsertReview,
  type Quote, type InsertQuote,
  type EmailCampaign, type InsertEmailCampaign,
  type Appointment, type InsertAppointment,
  type ProjectGallery, type InsertProjectGallery,
  type BlockedDate, type InsertBlockedDate,
  type Service, type InsertService,
  type ServiceAddon, type InsertServiceAddon,
  type AppointmentReminder, type InsertAppointmentReminder
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Customers
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: InsertCustomer): Promise<Customer>;
  getAllCustomers(): Promise<Customer[]>;
  updateCustomerLastEmail(id: number, lastEmailSent: Date): Promise<void>;

  // Maintenance Plans
  getMaintenancePlan(id: number): Promise<MaintenancePlan | undefined>;
  getMaintenancePlansByCustomer(customerId: number): Promise<MaintenancePlan[]>;
  createMaintenancePlan(plan: InsertMaintenancePlan): Promise<MaintenancePlan>;
  updateMaintenancePlanStatus(id: number, status: string): Promise<void>;
  getAllActiveMaintenancePlans(): Promise<MaintenancePlan[]>;

  // Reviews
  getReview(id: number): Promise<Review | undefined>;
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
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByCustomer(customerId: number): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: number, status: string): Promise<void>;
  getUpcomingAppointments(): Promise<Appointment[]>;

  // Project Gallery
  getProjectGalleryItem(id: number): Promise<ProjectGallery | undefined>;
  getAllProjectGalleryItems(): Promise<ProjectGallery[]>;
  getProjectGalleryByCategory(category: string): Promise<ProjectGallery[]>;
  getFeaturedProjects(): Promise<ProjectGallery[]>;
  createProjectGalleryItem(item: InsertProjectGallery): Promise<ProjectGallery>;

  // Blocked Dates
  getBlockedDates(): Promise<BlockedDate[]>;
  createBlockedDate(blockedDate: InsertBlockedDate): Promise<BlockedDate>;
  deleteBlockedDate(id: number): Promise<void>;
  getBlockedDatesInRange(startDate: string, endDate: string): Promise<BlockedDate[]>;

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

  // Appointment Reminders
  createAppointmentReminder(reminder: InsertAppointmentReminder): Promise<AppointmentReminder>;
  getAppointmentReminders(appointmentId: number): Promise<AppointmentReminder[]>;
  getPendingReminders(): Promise<AppointmentReminder[]>;
  markReminderSent(id: number, emailStatus: string, emailContent?: string): Promise<void>;
  deleteAppointmentReminders(appointmentId: number): Promise<void>;
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
      source: null,
      sourceLink: null,
      location: null,
      service: null,
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
      source: null,
      sourceLink: null,
      location: null,
      service: null,
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

  async updateCustomer(id: number, customerData: InsertCustomer): Promise<Customer> {
    const existingCustomer = this.customers.get(id);
    if (!existingCustomer) {
      throw new Error('Customer not found');
    }
    
    const updatedCustomer = {
      ...existingCustomer,
      ...customerData
    };
    
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
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
    const plan: MaintenancePlan = {
      ...insertPlan,
      id: this.currentMaintenancePlanId++,
      status: insertPlan.status || "active",
      startDate: new Date(),
    };
    this.maintenancePlans.set(plan.id, plan);
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

  // Reviews
  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
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
      source: insertReview.source || null,
      sourceLink: insertReview.sourceLink || null,
      location: insertReview.location || null,
      service: insertReview.service || null,
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
    const appointment: Appointment = {
      ...insertAppointment,
      id: this.currentAppointmentId++,
      customerId: insertAppointment.customerId || null,
      phone: insertAppointment.phone || null,
      notes: insertAppointment.notes || null,
      status: "scheduled",
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

  async getUpcomingAppointments(): Promise<Appointment[]> {
    const now = new Date();
    return Array.from(this.appointments.values()).filter(appointment => 
      appointment.appointmentDate > now && appointment.status === "scheduled"
    );
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

  // Blocked Dates (MemStorage placeholder - not used since we use DatabaseStorage)
  async getBlockedDates(): Promise<BlockedDate[]> {
    return [];
  }

  async createBlockedDate(blockedDate: InsertBlockedDate): Promise<BlockedDate> {
    throw new Error("MemStorage not implemented for blocked dates");
  }

  async deleteBlockedDate(id: number): Promise<void> {
    throw new Error("MemStorage not implemented for blocked dates");
  }

  async getBlockedDatesInRange(startDate: string, endDate: string): Promise<BlockedDate[]> {
    return [];
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

  // Appointment Reminders
  async createAppointmentReminder(reminder: InsertAppointmentReminder): Promise<AppointmentReminder> {
    throw new Error("MemStorage not implemented for appointment reminders");
  }

  async getAppointmentReminders(appointmentId: number): Promise<AppointmentReminder[]> {
    return [];
  }

  async getPendingReminders(): Promise<AppointmentReminder[]> {
    return [];
  }

  async markReminderSent(id: number, emailStatus: string, emailContent?: string): Promise<void> {
    throw new Error("MemStorage not implemented for appointment reminders");
  }

  async deleteAppointmentReminders(appointmentId: number): Promise<void> {
    throw new Error("MemStorage not implemented for appointment reminders");
  }
}

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

  async updateCustomer(id: number, customer: InsertCustomer): Promise<Customer> {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updated;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
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
    const [created] = await db.insert(maintenancePlans).values(plan).returning();
    return created;
  }

  async updateMaintenancePlanStatus(id: number, status: string): Promise<void> {
    await db.update(maintenancePlans).set({ status }).where(eq(maintenancePlans.id, id));
  }

  async getAllActiveMaintenancePlans(): Promise<MaintenancePlan[]> {
    return await db.select().from(maintenancePlans).where(eq(maintenancePlans.status, "active"));
  }

  // Reviews
  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
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
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(desc(appointments.createdAt));
  }

  async getAppointmentsByCustomer(customerId: number): Promise<Appointment[]> {
    return await db.select().from(appointments).where(eq(appointments.customerId, customerId));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [created] = await db.insert(appointments).values(appointment).returning();
    return created;
  }

  async updateAppointmentStatus(id: number, status: string): Promise<void> {
    await db.update(appointments).set({ status }).where(eq(appointments.id, id));
  }

  async getUpcomingAppointments(): Promise<Appointment[]> {
    const now = new Date();
    return await db.select().from(appointments)
      .where(and(gte(appointments.appointmentDate, now), eq(appointments.status, "scheduled")))
      .orderBy(appointments.appointmentDate);
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

  // Blocked Dates
  async getBlockedDates(): Promise<BlockedDate[]> {
    return await db.select().from(blockedDates).orderBy(blockedDates.date);
  }

  async createBlockedDate(blockedDate: InsertBlockedDate): Promise<BlockedDate> {
    const [created] = await db.insert(blockedDates).values(blockedDate).returning();
    return created;
  }

  async deleteBlockedDate(id: number): Promise<void> {
    await db.delete(blockedDates).where(eq(blockedDates.id, id));
  }

  async getBlockedDatesInRange(startDate: string, endDate: string): Promise<BlockedDate[]> {
    return await db.select().from(blockedDates)
      .where(and(gte(blockedDates.date, startDate), gte(blockedDates.date, startDate)))
      .orderBy(blockedDates.date);
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

  // Appointment Reminders
  async createAppointmentReminder(reminder: InsertAppointmentReminder): Promise<AppointmentReminder> {
    const [created] = await db.insert(appointmentReminders).values(reminder).returning();
    return created;
  }

  async getAppointmentReminders(appointmentId: number): Promise<AppointmentReminder[]> {
    return await db.select().from(appointmentReminders)
      .where(eq(appointmentReminders.appointmentId, appointmentId))
      .orderBy(appointmentReminders.reminderTime);
  }

  async getPendingReminders(): Promise<AppointmentReminder[]> {
    const now = new Date();
    return await db.select().from(appointmentReminders)
      .where(
        and(
          eq(appointmentReminders.emailSent, false),
          gte(appointmentReminders.reminderTime, now)
        )
      )
      .orderBy(appointmentReminders.reminderTime);
  }

  async markReminderSent(id: number, emailStatus: string, emailContent?: string): Promise<void> {
    const updates: any = {
      emailSent: true,
      emailSentAt: new Date(),
      emailStatus
    };
    
    if (emailContent) {
      updates.emailContent = emailContent;
    }
    
    await db.update(appointmentReminders)
      .set(updates)
      .where(eq(appointmentReminders.id, id));
  }

  async deleteAppointmentReminders(appointmentId: number): Promise<void> {
    await db.delete(appointmentReminders).where(eq(appointmentReminders.appointmentId, appointmentId));
  }
}

export const storage = new DatabaseStorage();
