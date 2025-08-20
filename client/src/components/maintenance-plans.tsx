import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Annual Home Maintenance Checkup",
    price: 299,
    period: "year",
    icon: "🛠️",
    description: "A once-a-year professional review of your home's essential systems.",
    features: [
      "Electrical system inspection (outlets, lights, smoke detectors)",
      "Plumbing checkup (faucets, drains, toilets)",
      "HVAC filter check (filter replacement extra if needed)",
      "Safety review (handrails, trip hazards, etc.)",
      "Personalized maintenance recommendations"
    ],
    benefit: "Perfect for proactive homeowners who want to catch small issues before they become big problems."
  },
  {
    name: "Seasonal Home Maintenance",
    price: 149,
    period: "visit",
    icon: "🏡",
    description: "A hands-on maintenance visit scheduled each spring, summer, fall, or winter.",
    features: [
      "Gutters cleared (as needed)",
      "Minor repairs (small drywall fixes, faucet checks)",
      "Pressure washing (one small area)",
      "Quick home safety inspection (smoke detectors, railings)",
      "Basic seasonal prep (e.g. winterize hose bibs)"
    ],
    benefit: "Choose the season(s) that fit your needs. Great for busy homeowners who want a hassle-free home.",
    popular: true
  },
  {
    name: "On-Demand Maintenance Services",
    price: "Custom",
    period: "service",
    icon: "🔧",
    description: "No commitment — just quality, professional service when you need it.",
    features: [
      "Light fixture installation",
      "Appliance hookup and minor repairs",
      "Drywall patching and painting",
      "Smart home device setup",
      "Security system installations"
    ],
    benefit: "Pay-as-you-go with transparent pricing. Contact us for a personalized quote!"
  }
];

export default function MaintenancePlans() {
  const { toast } = useToast();
  
  const subscribeToPlan = useMutation({
    mutationFn: async (planType: string) => {
      // In a real app, this would handle customer creation/authentication
      toast({ 
        title: "Interest Recorded!", 
        description: `We'll contact you about the ${planType} plan within 24 hours.` 
      });
    }
  });

  return (
    <section id="maintenance" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="bg-light-gray text-charcoal px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
            HOMEOWNER MAINTENANCE PLANS
          </div>
          <h2 className="text-4xl font-bold text-charcoal mb-4">HandyTech Solutions – Homeowner Maintenance Plans</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect maintenance plan to keep your home running smoothly with proactive support and regular check-ups.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative hover:shadow-lg transition-shadow ${
                plan.popular ? 'bg-white shadow-xl border-2 border-brand-red' : 'bg-light-gray'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-brand-red text-white">Most Popular</Badge>
                </div>
              )}
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="text-3xl mb-4">{plan.icon}</div>
                  <h3 className="text-xl font-bold text-charcoal mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold text-brand-red mb-2">
                    {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                    <span className="text-lg text-gray-600">/{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="text-brand-red mr-3 mt-0.5 flex-shrink-0" size={16} />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="bg-light-gray p-4 rounded-lg mb-6">
                  <p className="text-sm text-gray-700 italic">👉 {plan.benefit}</p>
                </div>
                <Button 
                  onClick={() => subscribeToPlan.mutate(plan.name.toLowerCase())}
                  className="w-full bg-brand-red text-white hover:bg-brand-red-dark"
                  disabled={subscribeToPlan.isPending}
                >
                  {typeof plan.price === 'number' ? `Get Started - $${plan.price}` : 'Get Quote'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
