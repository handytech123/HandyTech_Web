import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Calendar as CalendarIcon, User, AlertCircle, Loader2 } from "lucide-react";
import { format, parseISO, addHours } from "date-fns";
import { toZonedTime, fromZonedTime, format as formatTz } from "date-fns-tz";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Appointment } from "@shared/schema";

interface AvailableSlot {
  time: string;
  displayTime: string;
}

interface RescheduleAppointmentDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customMutation?: any; // Optional custom mutation for different API endpoints
}

export default function RescheduleAppointmentDialog({
  appointment,
  open,
  onOpenChange,
  customMutation
}: RescheduleAppointmentDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const { toast } = useToast();

  // Reset selections when dialog opens/closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
    }
    onOpenChange(isOpen);
  };

  // Get appointment duration from actual appointment data
  const appointmentDuration = useMemo(() => {
    if (!appointment) return 2; // Default fallback
    
    // Calculate duration from timestamps if available
    if (appointment.startTimestamptz && appointment.endTimestamptz) {
      const startTime = new Date(appointment.startTimestamptz);
      const endTime = new Date(appointment.endTimestamptz);
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationHours = Math.round(durationMs / (1000 * 60 * 60));
      return durationHours;
    }
    
    // Default to 2 hours if no timestamp data
    return 2;
  }, [appointment]);

  // Fetch available time slots for selected date
  const {
    data: availableSlots = [],
    isLoading: loadingSlots,
    error: slotsError,
  } = useQuery<string[]>({
    queryKey: ["/api/availability", selectedDate?.toISOString(), appointmentDuration],
    queryFn: async () => {      
      if (!selectedDate) {
        throw new Error("Missing date selection");
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
        hours: appointmentDuration.toString(),
        excludeAppointmentId: appointment?.id?.toString() || "", // Exclude current appointment from availability check
        allowBackToBack: "true",
      });
      
      const response = await fetch(`/api/availability?${queryParams}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch slots: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      return data.slots || [];
    },
    enabled: !!selectedDate && !!appointment,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Use custom mutation if provided, otherwise use admin mutation
  const defaultMutation = useMutation({
    mutationFn: async ({ appointmentId, startTime, endTime }: { 
      appointmentId: number; 
      startTime: string; 
      endTime: string; 
    }) => {
      const response = await apiRequest(
        `/api/admin/appointments/${appointmentId}/reschedule`, 
        "PUT", 
        { 
          startTime, 
          endTime, 
          checkAvailability: true 
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      toast({
        title: "Appointment Rescheduled",
        description: "The appointment has been successfully rescheduled."
      });
      handleOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Reschedule Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const rescheduleAppointmentMutation = customMutation || defaultMutation;

  // Format time slots for display in Central Time
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

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTimeSlot(""); // Reset time selection when date changes
  };

  // Handle time slot selection
  const handleTimeSelect = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
  };

  // Handle reschedule submission
  const handleReschedule = () => {
    if (!appointment || !selectedDate || !selectedTimeSlot) {
      return;
    }

    // The selectedTimeSlot is already in UTC format from the availability API
    // This represents the correct time the user selected in Central Time
    const startTime = selectedTimeSlot;
    const endTime = addHours(parseISO(selectedTimeSlot), appointmentDuration).toISOString();

    rescheduleAppointmentMutation.mutate({
      appointmentId: appointment.id,
      startTime,
      endTime
    });
  };

  // Format current appointment details
  const formatCurrentAppointment = (appointment: Appointment) => {
    const currentTime = appointment.startTimestamptz 
      ? format(new Date(appointment.startTimestamptz), 'h:mm a')
      : appointment.appointmentTime;
    
    const currentDate = appointment.startTimestamptz
      ? format(new Date(appointment.startTimestamptz), 'EEEE, MMMM d, yyyy')
      : format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy');

    return `${currentDate} at ${currentTime}`;
  };

  const isReadyToReschedule = selectedDate && selectedTimeSlot && !rescheduleAppointmentMutation.isPending;

  if (!appointment) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Reschedule Appointment
          </DialogTitle>
          <DialogDescription>
            Select a new date and time for this appointment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Current Appointment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-lg">
                    {appointment.firstName} {appointment.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{appointment.email}</p>
                  {appointment.phone && (
                    <p className="text-sm text-gray-600">{appointment.phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm">
                    <strong>Service:</strong> {appointment.serviceType}
                  </p>
                  <p className="text-sm">
                    <strong>Current Date & Time:</strong> {formatCurrentAppointment(appointment)}
                  </p>
                  <Badge className="mt-2">{appointment.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Select New Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                  data-testid="reschedule-calendar"
                />
              </CardContent>
            </Card>

            {/* Time Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Available Times
                  {selectedDate && (
                    <span className="text-sm font-normal text-gray-500">
                      for {format(selectedDate, 'MMM d, yyyy')}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <p className="text-center text-gray-500 py-8">
                    Please select a date first
                  </p>
                ) : loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading available times...</span>
                  </div>
                ) : slotsError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to load available times. Please try again.
                    </AlertDescription>
                  </Alert>
                ) : formattedSlots.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No available times for this date
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                    {formattedSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedTimeSlot === slot.time ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTimeSelect(slot.time)}
                        className="justify-center"
                        data-testid={`time-slot-${slot.time}`}
                      >
                        {slot.displayTime}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Selected Schedule Summary */}
          {selectedDate && selectedTimeSlot && (
            <Alert>
              <CalendarIcon className="h-4 w-4" />
              <AlertDescription>
                <strong>New appointment time:</strong> {format(selectedDate, 'EEEE, MMMM d, yyyy')} at{' '}
                {format(toZonedTime(parseISO(selectedTimeSlot), 'America/Chicago'), 'h:mm a')} Central Time
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={rescheduleAppointmentMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleReschedule}
            disabled={!isReadyToReschedule}
            data-testid="button-confirm-reschedule"
          >
            {rescheduleAppointmentMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Rescheduling...
              </>
            ) : (
              'Confirm Reschedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
