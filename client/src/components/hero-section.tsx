import { Button } from "@/components/ui/button";

export default function HeroSection() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="hero-section">
      <div className="container">
        <div className="grid grid-two-cols">
          <div>
            <div className="badge">
              PROFESSIONAL HANDYMAN SERVICES
            </div>
            <h1>
              Expert Handyman <span>Solutions</span>
            </h1>
            <p>
              Your trusted partner for home improvement and smart tech solutions, delivered with precision and professionalism.
            </p>
            <div className="flex gap-4 mb-8">
              <button 
                onClick={() => scrollToSection('contact')}
                className="btn btn-primary"
              >
                Get Free Estimate
              </button>
              <button 
                onClick={() => scrollToSection('scheduler')}
                className="btn btn-outline"
              >
                Schedule Service
              </button>
            </div>
            <div className="flex items-center gap-8 mb-6">
              <div className="flex items-center">
                <span className="feature-dots"></span>
                <span>Licensed & Insured</span>
              </div>
              <div className="flex items-center">
                <span className="feature-dots"></span>
                <span>10+ Years Experience</span>
              </div>
              <div className="flex items-center">
                <span className="feature-dots"></span>
                <span>Same Day Service</span>
              </div>
            </div>
            
            {/* Home Depot Pro Badge */}
            <div>
              <a 
                href="https://www.homedepot.com/c/pro_finder_contractor_profile/885948" 
                target="_blank" 
                rel="noopener noreferrer"
                className="home-depot-badge"
              >
                🔗 Certified Home Depot Pro Contractor
              </a>
            </div>
            <div className="mt-6">
              <a 
                href="https://www.homedepot.com/c/pro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                <span className="mr-2">🔨</span>
                Certified Home Depot Pro Contractor
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="bg-light-gray rounded-2xl p-8">
              <img 
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                alt="Professional handyman tools and equipment" 
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
