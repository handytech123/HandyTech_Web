import { Button } from "@/components/ui/button";
import { Phone, CalendarCheck } from "lucide-react";

export default function HeroSection() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-brand-red to-slate-800 text-white">
      <div className="absolute inset-0 bg-black/30"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-3xl">
          <div className="inline-block bg-brand-blue text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
            St. Louis Metro Area
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            Handyman Services in St. Louis
          </h1>
          <p className="text-xl sm:text-2xl text-blue-100 font-medium mb-4 leading-snug">
            Fast, reliable repairs, installations, and smart home upgrades done right.
          </p>
          <p className="text-lg text-blue-200 mb-10 leading-relaxed max-w-2xl">
            From small repairs to modern tech installs, HandyTech helps homeowners get the job done professionally and on time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <Button
              onClick={() => scrollToSection('contact')}
              className="bg-brand-blue hover:bg-brand-blue-dark text-white text-lg font-bold px-8 py-4 rounded-xl shadow-xl flex items-center gap-2 justify-center h-auto"
            >
              <CalendarCheck className="h-5 w-5" />
              Book Service Now
            </Button>
            <a
              href="tel:3143254575"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-red font-bold text-lg px-8 py-4 rounded-xl shadow-xl hover:bg-blue-50 transition-colors"
            >
              <Phone className="h-5 w-5" />
              Call (314) 325-4575
            </a>
          </div>

          <p className="text-blue-200 text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-brand-blue rounded-full inline-block"></span>
            Serving Florissant, Hazelwood, St. Louis, and surrounding areas.
          </p>
        </div>
      </div>
    </section>
  );
}
