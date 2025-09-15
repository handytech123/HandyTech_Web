import { useState } from "react";
import { Helmet } from 'react-helmet';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, DollarSign, Users, Calendar, Star, LogOut, MessageSquare, TestTube, Edit, Trash2, RefreshCw, User, MoreVertical, Home } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import AdminLogin from "@/components/admin-login";
import CalendarView from "@/components/calendar-view";
import BlockedDatesManager from "@/components/blocked-dates-manager";
import ServicesManager from "@/components/services-manager";
import AvailabilityRulesManager from "@/components/availability-rules-manager";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import type { Quote, Appointment, Review, Customer, MaintenancePlan } from "@shared/schema";

function AuthenticatedDashboard() {
  const queryClient = useQueryClient();
  const { logout } = useAdminAuth();
  const { toast } = useToast();
  const [testData, setTestData] = useState({
    name: "Test Customer",
    email: "test@example.com", 
    phone: "(555) 123-4567",
    serviceType: "Home Repair Consultation"
  });

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"]
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"]
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/reviews"]
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"]
  });

  const { data: maintenancePlans = [] } = useQuery<MaintenancePlan[]>({
    queryKey: ["/api/maintenance-plans"]
  });

  const handleLogout = () => {
    logout();
  };

  const approveReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await apiRequest(`/api/reviews/${reviewId}/approve`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
    }
  });

  const updateQuoteStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest(`/api/quotes/${id}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    }
  });


  // Admin Appointment Management Mutations
  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      await apiRequest(`/api/admin/appointments/${id}/status`, "PUT", { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Status Updated",
        description: "Appointment status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.response?.data?.message || "Failed to update appointment status.",
        variant: "destructive",
      });
    }
  });

  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async ({ id, startTime, endTime, checkAvailability }: { id: number; startTime: string; endTime: string; checkAvailability?: boolean }) => {
      await apiRequest(`/api/admin/appointments/${id}/reschedule`, "PUT", { startTime, endTime, checkAvailability });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Rescheduled Successfully",
        description: "Appointment has been rescheduled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reschedule Failed",
        description: error.response?.data?.message || "Failed to reschedule appointment.",
        variant: "destructive",
      });
    }
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "cancel" | "delete" }) => {
      await apiRequest(`/api/admin/appointments/${id}`, "DELETE", { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Action Completed",
        description: "Appointment has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Action Failed",
        description: error.response?.data?.message || "Failed to perform action.",
        variant: "destructive",
      });
    }
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ appointmentId, customerData }: { appointmentId: number; customerData: any }) => {
      await apiRequest(`/api/admin/appointments/${appointmentId}/customer`, "PUT", customerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Customer Updated",
        description: "Customer details have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.response?.data?.message || "Failed to update customer details.",
        variant: "destructive",
      });
    }
  });


  const totalRevenue = maintenancePlans.reduce((sum, plan) => sum + plan.price, 0);
  const pendingQuotes = quotes.filter(q => q.status === "pending").length;
  const todayAppointments = appointments.filter(
    a => new Date(a.appointmentDate).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                HandyTech Solutions - Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage your business operations and customer relationships
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/" 
                className="text-brand-red hover:underline inline-flex items-center gap-1 text-sm"
                data-testid="link-back-to-main-site"
              >
                <Home className="h-4 w-4" />
                Main Site
              </Link>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/live-chat'}
                className="flex items-center gap-2 bg-red-50 border-red-200 hover:bg-red-100"
              >
                <MessageSquare className="h-4 w-4 text-red-600" />
                Live Chat
              </Button>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingQuotes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="services" className="space-y-6">
          <TabsList className="flex w-full flex-wrap lg:grid lg:grid-cols-9 gap-1 h-auto p-1">
            <TabsTrigger value="services" className="flex-1 min-w-[100px] text-sm font-semibold bg-brand-red text-white data-[state=active]:bg-brand-red-dark">
              Services
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 min-w-[100px] text-sm">
              Calendar
            </TabsTrigger>
            <TabsTrigger value="blocked-dates" className="flex-1 min-w-[100px] text-sm">
              Block Dates
            </TabsTrigger>
            <TabsTrigger value="availability-rules" className="flex-1 min-w-[100px] text-sm">
              Availability
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex-1 min-w-[100px] text-sm">
              Quotes
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex-1 min-w-[100px] text-sm">
              Appointments
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 min-w-[100px] text-sm">
              Reviews
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex-1 min-w-[100px] text-sm">
              Customers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <CalendarView />
          </TabsContent>

          <TabsContent value="blocked-dates">
            <BlockedDatesManager />
          </TabsContent>

          <TabsContent value="availability-rules">
            <AvailabilityRulesManager />
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-1">
              <ServicesManager />
            </div>
          </TabsContent>

          <TabsContent value="quotes">
            <Card>
              <CardHeader>
                <CardTitle>Quote Requests</CardTitle>
                <CardDescription>Manage incoming service quote requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quotes.map((quote) => (
                    <div key={quote.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{quote.firstName} {quote.lastName}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{quote.email}</p>
                          {quote.company && <p className="text-sm text-gray-500">{quote.company}</p>}
                        </div>
                        <Badge variant={quote.status === "pending" ? "secondary" : "default"}>
                          {quote.status}
                        </Badge>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm"><strong>Service:</strong> {quote.serviceNeeded}</p>
                        {quote.message && <p className="text-sm mt-1"><strong>Message:</strong> {quote.message}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => updateQuoteStatusMutation.mutate({ id: quote.id, status: "contacted" })}
                          disabled={updateQuoteStatusMutation.isPending}
                        >
                          Mark Contacted
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateQuoteStatusMutation.mutate({ id: quote.id, status: "converted" })}
                          disabled={updateQuoteStatusMutation.isPending}
                        >
                          Mark Converted
                        </Button>
                      </div>
                    </div>
                  ))}
                  {quotes.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No quote requests yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle>Appointments Management</CardTitle>
                <CardDescription>View and manage scheduled appointments with full admin controls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg" data-testid={`text-customer-name-${appointment.id}`}>
                              {appointment.firstName} {appointment.lastName}
                            </h3>
                            <Badge variant={appointment.source === "manual" ? "outline" : "default"}>
                              {appointment.source === "manual" ? "📞 Manual" : "🤖 System"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300" data-testid={`text-customer-email-${appointment.id}`}>
                            {appointment.email}
                          </p>
                          {appointment.phone && (
                            <p className="text-sm text-gray-500" data-testid={`text-customer-phone-${appointment.id}`}>
                              {appointment.phone}
                            </p>
                          )}
                        </div>
                        
                        {/* Status and Actions */}
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end gap-2">
                            <Select
                              value={appointment.status}
                              onValueChange={(status) => 
                                updateAppointmentStatusMutation.mutate({ id: appointment.id, status })
                              }
                              disabled={updateAppointmentStatusMutation.isPending}
                            >
                              <SelectTrigger 
                                className="w-32" 
                                data-testid={`select-status-${appointment.id}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="no-show">No Show</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-[#BB0000] text-[#BB0000] hover:bg-[#BB0000] hover:text-white"
                                  data-testid={`button-actions-${appointment.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Reschedule
                                    </DropdownMenuItem>
                                  </DialogTrigger>
                                  <RescheduleDialog appointment={appointment} onReschedule={rescheduleAppointmentMutation} />
                                </Dialog>
                                
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <User className="h-4 w-4 mr-2" />
                                      Edit Customer
                                    </DropdownMenuItem>
                                  </DialogTrigger>
                                  <EditCustomerDialog appointment={appointment} onUpdate={updateCustomerMutation} />
                                </Dialog>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Cancel
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to cancel this appointment? This action can be undone by changing the status back to "scheduled".
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => cancelAppointmentMutation.mutate({ id: appointment.id, action: "cancel" })}
                                        className="bg-[#BB0000] hover:bg-[#A00000]"
                                        data-testid={`button-cancel-confirm-${appointment.id}`}
                                      >
                                        Cancel Appointment
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Permanently
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to permanently delete this appointment? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => cancelAppointmentMutation.mutate({ id: appointment.id, action: "delete" })}
                                        className="bg-red-600 hover:bg-red-700"
                                        data-testid={`button-delete-confirm-${appointment.id}`}
                                      >
                                        Delete Permanently
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                      
                      {/* Appointment Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Service</p>
                          <p className="text-sm" data-testid={`text-service-${appointment.id}`}>{appointment.serviceType}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Date & Time</p>
                          <p className="text-sm" data-testid={`text-datetime-${appointment.id}`}>
                            {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.appointmentTime}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">ID</p>
                          <p className="text-sm font-mono" data-testid={`text-appointment-id-${appointment.id}`}>#{appointment.id}</p>
                        </div>
                      </div>
                      
                      {appointment.notes && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Notes</p>
                          <p className="text-sm text-blue-800 dark:text-blue-200" data-testid={`text-notes-${appointment.id}`}>
                            {appointment.notes}
                          </p>
                        </div>
                      )}
                      
                      {/* Loading States */}
                      {(updateAppointmentStatusMutation.isPending || 
                        rescheduleAppointmentMutation.isPending || 
                        cancelAppointmentMutation.isPending || 
                        updateCustomerMutation.isPending) && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-lg flex items-center justify-center">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#BB0000]"></div>
                            <span className="text-sm">Processing...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {appointments.length === 0 && (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No appointments scheduled</p>
                      <p className="text-gray-400 text-sm">Appointments will appear here when customers book services</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>Customer Reviews</CardTitle>
                <CardDescription>Manage customer feedback and testimonials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{review.title}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                              />
                            ))}
                            <span className="text-sm text-gray-600 ml-2">({review.rating}/5)</span>
                          </div>
                        </div>
                        <Badge variant={review.isApproved ? "default" : "secondary"}>
                          {review.isApproved ? "Approved" : "Pending"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{review.content}</p>
                      {!review.isApproved && (
                        <Button 
                          size="sm"
                          onClick={() => approveReviewMutation.mutate(review.id)}
                          disabled={approveReviewMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve Review
                        </Button>
                      )}
                    </div>
                  ))}
                  {reviews.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No reviews yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle>Customer Database</CardTitle>
                <CardDescription>View and manage customer information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customers.map((customer) => (
                    <div key={customer.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{customer.firstName} {customer.lastName}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{customer.email}</p>
                          {customer.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
                          {customer.company && <p className="text-sm text-gray-500">{customer.company}</p>}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <p>Joined: {new Date(customer.createdAt).toLocaleDateString()}</p>
                          {customer.lastEmailSent && (
                            <p>Last Email: {new Date(customer.lastEmailSent).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {customers.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No customers yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}

// Reschedule Dialog Component
function RescheduleDialog({ appointment, onReschedule }: { appointment: any; onReschedule: any }) {
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [checkAvailability, setCheckAvailability] = useState(true);
  const [open, setOpen] = useState(false);

  const handleReschedule = () => {
    if (!startDateTime || !endDateTime) {
      return;
    }

    onReschedule.mutate(
      { 
        id: appointment.id, 
        startTime: startDateTime, 
        endTime: endDateTime, 
        checkAvailability 
      },
      {
        onSuccess: () => {
          setOpen(false);
          setStartDateTime("");
          setEndDateTime("");
        }
      }
    );
  };

  // Set default values when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && appointment.startTimestamptz) {
      const start = new Date(appointment.startTimestamptz);
      const end = new Date(appointment.endTimestamptz || start.getTime() + (2 * 60 * 60 * 1000));
      
      // Format for datetime-local input
      const formatForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setStartDateTime(formatForInput(start));
      setEndDateTime(formatForInput(end));
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Reschedule Appointment</DialogTitle>
        <DialogDescription>
          Update the appointment time for {appointment.firstName} {appointment.lastName}
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="start-time">Start Date & Time</Label>
          <Input
            id="start-time"
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            data-testid="input-reschedule-start"
          />
        </div>
        
        <div>
          <Label htmlFor="end-time">End Date & Time</Label>
          <Input
            id="end-time"
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            data-testid="input-reschedule-end"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="check-availability"
            checked={checkAvailability}
            onChange={(e) => setCheckAvailability(e.target.checked)}
            data-testid="checkbox-check-availability"
          />
          <Label htmlFor="check-availability" className="text-sm">
            Check availability (uncheck to force reschedule)
          </Label>
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button 
          onClick={handleReschedule}
          disabled={!startDateTime || !endDateTime || onReschedule.isPending}
          className="bg-[#BB0000] hover:bg-[#A00000]"
          data-testid="button-reschedule-confirm"
        >
          {onReschedule.isPending ? "Rescheduling..." : "Reschedule Appointment"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Edit Customer Dialog Component
function EditCustomerDialog({ appointment, onUpdate }: { appointment: any; onUpdate: any }) {
  const [firstName, setFirstName] = useState(appointment.firstName || "");
  const [lastName, setLastName] = useState(appointment.lastName || "");
  const [email, setEmail] = useState(appointment.email || "");
  const [phone, setPhone] = useState(appointment.phone || "");
  const [company, setCompany] = useState(appointment.company || "");
  const [open, setOpen] = useState(false);

  const handleUpdate = () => {
    const customerData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company: company.trim()
    };

    // Remove empty fields
    Object.keys(customerData).forEach(key => {
      if (!customerData[key as keyof typeof customerData]) {
        delete customerData[key as keyof typeof customerData];
      }
    });

    onUpdate.mutate(
      { appointmentId: appointment.id, customerData },
      {
        onSuccess: () => {
          setOpen(false);
        }
      }
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Reset form when opening
      setFirstName(appointment.firstName || "");
      setLastName(appointment.lastName || "");
      setEmail(appointment.email || "");
      setPhone(appointment.phone || "");
      setCompany(appointment.company || "");
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Customer Details</DialogTitle>
        <DialogDescription>
          Update customer information for this appointment
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first-name">First Name</Label>
            <Input
              id="first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              data-testid="input-edit-firstname"
            />
          </div>
          <div>
            <Label htmlFor="last-name">Last Name</Label>
            <Input
              id="last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              data-testid="input-edit-lastname"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
            data-testid="input-edit-email"
          />
        </div>
        
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            data-testid="input-edit-phone"
          />
        </div>
        
        <div>
          <Label htmlFor="company">Company (Optional)</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
            data-testid="input-edit-company"
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button 
          onClick={handleUpdate}
          disabled={!firstName.trim() || !lastName.trim() || !email.trim() || onUpdate.isPending}
          className="bg-[#BB0000] hover:bg-[#A00000]"
          data-testid="button-update-customer-confirm"
        >
          {onUpdate.isPending ? "Updating..." : "Update Customer"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function AdminDashboard() {
  const { isAuthenticated, isLoading: authLoading, login } = useAdminAuth();
  const [loginError, setLoginError] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError("");
    
    const result = await login(username, password);
    
    if (!result.success) {
      setLoginError(result.error || "Login failed");
    }
    
    setIsLoggingIn(false);
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>Admin Login | HandyTech Solutions</title>
          <meta name="description" content="Admin dashboard login for HandyTech Solutions business management system." />
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <AdminLogin 
          onLogin={handleLogin}
          error={loginError}
          isLoading={isLoggingIn}
        />
      </>
    );
  }

  // Show authenticated dashboard
  return (
    <>
      <Helmet>
        <title>Admin Dashboard | HandyTech Solutions Business Management</title>
        <meta name="description" content="Manage reviews, quotes, appointments, and customers for HandyTech Solutions handyman services." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AuthenticatedDashboard />
    </>
  );
}