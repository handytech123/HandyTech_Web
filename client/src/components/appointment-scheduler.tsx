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
import { Clock, CheckCircle, CalendarDays, AlertCircle, User, Mail, Phone, Wrench, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema } from "@shared/schema";
import { z } from "zod";
import { format, parseISO, isAfter, addHours } from "date-fns";

// Duration options for appointment booking
const DURATION_OPTIONS = [
  { value: "2", label: "2-Hour Block", description: "Quick repairs & installs", price: "Best for small fixes", color: "blue" },
  { value: "4", label: "4-Hour Half Day", description: "Medium projects & multiple tasks", price: "Most Popular", color: "red" },
  { value: "6", label: "6-Hour Full Day", description: "Large jobs & deep work", price: "Complex projects", color: "orange" }
] as const;

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
  duration: z.enum(["2", "4", "6"], { required_error: "Please select a duration" })
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

interface AvailableSlot {
  time: string;
  displayTime: string;
}

export default function AppointmentScheduler() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedDuration, setSelectedDuration] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<"duration" | "date" | "time" | "details">("duration");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      serviceType: "General Handyman",
      notes: "",
    }
  });

  // Fetch available time slots for selected date and duration
  const {
    data: availableSlots = [],
    isLoading: loadingSlots,
    error: slotsError,
    refetch: refetchSlots
  } = useQuery<string[]>({
    queryKey: ["/api/availability", selectedDate, selectedDuration],
    queryFn: async () => {
      if (!selectedDate || !selectedDuration) return [];
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const queryParams = new URLSearchParams({
        from: startOfDay.toISOString(),
        to: endOfDay.toISOString(),
        hours: selectedDuration
      });
      
      const response = await fetch(`/api/availability?${queryParams}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch available slots");
      }
      
      const data = await response.json();
      return data.slots || [];
    },
    enabled: !!selectedDate && !!selectedDuration,
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
        durationHours: Number(appointmentData.duration),
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

  // Handle duration selection
  const handleDurationSelect = (duration: string) => {
    setSelectedDuration(duration);
    setCurrentStep("date");
    setSelectedDate(undefined);
    setSelectedTimeSlot("");
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
    setCurrentStep("details");
    
    // Set form values
    form.setValue("duration", selectedDuration as "2" | "4" | "6");
    form.setValue("appointmentDate", selectedDate!);
    form.setValue("appointmentTime", timeSlot);
  };

  // Handle form submission
  const onSubmit = (data: BookingFormData) => {
    bookAppointmentMutation.mutate(data);
  };

  // Reset to step
  const resetToStep = (step: "duration" | "date" | "time" | "details") => {
    setCurrentStep(step);
    if (step === "duration") {
      setSelectedDuration("");
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
                  resetToStep("duration");
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
              { id: "duration", label: "Duration" },
              { id: "date", label: "Date" },
              { id: "time", label: "Time" },
              { id: "details", label: "Details" }
            ].map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep === step.id 
                      ? "bg-brand-red text-white" 
                      : (index < ["duration", "date", "time", "details"].indexOf(currentStep))
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

            {/* Step 1: Duration Selection */}
            {currentStep === "duration" && (
              <Card data-testid="card-duration-selection">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-brand-red" />
                    Step 1: Choose Appointment Duration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {DURATION_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      onClick={() => handleDurationSelect(option.value)}
                      variant="outline"
                      className={`w-full p-6 h-auto text-left ${
                        option.color === "red" ? "border-brand-red hover:bg-brand-red hover:text-white" : 
                        option.color === "blue" ? "border-blue-500 hover:bg-blue-500 hover:text-white" :
                        "border-orange-500 hover:bg-orange-500 hover:text-white"
                      }`}
                      data-testid={`button-duration-${option.value}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-semibold text-lg">{option.label}</div>
                          <div className="text-sm opacity-75">{option.description}</div>
                          {option.price === "Most Popular" && (
                            <Badge className="mt-1 bg-brand-red text-white">{option.price}</Badge>
                          )}
                        </div>
                        <Clock className="h-8 w-8 opacity-60" />
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Date Selection */}
            {currentStep === "date" && (
              <Card data-testid="card-date-selection">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-brand-red" />
                    Step 2: Select Date
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => resetToStep("duration")}
                      data-testid="button-change-duration"
                    >
                      Change Duration
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Badge variant="outline" className="mb-2">
                      Selected: {DURATION_OPTIONS.find(d => d.value === selectedDuration)?.label}
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

            {/* Step 3: Time Selection */}
            {currentStep === "time" && (
              <Card data-testid="card-time-selection">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-brand-red" />
                    Step 3: Choose Time
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => resetToStep("date")}
                      data-testid="button-change-date"
                    >
                      Change Date
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 space-y-2">
                    <Badge variant="outline">
                      Duration: {DURATION_OPTIONS.find(d => d.value === selectedDuration)?.label}
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

            {/* Step 4: Details Form */}
            {currentStep === "details" && (
              <Card data-testid="card-details-form">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-brand-red" />
                    Step 4: Your Details
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => resetToStep("time")}
                      data-testid="button-change-time"
                    >
                      Change Time
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                      <FormField
                        control={form.control}
                        name="serviceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Needed</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-service-type">
                                  <SelectValue placeholder="Select service type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SERVICE_TYPES.map((service) => (
                                  <SelectItem key={service} value={service}>
                                    {service}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""}
                                placeholder="Describe your project or any specific requirements..."
                                data-testid="textarea-notes"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full bg-brand-red hover:bg-brand-red-dark"
                        disabled={bookAppointmentMutation.isPending}
                        data-testid="button-confirm-booking"
                      >
                        {bookAppointmentMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Booking Appointment...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirm Booking
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
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
                
                {selectedDuration && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="font-medium">Duration: </span>
                      <span data-testid="text-selected-duration">
                        {DURATION_OPTIONS.find(d => d.value === selectedDuration)?.label}
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

                {currentStep === "duration" && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Select your appointment duration to get started. All time blocks include travel within 20 miles of Hazelwood, MO.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}