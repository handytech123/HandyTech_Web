import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { CheckCircle2, Home, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuoteThankYou() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Helmet><title>Quote Request Received | HandyTech Solutions</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-12">
        <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-600" aria-hidden="true" />
        <h1 className="mt-6 text-3xl font-bold text-slate-950 sm:text-4xl">Your quote request is complete!</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">We received your project details and uploaded media successfully. You may safely close this page.</p>
        <p className="mt-3 text-sm leading-6 text-slate-500">HandyTech will review the request and contact you using the phone number or email you provided. This request is not a final price or confirmed appointment.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="bg-brand-blue text-white hover:bg-brand-blue-dark"><Link href="/"><Home className="mr-2 h-4 w-4" />Return Home</Link></Button>
          <Button asChild variant="outline"><a href="tel:+13143254575"><Phone className="mr-2 h-4 w-4" />Call HandyTech</a></Button>
        </div>
      </section>
    </main>
  );
}
