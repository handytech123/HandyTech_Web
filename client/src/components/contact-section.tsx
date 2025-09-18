import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuoteSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, Clock } from "lucide-react";
import { z } from "zod";

const quoteFormSchema = insertQuoteSchema.extend({
  serviceNeeded: z.string().min(1, "Please select a service"),
});

type QuoteFormData = z.infer<typeof quoteFormSchema>;

export default function ContactSection() {
  const { toast } = useToast();

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
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



  const onSubmit = (data: QuoteFormData) => {
    submitQuote.mutate(data);
  };

  return (
    <section id="contact" className="py-20 bg-light-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="bg-white text-charcoal px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
            GET IN TOUCH
          </div>
          <h2 className="text-4xl font-bold text-charcoal mb-4">
            Ready to Start Your <span className="text-brand-red">Next Project?</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            HandyTech Solutions: Your family-owned premier choice for home improvement. With 10+ years of experience and full insurance coverage, we ensure high-quality service from minor repairs to major renovations.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Contact Information */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-charcoal mb-6">Get Your Free Estimate</h3>
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center">
                  <span className="text-green-600 font-semibold">✓ Family Owned & Operated</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 font-semibold">✓ Fully Insured</span>
                  <span className="text-gray-600 ml-2">- Protected for your peace of mind</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="bg-brand-red w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                  <Phone className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal">Phone</h3>
                  <a href="tel:+13143254575" className="text-gray-600 hover:text-brand-red hover:underline">(314) 325-4575</a>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-brand-red w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                  <Mail className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal">Email</h3>
                  <a href="mailto:contact@handytech-solutions.com" className="text-gray-600 hover:text-brand-red hover:underline">contact@handytech-solutions.com</a>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-brand-red w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                  <Clock className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal">Business Hours</h3>
                  <p className="text-gray-600">Mon-Fri: 8AM-6PM<br />Sat: 9AM-3PM</p>
                </div>
              </div>


            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
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
                    data-testid="input-firstName"
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
                    data-testid="input-lastName"
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
                  data-testid="input-email"
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-charcoal">Phone Number</Label>
                <Input 
                  id="phone"
                  type="tel"
                  {...form.register("phone")}
                  className="mt-2"
                  placeholder="(314) 325-4575"
                  data-testid="input-phone"
                />
                {form.formState.errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.phone.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="company" className="text-charcoal">Company (Optional)</Label>
                <Input 
                  id="company"
                  {...form.register("company")}
                  className="mt-2"
                  placeholder="Your Company Name"
                  data-testid="input-company"
                />
              </div>
              
              {/* Address Fields */}
              <div>
                <Label htmlFor="street" className="text-charcoal">Street Address</Label>
                <Input 
                  id="street"
                  {...form.register("street")}
                  className="mt-2"
                  placeholder="123 Main Street"
                  data-testid="input-street"
                />
                {form.formState.errors.street && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.street.message}</p>
                )}
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city" className="text-charcoal">City</Label>
                  <Input 
                    id="city"
                    {...form.register("city")}
                    className="mt-2"
                    placeholder="Hazelwood"
                    data-testid="input-city"
                  />
                  {form.formState.errors.city && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.city.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="state" className="text-charcoal">State</Label>
                  <Input 
                    id="state"
                    {...form.register("state")}
                    className="mt-2"
                    placeholder="MO"
                    data-testid="input-state"
                  />
                  {form.formState.errors.state && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.state.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="zip" className="text-charcoal">ZIP Code</Label>
                  <Input 
                    id="zip"
                    {...form.register("zip")}
                    className="mt-2"
                    placeholder="63042"
                    data-testid="input-zip"
                  />
                  {form.formState.errors.zip && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.zip.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label className="text-charcoal">Service Needed</Label>
                <Select onValueChange={(value) => form.setValue("serviceNeeded", value)}>
                  <SelectTrigger className="mt-2" data-testid="select-service">
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
                <Label htmlFor="message" className="text-charcoal">Project Details</Label>
                <Textarea 
                  id="message"
                  {...form.register("message")}
                  className="mt-2"
                  rows={4}
                  placeholder="Tell us about your project needs..."
                  data-testid="textarea-message"
                />
              </div>

              <div>
                <Label htmlFor="photos" className="text-charcoal">Project Photos (Optional)</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-red transition-colors">
                  <input 
                    type="file"
                    id="photos"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const fileNames = Array.from(files).map(f => f.name).join(', ');
                        console.log('Files selected:', fileNames);
                      }
                    }}
                  />
                  <label htmlFor="photos" className="cursor-pointer">
                    <div className="space-y-2">
                      <div className="mx-auto w-12 h-12 bg-light-gray rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-gray-600">
                          <span className="font-medium text-brand-red">Click to upload photos</span> or drag and drop
                        </p>
                        <p className="text-sm text-gray-500">PNG, JPG up to 10MB each</p>
                      </div>
                    </div>
                  </label>
                </div>
                <p className="text-sm text-gray-600 mt-2">Upload photos of your project area to help us provide a more accurate quote</p>
              </div>
              
              <Button 
                type="submit" 
                disabled={submitQuote.isPending}
                className="w-full bg-brand-red text-white hover:bg-brand-red-dark py-4 text-lg font-semibold"
                data-testid="button-submit-quote"
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
