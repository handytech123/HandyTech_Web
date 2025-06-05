import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuoteSchema } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, Clock, Calculator } from "lucide-react";
import { z } from "zod";

const quoteFormSchema = insertQuoteSchema.extend({
  serviceNeeded: z.string().min(1, "Please select a service"),
});

type QuoteFormData = z.infer<typeof quoteFormSchema>;

export default function ContactSection() {
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorResult, setCalculatorResult] = useState<number | null>(null);
  const { toast } = useToast();

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      serviceNeeded: "",
      message: "",
    },
  });

  const submitQuote = useMutation({
    mutationFn: async (data: QuoteFormData) => {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to submit quote");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Quote request submitted successfully!" });
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to submit quote request", variant: "destructive" });
    },
  });

  const calculateQuote = useMutation({
    mutationFn: async (data: { serviceType: string; companySize: string; complexity: string }) => {
      const response = await fetch("/api/service-quote-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to calculate quote");
      return response.json();
    },
    onSuccess: (data) => {
      setCalculatorResult(data.estimatedPrice);
    },
  });

  const onSubmit = (data: QuoteFormData) => {
    submitQuote.mutate(data);
  };

  return (
    <section id="contact" className="py-20 bg-charcoal text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Contact Information */}
          <div>
            <h2 className="text-4xl font-bold mb-6">
              Contact Us for Expert <span className="text-brand-red">Handyman & Smart Tech Services</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              HandyTech Solutions: Your premier choice for home improvement. With 10+ years of experience, we ensure high-quality service from minor repairs to major renovations.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="bg-brand-red w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                  <Phone className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold">Phone</h3>
                  <p className="text-gray-300">(555) 123-4567</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-brand-red w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                  <Mail className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold">Email</h3>
                  <p className="text-gray-300">info@handytech-solution.com</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-brand-red w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                  <Clock className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold">Business Hours</h3>
                  <p className="text-gray-300">Mon-Fri: 8AM-6PM<br />Sat: 9AM-3PM</p>
                </div>
              </div>

              <div className="mt-8">
                <Button
                  onClick={() => setShowCalculator(!showCalculator)}
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-charcoal"
                >
                  <Calculator className="mr-2" size={16} />
                  Service Quote Calculator
                </Button>
                
                {showCalculator && (
                  <Card className="mt-4 bg-white text-charcoal">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-4">Quick Quote Calculator</h4>
                      <div className="space-y-4">
                        <Select 
                          onValueChange={(value) => {
                            const [serviceType, companySize, complexity] = ['IT Support & Maintenance', 'medium', 'medium'];
                            calculateQuote.mutate({ serviceType: value, companySize, complexity });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IT Support & Maintenance">IT Support & Maintenance</SelectItem>
                            <SelectItem value="Cybersecurity Solutions">Cybersecurity Solutions</SelectItem>
                            <SelectItem value="Cloud Services">Cloud Services</SelectItem>
                            <SelectItem value="Network Infrastructure">Network Infrastructure</SelectItem>
                          </SelectContent>
                        </Select>
                        {calculatorResult && (
                          <div className="text-center p-4 bg-light-gray rounded">
                            <p className="text-lg font-bold">Estimated Price: ${calculatorResult}</p>
                            <p className="text-sm text-gray-600">*Final pricing may vary based on specific requirements</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-xl p-8">
            <h3 className="text-2xl font-bold text-charcoal mb-6">Request Your Quote</h3>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="firstName" className="text-charcoal">First Name</Label>
                  <Input 
                    id="firstName"
                    {...form.register("firstName")}
                    className="mt-2"
                    placeholder="John"
                  />
                  {form.formState.errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-charcoal">Last Name</Label>
                  <Input 
                    id="lastName"
                    {...form.register("lastName")}
                    className="mt-2"
                    placeholder="Smith"
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="email" className="text-charcoal">Email</Label>
                <Input 
                  id="email"
                  type="email"
                  {...form.register("email")}
                  className="mt-2"
                  placeholder="john@company.com"
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="company" className="text-charcoal">Company</Label>
                <Input 
                  id="company"
                  {...form.register("company")}
                  className="mt-2"
                  placeholder="Your Company Name"
                />
              </div>
              
              <div>
                <Label className="text-charcoal">Service Needed</Label>
                <Select onValueChange={(value) => form.setValue("serviceNeeded", value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Smart Home Technologies">Smart Home Technologies</SelectItem>
                    <SelectItem value="Electrical Work">Electrical Work</SelectItem>
                    <SelectItem value="Plumbing">Plumbing</SelectItem>
                    <SelectItem value="Low Voltage Systems">Low Voltage Systems</SelectItem>
                    <SelectItem value="Painting">Painting</SelectItem>
                    <SelectItem value="General Maintenance">General Maintenance</SelectItem>
                    <SelectItem value="Monthly Maintenance Plan">Monthly Maintenance Plan</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.serviceNeeded && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.serviceNeeded.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="message" className="text-charcoal">Message</Label>
                <Textarea 
                  id="message"
                  {...form.register("message")}
                  className="mt-2"
                  rows={4}
                  placeholder="Tell us about your technology needs..."
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={submitQuote.isPending}
                className="w-full bg-brand-red text-white hover:bg-brand-red-dark py-4 text-lg font-semibold"
              >
                {submitQuote.isPending ? "Submitting..." : "Get Free Quote"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
