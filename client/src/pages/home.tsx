import Navigation from "@/components/navigation";
import HeroSection from "@/components/hero-section";
import ServicesSection from "@/components/services-section";
import AppointmentScheduler from "@/components/appointment-scheduler";
import MaintenancePlans from "@/components/maintenance-plans";

import TestimonialsSection from "@/components/testimonials-section";
import ContactSection from "@/components/contact-section";
import Footer from "@/components/footer";
import ChatWidget from "@/components/chat-widget";
export default function Home() {
  return (
    <div style={{minHeight: '100vh', backgroundColor: '#ffffff'}}>
      <title>HandyTech Solutions - Expert Handyman & Smart Home Services</title>
      <meta name="description" content="Your trusted handyman service with over a decade of experience. We specialize in plumbing, electrical work, smart home technology, painting, and general maintenance. Expert, detail-oriented work on every job." />
      <Navigation />
      <main>
        <HeroSection />
        <ServicesSection />
        <AppointmentScheduler />
        <MaintenancePlans />

        <TestimonialsSection />
        <ContactSection />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
