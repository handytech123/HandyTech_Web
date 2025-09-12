import { useState, useEffect } from "react";
import { Helmet } from 'react-helmet';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { type Customer, type MaintenancePlan, type EmailCampaign, type Appointment, updateCustomerProfileSchema } from "@shared/schema";
import { CalendarDays, Mail, CreditCard, Star, LogOut, AlertCircle, Edit, Save, X, Clock, Calendar, MapPin, RefreshCcw, Filter } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { z } from "zod";

type UpdateProfileFormData = z.infer<typeof updateCustomerProfileSchema>;

interface PortalProfileData {
  success: boolean;
  customer: Customer;
  maintenancePlans: MaintenancePlan[];
  emailCampaigns: EmailCampaign[];
  appointments: Appointment[];
}

export default function CustomerPortal() {
  const { toast } = useToast();
  const { customer: authCustomer, isAuthenticated, isLoading: authLoading, logout: authLogout } = useCustomerAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch full customer profile data when authenticated
  const { data: profileData, isLoading: profileLoading, isError, error } = useQuery<PortalProfileData>({
    queryKey: ["/api/portal/profile"],
    queryFn: async () => {
      const response = await fetch("/api/portal/profile", {
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Failed to load profile data");
      }
      
      return response.json();
    },
    enabled: isAuthenticated, // Only fetch when authenticated
    retry: false
  });

  const customer = profileData?.customer || authCustomer;
  const maintenancePlans = profileData?.maintenancePlans || [];
  const emailCampaigns = profileData?.emailCampaigns || [];
  const appointments = profileData?.appointments || [];
  
  const isLoading = authLoading || profileLoading;
  
  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  
  // Appointments state
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  
  // Form setup for profile editing
  const form = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateCustomerProfileSchema),
    defaultValues: {
      firstName: customer?.firstName || '',
      lastName: customer?.lastName || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      company: customer?.company || '',
    },
  });
  
  // Reset form when customer data changes
  useEffect(() => {
    if (customer) {
      form.reset({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone || '',
        company: customer.company || '',
      });
    }
  }, [customer, form]);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileFormData) => {
      return apiRequest("/api/portal/profile", {
        method: "PUT",
        body: data,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/profile"] });
      setIsEditing(false);
      toast({ title: "Profile updated successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update profile", 
        description: error?.message || "Please try again later.",
        variant: "destructive" 
      });
    },
  });
  
  const subscribeToPlan = useMutation({
    mutationFn: async (planData: { planType: string; price: number; nextBillingDate: string }) => {
      return apiRequest("/api/maintenance-plans", {
        method: "POST",
        body: {
          ...planData,
          customerId: customer?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/profile"] });
      toast({ title: "Successfully subscribed to maintenance plan!" });
    },
    onError: () => {
      toast({ title: "Failed to subscribe to plan", variant: "destructive" });
    },
  });

  // Reschedule appointment mutation
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async (data: { appointmentId: number; startISO: string }) => {
      return apiRequest(`/api/portal/appointments/${data.appointmentId}/reschedule`, {
        method: "PUT",
        body: { startISO: data.startISO },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/profile"] });
      setRescheduleDialogOpen(false);
      setSelectedAppointment(null);
      setSelectedDate(undefined);
      setSelectedTimeSlot('');
      toast({ title: "Appointment rescheduled successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to reschedule appointment", 
        description: error?.message || "Please try again.",
        variant: "destructive" 
      });
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authLogout();
      toast({ title: "Logged out successfully" });
    } catch (error) {
      toast({ title: "Logout failed", variant: "destructive" });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSubscribe = (planType: string, price: number) => {
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    
    subscribeToPlan.mutate({
      planType,
      price,
      nextBillingDate: nextBillingDate.toISOString(),
    });
  };
  
  const onProfileSubmit = (data: UpdateProfileFormData) => {
    updateProfileMutation.mutate(data);
  };
  
  const handleEditCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  // Appointment utility functions
  const filterAppointments = (filter: typeof appointmentFilter) => {
    const now = new Date();
    return appointments.filter(appointment => {
      const appointmentDate = appointment.startTimestamptz 
        ? new Date(appointment.startTimestamptz) 
        : new Date(appointment.appointmentDate);
      
      switch (filter) {
        case 'upcoming':
          return appointmentDate >= now && ['scheduled', 'confirmed'].includes(appointment.status);
        case 'past':
          return appointmentDate < now || ['completed', 'cancelled'].includes(appointment.status);
        case 'all':
        default:
          return true;
      }
    });
  };

  const formatAppointmentDate = (appointment: Appointment) => {
    const date = appointment.startTimestamptz 
      ? new Date(appointment.startTimestamptz) 
      : new Date(appointment.appointmentDate);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatAppointmentTime = (appointment: Appointment) => {
    if (appointment.startTimestamptz) {
      const startTime = new Date(appointment.startTimestamptz);
      const endTime = appointment.endTimestamptz ? new Date(appointment.endTimestamptz) : new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
      return `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
    return appointment.appointmentTime || 'TBD';
  };

  const canReschedule = (appointment: Appointment) => {
    if (!['scheduled', 'confirmed'].includes(appointment.status)) return false;
    
    const appointmentDate = appointment.startTimestamptz 
      ? new Date(appointment.startTimestamptz) 
      : new Date(appointment.appointmentDate);
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return appointmentDate > twentyFourHoursFromNow;
  };

  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleDialogOpen(true);
  };

  const handleRescheduleSubmit = () => {
    if (!selectedAppointment || !selectedDate || !selectedTimeSlot) {
      toast({
        title: "Please select both a date and time",
        variant: "destructive"
      });
      return;
    }

    const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
    const appointmentDateTime = new Date(selectedDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    rescheduleAppointmentMutation.mutate({
      appointmentId: selectedAppointment.id,
      startISO: appointmentDateTime.toISOString()
    });
  };

  // Handle loading states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-light-gray">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red mr-3"></div>
            <span className="text-charcoal">Loading your portal...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle authentication states  
  if (!isAuthenticated && !authLoading) {
    // Redirect to login page
    window.location.href = "/portal/login";
    return (
      <div className="flex items-center justify-center min-h-screen bg-light-gray">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <span className="text-charcoal">Redirecting to sign in...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle error states
  if (isError || (!customer && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-light-gray">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Unable to Load Portal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                {error?.message || "There was an issue loading your customer portal. Please try signing in again."}
              </AlertDescription>
            </Alert>
            <div className="flex space-x-2">
              <Button 
                onClick={() => window.location.href = "/portal/login"} 
                className="flex-1 bg-brand-red hover:bg-brand-red/90 text-white"
                data-testid="button-sign-in-again"
              >
                Sign In Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = "/"} 
                className="flex-1"
                data-testid="button-home"
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-gray">
      <Helmet>
        <title>Customer Portal | HandyTech Solutions Account Management</title>
        <meta name="description" content="Manage your HandyTech Solutions account, view maintenance plans, service history, and access customer support. Secure customer self-service portal." />
        <link rel="canonical" href="https://handytech-solutions.com/customer-portal" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      
      <div className="bg-charcoal text-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            HandyTech<span className="text-brand-red">Solutions</span> Customer Portal
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="border-white text-white hover:bg-white hover:text-charcoal"
            data-testid="button-logout"
          >
            {isLoggingOut ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-charcoal mb-2">
            Welcome back, {customer?.firstName}!
          </h2>
          <p className="text-gray-600">Manage your maintenance plans and account settings</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="plans">Maintenance Plans</TabsTrigger>
            <TabsTrigger value="subscribe">Subscribe</TabsTrigger>
            <TabsTrigger value="history">Email History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{maintenancePlans.filter(p => p.status === 'active').length}</div>
                  <p className="text-xs text-muted-foreground">Maintenance subscriptions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filterAppointments('upcoming').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {filterAppointments('upcoming').length === 1 ? 'Service scheduled' : 'Services scheduled'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Emails Received</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{emailCampaigns.length}</div>
                  <p className="text-xs text-muted-foreground">Total communications</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Member Since</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {customer?.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">Customer since</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Account Information</CardTitle>
                <div>
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      data-testid="button-edit-profile"
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditCancel}
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-cancel-edit"
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={form.handleSubmit(onProfileSubmit)}
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                        className="flex items-center gap-2 bg-brand-red hover:bg-brand-red/90"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
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
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" data-testid="input-email" />
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
                            <FormLabel>Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-company" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" value={customer?.firstName || ''} readOnly data-testid="text-first-name" />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" value={customer?.lastName || ''} readOnly data-testid="text-last-name" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={customer?.email || ''} readOnly data-testid="text-email" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={customer?.phone || "Not specified"} readOnly data-testid="text-phone" />
                    </div>
                    <div>
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" value={customer?.company || "Not specified"} readOnly data-testid="text-company" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-charcoal">Your Appointments</h2>
                <p className="text-gray-600">View and manage your scheduled services</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={appointmentFilter} onValueChange={(value: any) => setAppointmentFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter appointments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Appointments</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filterAppointments(appointmentFilter).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-charcoal mb-2">
                    {appointmentFilter === 'upcoming' ? 'No upcoming appointments' : 
                     appointmentFilter === 'past' ? 'No past appointments' : 'No appointments found'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {appointmentFilter === 'upcoming' 
                      ? "Schedule your next service appointment to get started."
                      : "Your appointment history will appear here."}
                  </p>
                  {appointmentFilter === 'upcoming' && (
                    <Button 
                      onClick={() => window.location.href = "/#contact"} 
                      className="bg-brand-red hover:bg-brand-red/90 text-white"
                      data-testid="button-schedule-appointment"
                    >
                      Schedule Appointment
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filterAppointments(appointmentFilter).map((appointment) => (
                  <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge 
                              variant={
                                appointment.status === 'scheduled' || appointment.status === 'confirmed' ? 'default' :
                                appointment.status === 'completed' ? 'secondary' : 'destructive'
                              }
                              className="capitalize"
                            >
                              {appointment.status}
                            </Badge>
                            <span className="text-sm text-gray-500">#{appointment.id}</span>
                          </div>
                          
                          <h3 className="text-lg font-semibold text-charcoal mb-2" data-testid={`text-service-${appointment.id}`}>
                            {appointment.serviceType}
                          </h3>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span data-testid={`text-date-${appointment.id}`}>
                                {formatAppointmentDate(appointment)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span data-testid={`text-time-${appointment.id}`}>
                                {formatAppointmentTime(appointment)}
                              </span>
                            </div>
                            {appointment.notes && (
                              <div className="flex items-start gap-2 mt-2">
                                <MapPin className="h-4 w-4 mt-0.5" />
                                <span className="text-xs text-gray-500" data-testid={`text-notes-${appointment.id}`}>
                                  {appointment.notes}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          {canReschedule(appointment) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReschedule(appointment)}
                              className="flex items-center gap-2"
                              data-testid={`button-reschedule-${appointment.id}`}
                            >
                              <RefreshCcw className="h-4 w-4" />
                              Reschedule
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`mailto:support@handytech-solutions.com?subject=Appointment ${appointment.id} Question`)}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                            data-testid={`button-contact-${appointment.id}`}
                          >
                            <Mail className="h-4 w-4" />
                            Contact
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Reschedule Dialog */}
            <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Reschedule Appointment</DialogTitle>
                  <DialogDescription>
                    Select a new date and time for your {selectedAppointment?.serviceType} appointment.
                    <br />
                    <span className="text-xs text-orange-600 mt-1 block">
                      Appointments must be rescheduled at least 24 hours in advance.
                    </span>
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="button-select-date"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {selectedDate ? selectedDate.toLocaleDateString() : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => {
                            const now = new Date();
                            const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                            return date < twentyFourHoursFromNow || date.getDay() === 0; // Disable Sundays and dates within 24h
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Select Time</Label>
                    <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                      <SelectTrigger data-testid="select-time-slot">
                        <SelectValue placeholder="Choose a time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="08:00">8:00 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                        <SelectItem value="12:00">12:00 PM</SelectItem>
                        <SelectItem value="14:00">2:00 PM</SelectItem>
                        <SelectItem value="16:00">4:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRescheduleDialogOpen(false);
                      setSelectedAppointment(null);
                      setSelectedDate(undefined);
                      setSelectedTimeSlot('');
                    }}
                    className="flex-1"
                    data-testid="button-cancel-reschedule"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRescheduleSubmit}
                    disabled={rescheduleAppointmentMutation.isPending || !selectedDate || !selectedTimeSlot}
                    className="flex-1 bg-brand-red hover:bg-brand-red/90 text-white"
                    data-testid="button-confirm-reschedule"
                  >
                    {rescheduleAppointmentMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Rescheduling...
                      </>
                    ) : (
                      'Confirm Reschedule'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Maintenance Plans</CardTitle>
              </CardHeader>
              <CardContent>
                {maintenancePlans.length === 0 ? (
                  <p className="text-muted-foreground">No active maintenance plans. Subscribe to a plan to get started!</p>
                ) : (
                  <div className="space-y-4">
                    {maintenancePlans.map((plan) => (
                      <div key={plan.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold capitalize">{plan.planType} Plan</h3>
                            <p className="text-sm text-muted-foreground">
                              Started: {new Date(plan.startDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                            {plan.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-lg font-bold">${plan.price}/month</div>
                          <div className="text-sm text-muted-foreground">
                            Next billing: {new Date(plan.nextBillingDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscribe" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="relative">
                <CardHeader>
                  <CardTitle>Basic Plan</CardTitle>
                  <div className="text-3xl font-bold">$99<span className="text-lg text-muted-foreground">/month</span></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Star className="h-4 w-4 text-brand-red mr-2" />
                      Monthly system checkup
                    </li>
                    <li className="flex items-center">
                      <Star className="h-4 w-4 text-brand-red mr-2" />
                      Basic security updates
                    </li>
                    <li className="flex items-center">
                      <Star className="h-4 w-4 text-brand-red mr-2" />
                      Email support
                    </li>
                  </ul>
                  <Button 
                    onClick={() => handleSubscribe('basic', 99)}
                    className="w-full bg-brand-red hover:bg-brand-red-dark"
                    disabled={subscribeToPlan.isPending}
                  >
                    Subscribe to Basic
                  </Button>
                </CardContent>
              </Card>

              <Card className="relative border-brand-red border-2">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-brand-red">Most Popular</Badge>
                </div>
                <CardHeader>
                  <CardTitle>Professional Plan</CardTitle>
                  <div className="text-3xl font-bold">$199<span className="text-lg text-muted-foreground">/month</span></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Star className="h-4 w-4 text-brand-red mr-2" />
                      Bi-weekly system checkup
                    </li>
                    <li className="flex items-center">
                      <Star className="h-4 w-4 text-brand-red mr-2" />
                      Advanced security monitoring
                    </li>
                    <li className="flex items-center">
                      <Star className="h-4 w-4 text-brand-red mr-2" />
                      Priority phone support
                    </li>
                    <li className="flex items-center">
                      <Star className="h-4 w-4 text-brand-red mr-2" />
                      Monthly reports
                    </li>
                  </ul>
                  <Button 
                    onClick={() => handleSubscribe('professional', 199)}
                    className="w-full bg-brand-red hover:bg-brand-red-dark"
                    disabled={subscribeToPlan.isPending}
                  >
                    Subscribe to Professional
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Enterprise Plan</CardTitle>
                  <div className="text-3xl font-bold">$399<span className="text-lg text-muted-foreground">/month</span></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Star className="h-4 w-4 text-brand-red mr-2" />
                      Weekly system checkup
                    </li>
                    <li className="flex items-center">
                      <Star className="h-4 w-4 text-brand-red mr-2" />
                      Enterprise security suite
                    </li>
                    <li className="flex items-center">
                      <Star className="h-4 w-4 text-brand-red mr-2" />
                      24/7 dedicated support
                    </li>
                    <li className="flex items-center">
                      <Star className="h-4 w-4 text-brand-red mr-2" />
                      Custom integrations
                    </li>
                  </ul>
                  <Button 
                    onClick={() => handleSubscribe('enterprise', 399)}
                    className="w-full bg-brand-red hover:bg-brand-red-dark"
                    disabled={subscribeToPlan.isPending}
                  >
                    Subscribe to Enterprise
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Communication History</CardTitle>
              </CardHeader>
              <CardContent>
                {emailCampaigns.length === 0 ? (
                  <p className="text-muted-foreground">No email communications yet.</p>
                ) : (
                  <div className="space-y-4">
                    {emailCampaigns.map((campaign) => (
                      <div key={campaign.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{campaign.subject}</h3>
                          <Badge variant="outline" className="capitalize">
                            {campaign.campaignType}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{campaign.content}</p>
                        <p className="text-xs text-muted-foreground">
                          Sent: {new Date(campaign.sentAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
