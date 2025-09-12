import { useEffect, useState } from "react";
import { Helmet } from 'react-helmet';
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";

type CallbackState = "verifying" | "success" | "error";

interface CallbackError {
  title: string;
  message: string;
  canRetry?: boolean;
}

export default function PortalCallback() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<CallbackState>("verifying");
  const [error, setError] = useState<CallbackError | null>(null);
  const [customerName, setCustomerName] = useState<string>("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
      setState("error");
      setError({
        title: "Invalid Login Link",
        message: "The login link appears to be incomplete or corrupted. Please request a new sign-in link.",
        canRetry: true
      });
      return;
    }

    verifyToken(token);
  }, []);

  const verifyToken = async (token: string) => {
    try {
      setState("verifying");
      
      const response = await fetch(`/api/portal/callback?token=${encodeURIComponent(token)}`, {
        method: "GET",
        credentials: "include" // Important for session cookies
      });

      if (!response.ok) {
        const errorData = await response.json();
        setState("error");
        setError({
          title: "Sign-in Failed",
          message: errorData.message || "Unable to sign you in. Please try requesting a new login link.",
          canRetry: true
        });
        return;
      }

      const data = await response.json();
      setCustomerName(`${data.customer.firstName} ${data.customer.lastName}`);
      setState("success");

      // Redirect to customer portal after a brief success message
      setTimeout(() => {
        setLocation("/portal");
      }, 2000);

    } catch (error) {
      console.error("Token verification error:", error);
      setState("error");
      setError({
        title: "Connection Error",
        message: "Unable to connect to the server. Please check your internet connection and try again.",
        canRetry: true
      });
    }
  };

  const handleRetry = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    if (token) {
      verifyToken(token);
    }
  };

  if (state === "verifying") {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center">
        <Helmet>
          <title>Signing You In | HandyTech Solutions Customer Portal</title>
          <meta name="description" content="Verifying your secure sign-in link for HandyTech Solutions customer portal access." />
        </Helmet>
        
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-brand-red/10 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-6 w-6 text-brand-red animate-spin" />
              </div>
              <CardTitle className="text-2xl font-bold text-charcoal">Signing You In</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600">
                Please wait while we verify your secure login link...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center">
        <Helmet>
          <title>Welcome Back | HandyTech Solutions Customer Portal</title>
          <meta name="description" content="Successfully signed in to your HandyTech Solutions customer portal. Redirecting to your dashboard." />
        </Helmet>
        
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-charcoal">Welcome Back!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                Hi {customerName}, you've been successfully signed in to your customer portal.
              </p>
              <p className="text-sm text-gray-500">
                You'll be redirected to your dashboard in a moment...
              </p>
              <Button asChild className="w-full bg-brand-red hover:bg-brand-red/90 text-white" data-testid="button-go-to-portal">
                <Link href="/portal">Go to Portal Now</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (state === "error" && error) {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center">
        <Helmet>
          <title>Sign-in Error | HandyTech Solutions Customer Portal</title>
          <meta name="description" content="There was an issue with your sign-in link. Please request a new secure login link to access your customer portal." />
        </Helmet>
        
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-charcoal">{error.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-gray-600">
                {error.message}
              </p>

              <div className="space-y-3">
                {error.canRetry && (
                  <Button 
                    onClick={handleRetry}
                    className="w-full bg-brand-red hover:bg-brand-red/90 text-white"
                    data-testid="button-retry"
                  >
                    Try Again
                  </Button>
                )}
                
                <Button asChild variant="outline" className="w-full" data-testid="button-new-link">
                  <Link href="/portal/login">Request New Login Link</Link>
                </Button>
              </div>

              <div className="border-t pt-4">
                <Link href="/" className="text-sm text-brand-red hover:underline block text-center">
                  ← Back to HandyTech Solutions
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}