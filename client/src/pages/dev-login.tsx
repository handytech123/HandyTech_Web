import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function DevLogin() {
  const [email, setEmail] = useState("test@test.com");
  const [isLogging, setIsLogging] = useState(false);
  const { toast } = useToast();

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLogging(true);

    try {
      const response = await apiRequest("/api/portal/dev-login", {
        method: "POST",
        body: { email },
      });

      if (response.success) {
        toast({ title: "Development login successful!" });
        // Redirect to customer portal
        window.location.href = "/customer-portal";
      }
    } catch (error: any) {
      toast({ 
        title: "Login failed", 
        description: error?.message || "Please try again.",
        variant: "destructive" 
      });
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="min-h-screen bg-light-gray flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-charcoal">
            Development Portal Login
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Quick access for testing the redesigned customer portal
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDevLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Customer Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter customer email"
                required
                data-testid="input-dev-email"
              />
              <div className="text-sm text-gray-500">
                Available test accounts:
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>test@test.com</li>
                  <li>sarah.j@techcorp.com</li>
                  <li>mike.davis@email.com</li>
                  <li>lisa.wilson@email.com</li>
                  <li>john.smith@email.com</li>
                </ul>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLogging}
              className="w-full bg-brand-red hover:bg-brand-red/90 text-white"
              data-testid="button-dev-login"
            >
              {isLogging ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Logging in...
                </>
              ) : (
                "Login to Portal"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Development Only:</strong> This login method bypasses email verification 
              for testing purposes. It's only available in development mode.
            </p>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => window.location.href = "/"}
              className="text-sm"
              data-testid="button-home"
            >
              ← Back to Homepage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}