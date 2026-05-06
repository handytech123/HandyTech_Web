import { Helmet } from 'react-helmet';
import Navigation from "@/components/navigation";
import HeroSection from "@/components/hero-section";
import TrustBar from "@/components/trust-bar";
import ServicesSection from "@/components/services-section";
import SmartHomeSection from "@/components/smart-home-section";
import HowItWorksSection from "@/components/how-it-works-section";
import AppointmentScheduler from "@/components/appointment-scheduler";
import MaintenancePlans from "@/components/maintenance-plans";
import TestimonialsSection from "@/components/testimonials-section";
import ContactSection from "@/components/contact-section";
import FinalCtaSection from "@/components/final-cta-section";
import Footer from "@/components/footer";
import ThemeSwitcher from "@/components/theme-switcher";
import ContactBanner from "@/components/contact-banner";
import BadgesSection from "@/components/badges-section";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>HandyTech Solutions | Handyman Services in St. Louis, MO</title>
        <meta name="description" content="Fast, reliable handyman services in St. Louis, Florissant, and Hazelwood. Repairs, installations, smart home upgrades, and more. Book online or call (314) 325-4575." />
        <link rel="canonical" href="https://handytech-solutions.com" />
        <meta property="og:title" content="HandyTech Solutions | Handyman Services in St. Louis" />
        <meta property="og:description" content="Fast, reliable repairs, installations, and smart home upgrades. Serving St. Louis, Florissant, and Hazelwood." />
        <meta property="og:image" content="https://handytech-solutions.com/preview.jpg" />
        <meta property="og:url" content="https://handytech-solutions.com" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" href="/favicon.ico" />
      </Helmet>

      <ThemeSwitcher />
      <Navigation />
      <ContactBanner />

      <main>
        <HeroSection />
        <TrustBar />
        <BadgesSection />
        <ServicesSection />
        <SmartHomeSection />
        <HowItWorksSection />
        <AppointmentScheduler defaultBookingMode defaultServiceName="General Handyman" />
        <TestimonialsSection />
        <FinalCtaSection />
        <MaintenancePlans />
        <ContactSection />
      </main>

      <Footer />
    </div>
  );
}
