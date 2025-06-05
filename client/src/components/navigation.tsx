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
            <Link href="/" className="text-xl font-bold text-charcoal">
              HandyTech<span className="text-brand-red">Solutions</span>
            </Link>
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
