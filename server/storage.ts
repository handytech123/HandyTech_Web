import { 
  users, customers, maintenancePlans, reviews, quotes, emailCampaigns,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type MaintenancePlan, type InsertMaintenancePlan,
  type Review, type InsertReview,
  type Quote, type InsertQuote,
  type EmailCampaign, type InsertEmailCampaign
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private customers: Map<number, Customer> = new Map();
  private maintenancePlans: Map<number, MaintenancePlan> = new Map();
  private reviews: Map<number, Review> = new Map();
  private quotes: Map<number, Quote> = new Map();
  private emailCampaigns: Map<number, EmailCampaign> = new Map();
  private currentUserId = 1;
  private currentCustomerId = 1;
  private currentMaintenancePlanId = 1;
  private currentReviewId = 1;
  private currentQuoteId = 1;
  private currentEmailCampaignId = 1;

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
    };
    this.maintenancePlans.set(plan1.id, plan1);
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
      createdAt: new Date(),
      lastEmailSent: null,
    };
    this.customers.set(customer.id, customer);
    return customer;
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
}

export const storage = new MemStorage();
