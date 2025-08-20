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
  insertBlockedDateSchema,
  insertServiceSchema,
  insertServiceAddonSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin authentication route
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Simple authentication - you can change these credentials
      const ADMIN_USERNAME = "admin";
      const ADMIN_PASSWORD = "handytech2024";
      
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Generate a simple token (in production, use proper JWT)
        const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
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

  // Appointments routes
  app.post("/api/appointments", async (req, res) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment({
        ...appointmentData,
        status: "scheduled",
      });

      // Auto-create customer if they don't exist
      const existingCustomer = await storage.getCustomerByEmail(appointmentData.customerEmail);
      if (!existingCustomer) {
        const nameParts = appointmentData.customerName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        await storage.createCustomer({
          firstName,
          lastName,
          email: appointmentData.customerEmail,
          phone: appointmentData.customerPhone || null,
          company: null,
        });
      }

      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      } else {
        console.error("Appointment creation error:", error);
        res.status(500).json({ message: "Failed to create appointment" });
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

  app.patch("/api/quotes/:id/status", async (req, res) => {
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

  // Intelligent conversation generator with context awareness
  function generateFallbackResponse(message: string): string {
    // Context detection patterns
    const specificDetails = {
      faucetLeak: /faucet.*leak|leak.*faucet|dripping.*faucet|faucet.*drip/i,
      kitchenIssue: /kitchen.*leak|kitchen.*faucet|kitchen.*water|under.*sink/i,
      timeframe: /days?|weeks?|months?|yesterday|today|few.*days|several/i,
      location: /underneath|under.*sink|basement|crawl space|cabinet/i,
      costConcern: /charge|cost|price|expensive|estimate|how much|fee/i
    };
    
    // Priority triggers
    const scheduling = ["schedule", "appointment", "book", "when", "available", "time", "meet", "visit", "come out"];
    const greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"];
    const electrical = ["electrical", "electric", "wiring", "outlet", "switch", "panel", "breaker", "power", "lights"];
    const plumbing = ["plumbing", "plumber", "pipe", "leak", "drain", "faucet", "toilet", "water", "bathroom", "kitchen"];
    const tech = ["smart home", "automation", "security", "tech", "installation", "setup", "wifi", "network", "theater"];
    const painting = ["paint", "painting", "wall", "color", "interior", "exterior", "room", "house"];

    // Context-aware responses for specific situations
    if (specificDetails.faucetLeak.test(message) && specificDetails.kitchenIssue.test(message)) {
      return "Ah, kitchen faucet leak under the sink - that's pretty common actually. The good news is it's usually something we can fix pretty quickly. Is the water pooling in the cabinet, or is it dripping into a bucket? Also, do you see where exactly it's coming from - the supply lines or the faucet base itself?";
    }
    
    if (specificDetails.faucetLeak.test(message) && specificDetails.timeframe.test(message)) {
      return "A few days of dripping can definitely add up on your water bill. Kitchen faucet leaks under the sink are usually either loose connections or worn gaskets. Have you tried turning the water supply valves under the sink to see if that stops it temporarily? I can walk you through that if you want, or we can get someone out there today to take a look.";
    }
    
    if (specificDetails.location.test(message) && plumbing.some(word => message.includes(word))) {
      return "Underneath leaks are tricky because they can cause damage if they go too long. Smart of you to catch it! Is this something that just started, or has it been building up? And is the cabinet floor getting wet or warped at all? We should probably get someone out there sooner rather than later.";
    }
    
    if (specificDetails.costConcern.test(message) && greetings.some(word => message.includes(word))) {
      return "Hi Bob! Nice to meet you. I totally understand wanting to know what you're looking at cost-wise before we get started. What kind of project are we talking about? For most basic repairs we can give you a pretty good idea over the phone, and we always do free estimates for bigger jobs.";
    }

    // Standard priority responses
    if (scheduling.some(word => message.includes(word))) {
      return "Absolutely! I can help you get that taken care of. What kind of project are you working on? Is this something urgent, or are you planning ahead? I ask because we can usually get emergency calls out same day, but for bigger projects we like to schedule a time that works best for you.";
    }

    if (greetings.some(word => message.includes(word))) {
      return "Hi there! Good to hear from you. I'm with HandyTech Solutions here in Missouri. What's going on with your home today - anything I can help you figure out?";
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

  // Chatbot endpoint with intelligent fallback system
  app.post("/api/chatbot", async (req, res) => {
    try {
      const { message } = req.body;
      let botResponse = "";

      // Use fallback response system directly since OpenAI quota is exceeded
      console.log("Using fallback chatbot system for message:", message);
      botResponse = generateFallbackResponse(message.toLowerCase());
      console.log("Fallback response generated:", botResponse);

      // If no response was generated, provide a default
      if (!botResponse) {
        console.log("No response generated, using default");
        botResponse = "Hello! I'm here to help with HandyTech Solutions services. We offer electrical work, plumbing, smart home tech, painting, and general maintenance. How may I assist you today?";
      }

      // Determine if we should show scheduling
      const shouldShowScheduling = /schedule|appointment|meet|consultation|quote|call|speak|visit|come out|book|when can you|cost|price|estimate/i.test(message);

      res.json({
        response: botResponse,
        shouldShowScheduling,
      });
    } catch (error) {
      console.error("Final chatbot error:", error);
      res.json({ 
        response: "Hello! I'm here to help with HandyTech Solutions services. We offer electrical work, plumbing, smart home tech, painting, and general maintenance. How may I assist you today? Call us at (314) 325-4575 for immediate help.",
        shouldShowScheduling: true 
      });
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

  // Blocked Dates routes
  app.get("/api/blocked-dates", async (req, res) => {
    try {
      const blockedDates = await storage.getBlockedDates();
      res.json(blockedDates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blocked dates" });
    }
  });

  app.post("/api/blocked-dates", async (req, res) => {
    try {
      const validatedData = insertBlockedDateSchema.parse(req.body);
      const blockedDate = await storage.createBlockedDate(validatedData);
      res.status(201).json(blockedDate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid blocked date data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create blocked date" });
      }
    }
  });

  app.delete("/api/blocked-dates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBlockedDate(id);
      res.json({ message: "Blocked date deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete blocked date" });
    }
  });

  // Services Management routes
  app.get("/api/services", async (req, res) => {
    try {
      const { category, active } = req.query;
      let services;
      
      if (category && typeof category === 'string') {
        services = await storage.getServicesByCategory(category);
      } else if (active === 'true') {
        services = await storage.getActiveServices();
      } else {
        services = await storage.getAllServices();
      }
      
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
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
      const validatedData = insertServiceSchema.partial().parse(req.body);
      await storage.updateService(id, validatedData);
      res.json({ message: "Service updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid service data", errors: error.errors });
      } else {
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

  const httpServer = createServer(app);
  return httpServer;
}
