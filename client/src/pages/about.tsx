import Navigation from "@/components/navigation";
import Footer from "@/components/footer";
import ChatWidget from "@/components/chat-widget";
import ThemeSwitcher from "@/components/theme-switcher";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <title>About HandyTech Solutions - Your Trusted St. Louis Handyman</title>
      <meta name="description" content="Learn about HandyTech Solutions, your trusted St. Louis handyman service. Years of experience in painting, drywall, electrical, plumbing, and custom carpentry with transparent pricing and quality craftsmanship." />
      
      <ThemeSwitcher />
      <Navigation />
      
      <main className="container mx-auto px-4 py-12">
        {/* Back to Home Button */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-[#BB0000] hover:text-[#990000] transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        {/* About Section */}
        <section className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              About HandyTech Solutions
            </h1>
            <div className="w-24 h-1 bg-[#BB0000] mx-auto"></div>
          </div>

          <div className="prose prose-lg max-w-none text-foreground/90 space-y-6">
            <p className="text-xl leading-relaxed">
              At HandyTech Solutions, we believe every home deserves quality craftsmanship, honest service, and a personal touch. Based in St. Louis, Missouri, we proudly serve our neighbors with a wide range of handyman and home improvement services — from quick repairs to full-scale remodels.
            </p>
            
            <p className="text-lg leading-relaxed">
              Our team brings years of hands-on experience in painting, drywall, electrical, plumbing, and custom carpentry. Whether it's updating a bathroom, installing a new fixture, or tackling that lingering to-do list, we approach every job with care, precision, and respect for your home.
            </p>
            
            <p className="text-lg leading-relaxed">
              We understand that trust is the foundation of any good working relationship. That's why we're committed to transparent pricing, clear communication, and getting the job done right the first time.
            </p>
            
            <p className="text-lg leading-relaxed">
              When you choose HandyTech Solutions, you're not just hiring a handyman — you're partnering with a local business that treats your home like our own.
            </p>
          </div>

          {/* Call to Action */}
          <div className="mt-12 text-center">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-foreground/80 mb-6">
                Contact us today for a free estimate on your next project.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/" 
                  className="bg-[#BB0000] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#990000] transition-colors"
                >
                  Get Free Estimate
                </Link>
                <a 
                  href="tel:(314) 325-4575" 
                  className="border-2 border-[#BB0000] text-[#BB0000] px-6 py-3 rounded-lg font-semibold hover:bg-[#BB0000] hover:text-white transition-colors"
                >
                  Call (314) 325-4575
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
}