import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
}

interface Appointment {
  id: number;
  firstName: string;
  lastName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceType: string;
  status: string;
}

// Simple admin dashboard with direct access
export default function AdminSimple() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    enabled: isAuthenticated
  });

  const { data: quotes = [] } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
    enabled: isAuthenticated
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["/api/reviews"],
    enabled: isAuthenticated
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        localStorage.setItem("admin_auth", data.token);
      } else {
        setLoginError(data.message || "Login failed");
      }
    } catch (error) {
      setLoginError("Login failed. Please try again.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("admin_auth");
    window.location.href = "/";
  };

  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "linear-gradient(to bottom right, #f5f5f5, #e5e5e5)",
        fontFamily: "Arial, sans-serif"
      }}>
        <div style={{
          background: "white",
          padding: "40px",
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px"
        }}>
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <div style={{
              width: "60px",
              height: "60px",
              background: "#BB0000",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "white",
              fontSize: "24px"
            }}>🔐</div>
            <h1 style={{ color: "#333", margin: "0 0 10px" }}>Admin Access</h1>
            <p style={{ color: "#666", margin: "0" }}>HandyTech Solutions Dashboard</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", color: "#333" }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px"
                }}
                required
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", color: "#333" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "16px"
                }}
                required
              />
            </div>

            {loginError && (
              <div style={{
                background: "#fee",
                color: "#c33",
                padding: "10px",
                borderRadius: "4px",
                marginBottom: "20px",
                border: "1px solid #fcc"
              }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                background: "#BB0000",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                cursor: "pointer"
              }}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#f5f5f5", 
      fontFamily: "Arial, sans-serif",
      padding: "20px"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{
          background: "white",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h1 style={{ margin: "0 0 10px", color: "#333" }}>HandyTech Solutions - Admin Dashboard</h1>
            <p style={{ margin: "0", color: "#666" }}>Business Management System</p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 20px",
              background: "#666",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Sign Out
          </button>
        </div>

        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
          gap: "20px",
          marginBottom: "30px"
        }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px" }}>
            <h3 style={{ margin: "0 0 10px", color: "#333" }}>Total Customers</h3>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#BB0000" }}>
              {customers.length}
            </div>
          </div>

          <div style={{ background: "white", padding: "20px", borderRadius: "8px" }}>
            <h3 style={{ margin: "0 0 10px", color: "#333" }}>Appointments</h3>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#BB0000" }}>
              {appointments.length}
            </div>
          </div>

          <div style={{ background: "white", padding: "20px", borderRadius: "8px" }}>
            <h3 style={{ margin: "0 0 10px", color: "#333" }}>Quote Requests</h3>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#BB0000" }}>
              {quotes.length}
            </div>
          </div>

          <div style={{ background: "white", padding: "20px", borderRadius: "8px" }}>
            <h3 style={{ margin: "0 0 10px", color: "#333" }}>Reviews</h3>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#BB0000" }}>
              {reviews.length}
            </div>
          </div>
        </div>

        <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 20px", color: "#333" }}>Recent Customers</h2>
          {customers.slice(0, 5).map((customer) => (
            <div key={customer.id} style={{
              padding: "15px",
              border: "1px solid #eee",
              borderRadius: "4px",
              marginBottom: "10px"
            }}>
              <div style={{ fontWeight: "bold", color: "#333" }}>
                {customer.firstName} {customer.lastName}
              </div>
              <div style={{ color: "#666", fontSize: "14px" }}>
                {customer.email} | {customer.phone}
              </div>
              {customer.company && (
                <div style={{ color: "#666", fontSize: "14px" }}>
                  Company: {customer.company}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ background: "white", padding: "20px", borderRadius: "8px" }}>
          <h2 style={{ margin: "0 0 20px", color: "#333" }}>Recent Appointments</h2>
          {appointments.slice(0, 5).map((appointment) => (
            <div key={appointment.id} style={{
              padding: "15px",
              border: "1px solid #eee",
              borderRadius: "4px",
              marginBottom: "10px"
            }}>
              <div style={{ fontWeight: "bold", color: "#333" }}>
                {appointment.firstName} {appointment.lastName}
              </div>
              <div style={{ color: "#666", fontSize: "14px" }}>
                {appointment.appointmentDate} at {appointment.appointmentTime}
              </div>
              <div style={{ color: "#666", fontSize: "14px" }}>
                Service: {appointment.serviceType}
              </div>
              <div style={{
                display: "inline-block",
                padding: "2px 8px",
                background: appointment.status === 'confirmed' ? '#d4edda' : '#fff3cd',
                color: appointment.status === 'confirmed' ? '#155724' : '#856404',
                borderRadius: "12px",
                fontSize: "12px",
                marginTop: "5px"
              }}>
                {appointment.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}