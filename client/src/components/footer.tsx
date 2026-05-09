import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react";
import { Link } from "wouter";
import logoPath from "@assets/handytech_logo_extracted.png";

export default function Footer() {
  return (
    <footer className="bg-brand-red text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center mb-4">
              <div className="bg-white rounded-xl p-2 mr-3">
                <img
                  src={logoPath}
                  alt="HandyTech Solutions"
                  className="h-16 w-auto object-contain"
                />
              </div>
            </div>
            <p className="text-blue-100 mb-4">
              Family-owned professional handyman services and smart home technology solutions for homes and businesses. Fully insured for your peace of mind.
            </p>
            
            {/* Home Depot Pro Partnership */}
            <div className="mb-6">
              <div className="bg-orange-600 text-white px-4 py-3 rounded-lg inline-flex items-center space-x-2">
                <span className="font-bold text-sm">🔨 HOME DEPOT PRO</span>
              </div>
              <p className="text-blue-200 text-sm mt-2">Trusted Home Depot Pro Partner</p>
              <a 
                href="https://www.homedepot.com/c/pro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-300 hover:text-orange-200 text-sm underline transition-colors"
              >
                Learn about Home Depot Pro Services
              </a>
            </div>
            
            <div className="flex space-x-4">
              <a 
                href="https://facebook.com/handytechsolutions" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-200 hover:text-white transition-colors"
                aria-label="Follow us on Facebook"
                data-testid="link-facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="https://twitter.com/handytechsolutions" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-200 hover:text-white transition-colors"
                aria-label="Follow us on Twitter"
                data-testid="link-twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="https://linkedin.com/company/handytech-solutions" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-200 hover:text-white transition-colors"
                aria-label="Connect with us on LinkedIn"
                data-testid="link-linkedin"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a 
                href="https://instagram.com/handytechsolutions" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-200 hover:text-white transition-colors"
                aria-label="Follow us on Instagram"
                data-testid="link-instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4 text-brand-blue" style={{color: '#7BB3E8'}}>Services</h4>
            <ul className="space-y-2 text-blue-100">
              <li><a href="/#services" className="hover:text-white transition-colors">General Handyman</a></li>
              <li><a href="/#services" className="hover:text-white transition-colors">Electrical Work</a></li>
              <li><a href="/#services" className="hover:text-white transition-colors">Plumbing Services</a></li>
              <li><a href="/#services" className="hover:text-white transition-colors">Smart Home Technology</a></li>
              <li><a href="/#services" className="hover:text-white transition-colors">Carpentry &amp; Repairs</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4" style={{color: '#7BB3E8'}}>Company</h4>
            <ul className="space-y-2 text-blue-100">
              <li><a href="/#testimonials" className="hover:text-white transition-colors">About Us</a></li>
              <li><Link href="/gallery" className="hover:text-white transition-colors" data-testid="link-gallery-footer">Project Gallery</Link></li>
              <li><a href="/#testimonials" className="hover:text-white transition-colors">Our Team</a></li>
              <li><a href="/#contact" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="/#contact" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4" style={{color: '#7BB3E8'}}>Support</h4>
            <ul className="space-y-2 text-blue-100">
              <li><Link href="/customer-portal" className="hover:text-white transition-colors">Customer Portal</Link></li>
              <li><Link href="/leave-review" className="hover:text-white transition-colors">Leave a Review</Link></li>
              <li><a href="/#contact" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="/#contact" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/#contact" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-700 mt-8 pt-8 text-center text-blue-200">
          <p>&copy; 2025 HandyTech Solutions. All rights reserved. | Handyman &bull; Tech Expert &bull; Renovation Specialist</p>
        </div>
      </div>
    </footer>
  );
}
