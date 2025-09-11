import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { insertBlockedTimeSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import type { BlockedTime } from "@shared/schema";

const blockedTimeFormSchema = insertBlockedTimeSchema.extend({
  startDate: z.date({
    required_error: "Please select a start date",
  }),
  endDate: z.date({
    required_error: "Please select an end date",
  }),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
}).omit({
  startTimestamptz: true,
  endTimestamptz: true,
});

type BlockedTimeFormData = z.infer<typeof blockedTimeFormSchema>;

const timeSlots = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
];

// Helper function to safely parse time strings and create timestamps
function createTimestamp(date: Date, timeString: string): string {
  const safeDate = new Date(date);
  
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
  
  // Set the time safely using setHours/setMinutes
  safeDate.setHours(hours, minutes, 0, 0);
  
  return safeDate.toISOString();
}

export default function BlockedTimesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: blockedTimes = [] } = useQuery<BlockedTime[]>({
    queryKey: ["/api/blocked-times"]
  });

  const form = useForm<BlockedTimeFormData>({
    resolver: zodResolver(blockedTimeFormSchema),
    defaultValues: {
      reason: "",
      isFullDay: true,
      startTime: "",
      endTime: "",
    },
  });

  const createBlockedTime = useMutation({
    mutationFn: async (data: BlockedTimeFormData) => {
      const response = await fetch("/api/blocked-times", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: data.reason,
          isFullDay: data.isFullDay,
          startTimestamptz: data.isFullDay 
            ? data.startDate.toISOString()
            : createTimestamp(data.startDate, data.startTime!),
          endTimestamptz: data.isFullDay
            ? data.endDate.toISOString() 
            : createTimestamp(data.endDate, data.endTime!),
        }),
      });
      if (!response.ok) throw new Error("Failed to create blocked time");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Blocked time created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-times"] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedDate(undefined);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create blocked time",
        variant: "destructive",
      });
    },
  });

  const deleteBlockedTime = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/blocked-times/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete blocked time");
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
                <Button className="bg-brand-red hover:bg-brand-red-dark">
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
                    <Label htmlFor="startDate">Start Date</Label>
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
                          onSelect={(date) => {
                            setSelectedDate(date);
                            form.setValue("startDate", date || new Date());
                            form.setValue("endDate", date || new Date());
                          }}
                          initialFocus
                        />
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
                      className="bg-brand-red hover:bg-brand-red-dark"
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