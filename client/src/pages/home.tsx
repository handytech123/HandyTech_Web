import { Helmet } from 'react-helmet';
import Navigation from "@/components/navigation";
import HeroSection from "@/components/hero-section";
import ServicesSection from "@/components/services-section";
import AppointmentScheduler from "@/components/appointment-scheduler";
import MaintenancePlans from "@/components/maintenance-plans";
import GalleryPreview from "@/components/gallery-preview";
import TestimonialsSection from "@/components/testimonials-section";
import ContactSection from "@/components/contact-section";
import Footer from "@/components/footer";
import ContactBanner from "@/components/contact-banner";
import BadgesSection from "@/components/badges-section";
import VoiceSearchFaq, { voiceQuestions } from "@/components/voice-search-faq";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>HandyTech Solutions LLC | Handyman Services in St. Louis, MO</title>
        <meta name="description" content="Professional handyman, painting, drywall, wallpaper, low-voltage, smart-home, and security-camera services in Florissant, Bridgeton, Maryland Heights, Creve Coeur, and St. Charles." />
        <link rel="canonical" href="https://handytech-solutions.com/" />
        <meta property="og:title" content="HandyTech Solutions | Professional Handyman Services" />
        <meta property="og:description" content="Expert handyman services in Missouri. Professional home repairs and smart home installations." />
        <meta property="og:image" content="https://handytech-solutions.com/preview.jpg" />
        <meta property="og:url" content="https://handytech-solutions.com" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" href="/favicon.ico" />
        
        <script type="application/ld+json">
          {`
          {
            "@context": "https://schema.org",
            "@type": "HomeAndConstructionBusiness",
            "@id": "https://handytech-solutions.com/#business",
            "name": "HandyTech Solutions LLC",
            "image": "https://handytech-solutions.com/logo.png",
            "url": "https://handytech-solutions.com",
            "telephone": "+1-314-325-4575",
            "priceRange": "$$",
            "email": "contact@handytech-solutions.com",
            "areaServed": [
              "Florissant, MO",
              "Bridgeton, MO",
              "Maryland Heights, MO",
              "Creve Coeur, MO",
              "St. Charles, MO"
            ],
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Handyman Services",
              "itemListElement": [
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Smart Home Technology Installation"
                  }
                },
                {
                  "@type": "Offer", 
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Plumbing Repairs"
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service", 
                    "name": "Electrical Work"
                  }
                }
              ]
            },
            "knowsAbout": ["Handyman services", "Drywall repair", "Interior painting", "Wallpaper installation", "Toilet installation", "Door lock installation", "Low-voltage cabling", "Smart-home installation", "Security camera installation"],
            "sameAs": ["https://www.facebook.com/handytechsolutions", "https://proreferral.homedepot.com/public-profile/885948"]
          }
          `}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: voiceQuestions.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          })}
        </script>
      </Helmet>
      
      <ContactBanner />
      <Navigation />
      <main>
        <HeroSection />
        <BadgesSection />
        <ServicesSection />
        <AppointmentScheduler />
        <MaintenancePlans />
        <GalleryPreview />
        <TestimonialsSection />
        <VoiceSearchFaq />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
