// Static review data for deployment environments where API server is not available
// This ensures reviews are always displayed even in static hosting

export const staticReviews = [
  // Local business reviews
  {
    id: 1,
    customerId: 1,
    rating: 5,
    title: "Excellent Smart Home Installation",
    content: "HandyTech Solutions did an amazing job installing our smart home security system. Professional, on-time, and great pricing!",
    isApproved: true,
    createdAt: "2025-08-12T03:53:07.492Z",
    source: null,
    sourceLink: null,
    location: null,
    service: null
  },
  {
    id: 2,
    customerId: 2,
    rating: 5,
    title: "Outstanding Electrical Work",
    content: "The team upgraded our entire office electrical system flawlessly. Highly recommend for any business needs.",
    isApproved: true,
    createdAt: "2025-08-12T03:53:07.492Z",
    source: null,
    sourceLink: null,
    location: null,
    service: null
  },
  {
    id: 3,
    customerId: 3,
    rating: 4,
    title: "Quality Plumbing Service",
    content: "Quick response for our plumbing emergency. Fixed the issue efficiently and explained everything clearly.",
    isApproved: true,
    createdAt: "2025-08-12T03:53:07.492Z",
    source: null,
    sourceLink: null,
    location: null,
    service: null
  },
  {
    id: 4,
    customerId: 4,
    rating: 5,
    title: "Perfect Deck Construction",
    content: "Our new deck is beautiful! The craftsmanship and attention to detail exceeded our expectations.",
    isApproved: true,
    createdAt: "2025-08-12T03:53:07.492Z",
    source: null,
    sourceLink: null,
    location: null,
    service: null
  },
  // Authentic Home Depot Pro reviews
  {
    id: "hd-1",
    customerId: 999,
    rating: 5,
    title: "Grab Bar Installation - Ardell Henderson Jr",
    content: "The professionalism was amazing!! He communicated with me every step of the installation to make sure it was exactly like I wanted. I've had to clean up behind other installers before. But not Lou, he left my bathroom just as clean as it was when he started.",
    createdAt: "Apr 15, 2025",
    approved: true,
    source: "Home Depot Pro",
    sourceLink: "https://proreferral.homedepot.com/public-profile/885948",
    location: "Berkeley, MO",
    service: "Grab Bar Installation"
  },
  {
    id: "hd-2",
    customerId: 999,
    rating: 5,
    title: "Screen Door Installation - Pro Referral Customer",
    content: "Lou was fantastic. Would highly recommend.",
    createdAt: "Mar 14, 2025",
    approved: true,
    source: "Home Depot Pro",
    sourceLink: "https://proreferral.homedepot.com/public-profile/885948",
    location: "Saint Louis, MO",
    service: "Screen Door Installation"
  },
  {
    id: "hd-3",
    customerId: 999,
    rating: 5,
    title: "Dishwasher Installation - Pro Referral Customer",
    content: "Our installation was done professionally and timely.",
    createdAt: "Dec 21, 2024",
    approved: true,
    source: "Home Depot Pro",
    sourceLink: "https://proreferral.homedepot.com/public-profile/885948",
    location: "Manchester, MO",
    service: "Dishwasher Installation"
  },
  {
    id: "hd-4",
    customerId: 999,
    rating: 5,
    title: "Television Mount - Nautica Emberton",
    content: "He is so amazing and kind! 10/10 experience, will be rehiring!",
    createdAt: "Nov 21, 2024",
    approved: true,
    source: "Home Depot Pro",
    sourceLink: "https://proreferral.homedepot.com/public-profile/885948",
    location: "Saint Louis, MO",
    service: "Television Mount"
  },
  {
    id: "hd-5",
    customerId: 999,
    rating: 5,
    title: "Over The Range Microwave Installation - Tammy Shannon",
    content: "Lou went out of his way, and did a great job 👍",
    createdAt: "Nov 19, 2024",
    approved: true,
    source: "Home Depot Pro",
    sourceLink: "https://proreferral.homedepot.com/public-profile/885948",
    location: "Saint Peters, MO",
    service: "Over The Range Microwave Installation"
  }
];

export const staticCustomers = [
  {
    id: 1,
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@email.com",
    phone: "614-555-0123",
    company: null,
    createdAt: "2025-08-12T03:53:03.985Z",
    lastEmailSent: null
  },
  {
    id: 2,
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.j@techcorp.com",
    phone: "614-555-0456",
    company: "TechCorp Solutions",
    createdAt: "2025-08-12T03:53:03.985Z",
    lastEmailSent: null
  },
  {
    id: 3,
    firstName: "Mike",
    lastName: "Davis",
    email: "mike.davis@email.com",
    phone: "614-555-0789",
    company: null,
    createdAt: "2025-08-12T03:53:03.985Z",
    lastEmailSent: null
  },
  {
    id: 4,
    firstName: "Lisa",
    lastName: "Wilson",
    email: "lisa.wilson@email.com",
    phone: "614-555-0321",
    company: null,
    createdAt: "2025-08-12T03:53:03.985Z",
    lastEmailSent: null
  }
];