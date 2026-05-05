import { CalendarCheck, UserCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    icon: CalendarCheck,
    title: "Book Your Service",
    desc: "Fill out the quick booking form or call us directly. We'll find a time that works for you — often same week.",
  },
  {
    number: "02",
    icon: UserCheck,
    title: "We Confirm & Show Up",
    desc: "You'll get a confirmation and a reminder. Our tech shows up on time, ready to work — no surprises.",
  },
  {
    number: "03",
    icon: CheckCircle2,
    title: "Job Completed Right",
    desc: "We do the job cleanly and professionally. You inspect it. We don't leave until you're satisfied.",
  },
];

export default function HowItWorksSection() {
  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-block bg-light-gray text-charcoal text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
            Simple Process
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal mb-4">How It Works</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Getting help from HandyTech is straightforward. Here's what to expect.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map(({ number, icon: Icon, title, desc }) => (
            <div key={number} className="relative text-center bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="text-6xl font-extrabold text-gray-100 absolute top-4 right-6 select-none leading-none">
                {number}
              </div>
              <div className="bg-brand-red w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 relative z-10">
                <Icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-charcoal mb-3">{title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button
            onClick={scrollToContact}
            className="bg-brand-red hover:bg-brand-red-dark text-white font-bold px-10 py-4 rounded-xl text-base h-auto"
          >
            Get Started — Book Now
          </Button>
        </div>
      </div>
    </section>
  );
}
