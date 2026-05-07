import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Service } from "@shared/schema";

const categoryConfig = [
  {
    category: "essential",
    title: "A — Essential Repairs & Maintenance",
  },
  {
    category: "improvement",
    title: "B — Home Improvement & Remodeling",
  },
  {
    category: "specialized",
    title: "C — Specialized Installations & Tech Services",
  },
];

export default function ServicesSection() {
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const activeServices = services.filter((s) => s.isActive);
  const quickPickServices = activeServices
    .filter((s) => s.showAsQuickPick)
    .sort((a, b) => (a.quickPickOrder || 0) - (b.quickPickOrder || 0));

  const servicesByCategory = categoryConfig.map((category) => ({
    ...category,
    services: activeServices
      .filter((service) => service.category === category.category)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
  }));

  const scrollToBooking = (serviceId?: number) => {
    const el = document.getElementById("scheduler");
    if (el) el.scrollIntoView({ behavior: "smooth" });
    if (serviceId) {
      window.dispatchEvent(new CustomEvent("handytech:select-service", { detail: { serviceId } }));
    }
  };

  return (
    <section id="services" className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="bg-light-gray text-charcoal px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest inline-block mb-4">
            Our Services
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal mb-3">Expert HandyTech Services</h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">Your trusted home improvement experts. Over a decade of experience serving the St. Louis metro area.</p>
        </div>

        <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-charcoal">Quick Picks</h3>
          </div>
          {quickPickServices.length === 0 ? (
            <p className="text-sm text-gray-500">Popular services coming soon. Call (314) 325-4575 to schedule.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {quickPickServices.map((service) => (
                <Button key={service.id} type="button" variant="outline" size="sm" onClick={() => scrollToBooking(service.id)} className="rounded-full border-gray-300 bg-white text-sm">
                  {service.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {servicesByCategory.map((categoryInfo) => (
            <Card key={categoryInfo.category} className="border border-gray-100 rounded-xl bg-white">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-charcoal mb-3">{categoryInfo.title}</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {categoryInfo.services.length === 0 ? (
                    <li className="text-gray-500">No active services in this category yet.</li>
                  ) : (
                    categoryInfo.services.map((service) => (
                      <li key={service.id} className="flex items-center justify-between gap-2">
                        <button type="button" onClick={() => scrollToBooking(service.id)} className="text-left hover:text-brand-red">
                          {service.name}
                        </button>
                        <span className="text-xs text-gray-500">{service.basePrice ? `$${service.basePrice}` : ""}</span>
                      </li>
                    ))
                  )}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
