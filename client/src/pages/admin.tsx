import { useState } from "react";
import { Helmet } from 'react-helmet';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, DollarSign, Users, Star, LogOut, MessageSquare, Home, CalendarDays, User, Phone, Mail, RotateCcw, Filter } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLogin from "@/components/admin-login";
import CalendarView from "@/components/calendar-view";
import BlockedDatesManager from "@/components/blocked-dates-manager";
import ServicesManager from "@/components/services-manager";
import AvailabilityRulesManager from "@/components/availability-rules-manager";
import RescheduleAppointmentDialog from "@/components/reschedule-appointment-dialog";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import type { Quote, Review, Customer, MaintenancePlan, Appointment } from "@shared/schema";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

// AppointmentsTab component
function AppointmentsTab({ 
  appointments, 
  updateAppointmentStatusMutation 
}: {
  appointments: Appointment[];
  updateAppointmentStatusMutation: any;
}) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedAppointmentForReschedule, setSelectedAppointmentForReschedule] = useState<Appointment | null>(null);
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleReschedule = (appointmentId: number, customerName: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
      setSelectedAppointmentForReschedule(appointment);
      setRescheduleDialogOpen(true);
    } else {
      toast({
        title: "Error",
        description: "Appointment not found.",
        variant: "destructive"
      });
    }
  };

  const formatAppointmentDateTime = (appointment: Appointment) => {
    // Use timezone-aware timestamp if available, fallback to legacy fields
    if (appointment.startTimestamptz) {
      const centralTime = toZonedTime(new Date(appointment.startTimestamptz), 'America/Chicago');
      const formattedDate = format(centralTime, 'EEE, MMM d, yyyy');
      const formattedTime = format(centralTime, 'h:mm a');
      return `${formattedDate} at ${formattedTime} CT`;
    } else {
      // Legacy format - assume appointmentTime is already in Central Time
      const date = new Date(appointment.appointmentDate);
      const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return `${formattedDate} at ${appointment.appointmentTime} CT`;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Appointment Management
              </CardTitle>
              <CardDescription>View and manage customer appointments</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                data-testid="button-list-view"
              >
                List View
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                data-testid="button-calendar-view"
              >
                Calendar View
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'calendar' ? (
            <div data-testid="calendar-container">
              <CalendarView 
                appointments={appointments} 
                onEventClick={(appointment) => {
                  // Open reschedule dialog directly
                  setSelectedAppointmentForReschedule(appointment);
                  setRescheduleDialogOpen(true);
                }} 
              />
            </div>
          ) : (
            <div className="space-y-4" data-testid="appointments-list">
              {appointments.length === 0 ? (
                <p className="text-center text-gray-500 py-8" data-testid="text-no-appointments">
                  No appointments scheduled
                </p>
              ) : (
                appointments.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="border rounded-lg p-4 bg-white dark:bg-gray-800"
                    data-testid={`card-appointment-${appointment.id}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg" data-testid={`text-customer-name-${appointment.id}`}>
                          {appointment.firstName} {appointment.lastName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300" data-testid={`text-email-${appointment.id}`}>
                            {appointment.email}
                          </span>
                        </div>
                        {appointment.phone && (
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500" data-testid={`text-phone-${appointment.id}`}>
                              {appointment.phone}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge 
                          className={`${getStatusColor(appointment.status)} mb-2`}
                          data-testid={`badge-status-${appointment.id}`}
                        >
                          {appointment.status}
                        </Badge>
                        <div className="text-sm text-gray-500" data-testid={`text-datetime-${appointment.id}`}>
                          {formatAppointmentDateTime(appointment)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm" data-testid={`text-service-${appointment.id}`}>
                          <strong>Service:</strong> {appointment.serviceType}
                        </p>
                        {appointment.address && (
                          <p className="text-sm mt-1" data-testid={`text-address-${appointment.id}`}>
                            <strong>Address:</strong> {appointment.address}
                          </p>
                        )}
                      </div>
                      {appointment.notes && (
                        <div>
                          <p className="text-sm" data-testid={`text-notes-${appointment.id}`}>
                            <strong>Notes:</strong> {appointment.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={appointment.status}
                        onChange={(e) => updateAppointmentStatusMutation.mutate({ 
                          id: appointment.id, 
                          status: e.target.value 
                        })}
                        disabled={updateAppointmentStatusMutation.isPending}
                        className="text-sm border rounded px-3 py-1 bg-white"
                        data-testid={`select-status-${appointment.id}`}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReschedule(appointment.id, `${appointment.firstName} ${appointment.lastName}`)}
                        className="flex items-center gap-1"
                        data-testid={`button-reschedule-${appointment.id}`}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reschedule
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Reschedule Appointment Dialog */}
      <RescheduleAppointmentDialog
        appointment={selectedAppointmentForReschedule}
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
      />
    </>
  );
}

function AuthenticatedDashboard() {
  const queryClient = useQueryClient();
  const { logout } = useAdminAuth();


  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"]
  });


  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/admin/reviews"]
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"]
  });

  const { data: maintenancePlans = [] } = useQuery<MaintenancePlan[]>({
    queryKey: ["/api/maintenance-plans"]
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"]
  });

  const handleLogout = () => {
    logout();
  };

  const approveReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await apiRequest(`/api/reviews/${reviewId}/approve`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
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

  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest(`/api/admin/appointments/${id}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    }
  });




  const totalRevenue = maintenancePlans.reduce((sum, plan) => sum + plan.price, 0);
  const pendingQuotes = quotes.filter(q => q.status === "pending").length;

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

        </div>

        <Tabs defaultValue="services" className="space-y-6">
          <TabsList className="flex w-full flex-wrap lg:grid lg:grid-cols-8 gap-1 h-auto p-1">
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
            <TabsTrigger value="appointments" className="flex-1 min-w-[100px] text-sm">
              Appointments
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex-1 min-w-[100px] text-sm">
              Quotes
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

          <TabsContent value="appointments">
            <AppointmentsTab 
              appointments={appointments}
              updateAppointmentStatusMutation={updateAppointmentStatusMutation}
            />
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
        <meta name="description" content="Manage reviews, quotes, and customers for HandyTech Solutions handyman services." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AuthenticatedDashboard />
    </>
  );
}