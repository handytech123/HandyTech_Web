import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, CheckCircle, Clock, MapPin } from "lucide-react";
import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import type { ProjectGallery, Service } from "@shared/schema";
import { seoSlug, SITE_URL, SERVICE_AREAS } from "@shared/seo";
import { SERVICE_SEO_CONTENT, resolveServiceSlug } from "@shared/service-content";

export default function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const resolvedSlug = resolveServiceSlug(slug || "");
  const { data: services = [], isLoading } = useQuery<Service[]>({ queryKey: ["/api/services", { active: "true" }], queryFn: () => fetch("/api/services?active=true").then((response) => response.json()) });
  const { data: projectData } = useQuery<{ items: ProjectGallery[] }>({ queryKey: ["/api/gallery", "service-links"], queryFn: () => fetch("/api/gallery?page=1&limit=50").then((response) => response.json()) });
  const service = services.find((item) => seoSlug(item.name) === resolvedSlug);
  if (!isLoading && !service) return <><Navigation /><main className="mx-auto min-h-[70vh] max-w-3xl px-4 pt-36 text-center"><h1 className="text-3xl font-bold">Service not found</h1><Button asChild className="mt-6"><Link href="/services">Browse all services</Link></Button></main><Footer /></>;
  if (!service) return <main className="min-h-screen pt-40 text-center">Loading service...</main>;

  const canonical = `${SITE_URL}/services/${seoSlug(service.name)}`;
  const content = SERVICE_SEO_CONTENT[seoSlug(service.name)];
  const description = content?.metaDescription || service.description.slice(0, 160);
  const relatedProjects = (projectData?.items || []).filter((project) => project.category.toLowerCase() === service.category.toLowerCase()).slice(0, 3);
  const schema = { "@context": "https://schema.org", "@graph": [{ "@type": "Service", name: service.name, description, provider: { "@type": "LocalBusiness", name: "HandyTech Solutions", telephone: "+1-314-325-4575", url: SITE_URL }, areaServed: SERVICE_AREAS.map((name) => `${name}, MO`), url: canonical }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` }, { "@type": "ListItem", position: 3, name: service.name, item: canonical }] }] };

  return <div className="min-h-screen bg-white">
    <Helmet><title>{service.name} in St. Louis, MO | HandyTech Solutions</title><meta name="description" content={description} /><link rel="canonical" href={canonical} /><script type="application/ld+json">{JSON.stringify(schema)}</script></Helmet>
    <Navigation />
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-32 sm:px-6">
      <Link href="/services" className="mb-8 inline-flex items-center text-sm font-semibold text-brand-primary"><ArrowLeft className="mr-2 h-4 w-4" />All services</Link>
      <div className="rounded-3xl bg-slate-50 p-8 sm:p-12">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-primary">{service.category} service</p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900 sm:text-5xl">{service.name} in the St. Louis area</h1>
        <p className="mt-6 text-xl leading-8 text-slate-600">{content?.introduction || service.description}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {service.estimatedDuration && <div className="flex gap-3 rounded-xl bg-white p-4"><Clock className="h-6 w-6 text-brand-primary" /><div><strong>Typical appointment</strong><p className="text-sm text-slate-600">{service.estimatedDuration}</p></div></div>}
          <div className="flex gap-3 rounded-xl bg-white p-4"><MapPin className="h-6 w-6 text-brand-primary" /><div><strong>Service area</strong><p className="text-sm text-slate-600">St. Louis and nearby communities</p></div></div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><a href="/#contact">Request a Quote</a></Button><Button asChild size="lg" variant="outline"><a href="/#scheduler">Schedule Service</a></Button></div>
      </div>
      {content && <>
        <section className="grid gap-10 py-14 md:grid-cols-2">
          <div><h2 className="text-2xl font-bold">What this service can include</h2><ul className="mt-6 space-y-3">{content.included.map((item) => <li key={item} className="flex gap-3"><CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />{item}</li>)}</ul></div>
          <div><h2 className="text-2xl font-bold">A good fit for</h2><ul className="mt-6 space-y-3">{content.goodFor.map((item) => <li key={item} className="flex gap-3"><CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />{item}</li>)}</ul></div>
        </section>
        <section className="rounded-3xl border bg-white p-8 sm:p-10"><h2 className="text-2xl font-bold">How the project works</h2><ol className="mt-7 grid gap-5">{content.process.map((item, index) => <li key={item} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary font-bold text-white">{index + 1}</span><p className="pt-1 text-slate-700">{item}</p></li>)}</ol></section>
      </>}
      <section className="py-14"><h2 className="text-2xl font-bold">Why choose HandyTech?</h2><ul className="mt-6 grid gap-4 sm:grid-cols-2">{["Clear project communication", "Professional, careful workmanship", "Local St. Louis-area service", "Quote and scheduling options online"].map((item) => <li key={item} className="flex gap-3"><CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />{item}</li>)}</ul></section>
      {relatedProjects.length > 0 && <section className="pb-14"><h2 className="text-2xl font-bold">Related completed projects</h2><div className="mt-6 grid gap-5 sm:grid-cols-3">{relatedProjects.map((project) => <Link key={project.id} href={`/projects/${seoSlug(project.title)}`} className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><img src={project.imageUrl} alt={`${project.title} completed project`} loading="lazy" className="aspect-[4/3] w-full object-cover" /><div className="p-4"><h3 className="font-semibold text-slate-900">{project.title}</h3>{project.location && <p className="mt-1 text-sm text-slate-500">{project.location}</p>}</div></Link>)}</div></section>}
    </main>
    <Footer />
  </div>;
}
