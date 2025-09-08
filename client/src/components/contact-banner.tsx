import { Phone, Mail, Clock } from "lucide-react";

export default function ContactBanner() {
  return (
    <div className="bg-brand-red text-white py-4 px-6 border-b-4 border-brand-red-dark">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-center space-y-3 md:space-y-0 md:space-x-8 lg:space-x-12">
          
          {/* Phone */}
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90">Call Now</p>
              <p className="text-xl font-bold">(314) 325-4575</p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block h-12 w-px bg-white bg-opacity-30"></div>

          {/* Email */}
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90">Email Us</p>
              <p className="text-lg font-semibold">contact@handytech-solutions.com</p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block h-12 w-px bg-white bg-opacity-30"></div>

          {/* Hours */}
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90">Business Hours</p>
              <p className="text-lg font-semibold">Mon-Fri: 8AM-6PM | Sat: 9AM-3PM</p>
            </div>
          </div>
          
          {/* Divider */}
          <div className="hidden lg:block h-12 w-px bg-white bg-opacity-30"></div>
          
          {/* Family Owned & Insured */}
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <span className="text-xl">✓</span>
            </div>
            <div>
              <p className="text-sm font-medium opacity-90">Family Owned</p>
              <p className="text-lg font-semibold">Fully Insured</p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}