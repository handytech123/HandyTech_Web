import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { clearCsrfToken } from "@/lib/csrf";

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check authentication status with cookie-based session
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Use a protected endpoint to check authentication status
      // We'll use /api/admin/schedule as it requires admin authentication
      const response = await fetch("/api/admin/schedule", {
        method: "GET",
        credentials: "include", // Include cookies for session validation
      });

      if (response.ok) {
        // If we can access the protected endpoint, we're authenticated
        setIsAuthenticated(true);
      } else if (response.status === 401) {
        // 401 means not authenticated
        setIsAuthenticated(false);
      } else {
        // Other errors might be server issues, assume not authenticated
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("/api/admin/login", "POST", { 
        username, 
        password 
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return { success: true };
      } else {
        const errorData = await response.json();
        setIsLoading(false);
        return { 
          success: false, 
          error: errorData.message || "Invalid credentials" 
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Login failed. Please try again." 
      };
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to clear server-side session
      await apiRequest("/api/admin/logout", "POST");
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with client-side cleanup even if server request fails
    } finally {
      // Clear client-side authentication state
      clearCsrfToken(); // Clear cached CSRF token
      setIsAuthenticated(false);
      // Navigate back to main page
      window.location.href = "/";
    }
  };

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuthStatus, // Expose method for manual auth checking if needed
  };
}