import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ReviewFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  serviceType: string;
  rating: number;
  title: string;
  content: string;
}

interface CustomerReviewFormProps {
  onSuccess?: () => void;
}

export default function CustomerReviewForm({ onSuccess }: CustomerReviewFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<ReviewFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    serviceType: "",
    rating: 5,
    title: "",
    content: "",
  });

  const [hoveredRating, setHoveredRating] = useState(0);

  const submitReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      const response = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit review");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review Submitted Successfully!",
        description: "Thank you for your feedback. Your review is pending approval and will appear on our site soon.",
      });
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        serviceType: "",
        rating: 5,
        title: "",
        content: "",
      });
      
      // Refresh reviews
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error Submitting Review",
        description: error.message || "There was a problem submitting your review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof ReviewFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.title || !formData.content) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.rating < 1 || formData.rating > 5) {
      toast({
        title: "Invalid Rating",
        description: "Please select a rating between 1 and 5 stars.",
        variant: "destructive",
      });
      return;
    }
    
    submitReviewMutation.mutate(formData);
  };

  const serviceTypes = [
    "Electrical Work",
    "Plumbing Services", 
    "Smart Home Installation",
    "Home Repairs",
    "Furniture Assembly",
    "TV Mounting",
    "Grab Bar Installation",
    "Dishwasher Installation",
    "Microwave Installation",
    "Door Hardware Installation",
    "Bathroom Hardware Installation",
    "Drywall Repair",
    "Other"
  ];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-charcoal">
          Share Your Experience
        </CardTitle>
        <p className="text-center text-gray-600">
          Help others by sharing your experience with HandyTech Solutions
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-charcoal">Your Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <Input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  placeholder="Enter your first name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <Input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Received
              </label>
              <select
                value={formData.serviceType}
                onChange={(e) => handleInputChange("serviceType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              >
                <option value="">Select the service you received...</option>
                {serviceTypes.map((service, index) => (
                  <option key={index} value={service}>{service}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-charcoal">Overall Rating *</h3>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleInputChange("rating", star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-colors"
                >
                  <Star
                    size={32}
                    className={`${
                      (hoveredRating || formData.rating) >= star
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    } hover:text-yellow-400 transition-colors`}
                  />
                </button>
              ))}
              <span className="ml-3 text-gray-600">
                {formData.rating === 5 && "Excellent"}
                {formData.rating === 4 && "Very Good"}
                {formData.rating === 3 && "Good"}
                {formData.rating === 2 && "Fair"}
                {formData.rating === 1 && "Poor"}
              </span>
            </div>
          </div>

          {/* Review Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-charcoal">Your Review</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Title *
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Summarize your experience..."
                maxLength={100}
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.title.length}/100 characters
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Review *
              </label>
              <Textarea
                value={formData.content}
                onChange={(e) => handleInputChange("content", e.target.value)}
                placeholder="Tell others about your experience with HandyTech Solutions. What did we do well? How was our communication and professionalism?"
                rows={6}
                maxLength={1000}
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.content.length}/1000 characters
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              type="submit"
              disabled={submitReviewMutation.isPending}
              className="w-full bg-brand-red hover:bg-brand-red-dark text-white py-3 text-lg font-semibold"
            >
              {submitReviewMutation.isPending ? "Submitting Review..." : "Submit Review"}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              Your review will be reviewed and published within 24-48 hours. 
              Reviews help other customers make informed decisions about our services.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}