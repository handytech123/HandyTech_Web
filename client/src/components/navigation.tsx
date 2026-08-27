import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Phone } from "lucide-react";
import logoPath from "@assets/handytech_logo_extracted.png";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    setIsOpen(false);
  };

  const sectionLinks = [
    { label: "Services", id: "services" },
    { label: "Maintenance Plans", id: "maintenance" },
    { label: "Reviews", id: "testimonials" },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="HandyTech Solutions home">
          <img src={logoPath} alt="HandyTech Solutions" className="h-11 w-auto object-contain" />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {sectionLinks.map((link) => (
            <button key={link.id} onClick={() => scrollToSection(link.id)} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-brand-blue">
              {link.label}
            </button>
          ))}
          <Link href="/gallery" className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-brand-blue">
            Projects
          </Link>
          <Link href="/customer-portal" className="ml-2">
            <Button variant="outline" size="sm">Customer Portal</Button>
          </Link>
          <button onClick={() => scrollToSection("contact")} className="ml-2 rounded-md px-3 py-2 text-sm font-medium text-brand-blue hover:bg-blue-50">
            Free Quote
          </button>
          <Button onClick={() => scrollToSection("scheduler")} size="sm" className="bg-brand-blue px-5 text-white hover:bg-brand-blue-dark">
            Book a Visit
          </Button>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <a href="tel:+13143254575" aria-label="Call HandyTech Solutions">
            <Button variant="ghost" size="icon"><Phone className="h-5 w-5" /></Button>
          </a>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation"><Menu className="h-6 w-6" /></Button>
            </SheetTrigger>
            <SheetContent>
              <div className="mt-7 flex flex-col gap-2">
                <img src={logoPath} alt="HandyTech Solutions" className="mb-5 h-14 w-auto self-start object-contain" />
                {sectionLinks.map((link) => (
                  <button key={link.id} onClick={() => scrollToSection(link.id)} className="rounded-md px-3 py-3 text-left font-medium text-slate-800 hover:bg-slate-100">
                    {link.label}
                  </button>
                ))}
                <Link href="/gallery" onClick={() => setIsOpen(false)} className="rounded-md px-3 py-3 font-medium text-slate-800 hover:bg-slate-100">Projects</Link>
                <Link href="/customer-portal" onClick={() => setIsOpen(false)} className="rounded-md px-3 py-3 font-medium text-slate-800 hover:bg-slate-100">Customer Portal</Link>
                <Button onClick={() => scrollToSection("scheduler")} className="mt-4 bg-brand-blue text-white hover:bg-brand-blue-dark">Book a Visit</Button>
                <Button onClick={() => scrollToSection("contact")} variant="outline">Request a Free Quote</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
