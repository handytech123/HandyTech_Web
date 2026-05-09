import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import type { Service } from "@shared/schema";

type ServiceCategory = "essential" | "improvement" | "specialized";

const categoryConfig = [
  {
    category: "essential" as ServiceCategory,
    icon: "🛠️",
    title: "Essential Repairs & Maintenance",
    subtitle: "Service A",
    description: "Quick fixes and routine maintenance to keep your home in top shape.",
  },
  {
    category: "improvement" as ServiceCategory,
    icon: "🏡",
    title: "Home Improvement & Remodeling",
    subtitle: "Service B",
    description: "Enhance and modernize your living spaces with our remodeling services.",
  },
  {
    category: "specialized" as ServiceCategory,
    icon: "🧰",
    title: "Specialized Installations & Custom Projects",
    subtitle: "Service C",
    description: "Tailored solutions for unique home projects and installations.",
  },
];

export default function ServicesSection() {
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services", { active: "true" }],
  });

  const getServicesByCategory = (category: ServiceCategory) => {
    return services
      .filter((service) => service.category === category && (service.isActive ?? true))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((service) => service.name);
  };

  const scrollToScheduler = () => {
    const element = document.getElementById("scheduler");
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="bg-light-gray text-charcoal px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
            OUR SERVICES
          </div>
          <h2 className="text-4xl font-bold text-charcoal mb-4">Expert HandyTech Services</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your trusted home improvement experts. With over a decade of experience, we specialize in smart home
            technology, electrical, plumbing, and general maintenance services.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {categoryConfig.map((categoryInfo, index) => {
            const categoryServices = getServicesByCategory(categoryInfo.category);

            return (
              <Card
                key={index}
                className="relative bg-light-gray hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="text-3xl mb-4">{categoryInfo.icon}</div>
                    <div className="text-sm font-semibold text-brand-red mb-1">{categoryInfo.subtitle}</div>
                    <h3 className="text-xl font-bold text-charcoal mb-2">{categoryInfo.title}</h3>
                    <p className="text-gray-600">{categoryInfo.description}</p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {categoryServices.map((serviceName, serviceIndex) => (
                      <li key={serviceIndex} className="flex items-start">
                        <Check className="text-brand-red mr-3 mt-0.5 flex-shrink-0" size={16} />
                        <span className="text-sm text-gray-700">{serviceName}</span>
                      </li>
                    ))}
                    {categoryServices.length === 0 && (
                      <li className="text-sm text-gray-400 italic">Loading services...</li>
                    )}
                  </ul>

                  <Button
                    onClick={scrollToScheduler}
                    className="w-full bg-brand-red text-white hover:bg-brand-red-dark"
                  >
                    Book This Service
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
