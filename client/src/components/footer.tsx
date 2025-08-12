import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold">H</span>
              </div>
              <h3 className="text-xl font-bold">
                <span className="text-white">HandyTech</span>
                <span className="text-brand-red ml-1 font-extrabold italic">Solutions</span>
              </h3>
            </div>
            <p className="text-gray-400 mb-4">
              Professional handyman services and smart home technology solutions for homes and businesses.
            </p>
            
            {/* Home Depot Pro Partnership */}
            <div className="mb-6">
              <div className="bg-orange-600 text-white px-4 py-3 rounded-lg inline-flex items-center space-x-2">
                <span className="font-bold text-sm">🔨 HOME DEPOT PRO</span>
              </div>
              <p className="text-gray-400 text-sm mt-2">Certified Home Depot Pro Contractor</p>
              <a 
                href="https://www.homedepot.com/c/pro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 text-sm underline transition-colors"
              >
                Learn about Home Depot Pro Services
              </a>
            </div>
            
            <div className="flex space-x-4">
              <Facebook className="h-5 w-5 text-gray-400 hover:text-brand-red cursor-pointer transition-colors" />
              <Twitter className="h-5 w-5 text-gray-400 hover:text-brand-red cursor-pointer transition-colors" />
              <Linkedin className="h-5 w-5 text-gray-400 hover:text-brand-red cursor-pointer transition-colors" />
              <Instagram className="h-5 w-5 text-gray-400 hover:text-brand-red cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Plumbing Repairs</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Electrical Work</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Smart Home Setup</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Painting & Drywall</a></li>
              <li><a href="#" className="hover:text-white transition-colors">General Repairs</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/about" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#testimonials" className="hover:text-white transition-colors">Reviews</a></li>
              <li><a href="#scheduler" className="hover:text-white transition-colors">Schedule Service</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="/customer-portal" className="hover:text-white transition-colors">Customer Portal</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/customer-portal" className="hover:text-white transition-colors">Customer Portal</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 HandyTech Solutions. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
