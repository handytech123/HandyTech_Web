import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, CheckCircle, CalendarDays, AlertCircle, User, Wrench, Loader2, ArrowRight, Tag, Shield, Network } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema } from "@shared/schema";
import { z } from "zod";
import { format, parseISO, addHours } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

interface Service {
  id: number;
  name: string;
  suggestedHours: number;
  description: string;
  active: boolean;
  category: string;
}

const SERVICE_CATEGORIES = {
  A: {
    icon: Wrench,
    title: "A — Essential Repairs & Maintenance",
    subtitle: "Service A",
    description: "Quick fixes and routine maintenance to keep your home in shape.",
  },
  B: {
    icon: Shield,
    title: "B — Home Improvement & Remodeling",
    subtitle: "Service B",
    description: "Small improvements, updates, and remodeling support.",
  },
  C: {
    icon: Network,
    title: "C — Specialized Installations & Tech Services",
    subtitle: "Service C",
    description: "Special installs, custom projects, and tech-focused work.",
  }
} as const;

type CategoryKey = keyof typeof SERVICE_CATEGORIES;

const bookingFormSchema = insertAppointmentSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  street: true,
  city: true,
  state: true,
  zip: true,
  serviceType: true,
  notes: true
}).extend({
  appointmentDate: z.date({ required_error: "Please select a date" }),
  appointmentTime: z.string().min(1, "Please select a time slot"),
  serviceId: z.number({ required_error: "Please select a service" }),
  durationHours: z.number().min(1).max(12)
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

interface AvailableSlot {
  time: string;
  displayTime: string;
}

interface AppointmentSchedulerProps {
  defaultBookingMode?: boolean;
  defaultServiceName?: string;
}

export default function AppointmentScheduler({ defaultBookingMode = false, defaultServiceName }: AppointmentSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedService, setSelectedService] = useState<Service | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<"category" | "contact" | "date" | "time">(defaultBookingMode ? "contact" : "category");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const { data: services = [], isLoading: loadingServices } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const activeServices = services.filter(service => service.active);

  const servicesByCategory = activeServices.reduce((acc, service) => {
    if (!acc[service.category as CategoryKey]) {
      acc[service.category as CategoryKey] = [];
    }
    acc[service.category as CategoryKey].push(service);
    return acc;
  }, {} as Record<CategoryKey, Service[]>);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      serviceType: "General Handyman",
      notes: "",
    }
  });

  const { data: availableSlots = [], isLoading: loadingSlots, error: slotsError } = useQuery<string[]>({
    queryKey: ["/api/availability", selectedDate?.toISOString(), selectedService?.id, selectedService?.suggestedHours],
    queryFn: async () => {
      if (!selectedDate || !selectedService) {
        throw new Error("Missing date or service selection");
      }
      const centralTz = 'America/Chicago';
      const startOfDay = fromZonedTime(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0), centralTz);
      const endOfDay = fromZonedTime(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999), centralTz);
      const queryParams = new URLSearchParams({
        from: startOfDay.toISOString(),
        to: endOfDay.toISOString(),
        hours: selectedService.suggestedHours.toString(),
        serviceId: selectedService.id.toString()
      });
      const response = await fetch(`/api/availability?${queryParams}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch slots: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      return data.slots || [];
    },
    enabled: !!selectedDate && !!selectedService && selectedService.suggestedHours > 0,
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: BookingFormData) => {
      const appointmentDateTime = format(appointmentData.appointmentDate, "yyyy-MM-dd");
      const appointmentTimeFormatted = parseISO(appointmentData.appointmentTime);
      const appointmentTimeString = format(appointmentTimeFormatted, "h:mm a");
      const payload = {
        firstName: appointmentData.firstName,
        lastName: appointmentData.lastName,
        email: appointmentData.email,
        phone: appointmentData.phone || null,
        street: appointmentData.street || null,
        city: appointmentData.city || null,
        state: appointmentData.state || null,
        zip: appointmentData.zip || null,
        serviceType: appointmentData.serviceType,
        notes: appointmentData.notes || null,
        appointmentDate: appointmentDateTime,
        appointmentTime: appointmentTimeString,
        durationHours: appointmentData.durationHours,
        serviceId: appointmentData.serviceId,
        source: "website"
      };
      const response = await apiRequest("/api/appointments", "POST", payload);
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      toast({
        title: "Appointment Booked!",
        description: "Your appointment has been successfully scheduled. You'll receive a confirmation email shortly."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const formatTimeSlots = (slots: string[]): AvailableSlot[] => {
    const centralTz = 'America/Chicago';
    return slots.map(slot => {
      try {
        const utcDate = parseISO(slot);
        const centralDate = toZonedTime(utcDate, centralTz);
        return {
          time: slot,
          displayTime: format(centralDate, "h:mm a"),
        };
      } catch (error) {
        console.error("Error formatting time slot:", slot, error);
        return null;
      }
    }).filter(slot => slot !== null) as AvailableSlot[];
  };

  const formattedSlots = formatTimeSlots(availableSlots);

  const handleCategorySelect = (category: CategoryKey) => {
    setSelectedCategory(category);
    setCurrentStep("contact");
    setSelectedService(undefined);
    setTimeout(() => {
      const contactSection = document.querySelector('[data-testid="card-contact-details"]');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      }
    }, 100);
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    form.setValue("serviceType", service.name);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setCurrentStep("time");
      setSelectedTimeSlot("");
    }
  };

  const handleTimeSelect = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    if (selectedService) {
      form.setValue("serviceId", selectedService.id);
      form.setValue("durationHours", selectedService.suggestedHours);
    }
    form.setValue("appointmentDate", selectedDate!);
    form.setValue("appointmentTime", timeSlot);
    setTimeout(() => {
      const summarySection = document.querySelector('[data-testid="card-appointment-summary"]');
      if (summarySection) {
        summarySection.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      }
    }, 100);
  };

  const onSubmit = (data: BookingFormData) => {
    bookAppointmentMutation.mutate(data);
  };

  const isReadyToSubmit = () => {
    const formData = form.getValues();
    return (
      selectedService &&
      selectedDate &&
      selectedTimeSlot &&
      formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.phone &&
      !form.formState.errors.firstName &&
      !form.formState.errors.lastName &&
      !form.formState.errors.email &&
      !form.formState.errors.phone
    );
  };

  const handleManualSubmit = () => {
    form.handleSubmit(onSubmit)();
  };

  const resetToStep = (step: "category" | "contact" | "date" | "time") => {
    setCurrentStep(step);
    if (step === "category") {
      setSelectedCategory(undefined);
      setSelectedService(undefined);
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
    } else if (step === "contact") {
      setSelectedService(undefined);
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
    } else if (step === "date") {
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
    } else if (step === "time") {
      setSelectedTimeSlot("");
    }
  };

  if (isSubmitted) {
    return (
      <section id="scheduler" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2" data-testid="text-booking-success">Appointment Booked!</h2>
              <p className="text-gray-600 mb-4">
                Your appointment has been successfully scheduled. You'll receive a confirmation email with all the details shortly.
              </p>
              <Button 
                onClick={() => {
                  setIsSubmitted(false);
                  resetToStep("category");
                }}
                data-testid="button-book-another"
              >
                Book Another Appointment
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section id="scheduler" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="bg-light-gray text-charcoal px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
            SCHEDULE SERVICE
          </div>
          <h2 className="text-4xl font-bold text-charcoal mb-4">
            Book Your <span className="text-brand-red">HandyTech Appointment</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose a time block that fits your project. Materials billed separately. Travel included within 20 miles of Hazelwood, MO.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex space-x-2 sm:space-x-4">
            {
              [
                { id: "category", label: "Category" },
                { id: "contact", label: "Contact" },
                { id: "date", label: "Date" },
                { id: "time", label: "Time" }
              ].map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      currentStep === step.id 
                        ? "bg-brand-red text-white" 
                        : (index < ["category", "contact", "date", "time"].indexOf(currentStep))
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-600"
                    }`}
                    data-testid={`step-${step.id}`}
                  >
                    {index + 1}
                  </div>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium text-gray-600">{step.label}</span>
                  {index < 3 && <ArrowRight className="ml-2 sm:ml-4 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />}
                </div>
              ))
            }
          </div>
        </div>

        <div className="space-y-6">
          {currentStep === "category" && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Tag className="h-8 w-8 text-brand-red mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-charcoal mb-2">Step 1: Choose Your Service Category</h3>
                <p className="text-gray-600">Select the category that best matches your project needs</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {Object.entries(SERVICE_CATEGORIES).map(([key, category]) => {
                  const IconComponent = category.icon;
                  return (
                    <Card
                      key={key}
                      className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${selectedCategory === key ? 'ring-2 ring-brand-red bg-red-50' : 'hover:border-brand-red'}`}
                      onClick={() => handleCategorySelect(key as CategoryKey)}
                      data-testid={`card-category-${key}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-5">
                          <div className="w-14 h-14 rounded-2xl bg-light-gray flex items-center justify-center shrink-0">
                            <IconComponent className="h-7 w-7 text-brand-red" />
                          </div>
                          <div>
                            <Badge variant="outline" className="text-brand-red border-brand-red mb-2">
                              {category.subtitle}
                            </Badge>
                            <h4 className="text-lg font-semibold text-charcoal">{category.title}</h4>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-5 leading-relaxed">{category.description}</p>
                        <Button className="w-full bg-brand-red hover:bg-red-700" data-testid={`button-category-${key}`}>
                          Book Service Now
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === "contact" && (
            <Card data-testid="card-contact-details" className="shadow-lg border-0 rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <User className="h-5 w-5 text-brand-red" />
                  Step 2: Enter Your Contact Details
                </CardTitle>
                <p className="text-sm text-gray-600">We will confirm your appointment before arrival.</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-charcoal mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Selected service
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {selectedService ? (
                      <>
                        <Badge variant="outline" className="bg-white border-brand-red text-brand-red">
                          {selectedService.name}
                        </Badge>
                        <span className="text-sm text-gray-600">{selectedService.suggestedHours} hours</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">Please choose a service before continuing.</span>
                    )}
                  </div>
                </div>

                <Form {...form}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl><Input {...field} data-testid="input-first-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl><Input {...field} data-testid="input-last-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl><Input type="email" {...field} data-testid="input-email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl><Input type="tel" {...field} value={field.value || ""} data-testid="input-phone" placeholder="(314) 325-4575" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="street" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Street Address</FormLabel>
                        <FormControl><Input {...field} placeholder="123 Main Street" data-testid="input-street" value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:col-span-2">
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl><Input {...field} placeholder="Hazelwood" data-testid="input-city" value={field.value || ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="state" render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl><Input {...field} placeholder="MO" data-testid="input-state" value={field.value || ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="zip" render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl><Input {...field} placeholder="63042" data-testid="input-zip" value={field.value || ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormItem className="md:col-span-2">
                      <FormLabel>What do you need help with?</FormLabel>
                      <Select onValueChange={(value) => {
                        const service = activeServices.find(s => s.id === parseInt(value));
                        if (service) {
                          setSelectedService(service);
                          form.setValue("serviceType", service.name);
                        }
                      }} value={selectedService?.id.toString() || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-service">
                            <SelectValue placeholder="Choose a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeServices.map((service) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {service.name} ({service.suggestedHours}h)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Optional notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Add any details, access notes, or special requests..." data-testid="textarea-notes" value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button
                      onClick={() => {
                        const formData = form.getValues();
                        if (formData.firstName && formData.lastName && formData.email && selectedService) {
                          const isValid = form.formState.isValid || (!form.formState.errors.firstName && !form.formState.errors.lastName && !form.formState.errors.email);
                          if (isValid) {
                            setCurrentStep("date");
                          } else {
                            form.trigger(["firstName", "lastName", "email"]);
                          }
                        }
                      }}
                      disabled={!form.watch("firstName") || !form.watch("lastName") || !form.watch("email") || !selectedService}
                      className="w-full bg-brand-red hover:bg-red-700 md:col-span-2"
                      data-testid="button-proceed-to-date"
                    >
                      Continue to Date Selection
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </Form>
              </CardContent>
            </Card>
          )}

          {currentStep === "date" && (
            <Card data-testid="card-date-selection">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-brand-red" />
                  Step 3: Select Date
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep("contact")} data-testid="button-change-contact">
                    Change Details
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Badge variant="outline" className="mb-2">
                    Selected: {selectedService?.name} ({selectedService?.suggestedHours}h)
                  </Badge>
                </div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < addHours(new Date(), 12) || date.getDay() === 0}
                  className="rounded-md border w-full"
                  data-testid="calendar-date-picker"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Appointments must be booked at least 12 hours in advance. Sundays are not available.
                </p>
              </CardContent>
            </Card>
          )}

          {currentStep === "time" && (
            <Card data-testid="card-time-selection">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-brand-red" />
                  Step 4: Choose Time
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep("date")} data-testid="button-change-date">
                    Change Date
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 space-y-2">
                  <Badge variant="outline">
                    Service: {selectedService?.name} ({selectedService?.suggestedHours}h)
                  </Badge>
                  <Badge variant="outline">
                    Date: {selectedDate && format(selectedDate, "EEEE, MMMM do, yyyy")}
                  </Badge>
                </div>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-red" />
                    <span className="ml-2 text-gray-600">Loading available times...</span>
                  </div>
                ) : slotsError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to load available times. Please try selecting a different date.
                    </AlertDescription>
                  </Alert>
                ) : formattedSlots.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No available times for this date. Please try a weekday (Monday-Friday) between now and next month. If you continue to see this message, please contact us directly.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {formattedSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        onClick={() => handleTimeSelect(slot.time)}
                        variant="outline"
                        className="w-full hover:bg-brand-red hover:text-white"
                        data-testid={`button-time-${slot.displayTime.replace(/[^\w]/g, '-')}`}
                      >
                        {slot.displayTime}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
