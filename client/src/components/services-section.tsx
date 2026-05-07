import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Droplets,
  Square,
  Tv,
  DoorOpen,
  HandMetal,
  Lightbulb,
  Wrench,
  Shield,
  Network,
  ArrowRight,
  Eye,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Service } from "@shared/schema";

const categoryConfig = [
  { category: "essential", icon: Wrench, title: "Essential Repairs & Maintenance", subtitle: "🛠️ Service A", description: "Quick fixes and routine maintenance to keep your home in top shape." },
  { category: "improvement", icon: Shield, title: "Home Improvement & Remodeling", subtitle: "🏡 Service B", description: "Enhance and modernize your living spaces with our remodeling services." },
  { category: "specialized", icon: Network, title: "Specialized Installations & Custom Projects", subtitle: "🧰 Service C", description: "Tailored solutions for unique home projects and installations." },
];

const iconMap: Record<string, typeof Droplets> = {
  Faucet: Droplets,
  "Drywall Repair": Square,
  "TV Mounting": Tv,
  "Door Repair": DoorOpen,
  "Grab Bar Installation": HandMetal,
  "Light Fixture Replacement": Lightbulb,
};

export default function ServicesSection() {
  const { data: services = [], isLoading, isError } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const visibleServices = services.filter((service) => service.isActive ?? false);

  const openBooking = (service?: Service, targetId = "scheduler") => {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth" });
    window.dispatchEvent(new CustomEvent("handytech:booking-service", { detail: { serviceName: service?.name || null, serviceId: service?.id || null } }));
  };

  const getServicesByCategory = (category: string) =>
    visibleServices
      .filter((s) => s.category === category)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  if (isError || (!isLoading && visibleServices.length === 0)) {
    return (
      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600">Services are temporarily unavailable. Please call (314) 325-4575.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="bg-light-gray text-charcoal px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest inline-block mb-5">Our Services</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal mb-4">Expert HandyTech Services</h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">Your trusted home improvement experts. Over a decade of experience serving the St. Louis metro area.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {visibleServices.map((service) => {
            const Icon = iconMap[service.name] || Wrench;
            return (
              <Card key={service.id} className="border border-gray-100 hover:border-brand-red hover:shadow-lg transition-all duration-300 group rounded-xl bg-white">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="bg-light-gray group-hover:bg-brand-red w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300">
                    <Icon className="h-6 w-6 text-charcoal group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-brand-red uppercase tracking-widest">
                    <span>{service.category}</span>
                    {service.priceUnit ? <span>• {service.priceUnit}</span> : null}
                  </div>
                  <h3 className="text-base font-bold text-charcoal mb-2">{service.name}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed flex-1">{service.description}</p>
                  <div className="mt-3 text-sm font-medium text-charcoal">{service.basePrice ? `Starting at $${service.basePrice}` : "Call for pricing"}</div>
                  <Button onClick={() => openBooking(service, "scheduler")} variant="outline" size="sm" className="mt-5 w-full border-brand-red text-brand-red hover:bg-brand-red hover:text-white transition-colors">
                    Book Service
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
          {categoryConfig.map((categoryInfo, index) => {
            const IconComponent = categoryInfo.icon;
            const categoryServices = getServicesByCategory(categoryInfo.category);
            return (
              <Card key={index} className="bg-white border-2 border-gray-100 hover:border-brand-red hover:shadow-xl transition-all duration-300 group rounded-xl">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    <div className="bg-light-gray w-16 h-16 rounded-full flex items-center justify-center mr-4 group-hover:bg-brand-red transition-colors duration-300">
                      <IconComponent className="text-charcoal group-hover:text-white transition-colors duration-300" size={24} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-brand-red mb-1">{categoryInfo.subtitle}</div>
                      <h3 className="text-lg font-bold text-charcoal">{categoryInfo.title}</h3>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">{categoryInfo.description}</p>
                  <ul className="text-sm text-gray-600 space-y-2">
                    {categoryServices.map((service) => (
                      <li key={service.id} className="flex items-start">
                        <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed">{service.name}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <Button onClick={() => openBooking(categoryServices[0], "scheduler")} variant="outline" className="w-full border-brand-red text-brand-red hover:bg-brand-red hover:text-white transition-colors">
                      Book This Service
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="bg-gray-50 rounded-2xl p-12">
            <div className="max-w-3xl mx-auto">
              <div className="bg-brand-red text-white px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">See Our Craftsmanship</div>
              <h3 className="text-3xl font-bold text-charcoal mb-6">Quality Work Speaks for Itself</h3>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">Browse our project gallery to see the exceptional quality that makes HandyTech the trusted choice for Missouri homeowners.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button asChild size="lg" className="bg-brand-red hover:bg-brand-red-dark text-white px-8 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105">
                  <Link href="/gallery" data-testid="button-view-completed-projects">
                    <Eye className="mr-2 w-5 h-5" />
                    View Completed Projects
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <div className="text-gray-500 text-sm">See real projects from real customers</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
