import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { type Review, type Customer } from "@shared/schema";

const fallbackTestimonials = [
  {
    name: "Robert Chen",
    role: "Owner, Local Restaurant", 
    content: "Their proactive approach to maintenance has eliminated our IT headaches. Best investment we've made for our business.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
  },
  {
    name: "Jennifer Adams",
    role: "Director, Healthcare Solutions",
    content: "Professional, reliable, and affordable. HandyTech has been instrumental in our company's growth and success.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
  }
];

export default function TestimonialsSection() {
  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
    queryFn: () => fetch("/api/reviews").then(res => res.json()),
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: () => fetch("/api/customers").then(res => res.json()),
  });

  // Combine reviews with customer data
  const testimonials = reviews.map(review => {
    const customer = customers.find(c => c.id === review.customerId);
    
    // Handle Home Depot reviews differently
    if (review.source === "Home Depot") {
      return {
        name: "Home Depot Customer",
        role: "Verified Home Depot Review",
        content: review.content,
        rating: review.rating,
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        source: "Home Depot",
        sourceLink: review.sourceLink,
        isHomeDepot: true
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

  // Use fallback testimonials if no reviews available
  const displayTestimonials = testimonials.length > 0 ? [...testimonials, ...fallbackTestimonials] : fallbackTestimonials;

  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-charcoal mb-4">What Our Clients Say</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Don't just take our word for it. Here's what our satisfied customers have to say about our services.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayTestimonials.slice(0, 4).map((testimonial, index) => (
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
                {testimonial.isHomeDepot && (
                  <div className="mb-3">
                    <div className="inline-flex items-center bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                      🏠 Home Depot Verified Review
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
      </div>
    </section>
  );
}
