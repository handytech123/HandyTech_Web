import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageCircle, X, Send, Calendar, User, Bot } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  showScheduling?: boolean;
}

const appointmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Phone number is required"),
  preferredDate: z.string().min(1, "Preferred date is required"),
  preferredTime: z.string().min(1, "Preferred time is required"),
  serviceType: z.string().min(1, "Service type is required"),
  description: z.string().min(10, "Please provide more details about your needs"),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

// Safe message renderer component that handles phone numbers and emails without XSS risk
function SafeMessageRenderer({ text }: { text: string }) {
  const phoneRegex = /\((\d{3})\)\s(\d{3})-(\d{4})/g;
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  
  // Split text into parts, identifying phone numbers and emails
  const parts: (string | { type: 'phone' | 'email'; value: string; display: string })[] = [];
  let lastIndex = 0;
  
  // Find all matches for phones and emails
  const matches: Array<{ index: number; match: string; type: 'phone' | 'email'; display: string }> = [];
  
  let match;
  while ((match = phoneRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      match: match[0],
      type: 'phone',
      display: match[0]
    });
  }
  
  phoneRegex.lastIndex = 0; // Reset regex
  
  while ((match = emailRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      match: match[0],
      type: 'email',
      display: match[0]
    });
  }
  
  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);
  
  // Build parts array
  matches.forEach((match) => {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // Add the match as a special part
    parts.push({
      type: match.type,
      value: match.match,
      display: match.display
    });
    
    lastIndex = match.index + match.match.length;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  // If no matches found, just return the text
  if (parts.length === 0) {
    parts.push(text);
  }
  
  return (
    <>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={index}>{part}</span>;
        }
        
        if (part.type === 'phone') {
          // Extract digits for tel: link
          const digits = part.value.replace(/\D/g, '');
          return (
            <a
              key={index}
              href={`tel:+1${digits}`}
              className="underline hover:text-brand-red"
              data-testid={`link-phone-${digits}`}
            >
              {part.display}
            </a>
          );
        }
        
        if (part.type === 'email') {
          return (
            <a
              key={index}
              href={`mailto:${part.value}`}
              className="underline hover:text-brand-red"
              data-testid={`link-email-${part.value}`}
            >
              {part.display}
            </a>
          );
        }
        
        return <span key={index}>{part.display}</span>;
      })}
    </>
  );
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Hi! I'm here to help you with HandyTech Solutions services. I can answer questions about our home improvement, electrical, plumbing, and smart home services. How can I assist you today?",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showScheduling, setShowScheduling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Generate a unique session ID
  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  };

  // Get or create session ID with localStorage persistence
  const getSessionId = () => {
    if (sessionId) return sessionId;
    
    // Try to get from localStorage first
    const stored = localStorage.getItem('chatbot-session-id');
    if (stored) {
      setSessionId(stored);
      return stored;
    }
    
    // Generate new session ID
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    localStorage.setItem('chatbot-session-id', newSessionId);
    return newSessionId;
  };

  // Initialize session ID when component mounts
  useEffect(() => {
    getSessionId();
  }, []);

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      preferredDate: "",
      preferredTime: "",
      serviceType: "",
      description: "",
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const currentSessionId = getSessionId();
      const response = await apiRequest("/api/chatbot", "POST", { message, sessionId: currentSessionId });
      return response.json();
    },
    onSuccess: (data) => {
      setIsTyping(false);
      const botMessage: ChatMessage = {
        id: Date.now().toString() + "_bot",
        text: data.response,
        isBot: true,
        timestamp: new Date(),
        showScheduling: data.shouldShowScheduling,
      };
      setMessages(prev => [...prev, botMessage]);
      
      if (data.shouldShowScheduling) {
        setShowScheduling(true);
      }
    },
    onError: () => {
      setIsTyping(false);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + "_error",
        text: "Sorry, I'm having trouble responding right now. Please try again or call us directly at (314) 325-4575.",
        isBot: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  const scheduleAppointment = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: data.name,
          customerEmail: data.email,
          customerPhone: data.phone,
          scheduledDate: new Date(`${data.preferredDate}T${data.preferredTime}`),
          serviceType: data.serviceType,
          notes: data.description,
          status: "scheduled",
        }),
      });
      if (!response.ok) throw new Error("Failed to schedule appointment");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Appointment scheduled successfully!" });
      setShowScheduling(false);
      form.reset();
      const confirmMessage: ChatMessage = {
        id: Date.now().toString() + "_confirm",
        text: "Perfect! I've scheduled your appointment. You'll receive a confirmation email shortly. Is there anything else I can help you with today?",
        isBot: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, confirmMessage]);
    },
    onError: () => {
      toast({ title: "Failed to schedule appointment", variant: "destructive" });
    },
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    // Ensure we have a session ID before sending
    const currentSessionId = getSessionId();

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    sendMessage.mutate(inputMessage);
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const onSubmitAppointment = (data: AppointmentFormData) => {
    scheduleAppointment.mutate(data);
  };

  return (
    <>
      {/* Chat Bubble */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-brand-red hover:bg-brand-red-dark shadow-lg"
          size="icon"
        >
          <MessageCircle className="w-8 h-8 text-white" />
        </Button>
      </div>

      {/* Chat Window */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md h-[600px] p-0 gap-0">
          <DialogHeader className="p-4 bg-brand-red text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6" />
                <div>
                  <DialogTitle className="text-white">HandyTech Assistant</DialogTitle>
                  <p className="text-xs text-red-100">Typically replies in a few seconds</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isBot ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.isBot 
                    ? "bg-white text-gray-800 shadow-sm" 
                    : "bg-brand-red text-white"
                }`}>
                  <div className="text-sm" data-testid={`message-text-${message.id}`}>
                    <SafeMessageRenderer text={message.text} />
                  </div>
                  {message.showScheduling && (
                    <Button
                      onClick={() => setShowScheduling(true)}
                      className="mt-2 bg-brand-red text-white hover:bg-brand-red-dark text-xs"
                      size="sm"
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      Schedule Meeting
                    </Button>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
                disabled={sendMessage.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || sendMessage.isPending}
                className="bg-brand-red hover:bg-brand-red-dark"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointment Scheduling Modal */}
      <Dialog open={showScheduling} onOpenChange={setShowScheduling}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-red" />
              Schedule Your Appointment
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmitAppointment)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="John Smith"
                />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="(314) 555-0123"
                />
                {form.formState.errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.phone.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="john@example.com"
              />
              {form.formState.errors.email && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preferredDate">Preferred Date</Label>
                <Input
                  id="preferredDate"
                  type="date"
                  {...form.register("preferredDate")}
                  min={new Date().toISOString().split('T')[0]}
                />
                {form.formState.errors.preferredDate && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.preferredDate.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="preferredTime">Preferred Time</Label>
                <Input
                  id="preferredTime"
                  type="time"
                  {...form.register("preferredTime")}
                />
                {form.formState.errors.preferredTime && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.preferredTime.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="serviceType">Service Needed</Label>
              <Input
                id="serviceType"
                {...form.register("serviceType")}
                placeholder="e.g., Electrical repair, Smart home setup"
              />
              {form.formState.errors.serviceType && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.serviceType.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Project Details</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Please describe your project needs, timeline, and any specific requirements..."
                rows={3}
              />
              {form.formState.errors.description && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowScheduling(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={scheduleAppointment.isPending}
                className="flex-1 bg-brand-red hover:bg-brand-red-dark"
              >
                {scheduleAppointment.isPending ? "Scheduling..." : "Schedule Appointment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}