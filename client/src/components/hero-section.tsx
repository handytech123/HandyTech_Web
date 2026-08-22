import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Hammer, Home, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoPath from "@assets/handytech_logo_extracted.png";

export default function HeroSection() {
  const scrollToSection = (sectionId: string) => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-100/60 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-24">
        <div className="text-center lg:text-left">
          <p className="mb-5 inline-flex rounded-full border border-sky-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-blue shadow-sm">
            Handyman · Smart Home · Renovation
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            One trusted expert for your <span className="text-brand-blue">home and technology.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 lg:mx-0">
            From everyday repairs to smart-home upgrades and room renovations, HandyTech Solutions brings careful workmanship and clear communication to every project.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Button onClick={() => scrollToSection("contact")} size="lg" className="bg-brand-blue px-7 text-white shadow-lg shadow-blue-900/10 hover:bg-brand-blue-dark">
              Get a Free Quote <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button asChild variant="outline" size="lg" className="border-slate-300 bg-white px-7 text-slate-800">
              <Link href="/gallery">See Recent Projects</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-medium text-slate-600 lg:justify-start">
            {["Family owned", "Fully insured", "10+ years of experience"].map((item) => (
              <span key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand-blue" />{item}</span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="rounded-3xl border border-white/80 bg-slate-950 p-7 text-white shadow-2xl shadow-slate-900/20 sm:p-9">
            <div className="rounded-2xl bg-white p-6"><img src={logoPath} alt="HandyTech Solutions" className="mx-auto w-full max-w-xs object-contain" /></div>
            <p className="mt-7 text-sm font-semibold uppercase tracking-[0.16em] text-sky-300">One call. More problems solved.</p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs font-medium text-slate-200">
              <div className="rounded-xl bg-white/10 p-3"><Hammer className="mx-auto mb-2 h-5 w-5 text-sky-300" />Repairs</div>
              <div className="rounded-xl bg-white/10 p-3"><Laptop className="mx-auto mb-2 h-5 w-5 text-sky-300" />Technology</div>
              <div className="rounded-xl bg-white/10 p-3"><Home className="mx-auto mb-2 h-5 w-5 text-sky-300" />Renovation</div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-xl sm:-left-8">
            Serving greater St. Louis
          </div>
        </div>
      </div>
    </section>
  );
}
