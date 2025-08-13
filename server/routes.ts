import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchHomeDepotReviews, fetchContractorReviews } from "./home-depot-reviews";
import { reminderService } from "./reminder-service";
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

  // Review routes (including Home Depot reviews)
  app.get("/api/reviews", async (req, res) => {
    try {
      const localReviews = await storage.getApprovedReviews();
      
      // Fetch authentic Home Depot reviews
      const homeDepotReviews = await fetchHomeDepotReviews("885948");
      
      // Transform Home Depot reviews to match our format
      const transformedHomeDepotReviews = homeDepotReviews.map((review) => ({
        id: review.id,
        customerId: 999, // Special customer ID for Home Depot reviews
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
      
      // Combine local and Home Depot reviews
      const allReviews = [...localReviews, ...transformedHomeDepotReviews];
      
      res.json(allReviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      // Fall back to local reviews if Home Depot fetch fails
      const reviews = await storage.getApprovedReviews();
      res.json(reviews);
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
      const appointment = await storage.createAppointment(appointmentData);

      // Auto-create customer if they don't exist
      const existingCustomer = await storage.getCustomerByEmail(appointmentData.email);
      if (!existingCustomer) {
        await storage.createCustomer({
          firstName: appointmentData.firstName,
          lastName: appointmentData.lastName,
          email: appointmentData.email,
          phone: appointmentData.phone || null,
          company: null,
        });
      }

      // Create appointment reminders automatically
      try {
        await reminderService.createRemindersForAppointment(appointment);
      } catch (reminderError) {
        console.error("Failed to create reminders for appointment:", reminderError);
        // Don't fail the appointment creation if reminders fail
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

  // Update appointment status and handle reminders
  app.patch("/api/appointments/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      await storage.updateAppointmentStatus(id, status);
      
      // Clean up reminders if appointment is cancelled
      if (status === 'cancelled') {
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

  // Enhanced intelligent fallback response generator
  function generateFallbackResponse(message: string): string {
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

    if (greetings.some(word => message.includes(word))) {
      return "Hello! Welcome to HandyTech Solutions. We're Missouri's trusted handyman service specializing in electrical work, plumbing, smart home technology, and general maintenance. How may I assist you today?";
    }

    // Check specific services first (before more general ones)
    if (drywall.some(word => message.includes(word))) {
      return "Drywall repair is one of our most common services! We fix holes, cracks, water damage, and texture matching. From small nail holes to large repairs, we make your walls look perfect again. Need a drywall estimate? How may I assist you?";
    }

    if (kitchen.some(word => message.includes(word))) {
      return "We love kitchen projects! We handle cabinet installation, countertop replacement, backsplash installation, appliance hookup, and complete kitchen remodeling. Our team can transform your kitchen into the heart of your home. Ready to discuss your kitchen upgrade? How may I assist you?";
    }

    if (bathroom.some(word => message.includes(word))) {
      return "Bathroom renovations are our specialty! We do everything from simple updates like new vanities and mirrors to complete bathroom remodels including tile work, plumbing fixtures, and lighting. Let's create your perfect bathroom space! How may I assist you?";
    }

    if (flooring.some(word => message.includes(word))) {
      return "We install all types of flooring including hardwood, laminate, tile, and luxury vinyl. Whether you need one room or your whole house, we ensure professional installation with attention to detail. What type of flooring are you considering? How may I assist you?";
    }

    if (doors.some(word => message.includes(word))) {
      return "We handle all door and window services including installation, repair, weatherstripping, lock replacement, and frame adjustments. Whether it's sticking doors or drafty windows, we'll get them working smoothly! How may I assist you?";
    }

    if (deck.some(word => message.includes(word))) {
      return "Outdoor projects are great! We build decks, install fencing, create pergolas, and handle various outdoor improvements. Let's enhance your outdoor living space and increase your home's value! How may I assist you?";
    }

    if (pricing.some(word => message.includes(word))) {
      return "We provide free estimates for most projects! Pricing depends on the scope of work, materials, and complexity. We're committed to fair, transparent pricing with no hidden fees. What project would you like an estimate for? How may I assist you?";
    }

    if (repairs.some(word => message.includes(word))) {
      return "We handle all kinds of repairs - from minor fixes to major renovations! Whether it's electrical issues, plumbing problems, drywall damage, or general maintenance, our experienced handyman can get it fixed right. What needs repair? How may I assist you?";
    }
    
    // General service categories
    if (electrical.some(word => message.includes(word))) {
      return "Great! We handle all types of electrical work including outlet installation, switch replacement, lighting upgrades, and electrical panel upgrades. I have an experienced handyman that can handle your electrical issues with safe, reliable work. Would you like to schedule a consultation to discuss your electrical needs? How may I assist you?";
    }
    
    if (plumbing.some(word => message.includes(word))) {
      return "We provide comprehensive plumbing services including leak repairs, fixture installation, drain cleaning, and pipe replacement. Our experienced handyman can handle both minor repairs and major renovations. Let me help you schedule a service call! How may I assist you?";
    }
    
    if (tech.some(word => message.includes(word))) {
      return "Excellent! We specialize in smart home automation, security system installation, home theater setup, and tech integration. We can help you modernize your home with the latest technology. Would you like to discuss your smart home project? How may I assist you?";
    }
    
    if (painting.some(word => message.includes(word))) {
      return "We offer professional painting services for both interior and exterior projects. From single rooms to whole house painting, we use quality materials and provide detailed preparation work. Ready to transform your space with a fresh coat of paint? How may I assist you?";
    }
    
    if (scheduling.some(word => message.includes(word))) {
      return "I'd be happy to help you schedule a service! We're available Mon-Fri 8AM-6PM and Sat 9AM-3PM. Our team can provide free estimates for most projects. What type of service are you looking for? How may I assist you?";
    }

    return "Thanks for contacting HandyTech Solutions! We're Missouri's expert handyman service offering electrical work, plumbing, smart home technology, painting, and general maintenance. We'd love to help with your project. What service are you interested in, or would you like to schedule a consultation? How may I assist you?";
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

  // Appointment Reminders routes
  app.get("/api/appointments/:id/reminders", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const reminders = await storage.getAppointmentReminders(appointmentId);
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointment reminders" });
    }
  });

  // Get all pending reminders (admin endpoint)
  app.get("/api/admin/reminders/pending", async (req, res) => {
    try {
      const pendingReminders = await storage.getPendingReminders();
      res.json(pendingReminders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending reminders" });
    }
  });

  // Create reminders for an existing appointment (admin endpoint)
  app.post("/api/admin/reminders/create", async (req, res) => {
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

  // Process pending reminders manually (admin endpoint)
  app.post("/api/admin/reminders/process", async (req, res) => {
    try {
      await reminderService.processPendingReminders();
      res.json({ message: "Processed pending reminders successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to process pending reminders" });
    }
  });

  // Send manual reminder (admin endpoint)
  app.post("/api/admin/reminders/send", async (req, res) => {
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

  // Start background reminder processing
  startReminderProcessing();

  const httpServer = createServer(app);
  return httpServer;
}

// Background task to process reminders every 5 minutes
function startReminderProcessing() {
  const processReminders = async () => {
    try {
      await reminderService.processPendingReminders();
    } catch (error) {
      console.error('Background reminder processing error:', error);
    }
  };

  // Process immediately on startup
  processReminders();
  
  // Then process every 5 minutes
  setInterval(processReminders, 5 * 60 * 1000);
  
  console.log('Appointment reminder background processing started');
}
