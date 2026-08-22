import { Award, ShieldCheck } from "lucide-react";
import proReferralImage from "@assets/ProReferral-191 (1)_1758249625912.png";

export default function BadgesSection() {
  return (
    <div className="border-y border-slate-200 bg-white py-6">
      <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 sm:grid-cols-3 sm:px-6">
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50"><Award className="h-6 w-6 text-amber-600" /></div>
          <div><p className="font-bold text-slate-900">Best Handyman 2025</p><p className="text-sm text-slate-500">North County Chamber</p></div>
        </div>
        <div className="flex flex-col items-center border-slate-200 sm:border-x">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Pro Referral Provider</p>
          <a href="https://proreferral.homedepot.com/public-profile/885948" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-75">
            <img src={proReferralImage} alt="Pro Referral powered by The Home Depot" className="h-12 w-auto" />
          </a>
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50"><ShieldCheck className="h-6 w-6 text-brand-blue" /></div>
          <div><p className="font-bold text-slate-900">Local &amp; insured</p><p className="text-sm text-slate-500">Serving greater St. Louis</p></div>
        </div>
      </div>
    </div>
  );
}
