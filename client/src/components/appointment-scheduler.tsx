import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertAppointmentSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

const appointmentFormSchema = insertAppointmentSchema.extend({
  serviceType: z.string().min(1, "Please select a service"),
  appointmentDate: z.date({
    required_error: "Please select a date",
  }),
  appointmentTime: z.string().min(1, "Please select a time"),
});

type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

const timeSlots = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
];

const serviceTypes = [
  "Tech Setup & Support",
  "Electrical Work", 
  "Plumbing",
  "Carpentry",
  "General Handyman",
  "Home Repair",
  "Appliance Installation",
  "TV/Electronics Setup"
];

export default function AppointmentScheduler() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      serviceType: "",
      appointmentTime: "",
      notes: "",
    },
  });

  const createAppointment = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          appointmentDate: data.appointmentDate.toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to create appointment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ 
        title: "Appointment Scheduled!", 
        description: "We'll contact you within 24 hours to confirm your appointment." 
      });
      form.reset();
      setSelectedDate(undefined);
    },
    onError: () => {
      toast({ 
        title: "Scheduling Failed", 
        description: "Please try again or contact us directly.",
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: AppointmentFormData) => {
    if (!selectedDate) {
      toast({ 
        title: "Date Required", 
        description: "Please select an appointment date.",
        variant: "destructive" 
      });
      return;
    }
    
    createAppointment.mutate({
      ...data,
      appointmentDate: selectedDate,
    });
  };

  return (
    <section id="scheduler" className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="bg-light-gray text-charcoal px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
            SCHEDULE SERVICE
          </div>
          <h2 className="text-4xl font-bold text-charcoal mb-4">
            Book Your <span className="text-brand-red">Service Appointment</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Book a convenient time for your handyman services. We'll confirm your appointment and provide an estimated arrival time.
          </p>
        </div>

        <Card className="bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-charcoal">Book Your Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName"
                    {...form.register("firstName")}
                    placeholder="John"
                  />
                  {form.formState.errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.firstName.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName"
                    {...form.register("lastName")}
                    placeholder="Smith"
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="john@example.com"
                  />
                  {form.formState.errors.email && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone"
                    {...form.register("phone")}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label>Service Needed</Label>
                <Select onValueChange={(value) => form.setValue("serviceType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type of service you need" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.serviceType && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.serviceType.message}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Preferred Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date() || date.getDay() === 0}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.appointmentDate && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.appointmentDate.message}</p>
                  )}
                </div>

                <div>
                  <Label>Preferred Time</Label>
                  <Select onValueChange={(value) => form.setValue("appointmentTime", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            {time}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.appointmentTime && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.appointmentTime.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Additional Details</Label>
                <Textarea 
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Please describe the work needed, location details, or any special requirements..."
                  rows={4}
                />
              </div>

              <Button 
                type="submit" 
                disabled={createAppointment.isPending}
                className="w-full bg-brand-red hover:bg-brand-red-dark text-white py-4 text-lg font-semibold"
              >
                {createAppointment.isPending ? "Scheduling..." : "Schedule Appointment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}