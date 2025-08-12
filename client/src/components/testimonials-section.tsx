import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { type Review, type Customer } from "@shared/schema";
import { staticReviews, staticCustomers } from "@/data/static-reviews";

// No fallback testimonials - use only authentic reviews

export default function TestimonialsSection() {
  const { data: reviews = staticReviews, isLoading: reviewsLoading, error: reviewsError } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
    queryFn: async () => {
      const response = await fetch("/api/reviews");
      if (!response.ok) {
        // If API is unavailable (like in static deployment), use static data
        throw new Error(`API unavailable: ${response.status}`);
      }
      return response.json();
    },
    retry: 1, // Reduce retries for faster fallback to static data
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: customers = staticCustomers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) {
        // If API is unavailable (like in static deployment), use static data
        throw new Error(`API unavailable: ${response.status}`);
      }
      return response.json();
    },
    retry: 1, // Reduce retries for faster fallback to static data
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Combine reviews with customer data
  const testimonials = reviews.map((review: any) => {
    const customer = customers.find(c => c.id === review.customerId);
    
    // Handle Home Depot reviews differently
    if (review.source === "Home Depot Pro") {
      return {
        name: review.title?.split(" - ")[1] || "Home Depot Customer",
        role: `${review.service || "Service"} • ${review.location || "Missouri"}`,
        content: review.content,
        rating: review.rating,
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        source: "Home Depot Pro",
        sourceLink: review.sourceLink,
        isHomeDepot: true,
        date: review.createdAt
      };
    }
    
    return {
      name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
      role: customer?.company ? `${customer.company}` : "Valued Customer",
      content: review.content,
      rating: review.rating,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
      isHomeDepot: false
    };
  });

  // Separate Home Depot reviews from local reviews
  const homeDepotTestimonials = testimonials.filter((t: any) => t.isHomeDepot);
  const localTestimonials = testimonials.filter((t: any) => !t.isHomeDepot);
  
  // Show loading state
  if (reviewsLoading || customersLoading) {
    return (
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-charcoal mb-4">What Our Clients Say</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Loading customer reviews...</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-light-gray animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-300 rounded mb-4"></div>
                  <div className="h-16 bg-gray-300 rounded mb-4"></div>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-300 rounded-full mr-3"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // If we have static data as fallback, don't show error state
  // Only show error if we have no data at all
  if (reviewsError && reviews.length === 0) {
    console.error('Reviews loading error:', reviewsError);
    return (
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-charcoal mb-4">What Our Clients Say</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Don't just take our word for it. Here's what our satisfied customers have to say about our services.
            </p>
            <div className="text-center mt-8">
              <button 
                onClick={() => window.open('https://proreferral.homedepot.com/public-profile/885948', '_blank')}
                className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                View Our Home Depot Pro Reviews
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Show only authentic Home Depot reviews first (max 4), then local reviews if needed
  const displayTestimonials = homeDepotTestimonials.length >= 4 
    ? homeDepotTestimonials.slice(0, 4)
    : [...homeDepotTestimonials, ...localTestimonials].slice(0, 4);

  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-charcoal mb-4">What Our Clients Say</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Don't just take our word for it. Here's what our satisfied customers have to say about our services.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Featuring authentic Home Depot Pro reviews • {reviews.length} total reviews{reviewsError ? ' (static data)' : ' loaded'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayTestimonials.map((testimonial, index) => (
            <Card key={index} className="bg-light-gray hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="ml-2 text-gray-600 text-sm">{testimonial.rating}.0</span>
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.content}"</p>
                {(testimonial as any).isHomeDepot && (
                  <div className="mb-3">
                    <div className="inline-flex items-center bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                      🏠 Home Depot Pro Verified
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <img 
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-3 object-cover"
                  />
                  <div>
                    <h4 className="font-semibold text-charcoal">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {(homeDepotTestimonials.length > 4 || localTestimonials.length > 0) && (
          <div className="text-center mt-12">
            <button 
              onClick={() => window.open('https://proreferral.homedepot.com/public-profile/885948', '_blank')}
              className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
            >
              View All Home Depot Pro Reviews
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
