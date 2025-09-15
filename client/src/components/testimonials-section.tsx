import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { type Review, type Customer } from "@shared/schema";
import { useState } from "react";

const homeDepotProTestimonials = [
  {
    name: "Ardell Henderson Jr",
    role: "Berkeley, MO - Grab Bar Installation",
    content: "The professionalism was amazing!! He communicated with me every step of the installation to make sure it was exactly like I wanted. I've had to clean up behind other installers before. But not Lou, he left my bathroom just as clean as it was when he started.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
  },
  {
    name: "Pro Referral Customer", 
    role: "Saint Louis, MO - Screen Door Installation",
    content: "Lou was fantastic. Would highly recommend.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
  },
  {
    name: "Pro Referral Customer",
    role: "Manchester, MO - Dishwasher Installation", 
    content: "Our installation was done professionally and timely.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
  },
  {
    name: "Nautica Emberton",
    role: "Saint Louis, MO - Television Mount",
    content: "He is so amazing and kind! 10/10 experience, will be rehiring!",
    rating: 5,
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
  },
  {
    name: "Tammy Shannon", 
    role: "Saint Peters, MO - Microwave Installation",
    content: "Lou went out of his way, and did a great job 👍",
    rating: 5,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
  }
];

export default function TestimonialsSection() {
  const [showAll, setShowAll] = useState(false);

  const { data: reviews = [], isLoading: reviewsLoading, error: reviewsError } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
    queryFn: () => fetch("/api/reviews").then(res => {
      if (!res.ok) throw new Error('Failed to fetch reviews');
      return res.json();
    }),
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: () => fetch("/api/customers").then(res => {
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    }),
  });

  // Combine reviews with customer data
  const customerTestimonials = reviews.map(review => {
    const customer = customers.find(c => c.id === review.customerId);
    return {
      name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
      role: customer?.company ? `${customer.company}` : "Valued Customer",
      content: review.content,
      rating: review.rating,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
      source: "customer" as const
    };
  });

  // Add source identifier to Home Depot testimonials
  const homeDepotTestimonialsWithSource = homeDepotProTestimonials.map(testimonial => ({
    ...testimonial,
    source: "homeDepot" as const
  }));

  // Always combine customer reviews with Home Depot Pro testimonials
  const allTestimonials = [...customerTestimonials, ...homeDepotTestimonialsWithSource];
  
  // Display logic: show first 4 testimonials or all based on showAll state
  const displayTestimonials = showAll ? allTestimonials : allTestimonials.slice(0, 4);
  const hasMoreReviews = allTestimonials.length > 4;

  console.log('Debug testimonials:', { 
    reviews: reviews.length, 
    customers: customers.length, 
    customerTestimonials: customerTestimonials.length,
    allTestimonials: allTestimonials.length,
    displayTestimonials: displayTestimonials.length,
    reviewsError
  });

  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-charcoal mb-4">What Our Clients Say</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Don't just take our word for it. Here's what our satisfied customers have to say about our services.
          </p>
        </div>

        {reviewsLoading || customersLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, index) => (
              <Card key={index} className="bg-light-gray animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-300 rounded mb-4"></div>
                  <div className="h-16 bg-gray-300 rounded mb-4"></div>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-300 rounded-full mr-3"></div>
                    <div>
                      <div className="h-4 w-24 bg-gray-300 rounded mb-2"></div>
                      <div className="h-3 w-32 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {displayTestimonials.map((testimonial, index) => (
                <Card key={`${testimonial.source}-${index}`} className="bg-light-gray hover:shadow-lg transition-shadow" data-testid={`testimonial-card-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="flex text-yellow-400">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                      <span className="ml-2 text-gray-600 text-sm">{testimonial.rating}.0</span>
                      {testimonial.source === "customer" && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Customer Review</span>
                      )}
                    </div>
                    <p className="text-gray-700 mb-4 italic">"{testimonial.content}"</p>
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
            
            {hasMoreReviews && (
              <div className="text-center mt-12">
                <Button 
                  onClick={() => setShowAll(!showAll)}
                  variant="outline"
                  size="lg"
                  className="bg-white hover:bg-blue-50 border-blue-500 text-blue-600 hover:text-blue-700"
                  data-testid="button-see-more-reviews"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" />
                      Show Less Reviews
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      See More Reviews ({allTestimonials.length - 4} more)
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
        
        {customerTestimonials.length > 0 && (
          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              Showing {customerTestimonials.length} customer review{customerTestimonials.length !== 1 ? 's' : ''} and {homeDepotProTestimonials.length} Home Depot Pro testimonials
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
