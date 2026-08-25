import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Star, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { createCsrfHeaders } from "@/lib/csrf";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { publicReviewSubmissionSchema } from "@shared/schema";
import { z } from "zod";

// Extended schema to include customer information fields not in the base review schema
const reviewFormSchema = publicReviewSubmissionSchema.extend({
  serviceType: z.string().min(1, "Please select a service type"),
});

type ReviewFormData = z.infer<typeof reviewFormSchema>;

interface CustomerReviewFormProps {
  onSuccess?: () => void;
}

export default function CustomerReviewForm({ onSuccess }: CustomerReviewFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      serviceType: "",
      rating: 5,
      title: "",
      content: "",
      city: "",
      state: "",
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      const body = new FormData();
      body.append("review", JSON.stringify(data));
      photos.forEach((photo) => body.append("photos", photo));
      if (video) body.append("video", video);
      const headers = await createCsrfHeaders();
      const response = await fetch("/api/reviews/submit", {
        method: "POST",
        headers,
        body,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Review submission failed" }));
        throw new Error(error.message || "Review submission failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review Submitted Successfully!",
        description: "Thank you for your feedback. Your review is pending approval and will appear on our site soon.",
      });
      
      // Reset form
      form.reset();
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
      setPhotos([]);
      setPhotoPreviews([]);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideo(null);
      setVideoPreview(null);
      
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

  const onSubmit = (data: ReviewFormData) => {
    submitReviewMutation.mutate(data);
  };

  const onInvalid = () => {
    toast({
      title: "Please complete the highlighted fields",
      description: "The form has moved to the first item that still needs your attention.",
      variant: "destructive",
    });
  };

  const optimizeReviewPhoto = async (file: File): Promise<File> => {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" }) : file;
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const available = Math.max(0, 4 - photos.length);
    const accepted = await Promise.all(selected.slice(0, available).map(optimizeReviewPhoto));
    if (selected.length > available) {
      toast({ title: "Four-photo maximum", description: "You can attach up to four project photos.", variant: "destructive" });
    }
    setPhotos((current) => [...current, ...accepted]);
    setPhotoPreviews((current) => [...current, ...accepted.map((file) => URL.createObjectURL(file))]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
    setPhotoPreviews((current) => current.filter((_, photoIndex) => photoIndex !== index));
  };

  const selectVideo = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      toast({ title: "Video is too large", description: "Please choose a video smaller than 200 MB.", variant: "destructive" });
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview(null);
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-charcoal">Your Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter your first name" data-testid="input-firstName" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter your last name" data-testid="input-lastName" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} placeholder="your.email@example.com" data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Received *</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                        data-testid="select-service"
                      >
                        <option value="">Select the service you received...</option>
                        {serviceTypes.map((service, index) => (
                          <option key={index} value={service}>{service}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Location Fields - Required for reviews */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Hazelwood" data-testid="input-city" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="MO" data-testid="input-state" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-charcoal">Overall Rating *</h3>
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        className="p-1 transition-colors"
                        data-testid={`star-${star}`}
                      >
                        <Star
                          size={32}
                          className={`${
                            field.value >= star
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                          } hover:text-yellow-400 transition-colors`}
                        />
                      </button>
                    ))}
                    <span className="ml-3 text-gray-600">
                      {field.value === 5 && "Excellent"}
                      {field.value === 4 && "Very Good"}
                      {field.value === 3 && "Good"}
                      {field.value === 2 && "Fair"}
                      {field.value === 1 && "Poor"}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Review Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-charcoal">Your Review</h3>
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Review Title *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Summarize your experience..."
                      maxLength={100}
                      data-testid="input-title"
                    />
                  </FormControl>
                  <div className="text-xs text-gray-500 mt-1">
                    {field.value?.length || 0}/100 characters
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detailed Review *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Tell others about your experience with HandyTech Solutions. What did we do well? How was our communication and professionalism?"
                      rows={6}
                      maxLength={1000}
                      data-testid="textarea-content"
                    />
                  </FormControl>
                  <div className="text-xs text-gray-500 mt-1">
                    {field.value?.length || 0}/1000 characters
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Optional project photos */}
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-charcoal">Share Project Photos</h3>
              <p className="text-sm text-gray-600">Optional — add up to four before, during, or after photos.</p>
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 transition-colors hover:border-brand-red hover:text-brand-red">
              <ImagePlus className="h-5 w-5" />
              <span>{photos.length >= 4 ? "Four photos selected" : "Choose photos from your phone or computer"}</span>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={photos.length >= 4}
                className="sr-only"
                onChange={(event) => { addPhotos(event.target.files); event.target.value = ""; }}
                data-testid="input-review-photos"
              />
            </label>
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photoPreviews.map((preview, index) => (
                  <div key={preview} className="relative aspect-square overflow-hidden rounded-lg border bg-gray-100">
                    <img src={preview} alt={`Selected project photo ${index + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removePhoto(index)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white" aria-label={`Remove photo ${index + 1}`}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-2">
              {!videoPreview ? (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 transition-colors hover:border-brand-red hover:text-brand-red">
                  <Video className="h-5 w-5" />
                  <span>Add one project video — automatically compressed (maximum 200 MB)</span>
                  <Input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    className="sr-only"
                    onChange={(event) => { selectVideo(event.target.files?.[0]); event.target.value = ""; }}
                    data-testid="input-review-video"
                  />
                </label>
              ) : (
                <div className="relative overflow-hidden rounded-lg border bg-black">
                  <video src={videoPreview} controls preload="metadata" className="max-h-80 w-full" aria-label="Selected review video" />
                  <button type="button" onClick={removeVideo} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white" aria-label="Remove video">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              type="submit"
              disabled={submitReviewMutation.isPending}
              className="w-full bg-brand-red hover:bg-brand-red-dark text-white py-3 text-lg font-semibold"
              data-testid="button-submit-review"
            >
              {submitReviewMutation.isPending ? "Submitting Review..." : "Submit Review"}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              Your review will be reviewed and published within 24-48 hours. 
              Reviews help other customers make informed decisions about our services.
            </p>
          </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
