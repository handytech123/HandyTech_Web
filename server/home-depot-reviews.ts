interface HomeDepotReview {
  position: number;
  title: string;
  rating: number;
  date: string;
  snippet: string;
  source: {
    name: string;
    link: string;
  };
}

interface SerpApiResponse {
  reviews_results?: HomeDepotReview[];
}

export async function fetchHomeDepotReviews(businessName: string): Promise<HomeDepotReview[]> {
  if (!process.env.SERPAPI_KEY) {
    console.warn('SERPAPI_KEY not found, using sample data');
    return [];
  }

  try {
    // Search for Home Depot reviews for the business
    const searchQuery = `"${businessName}" site:homedepot.com reviews`;
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(searchQuery)}&api_key=${process.env.SERPAPI_KEY}&num=10`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: SerpApiResponse = await response.json();
    
    // Transform the results to match our review format
    const reviews = data.reviews_results || [];
    
    console.log(`Found ${reviews.length} Home Depot reviews for ${businessName}`);
    
    return reviews.map(review => ({
      ...review,
      source: {
        name: 'Home Depot',
        link: review.source?.link || 'https://www.homedepot.com'
      }
    }));
    
  } catch (error) {
    console.error('Error fetching Home Depot reviews:', error);
    return [];
  }
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