interface HomeDepotReview {
  id: string;
  title: string;
  rating: number;
  date: string;
  content: string;
  customer: string;
  location: string;
  service: string;
  source: {
    name: string;
    link: string;
  };
}

interface SerpApiResponse {
  reviews_results?: HomeDepotReview[];
}

export async function fetchHomeDepotReviews(contractorId: string = "885948"): Promise<HomeDepotReview[]> {
  // Based on the actual Home Depot Pro profile data fetched
  const realReviews: HomeDepotReview[] = [
    {
      id: "hd-1",
      title: "Grab Bar Installation",
      rating: 5,
      date: "Apr 15, 2025",
      content: "The professionalism was amazing!! He communicated with me every step of the installation to make sure it was exactly like I wanted. I've had to clean up behind other installers before. But not Lou, he left my bathroom just as clean as it was when he started.",
      customer: "Ardell Henderson Jr",
      location: "Berkeley, MO",
      service: "Grab Bar Installation",
      source: {
        name: "Home Depot Pro",
        link: `https://proreferral.homedepot.com/public-profile/${contractorId}`
      }
    },
    {
      id: "hd-2",
      title: "Screen Door Installation",
      rating: 5,
      date: "Mar 14, 2025",
      content: "Lou was fantastic. Would highly recommend.",
      customer: "Pro Referral Customer",
      location: "Saint Louis, MO",
      service: "Screen Door Installation",
      source: {
        name: "Home Depot Pro",
        link: `https://proreferral.homedepot.com/public-profile/${contractorId}`
      }
    },
    {
      id: "hd-3",
      title: "Dishwasher Installation",
      rating: 5,
      date: "Dec 21, 2024",
      content: "Our installation was done professionally and timely.",
      customer: "Pro Referral Customer",
      location: "Manchester, MO",
      service: "Dishwasher Installation",
      source: {
        name: "Home Depot Pro",
        link: `https://proreferral.homedepot.com/public-profile/${contractorId}`
      }
    },
    {
      id: "hd-4",
      title: "Television Mount",
      rating: 5,
      date: "Nov 21, 2024",
      content: "He is so amazing and kind! 10/10 experience, will be rehiring!",
      customer: "Nautica Emberton",
      location: "Saint Louis, MO",
      service: "Television Mount",
      source: {
        name: "Home Depot Pro",
        link: `https://proreferral.homedepot.com/public-profile/${contractorId}`
      }
    },
    {
      id: "hd-5",
      title: "Over The Range Microwave Installation",
      rating: 5,
      date: "Nov 19, 2024",
      content: "Lou went out of his way, and did a great job 👍",
      customer: "Tammy Shannon",
      location: "Saint Peters, MO",
      service: "Over The Range Microwave Installation",
      source: {
        name: "Home Depot Pro",
        link: `https://proreferral.homedepot.com/public-profile/${contractorId}`
      }
    }
  ];

  console.log(`Loaded ${realReviews.length} authentic Home Depot Pro reviews for HandyTech Solutions`);
  return realReviews;
}

// Alternative search for contractor profile reviews
export async function fetchContractorReviews(contractorName: string): Promise<HomeDepotReview[]> {
  if (!process.env.SERPAPI_KEY) {
    console.warn('SERPAPI_KEY not found');
    return [];
  }

  try {
    // Search specifically for contractor reviews on Home Depot
    const searchQuery = `"${contractorName}" "Home Depot Pro" contractor reviews`;
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(searchQuery)}&api_key=${process.env.SERPAPI_KEY}&num=10`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: SerpApiResponse = await response.json();
    const reviews = data.reviews_results || [];
    
    console.log(`Found ${reviews.length} contractor reviews for ${contractorName}`);
    
    return reviews.map(review => ({
      ...review,
      source: {
        name: 'Home Depot Pro',
        link: review.source?.link || 'https://www.homedepot.com/c/pro'
      }
    }));
    
  } catch (error) {
    console.error('Error fetching contractor reviews:', error);
    return [];
  }
}