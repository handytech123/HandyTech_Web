import { Button } from "@/components/ui/button";
import { Wifi, Tv, Bell, Thermometer, Volume2, ArrowRight } from "lucide-react";

const techServices = [
  { icon: Tv, name: "TV Mounting & Setup", desc: "Wall-mounted, leveled, and fully set up — cables hidden." },
  { icon: Bell, name: "Smart Doorbells & Cameras", desc: "Ring, Nest, Arlo, and more installed and connected." },
  { icon: Thermometer, name: "Smart Thermostats", desc: "Ecobee, Nest, and Honeywell installed and programmed." },
  { icon: Wifi, name: "WiFi / Network Setup", desc: "Routers, mesh systems, and extenders configured for full coverage." },
  { icon: Volume2, name: "Home Audio / Video Setup", desc: "Speakers, soundbars, and AV systems installed and tuned." },
];

export default function SmartHomeSection() {
  const scrollToContact = () => {
    const el = document.getElementById('scheduler');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="tech-services" className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-block bg-brand-blue text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
              Tech Services
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-6 leading-tight">
              Smart Home &amp; Tech Services
            </h2>
            <p className="text-blue-200 text-lg leading-relaxed mb-8">
              Need help with modern home technology? We install and set up smart devices, TVs, cameras, WiFi equipment, and connected home systems.
            </p>
            <Button
              onClick={scrollToContact}
              className="bg-brand-blue hover:bg-brand-blue-dark text-white font-bold px-8 py-4 rounded-xl text-base h-auto flex items-center gap-2"
            >
              Book Tech Service
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Right: service list */}
          <div className="space-y-4">
            {techServices.map(({ icon: Icon, name, desc }) => (
              <div
                key={name}
                className="flex items-start gap-4 bg-white/10 hover:bg-white/15 transition-colors rounded-xl p-5"
              >
                <div className="bg-brand-blue rounded-lg p-2.5 flex-shrink-0">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{name}</h3>
                  <p className="text-blue-200 text-sm mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
