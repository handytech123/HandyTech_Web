import { useState } from "react";
import { Helmet } from 'react-helmet';
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { type Customer, type MaintenancePlan, type EmailCampaign } from "@shared/schema";
import { CalendarDays, Mail, CreditCard, Star } from "lucide-react";

export default function CustomerPortal() {
  const [customerId, setCustomerId] = useState<number>(1); // In a real app, this would come from auth
  const { toast } = useToast();

  const { data: customer } = useQuery<Customer>({
    queryKey: ["/api/customers", customerId],
    queryFn: () => fetch(`/api/customers/${customerId}`).then(res => res.json()),
  });

  const { data: maintenancePlans = [] } = useQuery<MaintenancePlan[]>({
    queryKey: ["/api/customers", customerId, "maintenance-plans"],
    queryFn: () => fetch(`/api/customers/${customerId}/maintenance-plans`).then(res => res.json()),
  });

  const { data: emailCampaigns = [] } = useQuery<EmailCampaign[]>({
    queryKey: ["/api/customers", customerId, "email-campaigns"],
    queryFn: () => fetch(`/api/customers/${customerId}/email-campaigns`).then(res => res.json()),
  });

  const subscribeToPlan = useMutation({
    mutationFn: async (planData: { planType: string; price: number; nextBillingDate: string }) => {
      const response = await fetch("/api/maintenance-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...planData,
          customerId,
        }),
      });
      if (!response.ok) throw new Error("Failed to subscribe to plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "maintenance-plans"] });
      toast({ title: "Successfully subscribed to maintenance plan!" });
    },
    onError: () => {
      toast({ title: "Failed to subscribe to plan", variant: "destructive" });
    },
  });

  const handleSubscribe = (planType: string, price: number) => {
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    
    subscribeToPlan.mutate({
      planType,
      price,
      nextBillingDate: nextBillingDate.toISOString(),
    });
  };

  if (!customer) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold">
            HandyTech<span className="text-brand-red">Solutions</span> Customer Portal
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-charcoal mb-2">
            Welcome back, {customer.firstName}!
          </h2>
          <p className="text-gray-600">Manage your maintenance plans and account settings</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="plans">Maintenance Plans</TabsTrigger>
            <TabsTrigger value="subscribe">Subscribe</TabsTrigger>
            <TabsTrigger value="history">Email History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Customer since</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={customer.firstName} readOnly />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={customer.lastName} readOnly />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={customer.email} readOnly />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={customer.company || "Not specified"} readOnly />
                </div>
              </CardContent>
            </Card>
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
