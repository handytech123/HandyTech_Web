import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Check, Hammer, HousePlus, Wrench } from "lucide-react";
import type { Service } from "@shared/schema";

type ServiceCategory = "essential" | "improvement" | "specialized";

const categoryConfig = [
  { category: "essential" as ServiceCategory, icon: Wrench, title: "Repairs & Maintenance", subtitle: "KEEP THINGS WORKING", description: "Quick fixes and routine maintenance that help prevent bigger problems." },
  { category: "improvement" as ServiceCategory, icon: HousePlus, title: "Home Improvement & Remodeling", subtitle: "IMPROVE YOUR SPACE", description: "Thoughtful updates that make your rooms more useful, comfortable, and polished." },
  { category: "specialized" as ServiceCategory, icon: Hammer, title: "Smart Home & Specialty Projects", subtitle: "SOLVE THE UNUSUAL", description: "Technology installs and custom solutions for projects that need a versatile expert." },
];

export default function ServicesSection() {
  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services", { active: "true" }] });
  const getServicesByCategory = (category: ServiceCategory) => services.filter((service) => service.category === category && (service.isActive ?? true)).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const bookService = (category: ServiceCategory) => {
    sessionStorage.setItem("bookingCategory", category);
    setTimeout(() => document.getElementById("scheduler")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <section id="services" className="bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mb-5 inline-block rounded-full bg-sky-50 px-4 py-2 text-xs font-bold tracking-[0.16em] text-brand-blue">OUR SERVICES</div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Practical help for the whole home</h2>
          <p className="text-lg leading-8 text-slate-600">Choose a category to see the services currently available, then book a time or request a custom quote.</p>
        </div>
        <div className="mb-12 grid gap-6 lg:grid-cols-3">
          {categoryConfig.map((categoryInfo) => {
            const categoryServices = getServicesByCategory(categoryInfo.category);
            const Icon = categoryInfo.icon;
            return (
              <Card key={categoryInfo.category} className="overflow-hidden border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <CardContent className="flex h-full flex-col p-7">
                  <div className="mb-7">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white"><Icon className="h-6 w-6" /></div>
                    <div className="mb-2 text-xs font-bold tracking-[0.14em] text-brand-blue">{categoryInfo.subtitle}</div>
                    <h3 className="mb-2 text-xl font-bold text-slate-950">{categoryInfo.title}</h3>
                    <p className="leading-6 text-slate-600">{categoryInfo.description}</p>
                  </div>
                  <ul className="mb-7 flex-1 space-y-3">
                    {categoryServices.map((service) => <li key={service.id} className="flex items-start"><Check className="mr-3 mt-0.5 h-4 w-4 flex-shrink-0 text-brand-blue" /><span className="text-sm text-slate-700">{service.name}</span></li>)}
                    {categoryServices.length === 0 && <li className="text-sm text-slate-500">Services are temporarily unavailable. Please request a quote below.</li>}
                  </ul>
                  <Button onClick={() => bookService(categoryInfo.category)} className="w-full bg-brand-blue text-white hover:bg-brand-blue-dark">Book This Service</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="rounded-2xl bg-slate-950 px-6 py-9 text-center text-white">
          <p className="mb-2 text-lg font-semibold">Don't see the service you need?</p>
          <p className="mb-6 text-slate-300">Tell us what you have in mind. We will confirm whether it is a fit and prepare a custom quote.</p>
          <button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center rounded-lg bg-white px-8 py-3 font-semibold text-slate-950 transition-colors hover:bg-sky-50">Request a Custom Quote</button>
        </div>
      </div>
    </section>
  );
}
