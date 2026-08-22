import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

export default function ContactBanner() {
  return (
    <div className="bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-10 max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-1.5 sm:flex">
            <MapPin className="h-3.5 w-3.5 text-sky-400" />
            Serving the St. Louis metro area
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
            Family owned &amp; insured
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <a className="flex items-center gap-1.5 hover:text-sky-300" href="tel:+13143254575">
            <Phone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">(314) 325-4575</span>
            <span className="sm:hidden">Call</span>
          </a>
          <a className="hidden items-center gap-1.5 hover:text-sky-300 md:flex" href="mailto:contact@handytech-solutions.com">
            <Mail className="h-3.5 w-3.5" />
            contact@handytech-solutions.com
          </a>
        </div>
      </div>
    </div>
  );
}
