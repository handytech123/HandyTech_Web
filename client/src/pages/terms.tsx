import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Terms of Service | HandyTech Solutions</title>
        <meta name="description" content="HandyTech Solutions service and SMS messaging terms." />
        <link rel="canonical" href="https://handytech-solutions.com/terms" />
      </Helmet>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="text-xl font-bold text-slate-950">HandyTech Solutions</Link>
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-brand-blue hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to website
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
        <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">Terms of Service</h1>
          <p className="mt-3 text-sm text-slate-500">Effective date: August 24, 2026</p>

          <div className="mt-10 space-y-8 leading-7 text-slate-700">
            <section>
              <h2 className="text-2xl font-bold text-slate-950">Website and service requests</h2>
              <p className="mt-3">This website is operated by HandyTech Solutions LLC. Website information, quote requests, and appointment requests do not create a binding service agreement. Project scope, pricing, timing, materials, warranties, and payment terms will be confirmed separately before work begins.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-950">SMS messaging program</h2>
              <p className="mt-3">Customers who voluntarily opt in may receive appointment confirmations, reminders, scheduling notices, and service-related updates from HandyTech Solutions. Messages are transactional and customer-care focused; enrollment is not required to purchase or receive services.</p>
              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>Message frequency varies based on your appointments and active service requests.</li>
                <li>Message and data rates may apply.</li>
                <li>Reply STOP to cancel text messages at any time.</li>
                <li>Reply HELP for assistance, call (314) 325-4575, or email contact@handytech-solutions.com.</li>
                <li>Carriers are not liable for delayed or undelivered messages.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-950">Consent and opting out</h2>
              <p className="mt-3">SMS consent is optional, is collected through an unchecked checkbox, and is not a condition of purchase. You may withdraw consent at any time by replying STOP. After opting out, you may receive one final message confirming the opt-out. To resume messages later, submit a new opt-in through our website or text START when that option is available.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-950">Acceptable website use</h2>
              <p className="mt-3">You agree not to misuse this website, interfere with its operation, submit false information, attempt unauthorized access, or use website content in violation of applicable law or third-party rights.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-950">Availability and limitations</h2>
              <p className="mt-3">We work to keep website information accurate and available, but content may change and uninterrupted operation is not guaranteed. To the extent permitted by law, HandyTech Solutions is not responsible for indirect or consequential losses arising solely from use of this website.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-950">Privacy</h2>
              <p className="mt-3">Our handling of personal information and SMS consent data is described in our <Link href="/privacy-policy" className="font-medium text-brand-blue underline">Privacy Policy</Link>.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-950">Contact</h2>
              <p className="mt-3">For questions about these terms or the messaging program, contact HandyTech Solutions LLC at <a className="font-medium text-brand-blue underline" href="mailto:contact@handytech-solutions.com">contact@handytech-solutions.com</a> or <a className="font-medium text-brand-blue underline" href="tel:+13143254575">(314) 325-4575</a>.</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
