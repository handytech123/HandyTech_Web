import { useState, useEffect, useMemo } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { type Customer, type MaintenancePlan, type EmailCampaign, type Appointment, updateCustomerProfileSchema, type ServiceHistoryItem } from "@shared/schema";
import { CalendarDays, Mail, CreditCard, Star, LogOut, AlertCircle, Edit, Save, X, Clock, Calendar, MapPin, RefreshCcw, Filter, Ban, Play, AlertTriangle, CheckCircle2, Info, Phone, FileText, Search, Download, DollarSign, Home } from "lucide-react";
import { Link } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RescheduleAppointmentDialog from "@/components/reschedule-appointment-dialog";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";

type UpdateProfileFormData = z.infer<typeof updateCustomerProfileSchema>;

// Response interfaces for mutations
interface MutationResponse {
  success: boolean;
  message: string;
}

interface CancelSubscriptionResponse extends MutationResponse {
  cancellationType: 'immediate' | 'end_of_period';
}

interface ReactivateSubscriptionResponse extends MutationResponse {
  message: string;
}

interface PortalProfileData {
  success: boolean;
  customer: Customer;
  maintenancePlans: MaintenancePlan[];
  emailCampaigns: EmailCampaign[];
  appointments: Appointment[];
}

interface ServiceHistoryData {
  success: boolean;
  serviceHistory: ServiceHistoryItem[];
  summary: {
    totalServices: number;
    totalCost: number;
    averageCost: number;
    dateRange: {
      earliest: string | null;
      latest: string | null;
    };
  };
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function CustomerPortal() {
  const { toast } = useToast();
  const { customer: authCustomer, isAuthenticated, isLoading: authLoading, logout: authLogout } = useCustomerAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Service History state with pagination (moved up before URL construction)
  const [serviceHistoryFilters, setServiceHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    serviceType: '',
    limit: 50,
    offset: 0,
  });
  const [showServiceHistoryFilters, setShowServiceHistoryFilters] = useState(false);

  // Fetch full customer profile data when authenticated
  const { data: profileData, isLoading: profileLoading, isError, error } = useQuery<PortalProfileData>({
    queryKey: ["/api/portal/profile"],
    enabled: isAuthenticated, // Only fetch when authenticated
    retry: false
  });

  // SECURITY: Use standard TanStack Query fetcher with CSRF protection and proper URL construction  
  // Construct secure URL with query parameters for default fetcher using useMemo
  const serviceHistoryUrl = useMemo(() => {
    const queryParams = new URLSearchParams();
    if (serviceHistoryFilters.startDate) queryParams.append('startDate', serviceHistoryFilters.startDate);
    if (serviceHistoryFilters.endDate) queryParams.append('endDate', serviceHistoryFilters.endDate);
    if (serviceHistoryFilters.serviceType) queryParams.append('serviceType', serviceHistoryFilters.serviceType);
    if (serviceHistoryFilters.limit) queryParams.append('limit', serviceHistoryFilters.limit.toString());
    if (serviceHistoryFilters.offset) queryParams.append('offset', serviceHistoryFilters.offset.toString());
    
    return `/api/portal/service-history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  }, [serviceHistoryFilters]);

  // Fetch service history data with secure default fetcher (no custom queryFn)
  const { data: serviceHistoryData, isLoading: serviceHistoryLoading, isError: serviceHistoryError } = useQuery<ServiceHistoryData>({
    queryKey: [serviceHistoryUrl, "service-history", serviceHistoryFilters], // Hierarchical cache structure
    enabled: isAuthenticated, // Only fetch when authenticated
    retry: false
  });

  const customer = profileData?.customer || authCustomer;
  const maintenancePlans = profileData?.maintenancePlans || [];
  const emailCampaigns = profileData?.emailCampaigns || [];
  const appointments = profileData?.appointments || [];
  const serviceHistory = serviceHistoryData?.serviceHistory || [];
  const serviceHistorySummary = serviceHistoryData?.summary;
  
  const isLoading = authLoading || profileLoading;
  
  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  
  // Appointments state
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Subscription management state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);
  const [cancellationType, setCancellationType] = useState<'immediate' | 'end_of_period'>('end_of_period');
  
  
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
  
  // SECURITY: Use secure portal endpoint that only accepts planType
  const subscribeToPlan = useMutation({
    mutationFn: async (planData: { planType: string }) => {
      return apiRequest("/api/portal/maintenance-plans", {
        method: "POST",
        body: {
          planType: planData.planType, // Only send planType, server computes all sensitive data
        },
      });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/profile"] });
      toast({ 
        title: "Success!",
        description: response?.message || "Successfully subscribed to maintenance plan!" 
      });
    },
    onError: (error: any) => {
      // Handle specific business rule violations
      let errorMessage = "Failed to subscribe to maintenance plan.";
      
      if (error?.message?.includes("already have an active maintenance plan")) {
        errorMessage = "You already have an active maintenance plan. Please cancel your current plan before creating a new one.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });

  // Customer-specific reschedule appointment mutation using customer portal API
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, startTime, endTime }: { 
      appointmentId: number; 
      startTime: string; 
      endTime: string; 
    }) => {
      // Use customer portal API with proper authentication
      const response = await apiRequest(`/api/portal/appointments/${appointmentId}/reschedule`, {
        method: "PUT",
        body: { startISO: startTime },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reschedule appointment");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      setRescheduleDialogOpen(false);
      setSelectedAppointment(null);
      toast({ 
        title: "Appointment Rescheduled",
        description: "Your appointment has been successfully rescheduled."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Reschedule Failed", 
        description: error?.message || "Please try again.",
        variant: "destructive" 
      });
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation<CancelSubscriptionResponse, any, { planId: number; cancellationType: 'immediate' | 'end_of_period' }>({
    mutationFn: async (data: { planId: number; cancellationType: 'immediate' | 'end_of_period' }) => {
      return apiRequest(`/api/portal/maintenance-plans/${data.planId}/cancel`, {
        method: "PUT",
        body: { cancellationType: data.cancellationType },
      }) as unknown as Promise<CancelSubscriptionResponse>;
    },
    onSuccess: (response: CancelSubscriptionResponse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/profile"] });
      setCancelDialogOpen(false);
      setSelectedPlan(null);
      setCancellationType('end_of_period');
      toast({ 
        title: response.message || "Subscription cancelled successfully",
        description: response.cancellationType === 'immediate' 
          ? "Your plan access has ended immediately." 
          : "Your plan will remain active until the end of your current billing period."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to cancel subscription", 
        description: error?.message || "Please try again or contact support.",
        variant: "destructive" 
      });
    },
  });

  // Reactivate subscription mutation
  const reactivateSubscriptionMutation = useMutation<ReactivateSubscriptionResponse, any, number>({
    mutationFn: async (planId: number) => {
      return apiRequest(`/api/portal/maintenance-plans/${planId}/reactivate`, {
        method: "PUT",
      }) as unknown as Promise<ReactivateSubscriptionResponse>;
    },
    onSuccess: (response: ReactivateSubscriptionResponse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/profile"] });
      setReactivateDialogOpen(false);
      setSelectedPlan(null);
      toast({ 
        title: "Welcome back!",
        description: response.message || "Your subscription has been reactivated successfully."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to reactivate subscription", 
        description: error?.message || "Please try again or contact support.",
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

  // SECURITY: Only pass planType, server computes pricing and billing dates
  const handleSubscribe = (planType: string, price: number) => {
    subscribeToPlan.mutate({
      planType, // Only planType needed - server handles all sensitive data
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

  // Subscription management handlers
  const handleCancelSubscription = (plan: MaintenancePlan) => {
    setSelectedPlan(plan);
    setCancelDialogOpen(true);
  };

  const handleReactivateSubscription = (plan: MaintenancePlan) => {
    setSelectedPlan(plan);
    setReactivateDialogOpen(true);
  };

  const handleCancelConfirm = () => {
    if (!selectedPlan) return;
    
    cancelSubscriptionMutation.mutate({
      planId: selectedPlan.id,
      cancellationType
    });
  };

  const handleReactivateConfirm = () => {
    if (!selectedPlan) return;
    
    reactivateSubscriptionMutation.mutate(selectedPlan.id);
  };

  // Subscription utility functions
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'pending_cancellation':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <Ban className="h-4 w-4 text-red-600" />;
      case 'pending_cancellation':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const canReactivate = (plan: MaintenancePlan) => {
    if (plan.status !== 'cancelled' || !plan.cancelledAt) return false;
    
    const cancelledDate = new Date(plan.cancelledAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return cancelledDate > thirtyDaysAgo;
  };

  const getSubscriptionStatusText = (plan: MaintenancePlan) => {
    switch (plan.status) {
      case 'active':
        return `Active until ${new Date(plan.nextBillingDate).toLocaleDateString()}`;
      case 'pending_cancellation':
        return `Cancelling at end of period on ${plan.endDate ? new Date(plan.endDate).toLocaleDateString() : 'billing cycle end'}`;
      case 'cancelled':
        if (canReactivate(plan)) {
          return `Cancelled on ${plan.cancelledAt ? new Date(plan.cancelledAt).toLocaleDateString() : 'unknown date'} - Can reactivate`;
        }
        return `Cancelled on ${plan.cancelledAt ? new Date(plan.cancelledAt).toLocaleDateString() : 'unknown date'}`;
      default:
        return `Status: ${plan.status}`;
    }
  };

  const hasActivePlan = (planType: string) => {
    return maintenancePlans.some(plan => 
      plan.planType === planType && ['active', 'pending_cancellation'].includes(plan.status)
    );
  };

  const getUpgradeText = (planType: string, price: number) => {
    const currentActivePlans = maintenancePlans.filter(plan => 
      ['active', 'pending_cancellation'].includes(plan.status)
    );
    
    if (currentActivePlans.length === 0) {
      return `Subscribe to ${planType}`;
    }
    
    const lowestPlan = currentActivePlans.reduce((lowest, plan) => 
      plan.price < lowest.price ? plan : lowest
    );
    
    if (price > lowestPlan.price) {
      return `Upgrade to ${planType}`;
    }
    
    return `Subscribe to ${planType}`;
  };

  // Handle loading states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-light-gray">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mr-3"></div>
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
                className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white"
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
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">
              HandyTech<span className="text-brand-primary">Solutions</span> Customer Portal
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

        {/* Status Banner */}
        <div className="mb-8">
          <StatusBanner 
            maintenancePlans={maintenancePlans}
            appointments={appointments}
          />
        </div>

        {/* Dashboard Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-12">
          <AppointmentsCard 
            appointments={appointments}
            onReschedule={handleReschedule}
          />
          <ProfileCard 
            customer={customer as Customer | undefined}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            form={form}
            onProfileSubmit={onProfileSubmit}
            handleEditCancel={handleEditCancel}
            updateProfileMutation={updateProfileMutation}
          />
          <ServiceHistoryPreviewCard 
            serviceHistory={serviceHistory}
            serviceHistorySummary={serviceHistorySummary}
            isLoading={serviceHistoryLoading}
          />
          <SubscribeCard 
            maintenancePlans={maintenancePlans}
            hasActivePlan={hasActivePlan}
            handleSubscribe={handleSubscribe}
            subscribeToPlan={subscribeToPlan}
            getUpgradeText={getUpgradeText}
          />
        </div>

        {/* Detailed Sections */}
        <div className="space-y-12">
          <MaintenancePlansSection 
            maintenancePlans={maintenancePlans}
            handleCancelSubscription={handleCancelSubscription}
            handleReactivateSubscription={handleReactivateSubscription}
            getStatusBadgeVariant={getStatusBadgeVariant}
            getStatusIcon={getStatusIcon}
            getSubscriptionStatusText={getSubscriptionStatusText}
            canReactivate={canReactivate}
          />
          
          <ServiceHistorySection 
            serviceHistory={serviceHistory}
            serviceHistorySummary={serviceHistorySummary}
            serviceHistoryFilters={serviceHistoryFilters}
            setServiceHistoryFilters={setServiceHistoryFilters}
            showServiceHistoryFilters={showServiceHistoryFilters}
            setShowServiceHistoryFilters={setShowServiceHistoryFilters}
            serviceHistoryLoading={serviceHistoryLoading}
            serviceHistoryError={serviceHistoryError}
          />
        </div>

        {/* All Dialogs */}
        <RescheduleAppointmentDialog
          appointment={selectedAppointment}
          open={rescheduleDialogOpen}
          onOpenChange={(open) => {
            setRescheduleDialogOpen(open);
            if (!open) {
              setSelectedAppointment(null);
            }
          }}
          customMutation={rescheduleAppointmentMutation}
        />

        <CancelSubscriptionDialog 
          cancelDialogOpen={cancelDialogOpen}
          setCancelDialogOpen={setCancelDialogOpen}
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          cancellationType={cancellationType}
          setCancellationType={setCancellationType}
          handleCancelConfirm={handleCancelConfirm}
          cancelSubscriptionMutation={cancelSubscriptionMutation}
        />

        <ReactivateSubscriptionDialog 
          reactivateDialogOpen={reactivateDialogOpen}
          setReactivateDialogOpen={setReactivateDialogOpen}
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          handleReactivateConfirm={handleReactivateConfirm}
          reactivateSubscriptionMutation={reactivateSubscriptionMutation}
        />
      </div>
    </div>
  );
}

// Dashboard Components
interface StatusBannerProps {
  maintenancePlans: MaintenancePlan[];
  appointments: Appointment[];
}

function StatusBanner({ maintenancePlans, appointments }: StatusBannerProps) {
  const activePlan = maintenancePlans.find(plan => plan.status === 'active');
  const upcomingAppointments = appointments.filter(appointment => {
    const appointmentDate = appointment.startTimestamptz 
      ? new Date(appointment.startTimestamptz) 
      : new Date(appointment.appointmentDate);
    return appointmentDate >= new Date() && ['scheduled', 'confirmed'].includes(appointment.status);
  });

  if (!activePlan && upcomingAppointments.length === 0) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>No Active Plan</strong> - Consider subscribing to a maintenance plan to keep your systems running smoothly.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertDescription className="text-green-800 dark:text-green-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            {activePlan && (
              <span>
                <strong>{activePlan.planType} Plan Active</strong> - Next billing: {new Date(activePlan.nextBillingDate).toLocaleDateString()}
              </span>
            )}
            {activePlan && upcomingAppointments.length > 0 && ' • '}
            {upcomingAppointments.length > 0 && (
              <span>
                <strong>{upcomingAppointments.length} upcoming appointment{upcomingAppointments.length === 1 ? '' : 's'}</strong>
              </span>
            )}
          </div>
          <Badge className="bg-green-600 text-white w-fit">All Systems Operational</Badge>
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface AppointmentsCardProps {
  appointments: Appointment[];
  onReschedule: (appointment: Appointment) => void;
}

function AppointmentsCard({ appointments, onReschedule }: AppointmentsCardProps) {
  const upcomingAppointments = appointments.filter(appointment => {
    const appointmentDate = appointment.startTimestamptz 
      ? new Date(appointment.startTimestamptz) 
      : new Date(appointment.appointmentDate);
    return appointmentDate >= new Date() && ['scheduled', 'confirmed'].includes(appointment.status);
  }).sort((a, b) => {
    const dateA = a.startTimestamptz ? new Date(a.startTimestamptz) : new Date(a.appointmentDate);
    const dateB = b.startTimestamptz ? new Date(b.startTimestamptz) : new Date(b.appointmentDate);
    return dateA.getTime() - dateB.getTime();
  });

  const nextAppointment = upcomingAppointments[0];

  const canReschedule = (appointment: Appointment) => {
    if (!['scheduled', 'confirmed'].includes(appointment.status)) return false;
    const appointmentDate = appointment.startTimestamptz 
      ? new Date(appointment.startTimestamptz) 
      : new Date(appointment.appointmentDate);
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return appointmentDate > twentyFourHoursFromNow;
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

  return (
    <Card data-testid="card-appointments">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl">Next Appointment</CardTitle>
        <Calendar className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {nextAppointment ? (
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="capitalize" data-testid={`badge-status-${nextAppointment.id}`}>
                  {nextAppointment.status}
                </Badge>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Service ID: #{nextAppointment.id}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{formatAppointmentDate(nextAppointment)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{formatAppointmentTime(nextAppointment)}</span>
                </div>
                {nextAppointment.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400">{nextAppointment.address}</span>
                  </div>
                )}
              </div>
            </div>
            
            {canReschedule(nextAppointment) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onReschedule(nextAppointment)}
                className="w-full flex items-center gap-2"
                data-testid={`button-reschedule-${nextAppointment.id}`}
              >
                <RefreshCcw className="h-4 w-4" />
                Reschedule Appointment
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No upcoming appointments scheduled</p>
            <Button variant="outline" size="sm" className="mt-4" data-testid="button-schedule-appointment">
              Schedule Service
            </Button>
          </div>
        )}
        
        {upcomingAppointments.length > 1 && (
          <div className="pt-3 border-t">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              + {upcomingAppointments.length - 1} more appointment{upcomingAppointments.length - 1 === 1 ? '' : 's'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Profile Card Component
interface ProfileCardProps {
  customer: Customer | undefined;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  form: any;
  onProfileSubmit: (data: any) => void;
  handleEditCancel: () => void;
  updateProfileMutation: any;
}

function ProfileCard({ customer, isEditing, setIsEditing, form, onProfileSubmit, handleEditCancel, updateProfileMutation }: ProfileCardProps) {
  return (
    <Card data-testid="card-profile">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl">Account Information</CardTitle>
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
                className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90"
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
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Name</span>
                <p className="text-charcoal" data-testid="text-full-name">{customer?.firstName} {customer?.lastName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email</span>
                <p className="text-charcoal" data-testid="text-email">{customer?.email}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Phone</span>
                <p className="text-charcoal" data-testid="text-phone">{customer?.phone || "Not specified"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Company</span>
                <p className="text-charcoal" data-testid="text-company">{customer?.company || "Not specified"}</p>
              </div>
            </div>
            {customer?.createdAt && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarDays className="h-4 w-4" />
                  <span>Customer since {new Date(customer.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Service History Preview Card
interface ServiceHistoryPreviewCardProps {
  serviceHistory: ServiceHistoryItem[];
  serviceHistorySummary: any;
  isLoading: boolean;
}

function ServiceHistoryPreviewCard({ serviceHistory, serviceHistorySummary, isLoading }: ServiceHistoryPreviewCardProps) {
  const recentServices = serviceHistory.slice(0, 3);

  return (
    <Card data-testid="card-service-history">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl">Service History</CardTitle>
        <FileText className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ) : serviceHistorySummary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Total Services</span>
                <p className="text-2xl font-bold text-charcoal">{serviceHistorySummary.totalServices}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Total Spent</span>
                <p className="text-2xl font-bold text-charcoal">${serviceHistorySummary.totalCost.toFixed(2)}</p>
              </div>
            </div>
            
            {recentServices.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Recent Services</h4>
                {recentServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{service.serviceType}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(service.serviceDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">${service.cost.toFixed(2)}</p>
                      <Badge variant="secondary" className="text-xs">
                        {service.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Button variant="outline" size="sm" className="w-full" data-testid="button-view-full-history">
              View Full History
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No service history available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Subscribe Card Component
interface SubscribeCardProps {
  maintenancePlans: MaintenancePlan[];
  hasActivePlan: (planType: string) => boolean;
  handleSubscribe: (planType: string, price: number) => void;
  subscribeToPlan: any;
  getUpgradeText: (planType: string, price: number) => string;
}

function SubscribeCard({ maintenancePlans, hasActivePlan, handleSubscribe, subscribeToPlan, getUpgradeText }: SubscribeCardProps) {
  const activePlan = maintenancePlans.find(plan => plan.status === 'active');
  
  const plans = [
    { type: 'basic', name: 'Basic', price: 99, features: ['Monthly checkups', 'Email support', 'Basic updates'] },
    { type: 'professional', name: 'Professional', price: 199, features: ['Bi-weekly checkups', 'Phone support', 'Advanced monitoring'], popular: true },
    { type: 'enterprise', name: 'Enterprise', price: 499, features: ['Weekly checkups', '24/7 support', 'Custom integrations'] }
  ];

  return (
    <Card data-testid="card-subscribe">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl">Maintenance Plans</CardTitle>
        <CreditCard className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {activePlan ? (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <div className="flex items-center justify-between">
                  <span><strong>{activePlan.planType} Plan Active</strong></span>
                  <Badge className="bg-green-600 text-white">${activePlan.price}/mo</Badge>
                </div>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Available Upgrades</h4>
              {plans
                .filter(plan => plan.price > activePlan.price)
                .map((plan) => (
                  <div key={plan.type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{plan.name} Plan</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {plan.features.slice(0, 2).join(' • ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">${plan.price}/mo</span>
                      <Button
                        size="sm"
                        onClick={() => handleSubscribe(plan.type, plan.price)}
                        disabled={subscribeToPlan.isPending}
                        className="bg-brand-primary hover:bg-brand-primary/90 text-white"
                        data-testid={`button-upgrade-${plan.type}`}
                      >
                        Upgrade
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>No Active Plan</strong> - Subscribe to keep your systems running smoothly.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              {plans.map((plan) => (
                <div key={plan.type} className={`p-4 border rounded-lg ${plan.popular ? 'border-brand-blue bg-blue-50 dark:bg-blue-950/30' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{plan.name}</h4>
                      {plan.popular && (
                        <Badge className="bg-brand-primary text-white text-xs">Most Popular</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold">${plan.price}</span>
                      <span className="text-sm text-gray-600">/month</span>
                    </div>
                  </div>
                  <ul className="text-sm text-gray-600 mb-3 space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Star className="h-3 w-3 text-brand-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleSubscribe(plan.type, plan.price)}
                    disabled={subscribeToPlan.isPending}
                    className={`w-full ${plan.popular ? 'bg-brand-primary hover:bg-brand-primary/90 text-white' : 'variant="outline"'}`}
                    data-testid={`button-subscribe-${plan.type}`}
                  >
                    {subscribeToPlan.isPending ? 'Processing...' : getUpgradeText(plan.name, plan.price)}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Section Components
interface MaintenancePlansSectionProps {
  maintenancePlans: MaintenancePlan[];
  handleCancelSubscription: (plan: MaintenancePlan) => void;
  handleReactivateSubscription: (plan: MaintenancePlan) => void;
  getStatusBadgeVariant: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  getSubscriptionStatusText: (plan: MaintenancePlan) => string;
  canReactivate: (plan: MaintenancePlan) => boolean;
}

function MaintenancePlansSection({ 
  maintenancePlans, 
  handleCancelSubscription, 
  handleReactivateSubscription, 
  getStatusBadgeVariant, 
  getStatusIcon, 
  getSubscriptionStatusText, 
  canReactivate 
}: MaintenancePlansSectionProps) {
  if (maintenancePlans.length === 0) {
    return null; // Hide section if no plans
  }

  return (
    <div id="maintenance-plans" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-charcoal mb-2">Maintenance Plans</h2>
        <p className="text-gray-600">Manage your active subscriptions and billing</p>
      </div>

      <div className="space-y-6">
        {maintenancePlans.map((plan) => (
          <Card key={plan.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(plan.status)}
                    <div>
                      <h3 className="text-xl font-semibold capitalize flex items-center gap-2">
                        {plan.planType} Plan
                        <Badge 
                          variant={getStatusBadgeVariant(plan.status) as "default" | "destructive" | "secondary" | "outline"}
                          className="text-xs"
                          data-testid={`badge-status-${plan.id}`}
                        >
                          {plan.status === 'pending_cancellation' ? 'Ending Soon' : plan.status}
                        </Badge>
                      </h3>
                      <p className="text-sm text-gray-600">
                        {getSubscriptionStatusText(plan)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Price</span>
                      <p className="text-lg font-bold text-charcoal">${plan.price}/month</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Started</span>
                      <p className="text-charcoal">{new Date(plan.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        {plan.status === 'active' ? 'Next Billing' : 
                         plan.status === 'pending_cancellation' ? 'Active Until' : 'Cancelled'}
                      </span>
                      <p className="text-charcoal">
                        {plan.status === 'pending_cancellation' && plan.endDate 
                          ? new Date(plan.endDate).toLocaleDateString()
                          : plan.status === 'cancelled' && plan.cancelledAt
                          ? new Date(plan.cancelledAt).toLocaleDateString()
                          : new Date(plan.nextBillingDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {plan.cancellationReason && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <span className="font-medium">Cancellation reason:</span> {plan.cancellationReason}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {plan.status === 'active' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelSubscription(plan)}
                      className="flex items-center gap-2"
                      data-testid={`button-cancel-${plan.id}`}
                    >
                      <Ban className="h-4 w-4" />
                      Cancel Plan
                    </Button>
                  )}
                  
                  {plan.status === 'cancelled' && canReactivate(plan) && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleReactivateSubscription(plan)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                      data-testid={`button-reactivate-${plan.id}`}
                    >
                      <Play className="h-4 w-4" />
                      Reactivate
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`mailto:support@handytech-solutions.com?subject=Question about ${plan.planType} Plan (ID: ${plan.id})`)}
                    className="flex items-center gap-2"
                    data-testid={`button-contact-${plan.id}`}
                  >
                    <Phone className="h-4 w-4" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface ServiceHistorySectionProps {
  serviceHistory: ServiceHistoryItem[];
  serviceHistorySummary: any;
  serviceHistoryFilters: any;
  setServiceHistoryFilters: (filters: any) => void;
  showServiceHistoryFilters: boolean;
  setShowServiceHistoryFilters: (show: boolean) => void;
  serviceHistoryLoading: boolean;
  serviceHistoryError: boolean;
}

function ServiceHistorySection({
  serviceHistory,
  serviceHistorySummary,
  serviceHistoryFilters,
  setServiceHistoryFilters,
  showServiceHistoryFilters,
  setShowServiceHistoryFilters,
  serviceHistoryLoading,
  serviceHistoryError
}: ServiceHistorySectionProps) {
  if (serviceHistoryLoading || (!serviceHistory.length && !serviceHistoryError)) {
    return (
      <div id="service-history" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-charcoal mb-2">Service History</h2>
          <p className="text-gray-600">View your complete service history and invoices</p>
        </div>
        
        <Card>
          <CardContent className="py-8 text-center">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse mx-auto w-32"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse mx-auto w-48"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse mx-auto w-24"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div id="service-history" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-charcoal mb-2">Service History</h2>
          <p className="text-gray-600">View your complete service history and invoices</p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowServiceHistoryFilters(!showServiceHistoryFilters)}
          className="flex items-center gap-2"
          data-testid="button-toggle-filters"
        >
          <Filter className="h-4 w-4" />
          {showServiceHistoryFilters ? 'Hide' : 'Show'} Filters
        </Button>
      </div>

      {showServiceHistoryFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filter Service History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={serviceHistoryFilters.startDate}
                  onChange={(e) => setServiceHistoryFilters((prev: any) => ({ ...prev, startDate: e.target.value }))}
                  data-testid="input-start-date"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={serviceHistoryFilters.endDate}
                  onChange={(e) => setServiceHistoryFilters((prev: any) => ({ ...prev, endDate: e.target.value }))}
                  data-testid="input-end-date"
                />
              </div>
              <div>
                <Label htmlFor="serviceType">Service Type</Label>
                <Input
                  id="serviceType"
                  placeholder="Filter by service type"
                  value={serviceHistoryFilters.serviceType}
                  onChange={(e) => setServiceHistoryFilters((prev: any) => ({ ...prev, serviceType: e.target.value }))}
                  data-testid="input-service-type"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {serviceHistorySummary && (
        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-700">Total Services</span>
              </div>
              <p className="text-3xl font-bold text-charcoal">{serviceHistorySummary.totalServices}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-700">Total Spent</span>
              </div>
              <p className="text-3xl font-bold text-charcoal">${serviceHistorySummary.totalCost.toFixed(2)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-gray-700">Average Cost</span>
              </div>
              <p className="text-3xl font-bold text-charcoal">${serviceHistorySummary.averageCost.toFixed(2)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-gray-700">Date Range</span>
              </div>
              <p className="text-sm text-charcoal">
                {serviceHistorySummary.dateRange.earliest && serviceHistorySummary.dateRange.latest
                  ? `${new Date(serviceHistorySummary.dateRange.earliest).toLocaleDateString()} - ${new Date(serviceHistorySummary.dateRange.latest).toLocaleDateString()}`
                  : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {serviceHistory.length > 0 ? (
        <div className="space-y-4">
          {serviceHistory.map((service, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="secondary" className="capitalize">
                        {service.status}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Service #{service.id || index + 1}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-charcoal mb-2">
                      {service.serviceType}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(service.serviceDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">${service.cost.toFixed(2)}</span>
                      </div>
                      {service.technician && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {service.technician}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {service.description && (
                      <p className="text-sm text-gray-600 mt-2">{service.description}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`mailto:support@handytech-solutions.com?subject=Service History Question - ${service.serviceType}`)}
                      className="flex items-center gap-2"
                      data-testid={`button-contact-service-${index}`}
                    >
                      <Mail className="h-4 w-4" />
                      Contact
                    </Button>
                    {service.invoiceUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(service.invoiceUrl, '_blank')}
                        className="flex items-center gap-2"
                        data-testid={`button-download-invoice-${index}`}
                      >
                        <Download className="h-4 w-4" />
                        Invoice
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-charcoal mb-2">No Service History</h3>
            <p className="text-gray-600">Your service history will appear here once you start using our services.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Dialog Components
interface CancelSubscriptionDialogProps {
  cancelDialogOpen: boolean;
  setCancelDialogOpen: (open: boolean) => void;
  selectedPlan: MaintenancePlan | null;
  setSelectedPlan: (plan: MaintenancePlan | null) => void;
  cancellationType: 'immediate' | 'end_of_period';
  setCancellationType: (type: 'immediate' | 'end_of_period') => void;
  handleCancelConfirm: () => void;
  cancelSubscriptionMutation: any;
}

function CancelSubscriptionDialog({
  cancelDialogOpen,
  setCancelDialogOpen,
  selectedPlan,
  setSelectedPlan,
  cancellationType,
  setCancellationType,
  handleCancelConfirm,
  cancelSubscriptionMutation
}: CancelSubscriptionDialogProps) {
  return (
    <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Ban className="h-5 w-5" />
            Cancel {selectedPlan?.planType} Plan
          </DialogTitle>
          <DialogDescription>
            We're sorry to see you go! Please review the details below before confirming your cancellation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>What you'll lose:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>{selectedPlan?.planType === 'basic' ? 'Monthly' : selectedPlan?.planType === 'professional' ? 'Bi-weekly' : 'Weekly'} system checkups</li>
                <li>{selectedPlan?.planType === 'enterprise' ? '24/7 dedicated' : selectedPlan?.planType === 'professional' ? 'Priority phone' : 'Email'} support</li>
                <li>Security monitoring and updates</li>
                {selectedPlan?.planType !== 'basic' && <li>Monthly reports and insights</li>}
                {selectedPlan?.planType === 'enterprise' && <li>Custom integrations and enterprise features</li>}
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <Label className="text-base font-semibold">Cancellation Type</Label>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="end-of-period"
                  name="cancellationType"
                  value="end_of_period"
                  checked={cancellationType === 'end_of_period'}
                  onChange={(e) => setCancellationType(e.target.value as 'immediate' | 'end_of_period')}
                  className="mt-1 h-4 w-4 text-brand-primary"
                  data-testid="radio-end-of-period"
                />
                <div className="flex-1">
                  <label htmlFor="end-of-period" className="font-medium text-sm cursor-pointer">
                    Cancel at end of billing period (Recommended)
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Continue using your plan until {selectedPlan?.nextBillingDate ? new Date(selectedPlan.nextBillingDate).toLocaleDateString() : 'your next billing date'}. 
                    You won't be charged again.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  id="immediate"
                  name="cancellationType"
                  value="immediate"
                  checked={cancellationType === 'immediate'}
                  onChange={(e) => setCancellationType(e.target.value as 'immediate' | 'end_of_period')}
                  className="mt-1 h-4 w-4 text-brand-primary"
                  data-testid="radio-immediate"
                />
                <div className="flex-1">
                  <label htmlFor="immediate" className="font-medium text-sm cursor-pointer">
                    Cancel immediately
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Your plan access will end right away. No refund for the current billing period.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Need help instead?</strong> Our support team can help resolve issues or adjust your plan. 
              <Button 
                variant="link" 
                className="p-0 h-auto text-brand-primary"
                onClick={() => {
                  setCancelDialogOpen(false);
                  window.open(`mailto:support@handytech-solutions.com?subject=Help with ${selectedPlan?.planType} Plan (ID: ${selectedPlan?.id})`);
                }}
              >
                Contact support instead
              </Button>
            </AlertDescription>
          </Alert>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setCancelDialogOpen(false);
              setSelectedPlan(null);
              setCancellationType('end_of_period');
            }}
            className="flex-1"
            data-testid="button-cancel-dialog-close"
          >
            Keep My Plan
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancelConfirm}
            disabled={cancelSubscriptionMutation.isPending}
            className="flex-1"
            data-testid="button-confirm-cancellation"
          >
            {cancelSubscriptionMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Cancelling...
              </>
            ) : (
              cancellationType === 'immediate' ? 'Cancel Now' : 'Cancel at Period End'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ReactivateSubscriptionDialogProps {
  reactivateDialogOpen: boolean;
  setReactivateDialogOpen: (open: boolean) => void;
  selectedPlan: MaintenancePlan | null;
  setSelectedPlan: (plan: MaintenancePlan | null) => void;
  handleReactivateConfirm: () => void;
  reactivateSubscriptionMutation: any;
}

function ReactivateSubscriptionDialog({
  reactivateDialogOpen,
  setReactivateDialogOpen,
  selectedPlan,
  setSelectedPlan,
  handleReactivateConfirm,
  reactivateSubscriptionMutation
}: ReactivateSubscriptionDialogProps) {
  return (
    <Dialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Welcome Back!
          </DialogTitle>
          <DialogDescription>
            We're excited to have you back! Your {selectedPlan?.planType} plan will be reactivated.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>What you'll get back:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>{selectedPlan?.planType === 'basic' ? 'Monthly' : selectedPlan?.planType === 'professional' ? 'Bi-weekly' : 'Weekly'} system checkups</li>
                <li>{selectedPlan?.planType === 'enterprise' ? '24/7 dedicated' : selectedPlan?.planType === 'professional' ? 'Priority phone' : 'Email'} support</li>
                <li>Security monitoring and updates</li>
                {selectedPlan?.planType !== 'basic' && <li>Monthly reports and insights</li>}
                {selectedPlan?.planType === 'enterprise' && <li>Custom integrations and enterprise features</li>}
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">Plan:</span>
              <span className="capitalize">{selectedPlan?.planType} Plan</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Price:</span>
              <span className="font-bold">${selectedPlan?.price}/month</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Billing resumes:</span>
              <span>Immediately</span>
            </div>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Your first bill will be prorated if reactivated mid-cycle. You can cancel anytime from your account settings.
            </AlertDescription>
          </Alert>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setReactivateDialogOpen(false);
              setSelectedPlan(null);
            }}
            className="flex-1"
            data-testid="button-reactivate-dialog-close"
          >
            Not Now
          </Button>
          <Button
            onClick={handleReactivateConfirm}
            disabled={reactivateSubscriptionMutation.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-confirm-reactivation"
          >
            {reactivateSubscriptionMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Reactivating...
              </>
            ) : (
              'Reactivate Plan'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
