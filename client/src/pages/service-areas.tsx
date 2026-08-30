import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { ArrowRight, MapPin } from "lucide-react";
import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_URL } from "@shared/seo";
import { SERVICE_AREA_CONTENT } from "@shared/service-area-content";

export default function ServiceAreasPage() {
  return <div className="min-h-screen bg-slate-50">
    <Helmet><title>St. Louis Area Handyman Service Locations | HandyTech</title><meta name="description" content="HandyTech Solutions serves St. Louis, Hazelwood, Florissant, Ferguson, and Bridgeton with professional handyman and smart-home services." /><link rel="canonical" href={`${SITE_URL}/service-areas`} /></Helmet>
    <Navigation />
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <header className="mx-auto mb-12 max-w-3xl text-center"><p className="mb-3 text-sm font-bold uppercase tracking-widest text-brand-primary">Local service you can plan online</p><h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">Handyman services across the St. Louis area</h1><p className="mt-5 text-lg text-slate-600">Choose your community to see common project types and connect with the right HandyTech service.</p></header>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{SERVICE_AREA_CONTENT.map((area) => <Card key={area.slug} className="flex h-full flex-col"><CardHeader><MapPin className="mb-3 h-7 w-7 text-brand-primary" /><CardTitle>{area.city}, Missouri</CardTitle></CardHeader><CardContent className="flex flex-1 flex-col"><p className="flex-1 text-slate-600">{area.introduction}</p><Button asChild className="mt-6"><Link href={`/service-areas/${area.slug}`}>Explore local services<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardContent></Card>)}</div>
    </main><Footer />
  </div>;
}
