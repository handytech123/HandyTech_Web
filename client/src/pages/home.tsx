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
        
        <script type="application/ld+json">
          {`
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "HandyTech Solutions",
            "image": "https://handytech-solutions.com/logo.png",
            "url": "https://handytech-solutions.com",
            "telephone": "+1-314-325-4575",
            "priceRange": "$$",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Serving St. Louis Metro Area",
              "addressLocality": "Hazelwood",
              "addressRegion": "MO",
              "postalCode": "63042",
              "addressCountry": "US"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 38.7692,
              "longitude": -90.3702
            },
            "openingHours": "Mo-Fr 08:00-18:00",
            "serviceArea": {
              "@type": "GeoCircle",
              "geoMidpoint": {
                "@type": "GeoCoordinates",
                "latitude": 38.7692,
                "longitude": -90.3702
              },
              "geoRadius": "50000"
            },
            "areaServed": [
              "St. Louis, MO",
              "Florissant, MO",
              "Hazelwood, MO",
              "Ferguson, MO",
              "Bridgeton, MO"
            ],
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Handyman Services",
              "itemListElement": [
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Faucet Replacement" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Drywall Repair" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "TV Mounting" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Smart Home Installation" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Plumbing Repairs" } },
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Electrical Work" } }
              ]
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "reviewCount": "127"
            }
          }
          `}
        </script>
      </Helmet>

      <ThemeSwitcher />
      <Navigation />
      <ContactBanner />

      <main>
        {/* 1. Hero */}
        <HeroSection />

        {/* 2. Trust Bar */}
        <TrustBar />

        {/* Badges / credibility */}
        <BadgesSection />

        {/* 3. Core Services + Full Category Breakdown */}
        <ServicesSection />

        {/* 4. Smart Home & Tech Services */}
        <SmartHomeSection />

        {/* 5. How It Works */}
        <HowItWorksSection />

        {/* 6. Reviews */}
        <TestimonialsSection />

        {/* 7. Final CTA + Affiliate Disclosure (combined in one component) */}
        <FinalCtaSection />

        {/* Booking form (existing) */}
        <AppointmentScheduler />

        {/* Maintenance plans (existing) */}
        <MaintenancePlans />

        {/* 8. Quote / Contact form */}
        <ContactSection />
      </main>

      <Footer />
    </div>
  );
}
