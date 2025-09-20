import { Phone, Mail } from "lucide-react";

export default function ContactBanner() {
  return (
    <div className="bg-brand-red text-white py-6 px-4 border-b-4 border-brand-red-dark">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center space-x-6 md:space-x-12">
          
          {/* Phone */}
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <Phone className="h-6 w-6" />
            </div>
            <a href="tel:+13143254575" className="text-lg md:text-2xl lg:text-3xl font-bold hover:underline whitespace-nowrap">(314) 325-4575</a>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-white bg-opacity-30"></div>

          {/* Email */}
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <Mail className="h-6 w-6" />
            </div>
            <a href="mailto:contact@handytech-solutions.com" className="text-lg md:text-2xl lg:text-3xl font-bold hover:underline whitespace-nowrap">contact@handytech-solutions.com</a>
          </div>

          
        </div>
      </div>
    </div>
  );
}