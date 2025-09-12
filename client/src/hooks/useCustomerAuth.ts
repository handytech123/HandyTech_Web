import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { clearCsrfToken } from "@/lib/csrf";

interface CustomerData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
}

export function useCustomerAuth() {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check authentication status and get customer data
      const response = await fetch("/api/portal/profile", {
        method: "GET",
        credentials: "include", // Include cookies for session validation
      });

      if (response.ok) {
        const customerData = await response.json();
        setCustomer(customerData);
        setIsAuthenticated(true);
      } else if (response.status === 401) {
        // 401 means not authenticated
        setCustomer(null);
        setIsAuthenticated(false);
      } else {
        // Other errors might be server issues, assume not authenticated
        setCustomer(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error checking customer auth status:", error);
      setCustomer(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to clear server-side session
      await apiRequest("/api/portal/logout", "POST");
    } catch (error) {
      console.error("Customer logout error:", error);
      // Continue with client-side cleanup even if server request fails
    } finally {
      // Clear client-side authentication state
      clearCsrfToken();
      setCustomer(null);
      setIsAuthenticated(false);
      // Navigate to portal login page
      window.location.href = "/portal/login";
    }
  };

  return {
    customer,
    isAuthenticated,
    isLoading,
    logout,
    checkAuthStatus,
  };
}