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

const coreServices = [
  { icon: Droplets, name: "Faucet Replacement", desc: "Dripping or broken faucets repaired and replaced quickly — kitchen, bath, or utility." },
  { icon: Square, name: "Drywall Repair", desc: "Holes, cracks, and damaged patches fixed and finished to a smooth, paint-ready surface." },
  { icon: Tv, name: "TV Mounting", desc: "Safe, level wall mounting for any size TV with clean cable management included." },
  { icon: DoorOpen, name: "Door Repair", desc: "Sticking, squeaking, or damaged doors adjusted, re-hung, and fixed to operate smoothly." },
  { icon: HandMetal, name: "Grab Bar Installation", desc: "Safety grab bars installed securely into studs in bathrooms and showers for added safety." },
  { icon: Lightbulb, name: "Light Fixture Replacement", desc: "Old or broken light fixtures safely swapped out — ceiling lights, vanities, and fans." },
];

const categoryConfig = [
  { category: "essential", icon: Wrench, title: "Essential Repairs & Maintenance", subtitle: "🛠️ Service A", description: "Quick fixes and routine maintenance to keep your home in top shape." },
  { category: "improvement", icon: Shield, title: "Home Improvement & Remodeling", subtitle: "🏡 Service B", description: "Enhance and modernize your living spaces with our remodeling services." },
  { category: "specialized", icon: Network, title: "Specialized Installations & Custom Projects", subtitle: "🧰 Service C", description: "Tailored solutions for unique home projects and installations." },
];

export default function ServicesSection() {
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const openBooking = (serviceName?: string) => {
    const scheduler = document.getElementById("scheduler");
    if (!scheduler) return;
    scheduler.scrollIntoView({ behavior: "smooth" });
    window.dispatchEvent(new CustomEvent("handytech:booking-service", { detail: { serviceName: serviceName || null } }));
  };

  const getServicesByCategory = (category: string) =>
    services
      .filter((s) => s.category === category && s.isActive)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((s) => s.name);

  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="bg-light-gray text-charcoal px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest inline-block mb-5">Our Services</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal mb-4">Expert HandyTech Services</h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">Your trusted home improvement experts. Over a decade of experience serving the St. Louis metro area.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {coreServices.map(({ icon: Icon, name, desc }) => (
            <Card key={name} className="border border-gray-100 hover:border-brand-red hover:shadow-lg transition-all duration-300 group rounded-xl bg-white">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="bg-light-gray group-hover:bg-brand-red w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300">
                  <Icon className="h-6 w-6 text-charcoal group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-base font-bold text-charcoal mb-2">{name}</h3>
                <p className="text-gray-500 text-sm leading-relaxed flex-1">{desc}</p>
                <Button onClick={() => openBooking(name)} variant="outline" size="sm" className="mt-5 w-full border-brand-red text-brand-red hover:bg-brand-red hover:text-white transition-colors">
                  Book Service
                </Button>
              </CardContent>
            </Card>
          ))}
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
                    {categoryServices.map((serviceName, i) => (
                      <li key={i} className="flex items-start">
                        <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed">{serviceName}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <Button onClick={() => openBooking(categoryServices[0])} variant="outline" className="w-full border-brand-red text-brand-red hover:bg-brand-red hover:text-white transition-colors">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-8 border-t border-gray-200">
                {[
                  { stat: "10+", label: "Years Experience" },
                  { stat: "500+", label: "Projects Completed" },
                  { stat: "100%", label: "Customer Satisfaction" },
                  { stat: "Fully", label: "Insured & Bonded" },
                ].map(({ stat, label }) => (
                  <div key={label} className="text-center">
                    <div className="text-2xl font-bold text-brand-red mb-1">{stat}</div>
                    <div className="text-gray-600 text-sm">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-orange-50 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-semibold inline-block mb-4">Home Depot Pro Partner</div>
            <h3 className="text-2xl font-bold text-charcoal mb-4">Professional Grade Materials & Service</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">As a trusted Home Depot Pro partner, I have access to professional-grade materials, bulk pricing, and exclusive resources.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { emoji: "💰", title: "Bulk Pricing Savings", desc: "Pass savings directly to you with contractor bulk pricing on materials." },
              { emoji: "⚡", title: "Priority Service", desc: "Faster project completion with priority access to materials and delivery." },
              { emoji: "🏆", title: "Quality Guarantee", desc: "Professional-grade materials backed by Home Depot's quality standards." },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="text-center">
                <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">{emoji}</span>
                </div>
                <h4 className="font-semibold text-charcoal mb-2">{title}</h4>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <a href="https://www.homedepot.com/c/pro" target="_blank" rel="noopener noreferrer" className="inline-flex items-center bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              Learn More About Home Depot Pro
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
