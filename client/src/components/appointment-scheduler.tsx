import { useState, useEffect } from "react";
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
import { Clock, CheckCircle, CalendarDays, AlertCircle, User, Mail, Phone, Wrench, Loader2, ArrowRight, Tag, Shield, Network } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema } from "@shared/schema";
import { z } from "zod";
import { format, parseISO, isAfter, addHours } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

// Service interface — matches actual API/DB fields
interface Service {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  category: string;
  basePrice?: number;
  priceUnit?: string;
  estimatedDuration?: string;
  displayOrder?: number;
  showAsQuickPick?: boolean;
  quickPickOrder?: number;
}

// Parse estimatedDuration string ("2-3 hours") to a usable number for scheduling
function parseDurationHours(estimatedDuration?: string | null): number {
  if (!estimatedDuration) return 2;
  const nums = estimatedDuration.match(/\d+/g);
  if (nums && nums.length > 0) {
    const maxHours = Math.max(...nums.map(Number));
    if (maxHours <= 2) return 2;
    if (maxHours <= 4) return 4;
    return 6;
  }
  return 2;
}

// Service categories configuration
const SERVICE_CATEGORIES = {
  essential: { 
    icon: Wrench,
    title: "2-Hour Tech & Quick Jobs",
    subtitle: "🛠️ Service A",
    description: "Smart installs, swaps, setups — same size as faucet/light jobs",
    hours: 2 
  },
  improvement: { 
    icon: Shield,
    title: "4-Hour Medium Jobs", 
    subtitle: "🏡 Service B",
    description: "Half-day projects or multi-device tech setups",
    hours: 4 
  },
  specialized: { 
    icon: Network,
    title: "6-Hour Large Jobs",
    subtitle: "🧰 Service C", 
    description: "Full-day jobs, remodel bundles, or heavy tech wiring",
    hours: 6 
  }
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

export default function AppointmentScheduler() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedService, setSelectedService] = useState<Service | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<"contact" | "date" | "time">("contact");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  // Fetch services from API
  const { data: services = [], isLoading: loadingServices, error: servicesError } = useQuery<Service[]>({
    queryKey: ["/api/services", { active: "true" }],
  });

  // Filter active services only
  const activeServices = services.filter(service => service.isActive !== false);
  const quickPickServices = activeServices
    .filter(service => service.showAsQuickPick)
    .sort((a, b) => (a.quickPickOrder || 0) - (b.quickPickOrder || 0));
  const allActiveServices = [...activeServices].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

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
  const selectedDuration = selectedService ? parseDurationHours(selectedService.estimatedDuration).toString() : "";

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    mode: "onChange", // Enable real-time validation
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

  // Auto-advance when arriving via "Book This Service" from the services section
  useEffect(() => {
    const preSelected = sessionStorage.getItem("bookingCategory");
    if (!preSelected) return;

    const key = preSelected as CategoryKey;
    if (!SERVICE_CATEGORIES[key]) {
      sessionStorage.removeItem("bookingCategory");
      return;
    }

    // Wait until services have loaded before advancing
    if (services.length === 0) return;

    sessionStorage.removeItem("bookingCategory");
    setSelectedCategory(key);
    setCurrentStep("contact");
    setSelectedService(undefined);

    const first = (servicesByCategory[key] || [])[0];
    if (first) {
      form.setValue("serviceType", first.name);
      form.setValue("serviceId", first.id);
      form.setValue("durationHours", parseDurationHours(first.estimatedDuration));
    }
  }, [services, servicesByCategory, form]);

  // Fetch available time slots for selected date and service
  const {
    data: availableSlots = [],
    isLoading: loadingSlots,
    error: slotsError,
    refetch: refetchSlots
  } = useQuery<string[]>({
    queryKey: ["/api/availability", selectedDate?.toISOString(), selectedService?.id, selectedService?.estimatedDuration],
    queryFn: async () => {      
      if (!selectedDate || !selectedService) {
        throw new Error("Missing date or service selection");
      }
      
      // Use Central Time for all scheduling operations
      const centralTz = 'America/Chicago';
      
      // Create start and end of day in Central Time, then convert to UTC for API
      const startOfDay = fromZonedTime(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0),
        centralTz
      );
      
      const endOfDay = fromZonedTime(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999),
        centralTz
      );
      
      const queryParams = new URLSearchParams({
        from: startOfDay.toISOString(),
        to: endOfDay.toISOString(),
        hours: parseDurationHours(selectedService.estimatedDuration).toString(),
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
    enabled: !!selectedDate && !!selectedService,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
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

  // Handle category selection
  const handleCategorySelect = (category: CategoryKey) => {
    setSelectedCategory(category);
    setCurrentStep("contact");
    // Clear previous service selection
    setSelectedService(undefined);
    
    // Add smooth scroll to ensure Step 2 contact form is visible
    setTimeout(() => {
      const contactSection = document.querySelector('[data-testid="card-contact-details"]');
      if (contactSection) {
        contactSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest' 
        });
      }
    }, 100);
  };

  // Handle service selection
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    // Update serviceType to match the selected service
    form.setValue("serviceType", service.name);
    form.setValue("serviceId", service.id);
    form.setValue("durationHours", parseDurationHours(service.estimatedDuration));
  };

  const handleServiceShortcut = (service: Service) => {
    setSelectedCategory(service.category as CategoryKey);
    handleServiceSelect(service);
    setCurrentStep("contact");
    setTimeout(() => {
      document.getElementById("scheduler")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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
  const handleTimeSelect = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    
    // Set form values but don't auto-submit - user will manually click submit
    if (selectedService) {
      form.setValue("serviceId", selectedService.id);
      form.setValue("durationHours", parseDurationHours(selectedService.estimatedDuration));
    }
    form.setValue("appointmentDate", selectedDate!);
    form.setValue("appointmentTime", timeSlot);
    
    // Scroll to appointment summary after time selection
    setTimeout(() => {
      const summarySection = document.querySelector('[data-testid="card-appointment-summary"]');
      if (summarySection) {
        summarySection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest' 
        });
      }
    }, 100);
  };

  // Handle form submission
  const onSubmit = (data: BookingFormData) => {
    bookAppointmentMutation.mutate(data);
  };

  // Check if all required fields are complete for submission
  const isReadyToSubmit = () => {
    const formData = form.getValues();
    return (
      selectedCategory &&
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

  // Handle manual submit button click
  const handleManualSubmit = () => {
    // Trigger form validation and submit if valid
    form.handleSubmit(onSubmit)();
  };

  // Reset to step
  const resetToStep = (step: "contact" | "date" | "time") => {
    setCurrentStep(step);
    if (step === "contact") {
      setSelectedCategory(undefined);
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
                  resetToStep("contact");
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
    <section id="scheduler" className="py-20 bg-white pt-24 md:pt-20">
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

        {/* Step Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2 sm:space-x-4">
            {[
              { id: "contact", label: "Contact" },
              { id: "date", label: "Date" },
              { id: "time", label: "Time" }
            ].map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep === step.id 
                      ? "bg-brand-red text-white" 
                      : (index < ["contact", "date", "time"].indexOf(currentStep))
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600"
                  }`}
                  data-testid={`step-${step.id}`}
                >
                  {index + 1}
                </div>
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium text-gray-600">{step.label}</span>
                {index < 2 && <ArrowRight className="ml-2 sm:ml-4 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content - Selection Steps */}
        <div className="space-y-6">

            {/* Step 1: Contact Information & Service Selection */}
            {currentStep === "contact" && (
              <Card data-testid="card-contact-details">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-brand-red" />
                    Step 1: Your Information & Service Selection
                    {selectedCategory && (
                      <Badge variant="outline" className="ml-2">
                        {SERVICE_CATEGORIES[selectedCategory].subtitle}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  
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
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input type="tel" {...field} value={field.value || ""} data-testid="input-phone" placeholder="(314) 325-4575" />
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
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="123 Main Street" 
                                data-testid="input-street" 
                                value={field.value || ""} 
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
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Hazelwood" 
                                  data-testid="input-city" 
                                  value={field.value || ""} 
                                />
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
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="MO" 
                                  data-testid="input-state" 
                                  value={field.value || ""} 
                                />
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
                              <FormLabel>ZIP Code</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="63042" 
                                  data-testid="input-zip" 
                                  value={field.value || ""} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormItem>
                        <FormLabel>Select Job Type</FormLabel>
                        <Select onValueChange={(value) => {
                          const service = allActiveServices.find(s => s.id === parseInt(value));
                          if (service) {
                            setSelectedCategory(service.category as CategoryKey);
                            handleServiceSelect(service);
                          }
                        }} value={selectedService?.id.toString() || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-service">
                              <SelectValue placeholder="Choose your job type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(selectedCategory ? categoryServices : allActiveServices).map((service) => (
                              <SelectItem key={service.id} value={service.id.toString()}>
                                {service.name}
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
                      Selected: {selectedService?.name} {selectedService?.estimatedDuration ? `(${selectedService.estimatedDuration})` : ""}
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
                      Service: {selectedService?.name} {selectedService?.estimatedDuration ? `(${selectedService.estimatedDuration})` : ""}
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

        {/* Appointment Summary Section - Full Width at Bottom */}
        {(selectedCategory || selectedService || selectedDate || selectedTimeSlot) && (
          <Card className="mt-8" data-testid="card-appointment-summary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-brand-red" />
                Appointment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Category</h4>
                  <div className="flex items-center gap-2">
                    {selectedCategory ? (
                      <>
                        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                          ✅ {SERVICE_CATEGORIES[selectedCategory].subtitle}
                        </Badge>
                      </>
                    ) : (
                      <span className="text-gray-400 text-sm">Not selected</span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Service</h4>
                  <div>
                    {selectedService ? (
                      <>
                        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                          ✅ {selectedService.name}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          Duration: {selectedService.estimatedDuration || "~2 hours"}
                        </p>
                      </>
                    ) : (
                      <span className="text-gray-400 text-sm">Not selected</span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Date</h4>
                  <div>
                    {selectedDate ? (
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                        ✅ {format(selectedDate, "MMM do, yyyy")}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">Not selected</span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Time</h4>
                  <div>
                    {selectedTimeSlot ? (
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                        ✅ {format(toZonedTime(parseISO(selectedTimeSlot), 'America/Chicago'), "h:mm a")} CT
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">Not selected</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Contact Information Summary */}
              {(form.watch("firstName") || form.watch("lastName") || form.watch("email")) && (
                <div className="border-t pt-4 mb-6">
                  <h4 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-medium">
                        {form.watch("firstName")} {form.watch("lastName")}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium">{form.watch("email")}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <p className="font-medium">{form.watch("phone") || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Quality Assurance Section */}
              <div className="border-t pt-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Family Owned & Operated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Fully Insured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>10+ Years Experience</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Travel Included (20mi radius)</span>
                  </div>
                </div>
              </div>
              
              {/* Book Appointment Button */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="text-sm text-gray-600">
                  {isReadyToSubmit() ? (
                    <span className="text-green-600 font-medium">✅ Ready to book your appointment!</span>
                  ) : (
                    <span>Complete all steps above to book your appointment.</span>
                  )}
                </div>
                <Button 
                  onClick={handleManualSubmit}
                  disabled={!isReadyToSubmit() || bookAppointmentMutation.isPending}
                  size="lg"
                  className="bg-brand-red hover:bg-red-700 px-8 py-3 text-lg font-semibold"
                  data-testid="button-book-appointment"
                >
                  {bookAppointmentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Booking Appointment...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Book Appointment
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}