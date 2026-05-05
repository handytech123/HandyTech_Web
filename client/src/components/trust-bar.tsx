import { Zap, Shield, Award, MapPin } from "lucide-react";

const trustPoints = [
  { icon: Zap, label: "Fast Response", desc: "Same-week scheduling available" },
  { icon: Shield, label: "Reliable Service", desc: "We show up on time, every time" },
  { icon: Award, label: "Quality Workmanship", desc: "Done right the first time" },
  { icon: MapPin, label: "Local & Trusted", desc: "Serving St. Louis since 2014" },
];

export default function TrustBar() {
  return (
    <div className="bg-white border-b border-gray-100 py-8 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {trustPoints.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 text-left">
              <div className="bg-brand-red rounded-lg p-2 flex-shrink-0 mt-0.5">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-charcoal text-sm">{label}</p>
                <p className="text-gray-500 text-xs leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
