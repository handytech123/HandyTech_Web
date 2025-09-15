import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, CheckCircle, CalendarDays, AlertCircle, User, Mail, Phone, Wrench, Loader2, ArrowRight, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema } from "@shared/schema";
import { z } from "zod";
import { format, parseISO, isAfter, addHours } from "date-fns";

// Service interface
interface Service {
  id: number;
  name: string;
  suggestedHours: number;
  description: string;
  active: boolean;
  category: string;
}

// Service categories configuration
const SERVICE_CATEGORIES = {
  A: { label: "Category A (2-Hour Services)", description: "Quick fixes and standard replacements", hours: 2 },
  B: { label: "Category B (4-Hour Services)", description: "Medium projects and room improvements", hours: 4 },
  C: { label: "Category C (6-Hour Services)", description: "Larger projects and multi-room work", hours: 6 }
} as const;

type CategoryKey = keyof typeof SERVICE_CATEGORIES;

// Service type options
const SERVICE_TYPES = [
  "General Handyman",
  "Plumbing", 
  "Electrical",
  "Carpentry",
  "Technology Setup",
  "Appliance Installation",
  "Appliance Repair",
  "Home Security",
  "Custom Project"
] as const;

// Form schema for booking
const bookingFormSchema = insertAppointmentSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
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

export default function AppointmentScheduler() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedService, setSelectedService] = useState<Service | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<"category" | "contact" | "date" | "time">("category");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  // Fetch services from API
  const { data: services = [], isLoading: loadingServices, error: servicesError } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Filter active services only
  const activeServices = services.filter(service => service.active);

  // Group services by category
  const servicesByCategory = activeServices.reduce((acc, service) => {
    if (!acc[service.category as CategoryKey]) {
      acc[service.category as CategoryKey] = [];
    }
    acc[service.category as CategoryKey].push(service);
    return acc;
  }, {} as Record<CategoryKey, Service[]>);

  // Get services for selected category
  const categoryServices = selectedCategory ? servicesByCategory[selectedCategory] || [] : [];

  // Get selected duration from service
  const selectedDuration = selectedService?.suggestedHours.toString() || "";

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      serviceType: "General Handyman",
      notes: "",
    }
  });

  // Fetch available time slots for selected date and service
  const {
    data: availableSlots = [],
    isLoading: loadingSlots,
    error: slotsError,
    refetch: refetchSlots
  } = useQuery<string[]>({
    queryKey: ["/api/availability", selectedDate, selectedService?.id],
    queryFn: async () => {
      if (!selectedDate || !selectedService) return [];
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const queryParams = new URLSearchParams({
        from: startOfDay.toISOString(),
        to: endOfDay.toISOString(),
        hours: selectedService.suggestedHours.toString(),
        serviceId: selectedService.id.toString()
      });
      
      const response = await fetch(`/api/availability?${queryParams}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch available slots");
      }
      
      const data = await response.json();
      return data.slots || [];
    },
    enabled: !!selectedDate && !!selectedService,
  });

  // Book appointment mutation
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
        serviceType: appointmentData.serviceType,
        notes: appointmentData.notes || null,
        appointmentDate: appointmentDateTime,
        appointmentTime: appointmentTimeString,
        durationHours: appointmentData.durationHours,
        serviceId: appointmentData.serviceId,
        source: "website"
      };
      
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to book appointment");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
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

  // Format time slots for display
  const formatTimeSlots = (slots: string[]): AvailableSlot[] => {
    return slots.map(slot => {
      const date = parseISO(slot);
      return {
        time: slot,
        displayTime: format(date, "h:mm a"),
      };
    });
  };

  const formattedSlots = formatTimeSlots(availableSlots);

  // Handle category selection
  const handleCategorySelect = (category: CategoryKey) => {
    setSelectedCategory(category);
    setCurrentStep("contact");
    // Clear previous service selection
    setSelectedService(undefined);
  };

  // Handle service selection
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    // Update serviceType to match the selected service
    form.setValue("serviceType", service.name);
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setCurrentStep("time");
      setSelectedTimeSlot("");
    }
  };

  // Handle time slot selection
  const handleTimeSelect = async (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    
    // Set form values and submit since contact info is already collected
    if (selectedService) {
      form.setValue("serviceId", selectedService.id);
      form.setValue("durationHours", selectedService.suggestedHours);
    }
    form.setValue("appointmentDate", selectedDate!);
    form.setValue("appointmentTime", timeSlot);
    
    // Use proper form submission for validation and auto-submit
    form.handleSubmit(onSubmit)();
  };

  // Handle form submission
  const onSubmit = (data: BookingFormData) => {
    bookAppointmentMutation.mutate(data);
  };

  // Reset to step
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

  // Success state
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
            Follow the steps below to schedule your professional handyman service.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            {[
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
                <span className="ml-2 text-sm font-medium text-gray-600">{step.label}</span>
                {index < 3 && <ArrowRight className="ml-4 h-4 w-4 text-gray-400" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Selection Steps */}
          <div className="space-y-6">

            {/* Step 1: Category Selection */}
            {currentStep === "category" && (
              <Card data-testid="card-category-selection">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-brand-red" />
                    Step 1: Choose Service Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(SERVICE_CATEGORIES).map(([key, category]) => {
                      const categoryKey = key as CategoryKey;
                      const categoryServices = servicesByCategory[categoryKey] || [];
                      
                      return (
                        <div key={categoryKey} className="space-y-3">
                          <Button
                            onClick={() => handleCategorySelect(categoryKey)}
                            variant="outline"
                            className="w-full p-6 h-auto text-left hover:bg-brand-red hover:text-white hover:border-brand-red"
                            data-testid={`button-category-${categoryKey}`}
                          >
                            <div className="flex flex-col items-start">
                              <div className="text-lg font-semibold mb-1">{category.label}</div>
                              <div className="text-sm opacity-75">{category.description}</div>
                            </div>
                          </Button>
                          
                          {/* Service previews underneath each category */}
                          <div className="ml-4 pl-4 border-l-2 border-gray-200">
                            <p className="text-sm font-medium text-gray-600 mb-2">Services in this category:</p>
                            <div className="space-y-1">
                              {categoryServices.map((service) => (
                                <div key={service.id} className="text-sm text-gray-500">
                                  <span className="font-medium">{service.name}</span> - {service.description}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Contact Information & Service Selection */}
            {currentStep === "contact" && (
              <Card data-testid="card-contact-details">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-brand-red" />
                    Step 2: Contact Information & Service Selection
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentStep("category")}
                      data-testid="button-change-category"
                    >
                      Change Category
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Badge variant="outline" className="mb-2">
                      Selected: {selectedCategory && SERVICE_CATEGORIES[selectedCategory].label}
                    </Badge>
                  </div>
                  
                  <Form {...form}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-first-name" />
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
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-last-name" />
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
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} data-testid="input-email" />
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
                            <FormLabel>Phone Number (Optional)</FormLabel>
                            <FormControl>
                              <Input type="tel" {...field} value={field.value || ""} data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormItem>
                        <FormLabel>Select Specific Service</FormLabel>
                        <Select onValueChange={(value) => {
                          const service = categoryServices.find(s => s.id === parseInt(value));
                          if (service) handleServiceSelect(service);
                        }} value={selectedService?.id.toString() || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-service">
                              <SelectValue placeholder="Choose a service from selected category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoryServices.map((service) => (
                              <SelectItem key={service.id} value={service.id.toString()}>
                                {service.name} ({service.suggestedHours}h) - {service.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Comments (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Any specific details, preferences, or special instructions..."
                                data-testid="textarea-notes"
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        onClick={() => {
                          // Use proper form validation before advancing
                          const formData = form.getValues();
                          if (formData.firstName && formData.lastName && formData.email && selectedService) {
                            // Trigger validation to show any errors
                            const isValid = form.formState.isValid || (!form.formState.errors.firstName && !form.formState.errors.lastName && !form.formState.errors.email);
                            if (isValid) {
                              setCurrentStep("date");
                            } else {
                              // Trigger validation to show errors
                              form.trigger(["firstName", "lastName", "email"]);
                            }
                          }
                        }}
                        disabled={!form.watch("firstName") || !form.watch("lastName") || !form.watch("email") || !selectedService}
                        className="w-full bg-brand-red hover:bg-red-700"
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

            {/* Step 3: Date Selection */}
            {currentStep === "date" && (
              <Card data-testid="card-date-selection">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-brand-red" />
                    Step 3: Select Date
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentStep("contact")}
                      data-testid="button-change-contact"
                    >
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
                    disabled={(date) => 
                      date < addHours(new Date(), 12) || 
                      date.getDay() === 0 // Disable Sundays
                    }
                    className="rounded-md border w-full"
                    data-testid="calendar-date-picker"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Appointments must be booked at least 12 hours in advance. Sundays are not available.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Time Selection */}
            {currentStep === "time" && (
              <Card data-testid="card-time-selection">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-brand-red" />
                    Step 4: Choose Time
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentStep("date")}
                      data-testid="button-change-date"
                    >
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
                        No available times for this date. Please select a different date.
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

          {/* Right Column - Appointment Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6" data-testid="card-appointment-summary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-brand-red" />
                  Appointment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {selectedCategory && (
                  <div className="flex items-center gap-3">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="font-medium">Category: </span>
                      <span data-testid="text-selected-category">
                        {SERVICE_CATEGORIES[selectedCategory].label}
                      </span>
                    </div>
                  </div>
                )}

                {selectedService && (
                  <div className="flex items-center gap-3">
                    <Wrench className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="font-medium">Service: </span>
                      <span data-testid="text-selected-service">
                        {selectedService.name} ({selectedService.suggestedHours}h)
                      </span>
                    </div>
                  </div>
                )}

                {selectedDate && (
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="font-medium">Date: </span>
                      <span data-testid="text-selected-date">
                        {format(selectedDate, "EEEE, MMMM do, yyyy")}
                      </span>
                    </div>
                  </div>
                )}

                {selectedTimeSlot && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="font-medium">Time: </span>
                      <span data-testid="text-selected-time">
                        {format(parseISO(selectedTimeSlot), "h:mm a")}
                      </span>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Family Owned & Operated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Fully Insured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>10+ Years Experience</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Travel Included (20mi radius)</span>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}