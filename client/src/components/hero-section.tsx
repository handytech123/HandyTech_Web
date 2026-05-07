import { Button } from "@/components/ui/button";
import logoPath from "@assets/handytech_logo_extracted.png";

export default function HeroSection() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4 text-charcoal">
              Professional <span className="text-brand-red">Handyman</span>,{" "}
              <span className="text-brand-blue">Tech Expert</span> &amp;{" "}
              <span className="text-brand-red">Renovation</span> Specialist
            </h1>
            <p className="text-xl text-gray-600 mb-6 leading-relaxed">
              Your trusted partner for home improvement and smart tech solutions in the St. Louis metro area — delivered with precision and professionalism.
            </p>
            <div className="flex items-center gap-6 mb-8 text-sm text-gray-600 justify-center lg:justify-start flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-red rounded-full"></div>
                <span>Family Owned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-red rounded-full"></div>
                <span>Fully Insured</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-red rounded-full"></div>
                <span>10+ Years Experience</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                onClick={() => scrollToSection('contact')}
                className="bg-brand-blue hover:bg-brand-blue-dark text-white px-8 py-3 rounded-lg font-semibold text-base"
              >
                Get a Free Quote
              </Button>
              <Button
                variant="outline"
                onClick={() => scrollToSection('services')}
                className="border-brand-red text-brand-red hover:bg-brand-red hover:text-white px-8 py-3 rounded-lg font-semibold text-base"
              >
                Our Services
              </Button>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 w-full">
              <img 
                src={logoPath}
                alt="HandyTech Solutions - Handyman, Tech Expert, Renovation Specialist"
                className="w-full max-w-sm mx-auto object-contain drop-shadow-xl"
              />
              <div className="mt-6 text-center">
                <p className="text-sm font-semibold tracking-widest text-gray-500 uppercase">
                  Handyman &nbsp;|&nbsp; Tech Expert &nbsp;|&nbsp; Renovation Specialist
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
