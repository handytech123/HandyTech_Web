import { Helmet } from "react-helmet";
import { Link, useParams } from "wouter";
import { ArrowLeft, CheckCircle, MapPin } from "lucide-react";
import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@shared/seo";
import { SERVICE_AREA_BY_SLUG } from "@shared/service-area-content";

export default function ServiceAreaDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const area = SERVICE_AREA_BY_SLUG[slug];
  if (!area) return <><Navigation /><main className="mx-auto min-h-[70vh] max-w-3xl px-4 pt-36 text-center"><h1 className="text-3xl font-bold">Service area not found</h1><Button asChild className="mt-6"><Link href="/service-areas">View service areas</Link></Button></main><Footer /></>;
  const canonical = `${SITE_URL}/service-areas/${area.slug}`;
  return <div className="min-h-screen bg-white">
    <Helmet><title>{area.title} | HandyTech Solutions</title><meta name="description" content={area.metaDescription} /><link rel="canonical" href={canonical} /></Helmet>
    <Navigation />
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-32 sm:px-6">
      <Link href="/service-areas" className="mb-8 inline-flex items-center text-sm font-semibold text-brand-primary"><ArrowLeft className="mr-2 h-4 w-4" />All service areas</Link>
      <section className="rounded-3xl bg-slate-50 p-8 sm:p-12"><p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-primary"><MapPin className="h-4 w-4" />{area.city}, Missouri</p><h1 className="mt-3 text-4xl font-bold text-slate-900 sm:text-5xl">{area.title}</h1><p className="mt-6 text-xl leading-8 text-slate-600">{area.introduction}</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><a href="/#contact">Request a Quote</a></Button><Button asChild size="lg" variant="outline"><a href="/#scheduler">Schedule Service</a></Button></div></section>
      <section className="grid gap-10 py-14 md:grid-cols-2"><div><h2 className="text-2xl font-bold">Common projects in {area.city}</h2><ul className="mt-6 space-y-3">{area.needs.map((need) => <li key={need} className="flex gap-3"><CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />{need}</li>)}</ul></div><div><h2 className="text-2xl font-bold">Explore related services</h2><div className="mt-6 grid gap-3">{area.serviceSlugs.map((serviceSlug) => <Link key={serviceSlug} href={`/services/${serviceSlug}`} className="rounded-xl border bg-white px-5 py-4 font-semibold capitalize text-brand-primary shadow-sm hover:border-brand-primary">{serviceSlug.replace(/-/g, " ")}</Link>)}</div></div></section>
      <section className="rounded-3xl border p-8 text-center sm:p-10"><h2 className="text-2xl font-bold">Tell us what you need done</h2><p className="mx-auto mt-3 max-w-2xl text-slate-600">Share the project details and photos for a quote, or choose an available service appointment online.</p><Button asChild className="mt-6" size="lg"><a href="/#contact">Start your request</a></Button></section>
    </main><Footer />
  </div>;
}
