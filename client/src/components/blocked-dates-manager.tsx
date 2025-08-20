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
import { insertBlockedDateSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import type { BlockedDate } from "@shared/schema";

const blockedDateFormSchema = insertBlockedDateSchema.extend({
  date: z.date({
    required_error: "Please select a date",
  }),
});

type BlockedDateFormData = z.infer<typeof blockedDateFormSchema>;

const timeSlots = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
];

export default function BlockedDatesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: blockedDates = [] } = useQuery<BlockedDate[]>({
    queryKey: ["/api/blocked-dates"]
  });

  const form = useForm<BlockedDateFormData>({
    resolver: zodResolver(blockedDateFormSchema),
    defaultValues: {
      reason: "",
      allDay: true,
      startTime: "",
      endTime: "",
    },
  });

  const createBlockedDate = useMutation({
    mutationFn: async (data: BlockedDateFormData) => {
      const response = await fetch("/api/blocked-dates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          date: data.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        }),
      });
      if (!response.ok) throw new Error("Failed to create blocked date");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Blocked date created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-dates"] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedDate(undefined);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create blocked date",
        variant: "destructive",
      });
    },
  });

  const deleteBlockedDate = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/blocked-dates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete blocked date");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Blocked date deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-dates"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete blocked date",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BlockedDateFormData) => {
    createBlockedDate.mutate(data);
  };

  const isAllDay = form.watch("allDay");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Blocked Dates Management
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-red hover:bg-brand-red-dark">
                  <Plus className="h-4 w-4 mr-2" />
                  Block Date
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Block a Date</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
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
                            form.setValue("date", date || new Date());
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
                      value={isAllDay ? "true" : "false"}
                      onValueChange={(value) => form.setValue("allDay", value === "true")}
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

                  {!isAllDay && (
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
                      disabled={createBlockedDate.isPending}
                    >
                      {createBlockedDate.isPending ? "Creating..." : "Block Date"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {blockedDates.length > 0 ? (
            <div className="space-y-3">
              {blockedDates
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((blockedDate) => (
                  <div
                    key={blockedDate.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-red-50 border-red-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">
                          {format(new Date(blockedDate.date), "EEEE, MMMM d, yyyy")}
                        </h3>
                        <Badge variant="destructive" className="text-xs">
                          Blocked
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        {blockedDate.reason && (
                          <p><strong>Reason:</strong> {blockedDate.reason}</p>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {blockedDate.allDay ? (
                            <span>All Day</span>
                          ) : (
                            <span>
                              {blockedDate.startTime} - {blockedDate.endTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBlockedDate.mutate(blockedDate.id)}
                      disabled={deleteBlockedDate.isPending}
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
              <p>No blocked dates set</p>
              <p className="text-sm">Click "Block Date" to prevent appointments on specific dates</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}