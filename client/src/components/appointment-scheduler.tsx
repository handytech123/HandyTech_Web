import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, CalendarDays } from "lucide-react";

// Declare Calendly as global for TypeScript
declare global {
  interface Window {
    Calendly: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

export default function AppointmentScheduler() {
  
  const handleBooking = (timeBlock: string, url: string) => {
    // Ensure Calendly is loaded
    if (typeof window !== 'undefined' && window.Calendly) {
      window.Calendly.initPopupWidget({ url });
    } else {
      // Fallback - open in new window if Calendly widget fails
      window.open(url, '_blank');
    }
  };

  return (
    <section id="scheduler" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="bg-light-gray text-charcoal px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
            SCHEDULE SERVICE
          </div>
          <h2 className="text-4xl font-bold text-charcoal mb-4">
            Book Your <span className="text-brand-red">HandyTech Appointment</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-2">
            Choose a time block that fits your project. Materials billed separately. Travel included within 20 miles of Hazelwood, MO.
          </p>
          <p className="text-lg text-gray-500">
            Pick your time block and we'll handle the rest with professional scheduling.
          </p>
        </div>

        {/* Time Block Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          
          {/* 2-Hour Block */}
          <Card className="bg-white border-2 border-gray-200 hover:border-brand-red hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-blue-600" size={28} />
                </div>
                <h3 className="text-2xl font-bold text-charcoal mb-2">2-Hour Handyman Block</h3>
                <p className="text-gray-600 mb-4">Best for small fixes and punch-list items.</p>
                
                <ul className="text-left text-gray-700 mb-6 space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
                    <span>Quick repairs & installs</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
                    <span>Prep or troubleshooting</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
                    <span>Minor electrical/plumbing</span>
                  </li>
                </ul>
                
                <Button
                  onClick={() => handleBooking("2h", "https://calendly.com/handytech/2h")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold rounded-lg"
                >
                  <CalendarDays className="mr-2" size={20} />
                  Book 2 Hours
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 4-Hour Block */}
          <Card className="bg-white border-2 border-brand-red hover:border-brand-red-dark hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-brand-red w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-white" size={28} />
                </div>
                <div className="bg-brand-red text-white px-3 py-1 rounded-full text-sm font-semibold mb-2 inline-block">
                  MOST POPULAR
                </div>
                <h3 className="text-2xl font-bold text-charcoal mb-2">4-Hour Handyman (Half Day)</h3>
                <p className="text-gray-600 mb-4">Great for medium projects or multiple tasks.</p>
                
                <ul className="text-left text-gray-700 mb-6 space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
                    <span>Room painting & fixture swaps</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
                    <span>Batching several repairs</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
                    <span>Tech setup & smart home</span>
                  </li>
                </ul>
                
                <Button
                  onClick={() => handleBooking("4h", "https://calendly.com/handytech/4h")}
                  className="w-full bg-brand-red hover:bg-brand-red-dark text-white py-3 text-lg font-semibold rounded-lg"
                >
                  <CalendarDays className="mr-2" size={20} />
                  Book 4 Hours
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 6-Hour Block */}
          <Card className="bg-white border-2 border-gray-200 hover:border-orange-500 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-orange-600" size={28} />
                </div>
                <h3 className="text-2xl font-bold text-charcoal mb-2">6-Hour Handyman (Full Day)</h3>
                <p className="text-gray-600 mb-4">Ideal for larger jobs or deep work.</p>
                
                <ul className="text-left text-gray-700 mb-6 space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
                    <span>Drywall, trim, or bigger installs</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
                    <span>Full-day projects start to finish</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" size={16} />
                    <span>Complex electrical/plumbing</span>
                  </li>
                </ul>
                
                <Button
                  onClick={() => handleBooking("6h", "https://calendly.com/handytech/6h")}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-lg font-semibold rounded-lg"
                >
                  <CalendarDays className="mr-2" size={20} />
                  Book 6 Hours
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Help Section */}
        <div className="text-center">
          <div className="bg-gray-50 rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-charcoal mb-3">Need Help Choosing?</h3>
            <p className="text-gray-600 mb-4">
              Book the closest time block and we'll adjust after a quick call. All appointments include a free consultation to ensure we tackle your project efficiently.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckCircle className="text-brand-red mr-1" size={16} />
                <span>Family Owned & Operated</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="text-brand-red mr-1" size={16} />
                <span>Fully Insured</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="text-brand-red mr-1" size={16} />
                <span>10+ Years Experience</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}