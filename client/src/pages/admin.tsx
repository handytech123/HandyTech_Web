import { useState } from "react";
import { Helmet } from 'react-helmet';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, DollarSign, Users, Calendar, Star, LogOut, MessageSquare, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLogin from "@/components/admin-login";
import CalendarView from "@/components/calendar-view";
import BlockedDatesManager from "@/components/blocked-dates-manager";
import ServicesManager from "@/components/services-manager";
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

  const testCalendlyWebhookMutation = useMutation({
    mutationFn: async (testData: any) => {
      return await apiRequest("/api/admin/test-calendly-webhook", "POST", testData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    }
  });

  // Test Calendly API Integration
  const testCalendlyAPI = async () => {
    try {
      const response = await fetch("/api/calendly/event-types");
      const data = await response.json();
      
      toast({
        title: "Calendly API Test",
        description: response.ok 
          ? `Found ${data.event_types?.length || 0} event types` 
          : `Error: ${data.error}`,
        variant: response.ok ? "default" : "destructive"
      });

      console.log("Calendly API Test Results:", data);
    } catch (error) {
      toast({
        title: "Calendly API Test Failed", 
        description: "Check console for details",
        variant: "destructive"
      });
      console.error("Calendly API test error:", error);
    }
  };

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
            <TabsTrigger value="calendly-test" className="flex-1 min-w-[100px] text-sm">
              📅 Calendly Test
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <CalendarView />
          </TabsContent>

          <TabsContent value="blocked-dates">
            <BlockedDatesManager />
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
                <CardTitle>Appointments</CardTitle>
                <CardDescription>View and manage scheduled appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{appointment.firstName} {appointment.lastName}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{appointment.email}</p>
                          {appointment.phone && <p className="text-sm text-gray-500">{appointment.phone}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={appointment.status === "scheduled" ? "secondary" : "default"}>
                            {appointment.status}
                          </Badge>
                          <Badge variant={appointment.source === "calendly" ? "default" : "outline"}>
                            {appointment.source === "calendly" ? "📅 Calendly" : "📞 Manual"}
                          </Badge>
                        </div>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm"><strong>Service:</strong> {appointment.serviceType}</p>
                        <p className="text-sm"><strong>Date:</strong> {new Date(appointment.appointmentDate).toLocaleDateString()}</p>
                        <p className="text-sm"><strong>Time:</strong> {appointment.appointmentTime}</p>
                        {appointment.notes && <p className="text-sm mt-1"><strong>Notes:</strong> {appointment.notes}</p>}
                      </div>
                    </div>
                  ))}
                  {appointments.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No appointments scheduled</p>
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

          <TabsContent value="calendly-test">
            <Card>
              <CardHeader>
                <CardTitle>📅 Calendly Integration Testing</CardTitle>
                <CardDescription>
                  Test the Calendly webhook integration by simulating a booking. This will create a test appointment and trigger confirmation emails.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🔧 Integration Status</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Webhook endpoint: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">/api/webhooks/calendly</code></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Database schema updated with Calendly tracking</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Email confirmation system ready</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Test Appointment Details</h3>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="test-name">Customer Name</Label>
                          <Input
                            id="test-name"
                            value={testData.name}
                            onChange={(e) => setTestData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <Label htmlFor="test-email">Email Address</Label>
                          <Input
                            id="test-email"
                            type="email"
                            value={testData.email}
                            onChange={(e) => setTestData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="john@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="test-phone">Phone Number</Label>
                          <Input
                            id="test-phone"
                            value={testData.phone}
                            onChange={(e) => setTestData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        <div>
                          <Label htmlFor="test-service">Service Type</Label>
                          <Input
                            id="test-service"
                            value={testData.serviceType}
                            onChange={(e) => setTestData(prev => ({ ...prev, serviceType: e.target.value }))}
                            placeholder="Home Repair Consultation"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">What This Test Does</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="text-xs">1</Badge>
                          <span>Simulates a Calendly webhook with your test data</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="text-xs">2</Badge>
                          <span>Creates a customer record (or finds existing one by email)</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="text-xs">3</Badge>
                          <span>Schedules a test appointment marked as "Calendly" source</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="text-xs">4</Badge>
                          <span>Triggers confirmation email via Brevo (if configured)</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="text-xs">5</Badge>
                          <span>Updates your appointment dashboard instantly</span>
                        </div>
                      </div>

                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-4">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          <strong>💡 Pro Tip:</strong> After testing, check the "Appointments" tab to see your test booking with the "📅 Calendly" badge!
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => testCalendlyWebhookMutation.mutate(testData)}
                      disabled={testCalendlyWebhookMutation.isPending}
                      className="bg-brand-red hover:bg-brand-red-dark text-white"
                    >
                      {testCalendlyWebhookMutation.isPending ? "Testing..." : "🧪 Test Calendly Integration"}
                    </Button>
                    <Button
                      onClick={testCalendlyAPI}
                      variant="outline"
                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      <TestTube className="mr-2 h-4 w-4" />
                      Test API Connection
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setTestData({
                        name: "Test Customer",
                        email: "test@example.com",
                        phone: "(555) 123-4567",
                        serviceType: "Home Repair Consultation"
                      })}
                    >
                      Reset Form
                    </Button>
                  </div>

                  {testCalendlyWebhookMutation.isSuccess && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-semibold text-green-800 dark:text-green-200">Test Successful!</span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Calendly webhook test completed. Check the Appointments tab to see your test booking.
                      </p>
                    </div>
                  )}

                  {testCalendlyWebhookMutation.isError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-red-500" />
                        <span className="font-semibold text-red-800 dark:text-red-200">Test Failed</span>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        There was an error testing the Calendly integration. Check the server logs for details.
                      </p>
                    </div>
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
        <meta name="description" content="Manage reviews, quotes, appointments, and customers for HandyTech Solutions handyman services." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AuthenticatedDashboard />
    </>
  );
}