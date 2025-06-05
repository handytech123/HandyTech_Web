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
    title: "IT Support & Maintenance",
    description: "24/7 technical support and proactive maintenance to keep your systems running optimally.",
    features: ["Remote diagnostics", "Preventive maintenance", "Emergency support"]
  },
  {
    icon: Shield,
    title: "Cybersecurity Solutions", 
    description: "Comprehensive security measures to protect your business from digital threats.",
    features: ["Threat assessment", "Security audits", "Employee training"]
  },
  {
    icon: Cloud,
    title: "Cloud Services",
    description: "Scalable cloud solutions for data storage, backup, and application hosting.",
    features: ["Cloud migration", "Data backup", "24/7 monitoring"]
  },
  {
    icon: Network,
    title: "Network Infrastructure",
    description: "Design, installation, and management of robust network systems.",
    features: ["Network design", "Installation & setup", "Performance optimization"]
  },
  {
    icon: Database,
    title: "Data Management",
    description: "Comprehensive data solutions including backup, recovery, and analytics.",
    features: ["Data backup strategies", "Disaster recovery", "Analytics & reporting"]
  },
  {
    icon: Wrench,
    title: "Hardware Solutions",
    description: "Complete hardware services from procurement to installation and maintenance.",
    features: ["Hardware procurement", "Installation & setup", "Repair services"]
  }
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-20 bg-light-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-charcoal mb-4">Our Technology Services</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive solutions designed to streamline your business operations and maximize efficiency.
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
