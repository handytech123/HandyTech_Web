import { Helmet } from 'react-helmet';
import CustomerReviewForm from "@/components/customer-review-form";

export default function LeaveReview() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Leave a Review | HandyTech Solutions Customer Feedback</title>
        <meta name="description" content="Share your experience with HandyTech Solutions. Leave a review for our professional handyman services in Missouri. Your feedback helps other customers make informed decisions." />
        <link rel="canonical" href="https://handytech-solutions.com/leave-review" />
        <meta property="og:title" content="Leave a Review | HandyTech Solutions" />
        <meta property="og:description" content="Share your experience with our professional handyman services." />
        <meta property="og:url" content="https://handytech-solutions.com/leave-review" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-charcoal mb-4">
            Leave a Review
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We value your feedback! Share your experience with HandyTech Solutions to help others 
            make informed decisions about our services.
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
              ⭐ TRUSTED HOME DEPOT PRO PARTNER
            </div>
            <h2 className="text-2xl font-bold text-charcoal mb-4">
              Your Opinion Matters
            </h2>
            <p className="text-gray-600">
              As a trusted Home Depot Pro partner, we maintain the highest standards of quality and service. 
              Your honest review helps us continue to improve our services and assists other customers in their decision-making.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="bg-brand-red w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🏆</span>
              </div>
              <h3 className="font-semibold text-charcoal mb-2">Quality Guarantee</h3>
              <p className="text-gray-600 text-sm">Professional-grade work backed by our satisfaction guarantee</p>
            </div>
            
            <div className="text-center">
              <div className="bg-brand-red w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">⚡</span>
              </div>
              <h3 className="font-semibold text-charcoal mb-2">Reliable Service</h3>
              <p className="text-gray-600 text-sm">On-time, professional service with clear communication</p>
            </div>
            
            <div className="text-center">
              <div className="bg-brand-red w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">💰</span>
              </div>
              <h3 className="font-semibold text-charcoal mb-2">Fair Pricing</h3>
              <p className="text-gray-600 text-sm">Transparent, competitive pricing with no hidden fees</p>
            </div>
          </div>
        </div>

        <CustomerReviewForm />
        
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Already left a review? Check out our{" "}
            <a 
              href="https://proreferral.homedepot.com/public-profile/885948" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-red hover:text-brand-red-dark font-semibold"
            >
              Home Depot Pro profile
            </a>{" "}
            to see all verified reviews.
          </p>
        </div>
      </div>
    </div>
  );
}