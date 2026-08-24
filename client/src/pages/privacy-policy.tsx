import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Privacy Policy | HandyTech Solutions</title>
        <meta name="description" content="HandyTech Solutions privacy policy, including SMS messaging and consent practices." />
        <link rel="canonical" href="https://handytech-solutions.com/privacy-policy" />
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
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">Privacy Policy</h1>
          <p className="mt-3 text-sm text-slate-500">Effective date: August 24, 2026</p>

          <div className="mt-10 space-y-8 leading-7 text-slate-700">
            <section>
              <h2 className="text-2xl font-bold text-slate-950">Information we collect</h2>
              <p className="mt-3">HandyTech Solutions LLC collects information that you voluntarily provide when requesting a quote, scheduling service, contacting us, or using our customer portal. This may include your name, email address, telephone number, service address, project details, uploaded photos, appointment information, and communications with us.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-950">How we use information</h2>
              <p className="mt-3">We use this information to respond to inquiries, prepare estimates, schedule and provide services, communicate about appointments and active projects, maintain customer records, improve our services, protect our website, and comply with applicable law.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-950">SMS messaging and consent</h2>
              <p className="mt-3">If you voluntarily select the SMS consent checkbox on our website, HandyTech Solutions may send appointment confirmations, reminders, and service-related updates to the telephone number you provide. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time or HELP for assistance. Consent to receive text messages is not a condition of purchasing or receiving services.</p>
              <p className="mt-3 font-medium text-slate-900">All the above categories exclude text messaging originator opt-in data and consent; this information won’t be shared with any third parties.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-950">Information sharing</h2>
              <p className="mt-3">We do not sell your personal information. We may share limited information with service providers that help us operate our website, schedule work, process communications, or provide requested services, subject to appropriate confidentiality and security obligations. We may also disclose information when required by law or necessary to protect our rights and safety.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-950">Data security and retention</h2>
              <p className="mt-3">We use reasonable administrative and technical safeguards to protect personal information. We retain information only as long as reasonably necessary for business, legal, accounting, and service purposes. No internet transmission or storage system can be guaranteed completely secure.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-950">Your choices</h2>
              <p className="mt-3">You may decline SMS consent, opt out of texts by replying STOP, or contact us to request access, correction, or deletion of personal information where applicable. Opting out of SMS does not prevent us from contacting you by another method when needed to provide a requested service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-950">Contact us</h2>
              <p className="mt-3">Questions about this policy may be directed to HandyTech Solutions LLC at <a className="font-medium text-brand-blue underline" href="mailto:contact@handytech-solutions.com">contact@handytech-solutions.com</a> or <a className="font-medium text-brand-blue underline" href="tel:+13143254575">(314) 325-4575</a>.</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
