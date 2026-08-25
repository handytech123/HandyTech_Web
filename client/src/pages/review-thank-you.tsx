import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { CheckCircle2, Home, Images } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReviewThankYou() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Helmet>
        <title>Thank You for Your Review | HandyTech Solutions</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-12">
        <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-600" aria-hidden="true" />
        <h1 className="mt-6 text-3xl font-bold text-slate-950 sm:text-4xl">Thank you for your review!</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Your review was received successfully. We appreciate you taking the time to share your HandyTech experience.
        </p>
        <p className="mt-3 text-sm text-slate-500">Your review will appear on the website after it has been approved.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="bg-brand-blue text-white hover:bg-brand-blue-dark">
            <Link href="/"><Home className="mr-2 h-4 w-4" />Return Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/gallery"><Images className="mr-2 h-4 w-4" />View Our Work</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
