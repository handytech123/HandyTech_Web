import { useState, useEffect } from "react";

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if admin is already logged in
    const authToken = localStorage.getItem("admin_auth");
    const authExpiry = localStorage.getItem("admin_auth_expiry");
    
    if (authToken && authExpiry) {
      const expiryTime = new Date(authExpiry).getTime();
      const currentTime = new Date().getTime();
      
      if (currentTime < expiryTime) {
        setIsAuthenticated(true);
      } else {
        // Token expired, clear storage
        localStorage.removeItem("admin_auth");
        localStorage.removeItem("admin_auth_expiry");
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Set authentication token and expiry (24 hours)
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + 24);
        
        localStorage.setItem("admin_auth", data.token);
        localStorage.setItem("admin_auth_expiry", expiryTime.toISOString());
        
        setIsAuthenticated(true);
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return { success: false, error: data.message || "Invalid credentials" };
      }
    } catch (error) {
      setIsLoading(false);
      return { success: false, error: "Login failed. Please try again." };
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_auth");
    localStorage.removeItem("admin_auth_expiry");
    setIsAuthenticated(false);
    // Navigate back to main page
    window.location.href = "/";
  };

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
}