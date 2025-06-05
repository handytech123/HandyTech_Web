import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Laptop, 
  Shield, 
  Cloud, 
  Network, 
  Database, 
  Wrench 
} from "lucide-react";

const serviceCategories = [
  {
    icon: Wrench,
    title: "Essential Repairs & Maintenance",
    subtitle: "🛠️ Service A",
    description: "Quick fixes and routine maintenance to keep your home in top shape.",
    features: [
      "Smart thermostat installation",
      "Smart lighting and switches", 
      "Security camera setup",
      "Home automation systems",
      "Light plumbing repairs (faucets, drains)",
      "Electrical services (fixtures, outlets, ceiling fans)",
      "Drywall repair and installation",
      "Appliance repairs and furniture assembly",
      "Pressure washing"
    ]
  },
  {
    icon: Shield,
    title: "Home Improvement & Remodeling", 
    subtitle: "🏡 Service B",
    description: "Enhance and modernize your living spaces with our remodeling services.",
    features: [
      "Interior painting and surface preparation",
      "Kitchen and bathroom renovations",
      "Floor installation",
      "Staircase upgrades", 
      "Basement finishing",
      "Garage improvements"
    ]
  },
  {
    icon: Network,
    title: "Specialized Installations & Custom Projects",
    subtitle: "🧰 Service C", 
    description: "Tailored solutions for unique home projects and installations.",
    features: [
      "Home theater and audio wiring",
      "Network cabling and TV mounting",
      "Deck rebuilding and repairs",
      "Shed construction",
      "Concrete work",
      "Gutter installation and maintenance",
      "Vanity installations",
      "Lighting fixture upgrades",
      "Fireplace mantel installations"
    ]
  }
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="bg-light-gray text-charcoal px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
            OUR SERVICES
          </div>
          <h2 className="text-4xl font-bold text-charcoal mb-4">Expert HandyTech Services</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your trusted home improvement experts. With over a decade of experience, we specialize in smart home technology, electrical, plumbing, and general maintenance services.
          </p>
        </div>
        
        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
          {serviceCategories.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <Card key={index} className="bg-white border-2 border-gray-100 hover:border-brand-red hover:shadow-xl transition-all duration-300 group rounded-xl">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    <div className="bg-light-gray w-16 h-16 rounded-full flex items-center justify-center mr-4 group-hover:bg-brand-red transition-colors duration-300">
                      <IconComponent className="text-charcoal group-hover:text-white transition-colors duration-300" size={24} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-brand-red mb-1">{service.subtitle}</div>
                      <h3 className="text-lg font-bold text-charcoal">{service.title}</h3>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
                  <ul className="text-sm text-gray-600 space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <Button 
                      onClick={() => {
                        const element = document.getElementById('scheduler');
                        if (element) element.scrollIntoView({ behavior: 'smooth' });
                      }}
                      variant="outline" 
                      className="w-full border-brand-red text-brand-red hover:bg-brand-red hover:text-white transition-colors"
                    >
                      Book This Service
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Home Depot Pro Benefits Section */}
        <div className="mt-20 bg-orange-50 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-semibold inline-block mb-4">
              HOME DEPOT PRO CONTRACTOR
            </div>
            <h3 className="text-2xl font-bold text-charcoal mb-4">
              Professional Grade Materials & Service
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              As a certified Home Depot Pro contractor, I have access to professional-grade materials, bulk pricing, and exclusive contractor resources to deliver the best value for your projects.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">💰</span>
              </div>
              <h4 className="font-semibold text-charcoal mb-2">Bulk Pricing Savings</h4>
              <p className="text-gray-600 text-sm">Pass savings directly to you with contractor bulk pricing on materials</p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">⚡</span>
              </div>
              <h4 className="font-semibold text-charcoal mb-2">Priority Service</h4>
              <p className="text-gray-600 text-sm">Faster project completion with priority access to materials and delivery</p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🏆</span>
              </div>
              <h4 className="font-semibold text-charcoal mb-2">Quality Guarantee</h4>
              <p className="text-gray-600 text-sm">Professional-grade materials backed by Home Depot's quality standards</p>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <a 
              href="https://www.homedepot.com/c/pro" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Learn More About Home Depot Pro
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
