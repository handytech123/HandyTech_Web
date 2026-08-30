import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, Clock, Wrench } from "lucide-react";
import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Service } from "@shared/schema";
import { seoSlug, SITE_URL } from "@shared/seo";

export default function ServicesPage() {
  const { data: services = [], isLoading } = useQuery<Service[]>({ queryKey: ["/api/services", { active: "true" }], queryFn: () => fetch("/api/services?active=true").then((response) => response.json()) });
  const grouped = services.reduce<Record<string, Service[]>>((result, service) => { (result[service.category] ||= []).push(service); return result; }, {});

  return <div className="min-h-screen bg-slate-50">
    <Helmet><title>Handyman Services in St. Louis, MO | HandyTech Solutions</title><meta name="description" content="Explore HandyTech repair, installation, painting, carpentry, plumbing fixture, electrical fixture, and smart-home services in the St. Louis area." /><link rel="canonical" href={`${SITE_URL}/services`} /></Helmet>
    <Navigation />
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <header className="mx-auto mb-14 max-w-3xl text-center"><p className="mb-3 text-sm font-bold uppercase tracking-widest text-brand-primary">St. Louis Handyman Services</p><h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">Professional help for repairs, installations, and improvements</h1><p className="mt-5 text-lg text-slate-600">Browse our active services, learn what each one includes, and request a quote or schedule work when you are ready.</p></header>
      {isLoading ? <p className="text-center text-slate-600">Loading services…</p> : Object.entries(grouped).map(([category, items]) => <section key={category} className="mb-14"><h2 className="mb-6 capitalize text-2xl font-bold text-slate-900">{category} services</h2><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((service) => <Card key={service.id} className="flex h-full flex-col"><CardHeader><CardTitle>{service.name}</CardTitle></CardHeader><CardContent className="flex flex-1 flex-col"><p className="flex-1 text-slate-600">{service.description}</p>{service.estimatedDuration && <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Clock className="h-4 w-4" />Typical scope: {service.estimatedDuration}</p>}<Button asChild className="mt-5"><Link href={`/services/${seoSlug(service.name)}`}>View service details<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardContent></Card>)}</div></section>)}
      {!isLoading && services.length === 0 && <div className="py-16 text-center"><Wrench className="mx-auto mb-4 h-12 w-12 text-slate-400" /><h2 className="text-2xl font-semibold">Service information is being updated</h2></div>}
    </main>
    <Footer />
  </div>;
}
