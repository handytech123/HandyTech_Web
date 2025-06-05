import { Card, CardContent } from "@/components/ui/card";
import { 
  Laptop, 
  Shield, 
  Cloud, 
  Network, 
  Database, 
  Wrench 
} from "lucide-react";

const services = [
  {
    icon: Laptop,
    title: "Smart Home Technologies",
    description: "Professional smart home installation and automation setup for modern living.",
    features: ["Smart thermostat installation", "Smart lighting systems", "Security system integration", "Home automation setup"]
  },
  {
    icon: Network,
    title: "Electrical Services",
    description: "Safe and reliable electrical installations, repairs, and upgrades.",
    features: ["Light fixture installation", "Outlet and switch installation", "Ceiling fan installation", "Troubleshooting and repairs"]
  },
  {
    icon: Database,
    title: "Plumbing Services",
    description: "Professional plumbing repairs, installations, and maintenance.",
    features: ["Faucet and fixture installation", "Drain cleaning and unclogging", "Toilet repair and replacement", "Water heater maintenance"]
  },
  {
    icon: Shield,
    title: "Low Voltage Systems",
    description: "Advanced low voltage installations for security and entertainment systems.",
    features: ["Security camera installation", "Home theater wiring", "Network cabling", "TV mounts and setup"]
  },
  {
    icon: Cloud,
    title: "Painting Services",
    description: "Professional interior painting and surface preparation for your home.",
    features: ["Interior painting", "Surface preparation and priming", "Touch-ups and repairs", "Wallpaper removal"]
  },
  {
    icon: Wrench,
    title: "General Maintenance",
    description: "Complete home maintenance and repair services for all your needs.",
    features: ["Drywall repair and installation", "Appliance repair", "Furniture assembly", "Pressure washing"]
  }
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-20 bg-light-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-charcoal mb-4">Our Expert HandyTech Services</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your trusted home improvement experts. With over a decade of experience, we specialize in smart home technology, electrical, plumbing, and general maintenance services.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <Card key={index} className="bg-white hover:shadow-xl transition-shadow group">
                <CardContent className="p-8">
                  <div className="bg-brand-red w-16 h-16 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <IconComponent className="text-white text-2xl" size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-charcoal mb-4">{service.title}</h3>
                  <p className="text-gray-600 mb-6">{service.description}</p>
                  <ul className="text-sm text-gray-600 space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <div className="w-2 h-2 bg-brand-red rounded-full mr-3"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
