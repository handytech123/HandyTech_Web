import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Plus, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { insertBlockedTimeSchema } from "@shared/schema";
import { z } from "zod";
import type { BlockedTime, Appointment } from "@shared/schema";

const blockedTimeFormSchema = insertBlockedTimeSchema.extend({
  dateSelection: z.enum(["single", "multiple"]),
  singleDate: z.date().optional(),
  multipleDates: z.array(z.date()).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
}).omit({
  startTimestamptz: true,
  endTimestamptz: true,
});

type BlockedTimeFormData = z.infer<typeof blockedTimeFormSchema>;

// Generate time slots in 30-minute intervals from 6:00 AM to 8:00 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 6; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      const timeString = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
      slots.push(timeString);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

// Helper function to safely parse time strings and create timestamps in Central Time
function createTimestamp(date: Date, timeString: string): string {
  // Parse time string like "9:00 AM" or "2:00 PM"
  const [time, period] = timeString.split(' ');
  const [hoursStr, minutesStr] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  // Create date string in Central Time format then convert to UTC
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const dateTimeString = `${year}-${month}-${day}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  
  // Convert Central Time to UTC for storage
  const centralDateTime = fromZonedTime(dateTimeString, 'America/Chicago');
  return centralDateTime.toISOString();
}

export default function BlockedTimesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: blockedTimes = [] } = useQuery<BlockedTime[]>({
    queryKey: ["/api/blocked-times"]
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"]
  });

  const form = useForm<BlockedTimeFormData>({
    resolver: zodResolver(blockedTimeFormSchema),
    defaultValues: {
      reason: "",
      isFullDay: true,
      dateSelection: "single",
      startTime: "",
      endTime: "",
      singleDate: undefined,
      multipleDates: [],
    },
  });

  // Helper function to check for appointment conflicts
  const checkAppointmentConflicts = (datesToBlock: Date[], isFullDay: boolean, startTime?: string, endTime?: string): string[] => {
    const conflicts: string[] = [];
    
    for (const date of datesToBlock) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const conflictingAppointments = appointments.filter(appointment => {
        // Skip cancelled appointments
        if (appointment.status === 'cancelled') return false;
        
        let appointmentStart: Date;
        let appointmentEnd: Date;
        
        if (appointment.startTimestamptz && appointment.endTimestamptz) {
          appointmentStart = new Date(appointment.startTimestamptz);
          appointmentEnd = new Date(appointment.endTimestamptz);
        } else if (appointment.appointmentDate && appointment.appointmentTime) {
          appointmentStart = new Date(appointment.appointmentDate);
          const [time, period] = appointment.appointmentTime.split(' ');
          const [hours, minutes] = time.split(':');
          let hour = parseInt(hours);
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          appointmentStart.setHours(hour, parseInt(minutes), 0, 0);
          appointmentEnd = new Date(appointmentStart.getTime() + (2 * 60 * 60 * 1000)); // Assume 2 hours
        } else {
          return false;
        }
        
        // Check if appointment is on this date
        const appointmentDate = new Date(appointmentStart);
        appointmentDate.setHours(0, 0, 0, 0);
        
        if (appointmentDate.getTime() !== dayStart.getTime()) {
          return false;
        }
        
        // If blocking full day, any appointment on this date conflicts
        if (isFullDay) {
          return true;
        }
        
        // If blocking specific hours, check for time overlap
        if (startTime && endTime) {
          const blockStart = createTimestamp(date, startTime);
          const blockEnd = createTimestamp(date, endTime);
          const blockStartTime = new Date(blockStart);
          const blockEndTime = new Date(blockEnd);
          
          // Check for overlap
          return appointmentStart < blockEndTime && appointmentEnd > blockStartTime;
        }
        
        return false;
      });
      
      if (conflictingAppointments.length > 0) {
        const dateStr = format(date, "MMMM d, yyyy");
        const appointmentDetails = conflictingAppointments.map(apt => {
          if (apt.startTimestamptz) {
            return format(new Date(apt.startTimestamptz), "h:mm a");
          } else if (apt.appointmentTime) {
            return apt.appointmentTime;
          }
          return "Unknown time";
        }).join(", ");
        conflicts.push(`${dateStr} (appointments at: ${appointmentDetails})`);
      }
    }
    
    return conflicts;
  };

  const createBlockedTime = useMutation({
    mutationFn: async (data: BlockedTimeFormData) => {
      const datesToBlock: Date[] = [];
      
      // Determine which dates to block based on selection type
      if (data.dateSelection === "single" && data.singleDate) {
        datesToBlock.push(data.singleDate);
      } else if (data.dateSelection === "multiple" && data.multipleDates) {
        datesToBlock.push(...data.multipleDates);
      }
      
      // Check for appointment conflicts
      const conflicts = checkAppointmentConflicts(datesToBlock, data.isFullDay ?? true, data.startTime, data.endTime);
      
      if (conflicts.length > 0) {
        throw new Error(`Cannot block the following dates due to existing appointments:\n\n${conflicts.join('\n')}\n\nPlease choose different dates or reschedule the existing appointments first.`);
      }
      
      // Create blocked time entries for each date
      const promises = datesToBlock.map(date => {
        return apiRequest("/api/blocked-times", "POST", {
          reason: data.reason,
          isFullDay: data.isFullDay,
          startTimestamptz: data.isFullDay 
            ? fromZonedTime(date, 'America/Chicago').toISOString()
            : createTimestamp(date, data.startTime!),
          endTimestamptz: data.isFullDay
            ? fromZonedTime(date, 'America/Chicago').toISOString()
            : createTimestamp(date, data.endTime!),
        });
      });
      
      await Promise.all(promises);
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Blocked time created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-times"] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedDates([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Cannot Block These Dates",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBlockedTime = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/blocked-times/${id}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Blocked time deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-times"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete blocked time",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BlockedTimeFormData) => {
    createBlockedTime.mutate(data);
  };

  const isFullDay = form.watch("isFullDay");
  const dateSelection = form.watch("dateSelection");

  // Get dates that have appointments (to show as disabled in calendar)
  const getDatesWithAppointments = (): Date[] => {
    const datesWithAppointments: Date[] = [];
    
    appointments.forEach(appointment => {
      if (appointment.status === 'cancelled') return;
      
      let appointmentDate: Date;
      
      if (appointment.startTimestamptz) {
        appointmentDate = new Date(appointment.startTimestamptz);
      } else if (appointment.appointmentDate) {
        appointmentDate = new Date(appointment.appointmentDate);
      } else {
        return;
      }
      
      // Reset time to start of day for comparison
      appointmentDate.setHours(0, 0, 0, 0);
      datesWithAppointments.push(appointmentDate);
    });
    
    return datesWithAppointments;
  };
  
  const datesWithAppointments = getDatesWithAppointments();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Blocked Times Management
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-primary hover:bg-brand-primary-dark">
                  <Plus className="h-4 w-4 mr-2" />
                  Block Time
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Block a Time Period</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Date Selection Type</Label>
                    <Select
                      value={dateSelection}
                      onValueChange={(value: "single" | "multiple") => {
                        form.setValue("dateSelection", value);
                        // Reset date selections when changing type
                        setSelectedDates([]);
                        form.setValue("singleDate", undefined);
                        form.setValue("multipleDates", []);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Date</SelectItem>
                        <SelectItem value="multiple">Multiple Dates</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{dateSelection === "single" ? "Select Date" : "Select Multiple Dates"}</Label>
                    <p className="text-sm text-gray-600">
                      <strong>Note:</strong> Dates with existing appointments appear in yellow and cannot be blocked. 
                      You'll need to reschedule or cancel those appointments first.
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateSelection === "single" && form.watch("singleDate") 
                            ? format(form.watch("singleDate")!, "PPP")
                            : dateSelection === "multiple" && selectedDates.length > 0
                            ? `${selectedDates.length} dates selected`
                            : "Pick dates"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        {dateSelection === "single" && (
                          <Calendar
                            mode="single"
                            selected={form.watch("singleDate")}
                            onSelect={(date) => {
                              form.setValue("singleDate", date);
                            }}
                            disabled={(date) => {
                              // Disable dates that have appointments
                              const dateOnly = new Date(date);
                              dateOnly.setHours(0, 0, 0, 0);
                              return datesWithAppointments.some(appDate => 
                                appDate.getTime() === dateOnly.getTime()
                              );
                            }}
                            modifiers={{
                              hasAppointment: datesWithAppointments
                            }}
                            modifiersStyles={{
                              hasAppointment: { 
                                backgroundColor: '#fef3c7', 
                                color: '#92400e',
                                fontWeight: 'bold'
                              }
                            }}
                            initialFocus
                          />
                        )}
                        {dateSelection === "multiple" && (
                          <Calendar
                            mode="multiple"
                            selected={selectedDates}
                            onSelect={(dates) => {
                              if (dates) {
                                setSelectedDates(dates);
                                form.setValue("multipleDates", dates);
                              }
                            }}
                            disabled={(date) => {
                              // Disable dates that have appointments
                              const dateOnly = new Date(date);
                              dateOnly.setHours(0, 0, 0, 0);
                              return datesWithAppointments.some(appDate => 
                                appDate.getTime() === dateOnly.getTime()
                              );
                            }}
                            modifiers={{
                              hasAppointment: datesWithAppointments
                            }}
                            modifiersStyles={{
                              hasAppointment: { 
                                backgroundColor: '#fef3c7', 
                                color: '#92400e',
                                fontWeight: 'bold'
                              }
                            }}
                            initialFocus
                          />
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Textarea
                      {...form.register("reason")}
                      placeholder="e.g., Vacation, Holiday, Maintenance Day"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Time Block</Label>
                    <Select
                      value={isFullDay ? "true" : "false"}
                      onValueChange={(value) => form.setValue("isFullDay", value === "true")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">All Day</SelectItem>
                        <SelectItem value="false">Specific Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {!isFullDay && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Select
                          value={form.watch("startTime") || ""}
                          onValueChange={(value) => form.setValue("startTime", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Select
                          value={form.watch("endTime") || ""}
                          onValueChange={(value) => form.setValue("endTime", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="End time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-brand-primary hover:bg-brand-primary-dark"
                      disabled={createBlockedTime.isPending}
                    >
                      {createBlockedTime.isPending ? "Creating..." : "Block Time"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {blockedTimes.length > 0 ? (
            <div className="space-y-3">
              {blockedTimes
                .sort((a, b) => new Date(a.startTimestamptz).getTime() - new Date(b.startTimestamptz).getTime())
                .map((blockedTime) => (
                  <div
                    key={blockedTime.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-red-50 border-red-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">
                          {format(new Date(blockedTime.startTimestamptz), "EEEE, MMMM d, yyyy")}
                        </h3>
                        <Badge variant="destructive" className="text-xs">
                          Blocked
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        {blockedTime.reason && (
                          <p><strong>Reason:</strong> {blockedTime.reason}</p>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {blockedTime.isFullDay ? (
                            <span>All Day</span>
                          ) : (
                            <span>
                              {format(new Date(blockedTime.startTimestamptz), "h:mm a")} - {format(new Date(blockedTime.endTimestamptz), "h:mm a")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBlockedTime.mutate(blockedTime.id)}
                      disabled={deleteBlockedTime.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No blocked times set</p>
              <p className="text-sm">Click "Block Time" to prevent appointments during specific periods</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}