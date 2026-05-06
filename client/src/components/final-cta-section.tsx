import { Button } from "@/components/ui/button";
import { CalendarCheck, Phone, ExternalLink } from "lucide-react";

export default function FinalCtaSection() {
  const scrollToContact = () => {
    const el = document.getElementById('scheduler');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* Final CTA */}
      <section className="py-20 bg-brand-red text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
            Need a repair or installation done right?
          </h2>
          <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">
            HandyTech is ready to help. Book online or call us directly — we'll take it from there.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={scrollToContact}
              className="bg-white text-brand-red hover:bg-blue-50 font-bold text-lg px-10 py-4 rounded-xl h-auto flex items-center gap-2 justify-center shadow-lg"
            >
              <CalendarCheck className="h-5 w-5" />
              Schedule Your Appointment
            </Button>
            <a
              href="tel:3143254575"
              className="inline-flex items-center justify-center gap-2 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold text-lg px-10 py-4 rounded-xl shadow-lg transition-colors"
            >
              <Phone className="h-5 w-5" />
              Call HandyTech
            </a>
          </div>
        </div>
      </section>

      {/* Affiliate Disclosure */}
      <section className="py-8 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 mb-2">
            Prefer to purchase your own materials?{" "}
            <a
              href="https://www.homedepot.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue font-semibold hover:underline inline-flex items-center gap-1"
            >
              Browse Home Depot here
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            .
          </p>
          <p className="text-gray-400 text-xs max-w-2xl mx-auto">
            Disclosure: Some links may be affiliate links. HandyTech may earn a commission at no extra cost to you.
          </p>
        </div>
      </section>
    </>
  );
}
