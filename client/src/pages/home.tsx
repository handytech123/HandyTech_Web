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

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>HandyTech Solutions | Professional Handyman Services in Missouri</title>
        <meta name="description" content="Expert handyman services in St. Louis, Florissant, and Hazelwood. Professional home repairs, smart home installations, plumbing, electrical work, and maintenance. Over a decade of trusted service." />
        <link rel="canonical" href="https://handytech-solutions.com" />
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
            "sameAs": ["https://proreferral.homedepot.com/public-profile/885948"]
          }
          `}
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
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
