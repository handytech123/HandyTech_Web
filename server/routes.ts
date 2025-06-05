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
  insertProjectGallerySchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  app.post("/api/maintenance-plans", async (req, res) => {
    try {
      const planData = insertMaintenancePlanSchema.parse(req.body);
      const plan = await storage.createMaintenancePlan(planData);
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid maintenance plan data", errors: error.errors });
      } else {
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

  const httpServer = createServer(app);
  return httpServer;
}
