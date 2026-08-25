import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuoteSchema, type Service } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createCsrfHeaders } from "@/lib/csrf";
import { Phone, Mail, Clock, ImagePlus, Maximize2, Video, X } from "lucide-react";
import { z } from "zod";

const quoteFormSchema = insertQuoteSchema.extend({
  serviceNeeded: z.string().min(1, "Please select a service"),
  smsConsent: z.boolean().default(false),
});

type QuoteFormData = z.infer<typeof quoteFormSchema>;

export default function ContactSection() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [smsConsent, setSmsConsent] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [expandedMedia, setExpandedMedia] = useState<{ type: "photo" | "video"; url: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submissionError, setSubmissionError] = useState("");
  const { data: services = [] } = useQuery<Service[]>({ queryKey: ["/api/services"] });
  const quoteServices = services.filter((service) => service.isActive && service.includedInQuoteCalculator && service.basePrice > 0);
  const selectedServices = quoteServices.filter((service) => selectedServiceIds.includes(service.id));
  const estimatedPrice = selectedServices.reduce((total, service) => total + service.basePrice, 0);

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      serviceNeeded: "",
      message: "",
      smsConsent: false,
    },
  });

  const submitQuote = useMutation({
    mutationFn: async (data: QuoteFormData) => {
      setSubmissionError("");
      setUploadProgress(1);
      const body = new FormData();
      body.append("quote", JSON.stringify(data));
      photos.forEach((photo) => body.append("photos", photo));
      videos.forEach((video) => body.append("videos", video));
      const headers = await createCsrfHeaders();
      const response = await new Promise<{ ok: boolean; json: () => Promise<any> }>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/api/quotes");
        request.withCredentials = true;
        Object.entries(headers).forEach(([name, value]) => request.setRequestHeader(name, value));
        request.upload.onprogress = (event) => event.lengthComputable && setUploadProgress(Math.max(1, Math.round((event.loaded / event.total) * 90)));
        request.onload = () => {
          setUploadProgress(100);
          resolve({ ok: request.status >= 200 && request.status < 300, json: async () => { try { return JSON.parse(request.responseText); } catch { return {}; } } });
        };
        request.onerror = () => reject(new Error("The upload was interrupted. Check your connection and try again."));
        request.ontimeout = () => reject(new Error("The upload took too long. Try shorter videos or a stronger connection."));
        request.timeout = 20 * 60 * 1000;
        request.send(body);
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to submit quote" }));
        throw new Error(error.message || "Failed to submit quote");
      }
      return response.json();
    },
    onSuccess: () => {
      form.reset();
      setSmsConsent(false);
      setSelectedServiceIds([]);
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
      videoPreviews.forEach((url) => URL.revokeObjectURL(url));
      setPhotos([]); setPhotoPreviews([]); setVideos([]); setVideoPreviews([]);
      setUploadProgress(0); setSubmissionError("");
      setLocation("/quote-thank-you");
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      setSubmissionError(error.message);
      toast({ title: "Failed to submit quote request", description: error.message, variant: "destructive" });
    },
  });



  const onSubmit = (data: QuoteFormData) => {
    submitQuote.mutate({
      ...data,
      smsConsent,
      serviceNeeded: selectedServices.length ? selectedServices.map((service) => service.name).join(", ") : data.serviceNeeded,
      selectedServices: selectedServices.length ? selectedServices.map((service) => service.name) : [data.serviceNeeded],
      estimatedPrice: selectedServices.length ? estimatedPrice : undefined,
    });
  };

  const optimizeQuotePhoto = async (file: File): Promise<File> => {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" }) : file;
  };

  const addQuotePhotos = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).filter((file) => file.type.startsWith("image/"));
    const available = Math.max(0, 10 - photos.length);
    const accepted = await Promise.all(selected.slice(0, available).map(optimizeQuotePhoto));
    if (selected.length > available) toast({ title: "Ten-photo maximum", description: "You can attach up to ten project photos.", variant: "destructive" });
    setPhotos((current) => [...current, ...accepted]);
    setPhotoPreviews((current) => [...current, ...accepted.map((file) => URL.createObjectURL(file))]);
  };

  const removeQuotePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPhotoPreviews((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const addQuoteVideos = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).filter((file) => file.type.startsWith("video/"));
    const available = Math.max(0, 2 - videos.length);
    const accepted = selected.filter((file) => {
      if (file.size <= 100 * 1024 * 1024) return true;
      toast({ title: `${file.name} is too large`, description: "Each video must be smaller than 100 MB.", variant: "destructive" }); return false;
    }).slice(0, available);
    if (selected.length > available) toast({ title: "Two-video maximum", description: "You can attach up to two project videos.", variant: "destructive" });
    setVideos((current) => [...current, ...accepted]);
    setVideoPreviews((current) => [...current, ...accepted.map((file) => URL.createObjectURL(file))]);
  };

  const removeQuoteVideo = (index: number) => {
    URL.revokeObjectURL(videoPreviews[index]);
    setVideos((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setVideoPreviews((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <section id="contact" className="py-20 bg-light-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="bg-white text-charcoal px-4 py-2 rounded-full text-sm font-semibold inline-block mb-6">
            GET IN TOUCH
          </div>
          <h2 className="text-4xl font-bold text-charcoal mb-4">
            Ready to Start Your <span className="text-brand-red">Next Project?</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            HandyTech Solutions: Your family-owned premier choice for home improvement. With 10+ years of experience and full insurance coverage, we ensure high-quality service from minor repairs to major renovations.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Contact Information */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="mb-6">
              <Button 
                onClick={() => {
                  const form = document.getElementById('quote-form');
                  if (form) {
                    form.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="bg-brand-red hover:bg-brand-red-dark text-white px-12 py-6 rounded-lg text-2xl font-bold shadow-xl w-full"
                data-testid="button-get-estimate"
              >
                Get Free Estimate
              </Button>
            </div>
            
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center">
                  <span className="text-green-600 font-semibold">✓ Family Owned & Operated</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 font-semibold">✓ Fully Insured</span>
                  <span className="text-gray-600 ml-2">- Protected for your peace of mind</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center">
                <div className="bg-brand-red w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                  <Phone className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal">Phone</h3>
                  <a href="tel:+13143254575" className="text-gray-600 hover:text-brand-red hover:underline">(314) 325-4575</a>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-brand-red w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                  <Mail className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal">Email</h3>
                  <a href="mailto:contact@handytech-solutions.com" className="text-gray-600 hover:text-brand-red hover:underline">contact@handytech-solutions.com</a>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-brand-red w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                  <Clock className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal">Business Hours</h3>
                  <p className="text-gray-600">Mon-Fri: 8AM-6PM<br />Sat: 9AM-3PM</p>
                </div>
              </div>


            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-charcoal mb-6">Request Your Quote</h3>
            <form id="quote-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="firstName" className="text-charcoal">First Name</Label>
                  <Input 
                    id="firstName"
                    {...form.register("firstName")}
                    className="mt-2"
                    placeholder="John"
                    data-testid="input-firstName"
                  />
                  {form.formState.errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-charcoal">Last Name</Label>
                  <Input 
                    id="lastName"
                    {...form.register("lastName")}
                    className="mt-2"
                    placeholder="Smith"
                    data-testid="input-lastName"
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="email" className="text-charcoal">Email</Label>
                <Input 
                  id="email"
                  type="email"
                  {...form.register("email")}
                  className="mt-2"
                  placeholder="john@company.com"
                  data-testid="input-email"
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-charcoal">Phone Number</Label>
                <Input 
                  id="phone"
                  type="tel"
                  {...form.register("phone")}
                  className="mt-2"
                  placeholder="(314) 325-4575"
                  data-testid="input-phone"
                />
                {form.formState.errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.phone.message}</p>
                )}
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="quote-sms-consent"
                      checked={smsConsent}
                      onCheckedChange={(checked) => {
                        const consented = checked === true;
                        setSmsConsent(consented);
                        form.setValue("smsConsent", consented);
                      }}
                      data-testid="checkbox-quote-sms-consent"
                    />
                    <Label htmlFor="quote-sms-consent" className="cursor-pointer text-sm font-normal leading-6 text-slate-700">
                      I agree to receive appointment confirmations, reminders, and service updates by text message from HandyTech Solutions at the number provided. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase. View our{" "}
                      <Link href="/terms" className="font-medium text-brand-blue underline">Terms</Link> and{" "}
                      <Link href="/privacy-policy" className="font-medium text-brand-blue underline">Privacy Policy</Link>.
                    </Label>
                  </div>
                  <p className="mt-2 pl-7 text-xs text-slate-500">Optional - leave unchecked if you prefer phone or email contact only.</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="company" className="text-charcoal">Company (Optional)</Label>
                <Input 
                  id="company"
                  {...form.register("company")}
                  className="mt-2"
                  placeholder="Your Company Name"
                  data-testid="input-company"
                />
              </div>
              
              {/* Address Fields */}
              <div>
                <Label htmlFor="street" className="text-charcoal">Street Address</Label>
                <Input 
                  id="street"
                  {...form.register("street")}
                  className="mt-2"
                  placeholder="123 Main Street"
                  data-testid="input-street"
                />
                {form.formState.errors.street && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.street.message}</p>
                )}
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city" className="text-charcoal">City</Label>
                  <Input 
                    id="city"
                    {...form.register("city")}
                    className="mt-2"
                    placeholder="Hazelwood"
                    data-testid="input-city"
                  />
                  {form.formState.errors.city && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.city.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="state" className="text-charcoal">State</Label>
                  <Input 
                    id="state"
                    {...form.register("state")}
                    className="mt-2"
                    placeholder="MO"
                    data-testid="input-state"
                  />
                  {form.formState.errors.state && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.state.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="zip" className="text-charcoal">ZIP Code</Label>
                  <Input 
                    id="zip"
                    {...form.register("zip")}
                    className="mt-2"
                    placeholder="63042"
                    data-testid="input-zip"
                  />
                  {form.formState.errors.zip && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.zip.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label className="text-charcoal">Service Needed</Label>
                <Select onValueChange={(value) => form.setValue("serviceNeeded", value)}>
                  <SelectTrigger className="mt-2" data-testid="select-service">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Smart Home Technologies">Smart Home Technologies</SelectItem>
                    <SelectItem value="Electrical Work">Electrical Work</SelectItem>
                    <SelectItem value="Plumbing">Plumbing</SelectItem>
                    <SelectItem value="Low Voltage Systems">Low Voltage Systems</SelectItem>
                    <SelectItem value="Painting">Painting</SelectItem>
                    <SelectItem value="General Maintenance">General Maintenance</SelectItem>
                    <SelectItem value="Monthly Maintenance Plan">Monthly Maintenance Plan</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.serviceNeeded && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.serviceNeeded.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="message" className="text-charcoal">Project Details</Label>
                <Textarea 
                  id="message"
                  {...form.register("message")}
                  className="mt-2"
                  rows={4}
                  placeholder="Tell us about your project needs..."
                  data-testid="textarea-message"
                />
              </div>

              <div className="space-y-3">
                <div><Label className="text-charcoal">Project Photos (Optional)</Label><p className="text-sm text-gray-600">Add up to 10 photos. They are resized automatically before uploading.</p></div>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 transition-colors hover:border-brand-red hover:text-brand-red">
                  <ImagePlus className="h-5 w-5" /><span>{photos.length >= 10 ? "Ten photos selected" : `Choose photos (${photos.length}/10)`}</span>
                  <Input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={photos.length >= 10} className="sr-only" onChange={(event) => { addQuotePhotos(event.target.files); event.target.value = ""; }} />
                </label>
                {photoPreviews.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{photoPreviews.map((preview, index) => (
                  <div key={preview} className="relative aspect-square overflow-hidden rounded-lg border bg-gray-100">
                    <button type="button" className="h-full w-full" onClick={() => setExpandedMedia({ type: "photo", url: preview })} aria-label={`Preview quote photo ${index + 1}`}><img src={preview} alt={`Selected quote photo ${index + 1}`} className="h-full w-full object-cover" /></button>
                    <button type="button" onClick={() => removeQuotePhoto(index)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white" aria-label={`Remove photo ${index + 1}`}><X className="h-4 w-4" /></button>
                  </div>
                ))}</div>}

                <div className="pt-3"><Label className="text-charcoal">Project Videos (Optional)</Label><p className="text-sm text-gray-600">Add up to 2 videos, maximum 100 MB each. Videos are compressed by the website.</p></div>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 transition-colors hover:border-brand-red hover:text-brand-red">
                  <Video className="h-5 w-5" /><span>{videos.length >= 2 ? "Two videos selected" : `Choose videos (${videos.length}/2)`}</span>
                  <Input type="file" accept="video/mp4,video/quicktime,video/webm" multiple disabled={videos.length >= 2} className="sr-only" onChange={(event) => { addQuoteVideos(event.target.files); event.target.value = ""; }} />
                </label>
                {videoPreviews.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{videoPreviews.map((preview, index) => (
                  <div key={preview} className="relative overflow-hidden rounded-lg border bg-black">
                    <video src={preview} controls preload="metadata" className="max-h-64 w-full" aria-label={`Selected quote video ${index + 1}`} />
                    <button type="button" onClick={() => setExpandedMedia({ type: "video", url: preview })} className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-xs text-white"><Maximize2 className="h-3.5 w-3.5" />Expand</button>
                    <button type="button" onClick={() => removeQuoteVideo(index)} className="absolute right-2 top-2 rounded-full bg-black/75 p-1.5 text-white" aria-label={`Remove video ${index + 1}`}><X className="h-4 w-4" /></button>
                  </div>
                ))}</div>}
              </div>

              {submitQuote.isPending && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3" role="status" aria-live="polite">
                <div className="mb-2 flex justify-between text-sm font-medium text-blue-900"><span>{uploadProgress < 90 ? "Uploading project files…" : "Processing and saving your request…"}</span><span>{uploadProgress}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full bg-blue-600 transition-all" style={{ width: `${uploadProgress}%` }} /></div>
                <p className="mt-2 text-xs text-blue-800">Keep this page open until you see the confirmation page.</p>
              </div>}
              {submissionError && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">{submissionError}</div>}
              
              <Button 
                type="button"
                onClick={form.handleSubmit(onSubmit, () => {
                  setSubmissionError("Please complete the highlighted contact, address, and service fields.");
                  document.getElementById("quote-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                })}
                disabled={submitQuote.isPending}
                className="w-full bg-brand-red text-white hover:bg-brand-red-dark py-4 text-lg font-semibold"
                data-testid="button-submit-quote"
              >
                {submitQuote.isPending ? "Submitting..." : "Get Free Estimate"}
              </Button>
            </form>
          </div>
        </div>
        {expandedMedia && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Project media preview" onClick={() => setExpandedMedia(null)}>
          <button type="button" onClick={() => setExpandedMedia(null)} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white" aria-label="Close preview"><X className="h-6 w-6" /></button>
          {expandedMedia.type === "photo" ? <img src={expandedMedia.url} alt="Full-size selected project preview" className="max-h-[90vh] max-w-[95vw] object-contain" onClick={(event) => event.stopPropagation()} /> : <video src={expandedMedia.url} controls autoPlay className="max-h-[90vh] max-w-[95vw]" onClick={(event) => event.stopPropagation()} />}
        </div>}
      </div>
    </section>
  );
}
