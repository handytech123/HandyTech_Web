# HandyTech Solutions - Email Notification System Guide

## Overview

HandyTech Solutions v5.0.0 features a comprehensive dual email system designed for professional handyman service communications. The system provides automated notifications, professional templates, and seamless integration with IONOS hosting.

## 🔧 Email System Architecture

### **Dual Email Service Design**

```
┌─────────────────────────────────────────────────────────────┐
│                     Email System Architecture              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌──────────────────┐                │
│  │   EmailService  │    │ BrevoEmailService│                │
│  │   (Primary)     │    │   (Secondary)    │                │
│  │                 │    │                  │                │
│  │ • Admin Alerts  │    │ • 24h Reminders │                │
│  │ • Confirmations │    │ • 2h Reminders  │                │
│  │ • ICS Attachmt  │    │ • Follow-ups    │                │
│  │ • IONOS SMTP    │    │ • Marketing     │                │
│  └─────────────────┘    └──────────────────┘                │
│           │                       │                         │
│           └───────┬───────────────┘                         │
│                   │                                         │
│        ┌─────────────────────┐                              │
│        │  ReminderScheduler  │                              │
│        │                     │                              │
│        │ • Runs every 15min  │                              │
│        │ • Checks all appts  │                              │
│        │ • Sends reminders   │                              │
│        │ • Manages timing    │                              │
│        └─────────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

## 📧 Primary Email Service (IONOS SMTP)

### **Configuration**
```bash
# Required Environment Variables
ADMIN_EMAIL=contact@handytech-solutions.com
SMTP_HOST=smtp.ionos.com
SMTP_USER=contact@handytech-solutions.com
SMTP_PASS=your-email-password
SMTP_PORT=587

# Optional Business Info
BUSINESS_NAME=HandyTech Solutions
BUSINESS_PHONE=(314) 325-4575
FROM_EMAIL=contact@handytech-solutions.com
PUBLIC_BASE_URL=https://handytech-solutions.com
```

### **Email Types Handled**

#### 1. **Admin Notifications**
- **Purpose**: Instant alerts for new appointments
- **Recipient**: `contact@handytech-solutions.com`
- **Content**: Customer details, service type, appointment time
- **Format**: Professional HTML with business branding
- **Timing**: Immediately upon appointment creation

#### 2. **Customer Confirmations**
- **Purpose**: Appointment confirmation with calendar attachment
- **Recipients**: Customer email addresses
- **Content**: Appointment details, business info, reschedule link
- **Format**: Branded HTML template with ICS attachment
- **Timing**: Immediately after appointment booking

#### 3. **Calendar Integration**
- **ICS Files**: Automatically generated calendar invitations
- **Timezone**: Proper UTC handling with local time display
- **Details**: Service type, customer info, location details
- **Compatibility**: Works with Outlook, Gmail, Apple Calendar

### **IONOS SMTP Setup**

#### **Step 1: Email Account Creation**
1. Access IONOS control panel
2. Navigate to Email section
3. Create email account: `contact@handytech-solutions.com`
4. Set strong password for email account

#### **Step 2: SMTP Configuration**
```javascript
// IONOS SMTP Settings
{
  host: 'smtp.ionos.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: 'contact@handytech-solutions.com',
    pass: 'your-email-password'
  },
  requireTLS: true
}
```

#### **Step 3: DNS Configuration**
Ensure proper SPF and DKIM records:
```
TXT record: "v=spf1 mx include:_spf.ionos.com ~all"
```

## 🎨 Email Template Design

### **Professional Brand Styling**
- **Primary Color**: Ohio State Buckeyes Red (#BB0000)
- **Secondary Color**: Gray/White backgrounds
- **Typography**: Arial, sans-serif for compatibility
- **Layout**: Responsive HTML design

### **Template Structure**
```html
<!-- Header with Business Branding -->
<div style="background-color: #BB0000; color: white; padding: 20px;">
  <h1>HandyTech Solutions</h1>
  <p>Missouri's Trusted Handyman Service</p>
</div>

<!-- Main Content Area -->
<div style="padding: 30px 20px; background-color: #f9f9f9;">
  <!-- Dynamic content based on email type -->
</div>

<!-- Footer with Contact Info -->
<div style="background-color: #333333; color: #ffffff; padding: 20px;">
  <p>HandyTech Solutions</p>
  <p>Phone: (314) 325-4575</p>
  <p>Email: contact@handytech-solutions.com</p>
</div>
```

## ⏰ Automated Reminder System

### **Reminder Schedule**
```
Appointment Booked
       ↓
Customer Confirmation (immediate)
Admin Notification (immediate)
       ↓
24-Hour Reminder (1 day before)
       ↓  
2-Hour Reminder (2 hours before)
       ↓
Service Appointment
       ↓
Follow-up Email (1 day after)
```

### **ReminderScheduler Operation**
- **Frequency**: Checks every 15 minutes
- **Logic**: Time-based triggers using appointment timestamps
- **Window**: ±30 minutes tolerance for each reminder
- **Status**: Only sends for 'scheduled' appointments

### **Reminder Content**

#### **24-Hour Reminder**
```
Subject: Reminder: Your HandyTech Appointment is Tomorrow
Content: 
- Appointment details confirmation
- Time and service reminders
- Contact information for changes
- Professional courtesy message
```

#### **2-Hour Reminder**
```
Subject: We'll See You Soon! - HandyTech Arriving in 2 Hours
Content:
- Final confirmation details
- Preparation instructions
- Direct contact number
- Excitement for service delivery
```

## 🔒 Email Security Features

### **SMTP Security**
- **TLS Encryption**: All communications encrypted
- **Authentication**: Secure SMTP authentication
- **Port Configuration**: 587 (STARTTLS) preferred
- **Connection Timeouts**: Configured for reliability

### **Email Validation**
- **Format Validation**: RFC-compliant email addresses
- **Bounce Handling**: Error logging and recovery
- **Rate Limiting**: Prevents email abuse
- **Spam Prevention**: Proper headers and authentication

### **Privacy Protection**
- **No Email Storage**: Emails not stored in database
- **Secure Transmission**: End-to-end encryption
- **Data Minimization**: Only necessary information included
- **GDPR Compliance**: Customer data protection

## 📊 Email System Monitoring

### **Logging & Tracking**
```javascript
// Email service initialization
console.log('Email service initialized successfully with secure SMTP');

// Successful email sending
console.log(`Appointment confirmation sent for appointment ${id}`);

// Error handling
console.error('Failed to send email:', error);
```

### **Health Monitoring**
- **SMTP Connection**: Verified on startup
- **Authentication Status**: Confirmed during initialization
- **Error Tracking**: All email failures logged
- **Performance Metrics**: Send success rates monitored

### **Troubleshooting Guide**

#### **Common Issues**

1. **SMTP Connection Failed**
```bash
# Check logs for:
Error: Failed to initialize email service
# Solution: Verify IONOS email credentials
```

2. **Authentication Error**
```bash
# Check logs for:
Error: Invalid login: 535 Authentication failed
# Solution: Verify email account password
```

3. **Email Not Delivered**
```bash
# Check logs for:
Error: Mail command failed
# Solution: Check recipient address and DNS settings
```

## 🚀 Production Deployment

### **Pre-Deployment Checklist**
- [ ] IONOS email account created and active
- [ ] SMTP credentials tested
- [ ] Email templates tested with branding
- [ ] ICS calendar attachment verified
- [ ] Admin notification address confirmed
- [ ] Reminder scheduler tested
- [ ] Error handling verified
- [ ] Security settings confirmed

### **Testing Protocol**
1. **SMTP Connection Test**: Verify connection to smtp.ionos.com
2. **Admin Notification Test**: Create test appointment
3. **Customer Email Test**: Verify confirmation email delivery
4. **Calendar Test**: Open ICS attachment in email client
5. **Reminder Test**: Check scheduler logs for proper operation

### **Environment Variables Validation**
```javascript
// The system validates on startup:
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error('Email configuration incomplete');
}
```

## 📞 Support Information

### **Business Contact**
- **Primary Email**: contact@handytech-solutions.com
- **Phone**: (314) 325-4575
- **Business Name**: HandyTech Solutions
- **Location**: Missouri, USA

### **Email System Specifications**
- **Provider**: IONOS SMTP
- **Protocol**: SMTP with STARTTLS
- **Port**: 587
- **Authentication**: Username/Password
- **Encryption**: TLS 1.2+
- **Timezone**: America/Chicago (CDT/CST)

---

This email system provides professional, automated, and secure communication for HandyTech Solutions, ensuring excellent customer experience and efficient business operations.