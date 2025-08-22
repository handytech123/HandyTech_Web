import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { type Review, type Customer } from "@shared/schema";

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
    return {
      name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
      role: customer?.company ? `${customer.company}` : "Valued Customer",
      content: review.content,
      rating: review.rating,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    };
  });

  // Use Home Depot Pro testimonials if no internal reviews available
  const displayTestimonials = testimonials.length > 0 ? [...testimonials, ...homeDepotProTestimonials] : homeDepotProTestimonials;

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
