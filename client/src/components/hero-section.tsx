import { Button } from "@/components/ui/button";
import proReferralImage from "@assets/ProReferral-191 (1)_1758249625912.png";
import AwardBadge from "./award-badge";

export default function HeroSection() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6 text-charcoal">
              Professional Handyman <span className="text-brand-red">and Tech Services</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Your trusted partner for home improvement and smart tech solutions, delivered with precision and professionalism.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                onClick={() => scrollToSection('contact')}
                className="bg-brand-red hover:bg-brand-red-dark text-white px-8 py-4 rounded-lg text-lg font-semibold shadow-lg"
              >
                Get Free Estimate
              </Button>
            </div>
            <div className="flex items-center gap-8 mt-8 text-sm text-gray-600 justify-center lg:justify-start">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-red rounded-full"></div>
                <span>Family Owned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-red rounded-full"></div>
                <span>Fully Insured</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-red rounded-full"></div>
                <span>10+ Years Experience</span>
              </div>
            </div>
            
            {/* Badges Section */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-8 justify-center lg:justify-start">
              {/* Home Depot Pro Badge */}
              <a 
                href="https://proreferral.homedepot.com/public-profile/885948" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <img 
                  src={proReferralImage} 
                  alt="Pro Referral - Powered by The Home Depot" 
                  className="h-16 w-auto"
                />
              </a>
              
              {/* Award Badge */}
              <div className="scale-75 sm:scale-100">
                <AwardBadge />
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="bg-light-gray rounded-2xl p-8">
              <img 
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                alt="HandyTech Solutions professional handyman with smart home technology tools and equipment" 
                className="rounded-xl shadow-lg w-full h-96 object-cover" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://via.placeholder.com/800x600/374151/ffffff?text=HandyTech+Solutions";
                }}
              />

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
