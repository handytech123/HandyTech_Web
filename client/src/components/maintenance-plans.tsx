import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Basic",
    price: 99,
    description: "Perfect for small businesses",
    features: [
      "Monthly system checkup",
      "Basic security updates", 
      "Email support",
      "Performance monitoring",
      "Backup verification"
    ]
  },
  {
    name: "Professional",
    price: 199,
    description: "Ideal for growing companies",
    features: [
      "Bi-weekly system checkup",
      "Advanced security monitoring",
      "Priority phone support",
      "Real-time monitoring",
      "Automated backups",
      "Monthly reports"
    ],
    popular: true
  },
  {
    name: "Enterprise", 
    price: 399,
    description: "For large organizations",
    features: [
      "Weekly system checkup",
      "Enterprise security suite",
      "24/7 dedicated support",
      "Proactive monitoring",
      "Redundant backups",
      "Custom integrations"
    ]
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
          <h2 className="text-4xl font-bold text-charcoal mb-4">Monthly Maintenance Plans</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect maintenance plan to keep your technology running smoothly with proactive support and regular check-ups.
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
                  <h3 className="text-2xl font-bold text-charcoal mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold text-brand-red mb-2">
                    ${plan.price}<span className="text-lg text-gray-600">/month</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="text-brand-red mr-3" size={20} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => subscribeToPlan.mutate(plan.name.toLowerCase())}
                  className="w-full bg-brand-red text-white hover:bg-brand-red-dark"
                  disabled={subscribeToPlan.isPending}
                >
                  Choose {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
