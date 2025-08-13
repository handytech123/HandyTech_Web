import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PendingReminder {
  id: number;
  appointmentId: number;
  reminderType: string;
  reminderTime: string;
  emailSent: boolean;
  emailStatus: string;
  createdAt: string;
}

export function ReminderManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingReminders, isLoading } = useQuery({
    queryKey: ["/api/admin/reminders/pending"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const processRemindersMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/reminders/process", "POST"),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Processed pending reminders successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reminders/pending"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process pending reminders",
        variant: "destructive",
      });
    },
  });

  const sendManualReminderMutation = useMutation({
    mutationFn: ({ appointmentId, reminderType }: { appointmentId: number; reminderType: string }) =>
      apiRequest("/api/admin/reminders/send", "POST", { appointmentId, reminderType }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Manual reminder sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send manual reminder",
        variant: "destructive",
      });
    },
  });

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case '24_hours':
        return '24 Hours Before';
      case '2_hours':
        return '2 Hours Before';
      case '30_minutes':
        return '30 Minutes Before';
      default:
        return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Appointment Reminders</h2>
          <p className="text-gray-600">Manage automated appointment reminder emails</p>
        </div>
        <Button
          onClick={() => processRemindersMutation.mutate()}
          disabled={processRemindersMutation.isPending}
          className="bg-[#BB0000] hover:bg-[#AA0000]"
        >
          {processRemindersMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Process Pending Reminders
        </Button>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Reminders
            </CardTitle>
            <CardDescription>
              Reminders that are ready to be sent or have been processed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading reminders...</span>
              </div>
            ) : !pendingReminders || (pendingReminders as PendingReminder[]).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pending reminders at this time
              </div>
            ) : (
              <div className="space-y-3">
                {(pendingReminders as PendingReminder[]).map((reminder: PendingReminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(reminder.emailStatus)}
                      <div>
                        <div className="font-medium">
                          Appointment #{reminder.appointmentId}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getReminderTypeLabel(reminder.reminderType)}
                        </div>
                        <div className="text-xs text-gray-400">
                          Scheduled: {new Date(reminder.reminderTime).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(reminder.emailStatus)}>
                        {reminder.emailStatus}
                      </Badge>
                      {reminder.emailStatus !== 'sent' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            sendManualReminderMutation.mutate({
                              appointmentId: reminder.appointmentId,
                              reminderType: reminder.reminderType,
                            })
                          }
                          disabled={sendManualReminderMutation.isPending}
                        >
                          {sendManualReminderMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reminder System Status</CardTitle>
            <CardDescription>
              Automated email reminders are processed every 5 minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Brevo Email Service</span>
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Background Processing</span>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Reminder Types</span>
                <span className="text-sm text-gray-600">24h, 2h, 30min before</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}