import { Phone, Mail } from "lucide-react";

export default function ContactBanner() {
  return (
    <div className="bg-brand-red text-white py-2 px-4 border-b-4 border-brand-red-dark">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center space-x-4 md:space-x-8">
          
          {/* Phone */}
          <div className="flex items-center space-x-2">
            <div className="bg-white bg-opacity-20 rounded p-1">
              <Phone className="h-4 w-4" />
            </div>
            <a href="tel:+13143254575" className="text-sm md:text-base font-semibold hover:underline">(314) 325-4575</a>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-white bg-opacity-30"></div>

          {/* Email */}
          <div className="flex items-center space-x-2">
            <div className="bg-white bg-opacity-20 rounded p-1">
              <Mail className="h-4 w-4" />
            </div>
            <a href="mailto:contact@handytech-solutions.com" className="text-sm md:text-base font-semibold hover:underline">contact@handytech-solutions.com</a>
          </div>

          
        </div>
      </div>
    </div>
  );
}