import { useState } from "react";
import { Helmet } from 'react-helmet';
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address")
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function PortalLogin() {
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: ""
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return apiRequest("/api/portal/login", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: (data, variables) => {
      setSubmittedEmail(variables.email);
      setEmailSent(true);
      toast({ title: "Magic link sent!", description: "Check your email for the sign-in link." });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Unable to send login link", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center">
        <Helmet>
          <title>Check Your Email | HandyTech Solutions Customer Portal</title>
          <meta name="description" content="Magic link sent to your email. Check your inbox and click the secure sign-in link to access your HandyTech Solutions customer portal." />
        </Helmet>
        
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-brand-red/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-brand-red" />
              </div>
              <CardTitle className="text-2xl font-bold text-charcoal">Check Your Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="space-y-2">
                <p className="text-gray-600">
                  We've sent a secure sign-in link to:
                </p>
                <p className="font-semibold text-charcoal break-words">
                  {submittedEmail}
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  The link will expire in 30 minutes and can only be used once for security.
                </p>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Check your inbox (and spam folder) for an email from HandyTech Solutions.
                </p>
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEmailSent(false);
                    form.reset();
                  }}
                  className="w-full"
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-gray flex items-center justify-center">
      <Helmet>
        <title>Customer Portal Sign In | HandyTech Solutions</title>
        <meta name="description" content="Access your HandyTech Solutions customer portal with secure passwordless login. View appointments, manage maintenance plans, and update your profile." />
      </Helmet>
      
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-charcoal">
              HandyTech<span className="text-brand-red">Solutions</span>
            </CardTitle>
            <p className="text-gray-600 mt-2">Customer Portal Sign In</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-charcoal">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  {...form.register("email")}
                  className="w-full"
                  data-testid="input-email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600" data-testid="error-email">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-brand-red hover:bg-brand-red/90 text-white"
                disabled={loginMutation.isPending}
                data-testid="button-send-magic-link"
              >
                {loginMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send me a sign-in link
                  </>
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  We'll email you a secure link for instant access.
                </p>
                <p className="text-xs text-gray-500">
                  No passwords required - just click the link in your email.
                </p>
              </div>

              <div className="border-t pt-4">
                <Link href="/" className="text-sm text-brand-red hover:underline block text-center">
                  ← Back to HandyTech Solutions
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}