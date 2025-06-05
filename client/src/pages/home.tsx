import Navigation from "@/components/navigation";
import HeroSection from "@/components/hero-section";
import ServicesSection from "@/components/services-section";
import MaintenancePlans from "@/components/maintenance-plans";
import TeamSection from "@/components/team-section";
import TestimonialsSection from "@/components/testimonials-section";
import ContactSection from "@/components/contact-section";
import Footer from "@/components/footer";
import ChatWidget from "@/components/chat-widget";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <title>HandyTech Solutions - Professional Technology Services</title>
      <meta name="description" content="Comprehensive IT services, maintenance plans, and customer support that keeps your business running smoothly. Get professional technology solutions tailored to your needs." />
      
      <Navigation />
      <main>
        <HeroSection />
        <ServicesSection />
        <MaintenancePlans />
        <TeamSection />
        <TestimonialsSection />
        <ContactSection />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
