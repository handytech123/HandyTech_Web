import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Clock, ToggleLeft, ToggleRight } from "lucide-react";
import { insertAvailabilityRuleSchema } from "@shared/schema";
import { z } from "zod";
import type { AvailabilityRule } from "@shared/schema";

const availabilityRuleFormSchema = insertAvailabilityRuleSchema.extend({
  weekday: z.number({ required_error: "Please select a weekday" }).min(0).max(6),
  startTime: z.string({ required_error: "Please select a start time" }).min(1),
  endTime: z.string({ required_error: "Please select an end time" }).min(1),
});

type AvailabilityRuleFormData = z.infer<typeof availabilityRuleFormSchema>;

const weekdays = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const timeSlots = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", 
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", 
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"
];

// Convert 24-hour time to 12-hour AM/PM format
const formatTimeDisplay = (time24: string): string => {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

export default function AvailabilityRulesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AvailabilityRule | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: availabilityRules = [], isLoading } = useQuery<AvailabilityRule[]>({
    queryKey: ["/api/availability-rules"]
  });

  const form = useForm<AvailabilityRuleFormData>({
    resolver: zodResolver(availabilityRuleFormSchema),
    defaultValues: {
      weekday: 1, // Default to Monday
      startTime: "09:00",
      endTime: "17:00",
      active: true,
    },
  });

  const createRule = useMutation({
    mutationFn: async (data: AvailabilityRuleFormData) => {
      const response = await apiRequest("/api/availability-rules", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Availability rule created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/availability-rules"] });
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create availability rule", variant: "destructive" });
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AvailabilityRuleFormData }) => {
      const response = await apiRequest(`/api/availability-rules/${id}`, "PATCH", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Availability rule updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/availability-rules"] });
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update availability rule", variant: "destructive" });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/availability-rules/${id}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Availability rule deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/availability-rules"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete availability rule", variant: "destructive" });
    },
  });

  const toggleRuleStatus = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const response = await apiRequest(`/api/availability-rules/${id}/toggle`, "PATCH", { active });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Availability rule status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/availability-rules"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update availability rule status", variant: "destructive" });
    },
  });

  const resetForm = () => {
    form.reset({
      weekday: 1,
      startTime: "09:00", 
      endTime: "17:00",
      active: true,
    });
    setEditingRule(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (rule: AvailabilityRule) => {
    setEditingRule(rule);
    form.reset({
      weekday: rule.weekday,
      startTime: rule.startTime,
      endTime: rule.endTime,
      active: rule.active ?? true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: AvailabilityRuleFormData) => {
    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, data });
    } else {
      createRule.mutate(data);
    }
  };

  const getWeekdayLabel = (weekday: number) => {
    return weekdays.find(w => w.value === weekday)?.label || "Unknown";
  };

  // Sort rules by weekday for better display
  const sortedRules = [...availabilityRules].sort((a, b) => a.weekday - b.weekday);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Availability Rules Management
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-brand-red hover:bg-brand-red-dark" 
                  onClick={() => setEditingRule(null)}
                  data-testid="button-add-rule"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingRule ? "Edit Availability Rule" : "Add New Availability Rule"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="weekday"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weekday</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(value) => field.onChange(parseInt(value, 10))}
                              data-testid="select-weekday"
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select weekday" />
                              </SelectTrigger>
                              <SelectContent>
                                {weekdays.map((weekday) => (
                                  <SelectItem key={weekday.value} value={weekday.value.toString()}>
                                    {weekday.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
                            <FormControl>
                              <Select 
                                value={field.value}
                                onValueChange={field.onChange}
                                data-testid="select-start-time"
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Start time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeSlots.map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {formatTimeDisplay(time)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time</FormLabel>
                            <FormControl>
                              <Select 
                                value={field.value}
                                onValueChange={field.onChange}
                                data-testid="select-end-time"
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="End time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeSlots.map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {formatTimeDisplay(time)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active Rule</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Enable this availability rule
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value ?? true}
                              onCheckedChange={field.onChange}
                              data-testid="switch-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={resetForm}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-brand-red hover:bg-brand-red-dark"
                        disabled={createRule.isPending || updateRule.isPending}
                        data-testid="button-save"
                      >
                        {editingRule ? "Update Rule" : "Create Rule"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-gray-500">Loading availability rules...</div>
            </div>
          ) : sortedRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No availability rules configured</p>
              <p className="text-sm">Add rules to set your weekly working schedule</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Weekday</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRules.map((rule) => (
                    <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                      <TableCell className="font-medium">
                        {getWeekdayLabel(rule.weekday)}
                      </TableCell>
                      <TableCell data-testid={`text-start-time-${rule.id}`}>
                        {formatTimeDisplay(rule.startTime)}
                      </TableCell>
                      <TableCell data-testid={`text-end-time-${rule.id}`}>
                        {formatTimeDisplay(rule.endTime)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={rule.active ? "default" : "secondary"}
                          data-testid={`badge-status-${rule.id}`}
                        >
                          {rule.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRuleStatus.mutate({ 
                              id: rule.id, 
                              active: !rule.active 
                            })}
                            disabled={toggleRuleStatus.isPending}
                            data-testid={`button-toggle-${rule.id}`}
                          >
                            {rule.active ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(rule)}
                            data-testid={`button-edit-${rule.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRule.mutate(rule.id)}
                            disabled={deleteRule.isPending}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-${rule.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Add Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Add Monday-Friday 9-5 schedule
                const weekdayRules = [1, 2, 3, 4, 5]; // Mon-Fri
                weekdayRules.forEach(weekday => {
                  createRule.mutate({
                    weekday,
                    startTime: "09:00",
                    endTime: "17:00",
                    active: true,
                  });
                });
              }}
              data-testid="button-quick-weekdays"
            >
              Add Weekdays (9 AM - 5 PM)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Add Saturday half day
                createRule.mutate({
                  weekday: 6,
                  startTime: "09:00",
                  endTime: "13:00",
                  active: true,
                });
              }}
              data-testid="button-quick-saturday"
            >
              Add Saturday (9 AM - 1 PM)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}