import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Quote, Star } from "lucide-react";
import { type Review } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Testimonial = { name: string; role: string; content: string; rating: number; photoUrls?: string[]; videoUrl?: string | null };
type PublicReview = Review & { customerName?: string };

const proTestimonials: Testimonial[] = [
  { name: "Ardell Henderson Jr", role: "Berkeley, MO · Grab bar installation", content: "The professionalism was amazing!! He communicated with me every step of the installation to make sure it was exactly like I wanted. He left my bathroom just as clean as it was when he started.", rating: 5 },
  { name: "Pro Referral Customer", role: "St. Louis, MO · Screen door installation", content: "Lou was fantastic. Would highly recommend.", rating: 5 },
  { name: "Pro Referral Customer", role: "Manchester, MO · Dishwasher installation", content: "Our installation was done professionally and timely.", rating: 5 },
  { name: "Nautica Emberton", role: "St. Louis, MO · Television mount", content: "He is so amazing and kind! 10/10 experience, will be rehiring!", rating: 5 },
  { name: "Tammy Shannon", role: "St. Peters, MO · Microwave installation", content: "Lou went out of his way and did a great job.", rating: 5 },
];

export default function TestimonialsSection() {
  const [showAll, setShowAll] = useState(false);
  const { data: reviews = [], isLoading } = useQuery<PublicReview[]>({
    queryKey: ["/api/reviews"],
    queryFn: async () => {
      const response = await fetch("/api/reviews");
      if (!response.ok) throw new Error("Failed to fetch reviews");
      return response.json();
    },
  });
  const siteReviews: Testimonial[] = reviews.map((review) => ({
    name: review.customerName || "Verified Customer",
    role: [review.city?.trim(), review.state?.trim().toUpperCase()].filter(Boolean).join(", ") || "HandyTech customer review",
    content: review.content,
    rating: review.rating,
    photoUrls: review.photoUrls || [],
    videoUrl: review.videoUrl,
  }));
  const allTestimonials = [...siteReviews, ...proTestimonials];
  const displayTestimonials = showAll ? allTestimonials : allTestimonials.slice(0, 3);

  return (
    <section id="testimonials" className="bg-slate-50 py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-4 text-xs font-bold tracking-[0.16em] text-brand-blue">CUSTOMER REVIEWS</p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Trusted in homes across the St. Louis area</h2>
          <p className="text-lg text-slate-600">Real feedback from customers who hired HandyTech for repairs, installations, and home projects.</p>
        </div>
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-3">{[0, 1, 2].map((index) => <div key={index} className="h-72 animate-pulse rounded-2xl bg-slate-200" />)}</div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {displayTestimonials.map((testimonial, index) => (
                <Card key={`${testimonial.name}-${index}`} className="border-slate-200 bg-white shadow-sm" data-testid={`testimonial-card-${index}`}>
                  <CardContent className="flex h-full flex-col p-7">
                    {testimonial.photoUrls && testimonial.photoUrls.length > 0 && (
                      <div className="-mx-7 -mt-7 mb-6 grid grid-cols-2 overflow-hidden rounded-t-xl">
                        {testimonial.photoUrls.slice(0, 4).map((photoUrl) => (
                          <img key={photoUrl} src={photoUrl} alt="Customer project" className="aspect-[4/3] h-full w-full object-cover" loading="lazy" />
                        ))}
                      </div>
                    )}
                    {testimonial.videoUrl && (
                      <video src={testimonial.videoUrl} controls preload="metadata" className="-mx-7 -mt-7 mb-6 w-[calc(100%+3.5rem)] max-h-72 bg-black object-contain" aria-label="Customer project video" />
                    )}
                    <div className="mb-5 flex items-center justify-between"><div className="flex text-amber-400">{Array.from({ length: testimonial.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div><Quote className="h-7 w-7 text-sky-100" /></div>
                    <p className="mb-7 flex-1 leading-7 text-slate-700">“{testimonial.content}”</p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">{testimonial.name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("")}</div>
                      <div><h3 className="font-semibold text-slate-950">{testimonial.name}</h3><p className="text-sm text-slate-500">{testimonial.role}</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {allTestimonials.length > 3 && <div className="mt-10 text-center"><Button onClick={() => setShowAll(!showAll)} variant="outline" size="lg">{showAll ? <><ChevronUp className="mr-2 h-4 w-4" />Show fewer reviews</> : <><ChevronDown className="mr-2 h-4 w-4" />Read more reviews</>}</Button></div>}
          </>
        )}
        <p className="mt-8 text-center text-xs text-slate-500">Selected testimonials also appear on the HandyTech Home Depot Pro Referral profile.</p>
      </div>
    </section>
  );
}
