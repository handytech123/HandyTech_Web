import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Laptop, 
  Wrench, 
  Shield, 
  ArrowRight,
  Eye 
} from "lucide-react";

export default function ServicesSection() {
  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="bg-light-gray text-charcoal px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
            OUR SERVICES
          </div>
          <h2 className="text-4xl font-bold text-charcoal mb-4">Expert HandyTech Services</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your trusted home improvement experts. With over a decade of experience, we specialize in smart home technology, electrical, plumbing, and general maintenance services.
          </p>
        </div>
        
        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Technology & Smart Home */}
          <Card className="bg-white border-2 border-gray-100 hover:border-brand-red hover:shadow-xl transition-all duration-300 group rounded-xl">
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <div className="bg-light-gray w-16 h-16 rounded-full flex items-center justify-center mr-4 group-hover:bg-brand-red transition-colors duration-300">
                  <Laptop className="text-charcoal group-hover:text-white transition-colors duration-300" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-charcoal">Technology & Smart Home</h3>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">Smart home installations, device setup, and technology integration for modern living.</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">Smart thermostats and lighting</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">Home security systems</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">WiFi and network setup</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">TV mounting and wiring</span>
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <Button 
                  onClick={() => {
                    const element = document.getElementById('scheduler');
                    if (element) element.scrollIntoView({ behavior: 'smooth' });
                  }}
                  variant="outline" 
                  className="w-full border-brand-red text-brand-red hover:bg-brand-red hover:text-white transition-colors"
                >
                  Book This Service
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Traditional Handyman */}
          <Card className="bg-white border-2 border-gray-100 hover:border-brand-red hover:shadow-xl transition-all duration-300 group rounded-xl">
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <div className="bg-light-gray w-16 h-16 rounded-full flex items-center justify-center mr-4 group-hover:bg-brand-red transition-colors duration-300">
                  <Wrench className="text-charcoal group-hover:text-white transition-colors duration-300" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-charcoal">Traditional Handyman</h3>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">Professional plumbing, electrical, and carpentry services for all your home maintenance needs.</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">Faucet and fixture repairs</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">Electrical outlet installation</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">Drywall and painting</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">Trim and molding work</span>
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <Button 
                  onClick={() => {
                    const element = document.getElementById('scheduler');
                    if (element) element.scrollIntoView({ behavior: 'smooth' });
                  }}
                  variant="outline" 
                  className="w-full border-brand-red text-brand-red hover:bg-brand-red hover:text-white transition-colors"
                >
                  Book This Service
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* General Services */}
          <Card className="bg-white border-2 border-gray-100 hover:border-brand-red hover:shadow-xl transition-all duration-300 group rounded-xl">
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <div className="bg-light-gray w-16 h-16 rounded-full flex items-center justify-center mr-4 group-hover:bg-brand-red transition-colors duration-300">
                  <Shield className="text-charcoal group-hover:text-white transition-colors duration-300" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-charcoal">General Services</h3>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">Maintenance plans, consultations, and custom projects tailored to your specific needs.</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">Home maintenance plans</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">Project consultations</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">Custom installations</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-brand-red rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">Emergency repairs</span>
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <Button 
                  onClick={() => {
                    const element = document.getElementById('scheduler');
                    if (element) element.scrollIntoView({ behavior: 'smooth' });
                  }}
                  variant="outline" 
                  className="w-full border-brand-red text-brand-red hover:bg-brand-red hover:text-white transition-colors"
                >
                  Book This Service
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Gallery CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gray-50 rounded-2xl p-12">
            <div className="max-w-3xl mx-auto">
              <div className="bg-brand-red text-white px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
                SEE OUR CRAFTSMANSHIP
              </div>
              <h3 className="text-3xl font-bold text-charcoal mb-6">
                Quality Work Speaks for Itself
              </h3>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Don't just take our word for it. Browse our project gallery to see the exceptional quality and attention to detail that makes HandyTech Solutions the trusted choice for Missouri homeowners.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  asChild
                  size="lg" 
                  className="bg-brand-red hover:bg-brand-red-dark text-white px-8 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105"
                >
                  <Link href="/gallery" data-testid="button-view-completed-projects">
                    <Eye className="mr-2 w-5 h-5" />
                    View Completed Projects
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <div className="text-gray-500 text-sm">
                  See real projects from real customers
                </div>
              </div>
              
              {/* Trust indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-8 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-red mb-1">10+</div>
                  <div className="text-gray-600 text-sm">Years Experience</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-red mb-1">500+</div>
                  <div className="text-gray-600 text-sm">Projects Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-red mb-1">100%</div>
                  <div className="text-gray-600 text-sm">Customer Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-red mb-1">Fully</div>
                  <div className="text-gray-600 text-sm">Insured & Bonded</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Home Depot Pro Benefits Section */}
        <div className="mt-20 bg-orange-50 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-semibold inline-block mb-4">
              HOME DEPOT PRO PARTNER
            </div>
            <h3 className="text-2xl font-bold text-charcoal mb-4">
              Professional Grade Materials & Service
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              As a trusted Home Depot Pro partner, I have access to professional-grade materials, bulk pricing, and exclusive resources to deliver the best value for your projects.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">💰</span>
              </div>
              <h4 className="font-semibold text-charcoal mb-2">Bulk Pricing Savings</h4>
              <p className="text-gray-600 text-sm">Pass savings directly to you with contractor bulk pricing on materials</p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">⚡</span>
              </div>
              <h4 className="font-semibold text-charcoal mb-2">Priority Service</h4>
              <p className="text-gray-600 text-sm">Faster project completion with priority access to materials and delivery</p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🏆</span>
              </div>
              <h4 className="font-semibold text-charcoal mb-2">Quality Guarantee</h4>
              <p className="text-gray-600 text-sm">Professional-grade materials backed by Home Depot's quality standards</p>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <a 
              href="https://www.homedepot.com/c/pro" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Learn More About Home Depot Pro
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}