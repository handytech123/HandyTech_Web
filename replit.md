# HandyTech Solutions - Handyman Services Platform

## Overview

HandyTech Solutions is a full-stack web application for a professional handyman service business specializing in home improvement and smart technology solutions. The platform provides a comprehensive business management system with customer relationship management, appointment scheduling, project galleries, maintenance plans, quote requests, and automated email marketing capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.
Business location: Missouri-based handyman service
Color scheme: Ohio State Buckeyes colors (scarlet red #BB0000 and gray) for proper text visibility
Database preference: User chose to build own backend rather than use external CRM software
Deployment preference: **Ionos VPS Hosting** (full-stack with complete server control and all backend features)
Electrical work disclaimer: Not a licensed electrician - has experienced handyman for electrical issues

## Recent Changes (August 12, 2024)

✓ **Database Integration Complete**: Fully migrated from memory storage to PostgreSQL
✓ **DatabaseStorage Implementation**: All CRUD operations now use persistent database
✓ **Sample Data Added**: Customers, reviews, maintenance plans, quotes, appointments, and project gallery
✓ **Admin Dashboard Created**: Complete business management interface at /admin route
✓ **API Endpoints Enhanced**: Added quote status updates, review approval, customer management
✓ **Real Business Operations**: Live data demonstrating quote management, appointment scheduling, and customer tracking
✓ **Services Management System**: Created dynamic services system but reverted main page to original design per user request
✓ **Service Categories Synchronized**: Admin portal now exactly matches website's three service categories
✓ **Services Database Updated**: Populated with 24 services matching website bullet points exactly
✓ **Admin Portal Navigation Fixed**: Sign out button now redirects to main homepage
✓ **Service Quote Calculator Removed**: Completely removed from contact section per user request
✓ **Gallery Images Fixed**: Implemented branded placeholder system with Ohio State Buckeyes colors and graceful fallbacks
✓ **Intelligent Chatbot**: Created AI-powered customer service bot with OpenAI integration
✓ **Smart Appointment Scheduling**: Chatbot can intelligently escalate to meeting scheduling when appropriate
✓ **Customer Auto-Creation**: System automatically creates customer records from chat interactions
✓ **Project Gallery Removed**: Completely removed project gallery section from main page per user request
✓ **Services Section Restored**: Restored main three-tier services section to homepage
✓ **Footer Services Updated**: Replaced IT services in footer with relevant handyman services
✓ **Customer Portal Removed**: Eliminated customer portal from navigation - not needed for handyman business model
✓ **About Page Created**: Added dedicated About page (/about) with professional content and navigation from main page
✓ **Authentic Home Depot Reviews**: Integrated real customer reviews from Home Depot Pro profile (885948)
✓ **Testimonials Display Optimized**: Shows only 4 authentic Home Depot Pro reviews with "View All" button linking to profile
✓ **Review Priority System**: Home Depot Pro reviews displayed first, removing generic fallback testimonials
✓ **Static Deployment Fix**: Created build-for-deployment.sh script to resolve build output structure mismatch
✓ **Deployment File Structure Fixed**: Assets now correctly placed in dist/ root for static deployment compatibility
✓ **Reviews Static Data Solution**: Added static review data for deployment environments without backend server
✓ **API Fallback System**: Implemented graceful degradation from API to static data for reviews display
✓ **Deployment Documentation**: Added DEPLOYMENT_FIX.md with complete solution details and technical notes
✓ **Appointment Reminder System**: Complete automated email reminder system using Brevo API
✓ **Smart Reminder Scheduling**: Automatic 24-hour, 2-hour, and 30-minute appointment reminders
✓ **Background Processing**: Server-side reminder processing every 5 minutes with manual override capability
✓ **Professional Email Templates**: Branded HTML emails with Ohio State Buckeyes theming and company branding
✓ **Admin Reminder Management**: Complete dashboard interface for monitoring and manually triggering reminders
✓ **Customer Email Integration**: Enhanced reminder system to prioritize linked customer emails over appointment emails
✓ **Reminder UI Reorganization**: Moved send reminders functionality to appointments tab for streamlined workflow
✓ **Mobile Responsiveness Enhanced**: Fixed "Send Reminder" button and appointment cards for mobile view
✓ **Customer Contact Editing Fixed**: Resolved API parameter order bug and added proper database storage methods
✓ **VPS Deployment Complete**: Successfully deployed HandyTech Solutions to Ionos VPS (209.46.125.246) with full functionality
✓ **Admin System Fully Restored**: Fixed Tailwind CSS configuration errors and restored complete admin dashboard functionality
✓ **All APIs Operational**: Customer management, appointments, quotes, reviews, and reminder systems working perfectly
✓ **Database Connections Active**: PostgreSQL database with 5 customers, 6 appointments, 3 quotes, 9 reviews, and 24 services

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom Ohio State Buckeyes brand theming
- **Form Handling**: React Hook Form with Zod validation
- **Component Structure**: Modular component architecture with reusable UI components

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured route handlers
- **Error Handling**: Centralized error handling middleware
- **Development Server**: Vite integration for hot module replacement in development

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless hosting (ACTIVE - fully implemented)
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Storage Layer**: DatabaseStorage class replacing MemStorage for persistent data
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple

### Database Schema Design
The application uses a normalized relational database structure with the following core entities:
- **Users**: Authentication and admin access
- **Customers**: Customer information and contact details
- **Maintenance Plans**: Subscription-based service plans
- **Reviews**: Customer feedback and testimonials
- **Quotes**: Service quote requests and lead management
- **Appointments**: Service scheduling system
- **Email Campaigns**: Automated marketing campaigns
- **Project Gallery**: Portfolio showcase with categorization

### Authentication & Authorization
- Session-based authentication with secure cookie management
- Role-based access control for admin and customer portals
- Customer self-service portal for managing services and appointments

### Business Logic Features
- **Appointment Scheduling**: Calendar-based booking system with time slot management
- **Maintenance Plans**: Tiered subscription services (Annual, Seasonal, On-Demand)
- **Quote Management**: Lead capture and conversion tracking with status updates
- **Email Automation**: Automated follow-up campaigns with 45-day intervals
- **Project Portfolio**: Categorized gallery with featured projects
- **Review System**: Customer testimonials with approval workflow
- **Service Calculator**: Dynamic pricing estimation tools
- **Admin Dashboard**: Complete business operations management interface (/admin)
- **Customer Portal**: Self-service customer management interface (/customer-portal)

### UI/UX Design Patterns
- **Responsive Design**: Mobile-first approach with breakpoint-specific layouts
- **Brand Theming**: Ohio State Buckeyes color scheme with theme switching capability
- **Component Library**: Consistent design system using Shadcn/ui components
- **Interactive Elements**: Chat widget, toast notifications, and modal dialogs
- **Accessibility**: ARIA-compliant components with keyboard navigation support

### Development Architecture
- **Build System**: Vite with TypeScript compilation and hot reloading
- **Code Organization**: Shared types and schemas between client and server
- **Path Aliases**: Configured import aliases for clean code organization
- **Development Tools**: ESBuild for production bundling with external package handling

### Deployment Architecture
- **Static Deployment Ready**: Automated file structure correction for static hosting platforms
- **Build Output**: Vite builds to `dist/public`, deployment script moves to `dist/` root
- **Deployment Script**: `scripts/prepare-deploy.js` handles file structure reorganization
- **Asset Management**: Maintains proper asset paths and references during deployment preparation

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations and query building
- **Drizzle Kit**: Database schema management and migration tools

### Frontend Libraries
- **React Ecosystem**: React 18 with TypeScript and Vite
- **TanStack Query**: Server state management and caching
- **Wouter**: Lightweight client-side routing
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation and schema definition

### UI Component Libraries
- **Radix UI**: Accessible primitive components for complex UI elements
- **Shadcn/ui**: Pre-built component library with customizable theming
- **Tailwind CSS**: Utility-first CSS framework
- **Class Variance Authority**: Type-safe variant management for components
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **Vite**: Fast build tool with hot module replacement
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration
- **Replit Integration**: Development environment optimization for Replit platform

### Business Integration
- **Home Depot Pro**: Partnership integration for contractor services
- **Email Automation**: Custom-built system for customer retention campaigns
- **Session Management**: PostgreSQL-backed session storage for user authentication
- **Real Data Operations**: Live PostgreSQL database with sample business data
- **Admin Operations**: Quote management, appointment scheduling, review approval
- **Customer Relationship Management**: Automated customer creation and email tracking