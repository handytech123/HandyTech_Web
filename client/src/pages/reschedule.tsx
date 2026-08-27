import { useState } from "react";
import { useParams } from "wouter";
import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarDays, 
  Clock, 
  User, 
  Wrench, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  Home
} from "lucide-react";
import { Link } from "wouter";
import { format, parseISO, isAfter, addHours } from "date-fns";

interface AppointmentDetails {
  id: number;
  title: string;
  start: string;
  end: string;
  hours: number;
}

interface AvailableSlot {
  time: string;
  displayTime: string;
}

export default function ReschedulePage() {
  const { token } = useParams<{ token: string }>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  // Fetch appointment details
  const { 
    data: appointment, 
    isLoading: loadingAppointment, 
    error: appointmentError 
  } = useQuery<AppointmentDetails>({
    queryKey: ["/api/reschedule", token],
    queryFn: async () => {
      const response = await fetch(`/api/reschedule/${token}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch appointment");
      }
      return response.json();
    },
    enabled: !!token,
  });

  // Fetch available time slots for selected date
  const { 
    data: availableSlots = [], 
    isLoading: loadingSlots,
    error: slotsError 
  } = useQuery<string[]>({
    queryKey: ["/api/availability", selectedDate, appointment?.hours],
    queryFn: async () => {
      if (!selectedDate || !appointment) return [];
      
      // API expects from/to as ISO datetime strings and hours as "2", "4", or "6"
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Convert hours to the format expected by API ("2", "4", or "6")
      const hours = Math.round(appointment.hours);
      const hoursStr = hours.toString();
      
      // Validate that hours is one of the accepted values
      if (!["2", "4", "6"].includes(hoursStr)) {
        throw new Error(`Unsupported appointment duration: ${hours} hours`);
      }
      
      const queryParams = new URLSearchParams({
        from: startOfDay.toISOString(),
        to: endOfDay.toISOString(),
        hours: hoursStr
      });
      
      const response = await fetch(`/api/availability?${queryParams}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch available slots");
      }
      
      const data = await response.json();
      return data.slots || [];
    },
    enabled: !!selectedDate && !!appointment,
  });

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: async (newStartTime: string) => {
      const response = await fetch(`/api/reschedule/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startISO: newStartTime }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reschedule appointment");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setIsSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/reschedule", token] });
      toast({
        title: "Appointment Rescheduled!",
        description: "Your appointment has been successfully rescheduled. You'll receive a confirmation email shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reschedule Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast({
        title: "Missing Information",
        description: "Please select both a date and time slot.",
        variant: "destructive",
      });
      return;
    }

    rescheduleMutation.mutate(selectedTimeSlot);
  };

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

  // Loading state
  if (loadingAppointment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-4" />
            <p className="text-muted-foreground">Loading appointment details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (appointmentError || !appointment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Reschedule Link</h2>
            <p className="text-muted-foreground mb-4">
              This reschedule link is invalid or has expired. Please contact us directly to reschedule your appointment.
            </p>
            <Button 
              onClick={() => window.location.href = "tel:+1-314-325-4575"}
              data-testid="button-call-support"
            >
              Call (314) 325-4575
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Appointment Rescheduled!</h2>
            <p className="text-muted-foreground mb-4">
              Your appointment has been successfully rescheduled. You'll receive a confirmation email with the new details.
            </p>
            <Button 
              onClick={() => window.location.href = "/"}
              data-testid="button-return-home"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentAppointmentDate = appointment.start ? parseISO(appointment.start) : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Reschedule Appointment | HandyTech Solutions</title>
        <meta name="description" content="Reschedule your HandyTech Solutions appointment. Select a new date and time that works for you." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="bg-charcoal text-white py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            HandyTech<span className="text-brand-primary">Solutions</span> - Reschedule Appointment
          </h1>
          <Link 
            href="/" 
            className="text-white hover:text-brand-primary inline-flex items-center gap-1 text-sm"
            data-testid="link-back-to-main-site"
          >
            <Home className="h-4 w-4" />
            Main Site
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Current Appointment Details */}
          <div className="space-y-6">
            <Card data-testid="card-current-appointment">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-brand-primary" />
                  Current Appointment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium" data-testid="text-appointment-title">
                    {appointment.title}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span data-testid="text-service-type">
                    {appointment.title.split(' - ')[0]}
                  </span>
                </div>
                
                {currentAppointmentDate && (
                  <>
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-current-date">
                        {format(currentAppointmentDate, "EEEE, MMMM do, yyyy")}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-current-time">
                        {format(currentAppointmentDate, "h:mm a")} 
                        {appointment.end && ` - ${format(parseISO(appointment.end), "h:mm a")}`}
                      </span>
                    </div>
                  </>
                )}
                
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" data-testid="badge-duration">
                    {appointment.hours} hour{appointment.hours !== 1 ? 's' : ''} estimated
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Appointments must be rescheduled at least 12 hours in advance. 
                Please select a new date and time below.
              </AlertDescription>
            </Alert>
          </div>

          {/* Reschedule Form */}
          <div className="space-y-6">
            <Card data-testid="card-reschedule-form">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-brand-primary" />
                  Select New Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label data-testid="label-select-date">Select New Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => 
                      date < addHours(new Date(), 12) || 
                      date.getDay() === 0 // Disable Sundays
                    }
                    className="rounded-md border"
                    data-testid="calendar-date-picker"
                  />
                </div>

                <Separator />

                {/* Time Slot Selection */}
                <div className="space-y-4">
                  <Label data-testid="label-select-time">
                    {selectedDate 
                      ? `Available Times for ${format(selectedDate, "MMMM do")}`
                      : "Select a date to see available times"
                    }
                  </Label>
                  
                  {selectedDate && (
                    <>
                      {loadingSlots ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
                          <span className="ml-2 text-muted-foreground">Loading available times...</span>
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
                              variant={selectedTimeSlot === slot.time ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedTimeSlot(slot.time)}
                              className={selectedTimeSlot === slot.time ? "bg-brand-primary hover:bg-brand-primary-dark" : ""}
                              data-testid={`button-time-slot-${slot.displayTime.replace(/[^a-zA-Z0-9]/g, '-')}`}
                            >
                              {slot.displayTime}
                            </Button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <Separator />

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedDate || !selectedTimeSlot || rescheduleMutation.isPending}
                  className="w-full bg-brand-primary hover:bg-brand-primary-dark"
                  size="lg"
                  data-testid="button-submit-reschedule"
                >
                  {rescheduleMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Rescheduling...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Reschedule
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}