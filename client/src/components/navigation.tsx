import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-brand-red rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <Link href="/" className="text-2xl font-bold">
                <span className="text-charcoal">HandyTech</span>
                <span className="text-brand-red ml-1 font-extrabold italic">Solutions</span>
              </Link>
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <button 
                onClick={() => scrollToSection('services')}
                className="text-charcoal hover:text-brand-red px-3 py-2 text-sm font-medium transition-colors"
              >
                Services
              </button>
              <button 
                onClick={() => scrollToSection('gallery')}
                className="text-charcoal hover:text-brand-red px-3 py-2 text-sm font-medium transition-colors"
              >
                Gallery
              </button>
              <button 
                onClick={() => scrollToSection('scheduler')}
                className="text-charcoal hover:text-brand-red px-3 py-2 text-sm font-medium transition-colors"
              >
                Schedule
              </button>
              <button 
                onClick={() => scrollToSection('testimonials')}
                className="text-charcoal hover:text-brand-red px-3 py-2 text-sm font-medium transition-colors"
              >
                Reviews
              </button>
              <a 
                href="https://www.homedepot.com/c/pro" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors mr-2"
              >
                Home Depot Pro
              </a>
              <Link href="/customer-portal">
                <Button variant="outline" size="sm" className="mr-2">
                  Customer Portal
                </Button>
              </Link>
              <button 
                onClick={() => scrollToSection('contact')}
                className="bg-brand-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-red-dark transition-colors"
              >
                Get Quote
              </button>
            </div>
          </div>
          
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col space-y-4 mt-8">
                  <button 
                    onClick={() => scrollToSection('services')}
                    className="text-left text-charcoal hover:text-brand-red py-2"
                  >
                    Services
                  </button>
                  <button 
                    onClick={() => scrollToSection('gallery')}
                    className="text-left text-charcoal hover:text-brand-red py-2"
                  >
                    Gallery
                  </button>
                  <button 
                    onClick={() => scrollToSection('scheduler')}
                    className="text-left text-charcoal hover:text-brand-red py-2"
                  >
                    Schedule
                  </button>
                  <button 
                    onClick={() => scrollToSection('testimonials')}
                    className="text-left text-charcoal hover:text-brand-red py-2"
                  >
                    Reviews
                  </button>
                  <a 
                    href="https://www.homedepot.com/c/pro" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-medium transition-colors text-center"
                  >
                    Home Depot Pro
                  </a>
                  <Link href="/customer-portal">
                    <Button variant="outline" className="w-full justify-start">
                      Customer Portal
                    </Button>
                  </Link>
                  <button 
                    onClick={() => scrollToSection('contact')}
                    className="bg-brand-red text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-red-dark transition-colors text-center"
                  >
                    Get Quote
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
