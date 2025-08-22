import { Button } from "@/components/ui/button";

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
          <div>
            <div className="bg-brand-red text-white px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
              PROFESSIONAL HANDYMAN SERVICES
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6 text-charcoal">
              Expert Handyman <span className="text-brand-red">Solutions</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Your trusted partner for home improvement and smart tech solutions, delivered with precision and professionalism.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => scrollToSection('contact')}
                className="bg-brand-red hover:bg-brand-red-dark text-white px-8 py-4 rounded-lg text-lg font-semibold shadow-lg"
              >
                Get Free Estimate
              </Button>
              <Button 
                onClick={() => scrollToSection('scheduler')}
                variant="outline"
                className="border-2 border-charcoal text-charcoal hover:bg-charcoal hover:text-white px-8 py-4 rounded-lg text-lg font-semibold"
              >
                Schedule Service
              </Button>
            </div>
            <div className="flex items-center gap-8 mt-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-red rounded-full"></div>
                <span>Licensed & Insured</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-red rounded-full"></div>
                <span>10+ Years Experience</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-red rounded-full"></div>
                <span>Same Day Service</span>
              </div>
            </div>
            
            {/* Home Depot Pro Badge */}
            <div className="mt-6">
              <a 
                href="https://proreferral.homedepot.com/public-profile/885948" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <span className="mr-2">🔨</span>
                Certified Home Depot Pro Contractor - View Reviews
              </a>
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
