import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
import { insertQuoteSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import AddressAutocomplete from "@/components/address-autocomplete";

// Form schema for maintenance plan contact form
const maintenancePlanContactSchema = insertQuoteSchema.extend({
  serviceNeeded: z.string().min(1, "Service selection is required"),
});

type MaintenancePlanContactData = z.infer<typeof maintenancePlanContactSchema>;

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

// Contact form component for maintenance plans
function MaintenancePlanContactForm({ plan, onSuccess }: { plan: typeof plans[0], onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<MaintenancePlanContactData>({
    resolver: zodResolver(maintenancePlanContactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      serviceNeeded: plan.name,
      message: "",
    },
  });

  const submitContact = useMutation({
    mutationFn: async (data: MaintenancePlanContactData) => {
      return apiRequest("/api/quotes", "POST", data);
    },
    onSuccess: () => {
      toast({ 
        title: "Request Submitted Successfully!", 
        description: `Thank you! We'll contact you about the ${plan.name} plan within 24 hours.` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      form.reset();
      onSuccess();
    },
    onError: () => {
      toast({ 
        title: "Submission Failed", 
        description: "Unable to submit your request. Please try again.",
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: MaintenancePlanContactData) => {
    submitContact.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input data-testid="input-firstName" placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input data-testid="input-lastName" placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address *</FormLabel>
              <FormControl>
                <Input data-testid="input-email" type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number *</FormLabel>
              <FormControl>
                <Input data-testid="input-phone" type="tel" placeholder="(314) 325-4575" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company (Optional)</FormLabel>
              <FormControl>
                <Input data-testid="input-company" placeholder="Your Company Name" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Address Fields */}
        <FormField
          control={form.control}
          name="street"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Street Address *</FormLabel>
              <FormControl>
                <AddressAutocomplete
                  value={field.value || ""}
                  onChange={field.onChange}
                  onAddressSelect={(address) => {
                    field.onChange(address.street);
                    form.setValue("city", address.city, { shouldValidate: true });
                    form.setValue("state", address.state, { shouldValidate: true });
                    form.setValue("zip", address.zip, { shouldValidate: true });
                  }}
                  placeholder="Start typing the service address"
                  testId="input-street"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input data-testid="input-city" placeholder="Hazelwood" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State *</FormLabel>
                <FormControl>
                  <Input data-testid="input-state" placeholder="MO" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="zip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP Code *</FormLabel>
                <FormControl>
                  <Input data-testid="input-zip" placeholder="63042" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Details (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  data-testid="textarea-message"
                  placeholder="Tell us about your specific needs or any questions you have..."
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="bg-light-gray p-4 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Selected Plan:</strong> {plan.name}
            {typeof plan.price === 'number' ? ` - $${plan.price}/${plan.period}` : ' - Custom Pricing'}
          </p>
        </div>

        <Button 
          type="submit" 
          data-testid="button-submit-contact"
          className="w-full bg-brand-primary text-white hover:bg-brand-primary-dark"
          disabled={submitContact.isPending}
        >
          {submitContact.isPending ? "Submitting..." : "Submit Request"}
        </Button>
      </form>
    </Form>
  );
}

export default function MaintenancePlans() {
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handlePlanSelection = (plan: typeof plans[0]) => {
    setSelectedPlan(plan);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setSelectedPlan(null);
  };

  return (
    <>
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
                  plan.popular ? 'bg-white shadow-xl border-2 border-brand-primary' : 'bg-light-gray'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-brand-primary text-white">Most Popular</Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="text-3xl mb-4">{plan.icon}</div>
                    <h3 className="text-xl font-bold text-charcoal mb-2">{plan.name}</h3>
                    <div className="text-3xl font-bold text-brand-primary mb-2">
                      {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                      <span className="text-lg text-gray-600">/{plan.period}</span>
                    </div>
                    <p className="text-gray-600">{plan.description}</p>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="text-brand-primary mr-3 mt-0.5 flex-shrink-0" size={16} />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="bg-light-gray p-4 rounded-lg mb-6">
                    <p className="text-sm text-gray-700 italic">👉 {plan.benefit}</p>
                  </div>
                  <Button 
                    onClick={() => handlePlanSelection(plan)}
                    data-testid={`button-plan-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="w-full bg-brand-primary text-white hover:bg-brand-primary-dark"
                  >
                    {typeof plan.price === 'number' ? `Get Started - $${plan.price}` : 'Get Quote'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Get Started with {selectedPlan?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <MaintenancePlanContactForm 
              plan={selectedPlan} 
              onSuccess={handleSuccess} 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
