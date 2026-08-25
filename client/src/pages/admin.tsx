import { useState, useEffect, useRef } from "react";
import { Helmet } from 'react-helmet';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { createCsrfHeaders } from "@/lib/csrf";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Clock, DollarSign, Users, Star, LogOut, MessageSquare, Home, CalendarDays, User, Phone, Mail, RotateCcw, Filter, Plus, Trash2, UserPlus, MapPin, Edit, Image, Upload, Eye, Calendar, MapPin as Location, Bot, UserCheck, Send, RefreshCw, Camera, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLogin from "@/components/admin-login";
import CalendarView from "@/components/calendar-view";
import BlockedDatesManager from "@/components/blocked-dates-manager";
import ServicesManager from "@/components/services-manager";
import AvailabilityRulesManager from "@/components/availability-rules-manager";
import RescheduleAppointmentDialog from "@/components/reschedule-appointment-dialog";
import AppointmentDetailsDialog from "@/components/appointment-details-dialog";
import AdminQuoteBuilder from "@/components/admin-quote-builder";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import type { Quote, Review, Customer, MaintenancePlan, Appointment, InsertCustomer, ProjectGallery, InsertProjectGallery } from "@shared/schema";
import { insertCustomerSchema, insertProjectGallerySchema, updateProjectGallerySchema } from "@shared/schema";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { io, Socket } from "socket.io-client";

// Types for chat
interface ChatMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: string;
}

interface ChatConversation {
  id: string;
  status: 'bot' | 'pending_handoff' | 'human';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  lastMessageAt: string;
  createdAt: string;
}

// LiveChatManagement component 
function LiveChatManagement() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io({
      auth: {
        role: 'admin'
      }
    });
    
    newSocket.on('handoff:requested', (data) => {
      toast({
        title: "Handoff Requested",
        description: `Customer in conversation ${data.conversationId.slice(-8)} wants human help`
      });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    });
    
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [queryClient, toast]);

  // Get conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/chat/conversations', 'GET');
      const data = await response.json();
      return (data?.conversations || []) as ChatConversation[];
    },
    refetchInterval: 5000
  });

  // Get messages for selected conversation  
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-history', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const response = await apiRequest(`/api/admin/chat/history/${selectedConversation}`, 'GET');
      const data = await response.json();
      return (data?.messages || []) as ChatMessage[];
    },
    enabled: !!selectedConversation
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const takeoverConversation = () => {
    if (!socket || !selectedConversation) return;
    
    socket.emit('admin:takeover', { convId: selectedConversation });
    toast({ title: "Conversation taken over" });
    queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
  };

  const returnToBot = () => {
    if (!socket || !selectedConversation) return;
    
    socket.emit('admin:botback', { convId: selectedConversation });
    toast({ title: "Returned to AI assistant" });
    queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
  };

  const sendMessage = () => {
    if (!socket || !selectedConversation || !messageInput.trim()) return;
    
    socket.emit('admin:message', { 
      convId: selectedConversation, 
      text: messageInput.trim() 
    });
    
    setMessageInput("");
    
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['chat-history', selectedConversation] });
    }, 500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bot':
        return <Badge className="bg-blue-100 text-blue-800"><Bot className="w-3 h-3 mr-1" />AI Active</Badge>;
      case 'pending_handoff':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Handoff Requested</Badge>;
      case 'human':
        return <Badge className="bg-green-100 text-green-800"><UserCheck className="w-3 h-3 mr-1" />Human Active</Badge>;
      default:
        return null;
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, h:mm a');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Conversations ({conversations?.length || 0})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {conversationsLoading ? (
              <div className="p-4 text-center text-gray-500">Loading conversations...</div>
            ) : conversations?.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No conversations yet</div>
            ) : (
              <div className="space-y-1">
                {conversations?.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedConversation === conv.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedConversation(conv.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {conv.customerName || `Conversation ${conv.id.slice(-8)}`}
                      </span>
                      {getStatusBadge(conv.status)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {conv.customerEmail && <div>{conv.customerEmail}</div>}
                      {conv.customerPhone && <div>{conv.customerPhone}</div>}
                      {formatTime(conv.lastMessageAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {selectedConversation ? `Chat ${selectedConversation.slice(-8)}` : 'Select a conversation'}
            </CardTitle>
            {selectedConversation && (
              <div className="flex space-x-2">
                <Button size="sm" onClick={takeoverConversation}>
                  Take Over
                </Button>
                <Button size="sm" variant="outline" onClick={returnToBot}>
                  Return to AI
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!selectedConversation ? (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              Select a conversation to start chatting
            </div>
          ) : (
            <div className="space-y-4">
              {/* Messages */}
              <ScrollArea className="h-[350px] border rounded-lg p-4">
                {messagesLoading ? (
                  <div className="text-center text-gray-500">Loading messages...</div>
                ) : messages?.length === 0 ? (
                  <div className="text-center text-gray-500">No messages yet</div>
                ) : (
                  <div className="space-y-3">
                    {messages?.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : message.role === 'assistant'
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-green-100 text-green-900'
                          }`}
                        >
                          <div className="text-sm">{message.content}</div>
                          <div className="text-xs opacity-75 mt-1">
                            {formatTime(message.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage} disabled={!messageInput.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Schema for the admin Add Appointment form
const adminAddAppointmentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Valid email is required"),
  address: z.string().min(1, "Address is required"),
  serviceType: z.string().min(1, "Service type is required"),
  appointmentDate: z.string().min(1, "Date is required"),
  appointmentTime: z.string().min(1, "Time is required"),
  notes: z.string().optional(),
  status: z.enum(["scheduled", "confirmed"]),
});
type AdminAddAppointmentForm = z.infer<typeof adminAddAppointmentSchema>;

// AppointmentsTab component
function AppointmentsTab({ 
  appointments, 
  updateAppointmentStatusMutation 
}: {
  appointments: Appointment[];
  updateAppointmentStatusMutation: any;
}) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedAppointmentForReschedule, setSelectedAppointmentForReschedule] = useState<Appointment | null>(null);
  const [addAppointmentOpen, setAddAppointmentOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const todayInCentralTime = format(
    toZonedTime(new Date(), "America/Chicago"),
    "yyyy-MM-dd",
  );

  const addAppointmentForm = useForm<AdminAddAppointmentForm>({
    resolver: zodResolver(adminAddAppointmentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      address: "",
      serviceType: "",
      appointmentDate: "",
      appointmentTime: "",
      notes: "",
      status: "scheduled",
    },
  });

  const addAppointmentMutation = useMutation({
    mutationFn: async (data: AdminAddAppointmentForm) => {
      return await apiRequest("/api/admin/appointments", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedule"] });
      setAddAppointmentOpen(false);
      addAppointmentForm.reset();
      toast({ title: "Appointment created", description: "The appointment has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create appointment.", variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleReschedule = (appointmentId: number, customerName: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
      setSelectedAppointmentForReschedule(appointment);
      setRescheduleDialogOpen(true);
    } else {
      toast({
        title: "Error",
        description: "Appointment not found.",
        variant: "destructive"
      });
    }
  };

  const formatAppointmentDateTime = (appointment: Appointment) => {
    // Use timezone-aware timestamp if available, fallback to legacy fields
    if (appointment.startTimestamptz) {
      const centralTime = toZonedTime(new Date(appointment.startTimestamptz), 'America/Chicago');
      const formattedDate = format(centralTime, 'EEE, MMM d, yyyy');
      const formattedTime = format(centralTime, 'h:mm a');
      return `${formattedDate} at ${formattedTime} CT`;
    } else {
      // Legacy format - assume appointmentTime is already in Central Time
      const date = new Date(appointment.appointmentDate);
      const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return `${formattedDate} at ${appointment.appointmentTime} CT`;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Appointment Management
              </CardTitle>
              <CardDescription>View and manage customer appointments</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                data-testid="button-list-view"
              >
                List View
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                data-testid="button-calendar-view"
              >
                Calendar View
              </Button>
              <Button
                size="sm"
                className="bg-brand-blue hover:bg-brand-blue-dark text-white flex items-center gap-1"
                onClick={() => setAddAppointmentOpen(true)}
                data-testid="button-add-appointment"
              >
                <Plus className="h-4 w-4" />
                Add Appointment
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'calendar' ? (
            <div data-testid="calendar-container">
              <CalendarView 
                appointments={appointments} 
                onEventClick={(appointment) => {
                  // Open reschedule dialog directly
                  setSelectedAppointmentForReschedule(appointment);
                  setRescheduleDialogOpen(true);
                }} 
              />
            </div>
          ) : (
            <div className="space-y-4" data-testid="appointments-list">
              {appointments.length === 0 ? (
                <p className="text-center text-gray-500 py-8" data-testid="text-no-appointments">
                  No appointments scheduled
                </p>
              ) : (
                appointments.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="border rounded-lg p-4 bg-white dark:bg-gray-800"
                    data-testid={`card-appointment-${appointment.id}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg" data-testid={`text-customer-name-${appointment.id}`}>
                          {appointment.firstName} {appointment.lastName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300" data-testid={`text-email-${appointment.id}`}>
                            {appointment.email}
                          </span>
                        </div>
                        {appointment.phone && (
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500" data-testid={`text-phone-${appointment.id}`}>
                              {appointment.phone}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge 
                          className={`${getStatusColor(appointment.status)} mb-2`}
                          data-testid={`badge-status-${appointment.id}`}
                        >
                          {appointment.status}
                        </Badge>
                        <div className="text-sm text-gray-500" data-testid={`text-datetime-${appointment.id}`}>
                          {formatAppointmentDateTime(appointment)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm" data-testid={`text-service-${appointment.id}`}>
                          <strong>Service:</strong> {appointment.serviceType}
                        </p>
                        {appointment.address && (
                          <p className="text-sm mt-1" data-testid={`text-address-${appointment.id}`}>
                            <strong>Address:</strong> {appointment.address}
                          </p>
                        )}
                      </div>
                      {appointment.notes && (
                        <div>
                          <p className="text-sm" data-testid={`text-notes-${appointment.id}`}>
                            <strong>Notes:</strong> {appointment.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={appointment.status}
                        onChange={(e) => updateAppointmentStatusMutation.mutate({ 
                          id: appointment.id, 
                          status: e.target.value 
                        })}
                        disabled={updateAppointmentStatusMutation.isPending}
                        className="text-sm border rounded px-3 py-1 bg-white"
                        data-testid={`select-status-${appointment.id}`}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReschedule(appointment.id, `${appointment.firstName} ${appointment.lastName}`)}
                        className="flex items-center gap-1"
                        data-testid={`button-reschedule-${appointment.id}`}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reschedule
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Reschedule Appointment Dialog */}
      <RescheduleAppointmentDialog
        appointment={selectedAppointmentForReschedule}
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
      />

      {/* Add Appointment Dialog */}
      <Dialog open={addAppointmentOpen} onOpenChange={(open) => { setAddAppointmentOpen(open); if (!open) addAppointmentForm.reset(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Add Appointment
            </DialogTitle>
            <DialogDescription>
              Create a new appointment. An existing customer will be matched by email, or a new one will be created.
            </DialogDescription>
          </DialogHeader>
          <Form {...addAppointmentForm}>
            <form
              onSubmit={addAppointmentForm.handleSubmit((data) => addAppointmentMutation.mutate(data))}
              className="space-y-4"
            >
              {/* Customer Name */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addAppointmentForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addAppointmentForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addAppointmentForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(314) 555-0100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addAppointmentForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Address */}
              <FormField
                control={addAppointmentForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, Hazelwood, MO 63042" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Service Type */}
              <FormField
                control={addAppointmentForm.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="General Handyman">General Handyman</SelectItem>
                        <SelectItem value="Plumbing Repair">Plumbing Repair</SelectItem>
                        <SelectItem value="Electrical Work">Electrical Work</SelectItem>
                        <SelectItem value="Smart Home Installation">Smart Home Installation</SelectItem>
                        <SelectItem value="Carpentry & Repairs">Carpentry &amp; Repairs</SelectItem>
                        <SelectItem value="Painting">Painting</SelectItem>
                        <SelectItem value="Drywall Repair">Drywall Repair</SelectItem>
                        <SelectItem value="Flooring">Flooring</SelectItem>
                        <SelectItem value="Fixture Installation">Fixture Installation</SelectItem>
                        <SelectItem value="Home Inspection">Home Inspection</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date & Time */}
              <div className="flex items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                <div>
                  <p className="text-sm font-medium text-blue-950">Need to book work today?</p>
                  <p className="text-xs text-blue-800">Same-day booking is available here in the admin only.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-blue-300 bg-white"
                  onClick={() => {
                    addAppointmentForm.setValue("appointmentDate", todayInCentralTime, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                >
                  Book Today
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addAppointmentForm.control}
                  name="appointmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Date</FormLabel>
                      <FormControl>
                        <Input type="date" min={todayInCentralTime} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addAppointmentForm.control}
                  name="appointmentTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Status */}
              <FormField
                control={addAppointmentForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={addAppointmentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any special instructions or details..." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setAddAppointmentOpen(false); addAppointmentForm.reset(); }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand-blue hover:bg-brand-blue-dark text-white"
                  disabled={addAppointmentMutation.isPending}
                  data-testid="button-submit-add-appointment"
                >
                  {addAppointmentMutation.isPending ? "Creating..." : "Create Appointment"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// CustomersTab component
function CustomersTab({ customers }: { customers: Customer[] }) {
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [editCustomerDialogOpen, setEditCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteCustomerId, setDeleteCustomerId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
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
    },
  });

  const editForm = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
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
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: InsertCustomer) => {
      return apiRequest("/api/customers", "POST", customerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setAddCustomerDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add customer",
        variant: "destructive",
      });
    },
  });

  const editCustomerMutation = useMutation({
    mutationFn: async ({ id, customerData }: { id: number; customerData: InsertCustomer }) => {
      return apiRequest(`/api/customers/${id}`, "PUT", customerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditCustomerDialogOpen(false);
      setEditingCustomer(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: number) => {
      return apiRequest(`/api/customers/${customerId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDeleteCustomerId(null);
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCustomer) => {
    createCustomerMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertCustomer) => {
    if (editingCustomer) {
      editCustomerMutation.mutate({ id: editingCustomer.id, customerData: data });
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    editForm.reset({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone || "",
      company: customer.company || "",
      street: customer.street || "",
      city: customer.city || "",
      state: customer.state || "",
      zip: customer.zip || "",
    });
    setEditCustomerDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Database
              </CardTitle>
              <CardDescription>View and manage customer information</CardDescription>
            </div>
            <Dialog open={addCustomerDialogOpen} onOpenChange={setAddCustomerDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2" data-testid="button-add-customer">
                  <UserPlus className="h-4 w-4" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                  <DialogDescription>
                    Create a new customer record with their contact information.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-add-customer">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-firstName" />
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
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-lastName" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" data-testid="input-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input {...field} type="tel" data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-company" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-street" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-city" />
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
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-state" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-zip" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAddCustomerDialogOpen(false)}
                        data-testid="button-cancel-add-customer"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createCustomerMutation.isPending}
                        data-testid="button-submit-add-customer"
                      >
                        {createCustomerMutation.isPending ? "Adding..." : "Add Customer"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4" data-testid="customers-list">
            {customers.map((customer) => (
              <div 
                key={customer.id} 
                className="border rounded-lg p-4 bg-white dark:bg-gray-800"
                data-testid={`card-customer-${customer.id}`}
              >
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    <div>
                      <h3 className="font-semibold text-lg" data-testid={`text-customer-name-${customer.id}`}>
                        {customer.firstName} {customer.lastName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300" data-testid={`text-email-${customer.id}`}>
                          {customer.email}
                        </span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500" data-testid={`text-phone-${customer.id}`}>
                            {customer.phone}
                          </span>
                        </div>
                      )}
                      {customer.company && (
                        <p className="text-sm text-gray-500 mt-1" data-testid={`text-company-${customer.id}`}>
                          {customer.company}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      {(customer.street || customer.city || customer.state || customer.zip) && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <div className="text-sm text-gray-600 dark:text-gray-300" data-testid={`text-location-${customer.id}`}>
                            {customer.street && <div>{customer.street}</div>}
                            <div>
                              {[customer.city, customer.state].filter(Boolean).join(", ")}
                              {customer.zip ? ` ${customer.zip}` : ""}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="text-sm text-gray-500 mt-2">
                        <p data-testid={`text-joined-${customer.id}`}>
                          Joined: {new Date(customer.createdAt).toLocaleDateString()}
                        </p>
                        {customer.lastEmailSent && (
                          <p data-testid={`text-last-email-${customer.id}`}>
                            Last Email: {new Date(customer.lastEmailSent).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCustomer(customer)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      data-testid={`button-edit-${customer.id}`}
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    
                    <AlertDialog open={deleteCustomerId === customer.id} onOpenChange={(open) => !open && setDeleteCustomerId(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteCustomerId(customer.id)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-${customer.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent data-testid={`dialog-delete-customer-${customer.id}`}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {customer.firstName} {customer.lastName}? 
                            This action cannot be undone and will remove all customer data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCustomerMutation.mutate(customer.id)}
                            disabled={deleteCustomerMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                            data-testid="button-confirm-delete"
                          >
                            {deleteCustomerMutation.isPending ? "Deleting..." : "Delete Customer"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
            {customers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg" data-testid="text-no-customers">No customers yet</p>
                <p className="text-gray-400 text-sm">Get started by adding your first customer</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Customer Dialog */}
      <Dialog open={editCustomerDialogOpen} onOpenChange={setEditCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information and contact details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4" data-testid="form-edit-customer">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-firstName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-lastName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-edit-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" data-testid="input-edit-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-edit-company" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-street" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-zip" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditCustomerDialogOpen(false)}
                  data-testid="button-cancel-edit-customer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editCustomerMutation.isPending}
                  data-testid="button-submit-edit-customer"
                >
                  {editCustomerMutation.isPending ? "Updating..." : "Update Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// GalleryTab component
function GalleryTab() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectGallery | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [optimizingImages, setOptimizingImages] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null);
  const [finishedImagePreviews, setFinishedImagePreviews] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<{ main: File | null; before: File | null; finished: File[] }>({ main: null, before: null, finished: [] });
  const [editMainImage, setEditMainImage] = useState<File | null>(null);
  const [editBeforeImage, setEditBeforeImage] = useState<File | null>(null);
  const [editMainPreview, setEditMainPreview] = useState<string | null>(null);
  const [editBeforePreview, setEditBeforePreview] = useState<string | null>(null);
  const [removeEditBefore, setRemoveEditBefore] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const pageSize = 12;

  // Fetch gallery items with pagination
  const { data: galleryData, isLoading: galleryLoading } = useQuery<{items: ProjectGallery[], total: number}>({
    queryKey: ["/api/admin/gallery", currentPage, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(categoryFilter !== "all" && { category: categoryFilter })
      });
      const response = await fetch(`/api/admin/gallery?${params}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error('Failed to fetch gallery items');
      return response.json();
    }
  });

  const galleryItems = galleryData?.items || [];
  const totalPages = Math.ceil((galleryData?.total || 0) / pageSize);

  // Upload form
  const uploadForm = useForm<InsertProjectGallery & { mainImage?: FileList; beforeImage?: FileList }>({
    resolver: zodResolver(insertProjectGallerySchema.extend({
      completionDate: insertProjectGallerySchema.shape.completionDate.optional().default(() => new Date())
    })),
    defaultValues: {
      title: "",
      description: "",
      category: "general",
      location: "",
      completionDate: new Date(),
      featured: false,
      beforeImageUrls: [],
      videoUrls: [],
    },
  });

  // Edit form
  const editForm = useForm<Partial<ProjectGallery>>({
    resolver: zodResolver(updateProjectGallerySchema),
    defaultValues: {
      title: "",
      description: "",
      category: "general",
      location: "",
      completionDate: new Date(),
      featured: false,
      beforeImageUrls: [],
      videoUrls: [],
    },
  });

  // File upload validation
  const validateFile = (file: File): string | null => {
    const maxSize = 25 * 1024 * 1024; // Large phone photos are compressed before upload
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (file.size > maxSize) {
      return 'File size must be less than 25MB';
    }
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG and WebP images are allowed';
    }
    return null;
  };

  const optimizeImageForUpload = async (file: File): Promise<File> => {
    if (file.size <= 2 * 1024 * 1024) return file;
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const maxDimension = 1920;
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (!context) return file;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp", lastModified: file.lastModified });
    } catch {
      return file;
    }
  };

  // Handle file selection and preview
  const handleFileSelect = async (files: FileList | null, type: 'main' | 'before' | 'finished') => {
    if (!files || files.length === 0) return;
    setOptimizingImages(true);
    try {
    if (type === 'finished') {
      const remainingSlots = 10 - selectedImages.finished.length - (selectedImages.before ? 1 : 0) - (selectedImages.main ? 1 : 0);
      const fileArray = Array.from(files).slice(0, Math.max(0, remainingSlots));
      if (files.length > remainingSlots) toast({ title: "Photo limit", description: "A project can contain up to 10 photos." });
      const validFiles: File[] = [];
      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          toast({
            title: "Invalid File",
            description: `${file.name}: ${error}`,
            variant: "destructive",
          });
          continue;
        }
        validFiles.push(await optimizeImageForUpload(file));
      }
      if (validFiles.length === 0) return;
      setFinishedImagePreviews(prev => [...prev, ...validFiles.map(file => URL.createObjectURL(file))]);
      setSelectedImages(prev => ({ ...prev, finished: [...prev.finished, ...validFiles] }));
    } else {
      const file = files[0];
      const error = validateFile(file);
      if (error) {
        toast({
          title: "Invalid File",
          description: error,
          variant: "destructive",
        });
        return;
      }
      const optimizedFile = await optimizeImageForUpload(file);
      const preview = URL.createObjectURL(optimizedFile);
      if (type === 'main') {
        setImagePreview(preview);
        setSelectedImages(prev => ({ ...prev, main: optimizedFile }));
      } else {
        setBeforeImagePreview(preview);
        setSelectedImages(prev => ({ ...prev, before: optimizedFile }));
      }
    }
    } finally {
      setOptimizingImages(false);
    }
  };

  // Remove finished image
  const removeFinishedImage = (index: number) => {
    setFinishedImagePreviews(prev => prev.filter((_, i) => i !== index));
    setSelectedImages(prev => ({ 
      ...prev, 
      finished: prev.finished.filter((_, i) => i !== index) 
    }));
  };

  // Upload mutation with XMLHttpRequest for real progress and CSRF protection
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setUploading(true);
      setUploadProgress(0);

      try {
        // Get CSRF headers for secure upload
        const headers = await createCsrfHeaders();
        
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          // Real upload progress tracking
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 100;
              setUploadProgress(Math.round(progress));
            }
          };
          
          xhr.onload = () => {
            setUploadProgress(100);
            
            if (xhr.status === 200 || xhr.status === 201) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (parseError) {
                reject(new Error('Invalid server response'));
              }
            } else if (xhr.status === 401) {
              reject(new Error('Your session has expired. Please refresh the page and log in again.'));
            } else if (xhr.status === 403) {
              if (xhr.responseText.includes('CSRF')) {
                reject(new Error('Security token expired. Please refresh the page and try again.'));
              } else {
                reject(new Error('Access denied. Please check your permissions.'));
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText || 'Unknown error'}`));
            }
          };
          
          xhr.onerror = () => {
            reject(new Error('Network error occurred during upload. Please check your connection and try again.'));
          };
          
          xhr.ontimeout = () => {
            reject(new Error('Upload timed out. Please try uploading a smaller file or check your connection.'));
          };
          
          // Configure request
          xhr.open('POST', '/api/admin/gallery');
          xhr.timeout = 300000; // 5 minute timeout for large files
          xhr.withCredentials = true; // Include cookies for session-based auth
          
          // Set CSRF headers
          Object.entries(headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
          });
          
          xhr.send(formData);
        });
      } catch (csrfError) {
        throw new Error(`Security token error: ${csrfError instanceof Error ? csrfError.message : 'Unable to get security token'}`);
      } finally {
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
        }, 1000);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gallery"] });
      
      // Reset all form states immediately
      uploadForm.reset();
      setImagePreview(null);
      setBeforeImagePreview(null);
      setFinishedImagePreviews([]);
      setSelectedImages({ main: null, before: null, finished: [] });
      
      // Show success toast
      toast({
        title: "Success",
        description: "Photos uploaded successfully",
      });
      
      // Close dialog with a small delay to ensure state updates complete
      setTimeout(() => {
        setUploadDialogOpen(false);
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ProjectGallery> }) => {
      const metadataResponse = await apiRequest(`/api/admin/gallery/${id}`, "PATCH", data);
      if (editMainImage || editBeforeImage || removeEditBefore) {
        const media = new FormData();
        if (editMainImage) media.append('images', editMainImage);
        if (editBeforeImage) media.append('images', editBeforeImage);
        media.append('replaceMain', String(Boolean(editMainImage)));
        media.append('replaceBefore', String(Boolean(editBeforeImage)));
        media.append('removeBefore', String(removeEditBefore));
        const headers = await createCsrfHeaders();
        const response = await fetch(`/api/admin/gallery/${id}/image`, { method: 'PUT', headers, body: media, credentials: 'include' });
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Image replacement failed' }));
          throw new Error(error.message || 'Image replacement failed');
        }
      }
      return metadataResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gallery"] });
      setEditDialogOpen(false);
      setEditingItem(null);
      setEditMainImage(null); setEditBeforeImage(null); setEditMainPreview(null); setEditBeforePreview(null); setRemoveEditBefore(false);
      editForm.reset();
      toast({
        title: "Success",
        description: "Photo updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update photo",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/gallery/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gallery"] });
      setDeleteItemId(null);
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete photo",
        variant: "destructive",
      });
    },
  });

  const onUploadSubmit = (data: InsertProjectGallery) => {
    if (!selectedImages.main && selectedImages.finished.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one image (main image or finished result images)",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    
    // The server expects cover, optional before, then additional photos.
    const coverImage = selectedImages.main || selectedImages.finished[0];
    if (coverImage) formData.append('images', coverImage);
    if (selectedImages.before) {
      formData.append('images', selectedImages.before);
    }
    const additionalImages = selectedImages.main ? selectedImages.finished : selectedImages.finished.slice(1);
    additionalImages.forEach(file => {
      formData.append('images', file);
    });
    formData.append('hasBeforeImage', selectedImages.before ? 'true' : 'false');
    
    // Add metadata
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    if (data.location) formData.append('location', data.location);
    formData.append('completionDate', data.completionDate.toISOString());
    formData.append('featured', (data.featured || false).toString());
    formData.append('videoUrls', JSON.stringify(data.videoUrls || []));

    uploadMutation.mutate(formData);
  };

  const onEditSubmit = (data: Partial<ProjectGallery>) => {
    if (!editingItem) return;
    editMutation.mutate({ id: editingItem.id, data });
  };

  const handleEditImageSelect = async (files: FileList | null, type: 'main' | 'before') => {
    const file = files?.[0];
    if (!file) return;
    const error = validateFile(file);
    if (error) return toast({ title: 'Invalid File', description: error, variant: 'destructive' });
    setOptimizingImages(true);
    try {
      const optimized = await optimizeImageForUpload(file);
      const preview = URL.createObjectURL(optimized);
      if (type === 'main') {
        if (editMainPreview?.startsWith('blob:')) URL.revokeObjectURL(editMainPreview);
        setEditMainImage(optimized); setEditMainPreview(preview);
      } else {
        if (editBeforePreview?.startsWith('blob:')) URL.revokeObjectURL(editBeforePreview);
        setEditBeforeImage(optimized); setEditBeforePreview(preview); setRemoveEditBefore(false);
      }
    } finally { setOptimizingImages(false); }
  };

  const handleEditItem = (item: ProjectGallery) => {
    setEditingItem(item);
    setEditMainImage(null); setEditBeforeImage(null); setRemoveEditBefore(false);
    setEditMainPreview(item.imageUrl);
    setEditBeforePreview(item.beforeImageUrl || null);
    editForm.reset({
      title: item.title,
      description: item.description,
      category: item.category,
      location: item.location || "",
      completionDate: new Date(item.completionDate),
      featured: item.featured,
      beforeImageUrls: item.beforeImageUrls || (item.beforeImageUrl ? [item.beforeImageUrl] : []),
      videoUrls: item.videoUrls || [],
    });
    setEditDialogOpen(true);
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors = {
      plumbing: 'bg-blue-100 text-blue-800',
      electrical: 'bg-yellow-100 text-yellow-800',
      carpentry: 'bg-amber-100 text-amber-800',
      tech: 'bg-purple-100 text-purple-800',
      general: 'bg-gray-100 text-gray-800',
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Project Gallery Management
              </CardTitle>
              <CardDescription>Upload, edit, and manage project photos</CardDescription>
            </div>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2" data-testid="button-upload-photo">
                  <Camera className="h-4 w-4" />
                  Add Project Photos
                </Button>
              </DialogTrigger>
              <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[92vh] sm:max-w-[680px] sm:rounded-lg sm:p-6">
                <DialogHeader>
                  <DialogTitle>Add a Project</DialogTitle>
                  <DialogDescription>
                    Select several photos from your phone at once. The first project photo becomes the gallery cover.
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                  <Form {...uploadForm}>
                    <form onSubmit={uploadForm.handleSubmit(onUploadSubmit)} className="space-y-4" data-testid="form-upload-photo">
                    
                    {/* Image Upload Section */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Cover Photo (Optional)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handleFileSelect(e.target.files, 'main')}
                            className="hidden"
                            id="main-image-upload"
                            data-testid="input-main-image"
                          />
                          <label htmlFor="main-image-upload" className="cursor-pointer">
                            {imagePreview ? (
                              <img src={imagePreview} alt="Preview" className="max-w-full h-32 object-cover mx-auto rounded" />
                            ) : (
                              <div className="flex flex-col items-center">
                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                <p className="text-sm font-medium text-gray-700">Choose a specific cover photo</p>
                                <p className="mt-1 text-xs text-gray-400">Otherwise, your first project photo is used</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Before Image (Optional)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handleFileSelect(e.target.files, 'before')}
                            className="hidden"
                            id="before-image-upload"
                            data-testid="input-before-image"
                          />
                          <label htmlFor="before-image-upload" className="cursor-pointer">
                            {beforeImagePreview ? (
                              <img src={beforeImagePreview} alt="Before Preview" className="max-w-full h-32 object-cover mx-auto rounded" />
                            ) : (
                              <div className="flex flex-col items-center">
                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">Click to upload before image</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Project Photos *
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={(e) => handleFileSelect(e.target.files, 'finished')}
                            className="hidden"
                            id="finished-images-upload"
                            data-testid="input-finished-images"
                          />
                          <label htmlFor="finished-images-upload" className="cursor-pointer">
                            <div className="flex flex-col items-center">
                              <Camera className="h-8 w-8 text-brand-blue mb-2" />
                              <p className="text-sm font-semibold text-gray-700">Choose photos from your phone</p>
                              <p className="text-xs text-gray-500 mt-1">Select several at once · up to 10 photos</p>
                            </div>
                          </label>
                        </div>
                        
                        {/* Finished images preview grid */}
                        {finishedImagePreviews.length > 0 && (
                          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {finishedImagePreviews.map((preview, index) => (
                              <div key={index} className="relative group">
                                <img 
                                  src={preview} 
                                  alt={`Finished result ${index + 1}`} 
                                  className="w-full h-24 object-cover rounded border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeFinishedImage(index)}
                                  className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/85 text-white shadow sm:h-7 sm:w-7"
                                  data-testid={`button-remove-finished-${index}`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                                {index === 0 && !selectedImages.main && (
                                  <span className="absolute bottom-1 left-1 rounded bg-brand-blue px-2 py-1 text-[10px] font-bold text-white">COVER</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={uploadForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-title" placeholder="Project title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={uploadForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="plumbing">Plumbing</SelectItem>
                                <SelectItem value="electrical">Electrical</SelectItem>
                                <SelectItem value="carpentry">Carpentry</SelectItem>
                                <SelectItem value="tech">Tech Support</SelectItem>
                                <SelectItem value="general">General</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={uploadForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-description" placeholder="Describe the project..." rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={uploadForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} data-testid="input-location" placeholder="Project location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={uploadForm.control}
                        name="completionDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Completion Date</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="date"
                                value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                                onChange={(e) => field.onChange(new Date(e.target.value))}
                                data-testid="input-completion-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={uploadForm.control}
                      name="featured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-featured"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Featured Project</FormLabel>
                            <FormDescription>
                              This project will be highlighted on the main gallery
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={uploadForm.control}
                      name="videoUrls"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Video URLs (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              value={(field.value || []).join('\n')}
                              onChange={(event) => field.onChange(event.target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean))}
                              placeholder="One uploaded or hosted MP4 URL per line"
                              rows={3}
                            />
                          </FormControl>
                          <FormDescription>Add before and after video links in display order.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {optimizingImages && <div className="rounded-lg bg-sky-50 p-3 text-sm text-brand-blue">Optimizing photos for a faster mobile upload…</div>}
                    {uploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="w-full" />
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setUploadDialogOpen(false)}
                        disabled={uploading}
                        data-testid="button-cancel-upload"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={optimizingImages || uploading || uploadMutation.isPending}
                        data-testid="button-submit-upload"
                      >
                        {optimizingImages ? "Preparing photos..." : uploading ? "Uploading..." : "Publish Project"}
                      </Button>
                    </div>
                  </form>
                </Form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="flex justify-between items-center mb-6">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48" data-testid="select-category-filter">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="carpentry">Carpentry</SelectItem>
                <SelectItem value="tech">Tech Support</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="text-sm text-gray-500">
              {galleryData?.total || 0} photos total
            </div>
          </div>

          {/* Gallery Grid */}
          {galleryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="bg-gray-200 h-48 rounded mb-4"></div>
                  <div className="bg-gray-200 h-4 rounded mb-2"></div>
                  <div className="bg-gray-200 h-3 rounded"></div>
                </div>
              ))}
            </div>
          ) : galleryItems.length === 0 ? (
            <div className="text-center py-12" data-testid="text-no-photos">
              <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
              <p className="text-gray-500">Upload your first project photo to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="gallery-grid">
              {galleryItems.map((item) => (
                <div key={item.id} className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800" data-testid={`gallery-item-${item.id}`}>
                  <div className="relative">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE2IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
                      }}
                    />
                    {item.featured && (
                      <Badge className="absolute top-2 left-2 bg-yellow-500 text-white">
                        Featured
                      </Badge>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg truncate" data-testid={`text-title-${item.id}`}>
                        {item.title}
                      </h3>
                      <Badge className={getCategoryBadgeColor(item.category)} data-testid={`badge-category-${item.id}`}>
                        {item.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2" data-testid={`text-description-${item.id}`}>
                      {item.description}
                    </p>
                    {!!item.videoUrls?.length && <Badge variant="secondary" className="mb-3">{item.videoUrls.length} video{item.videoUrls.length === 1 ? '' : 's'}</Badge>}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      {item.location && (
                        <div className="flex items-center gap-1">
                          <Location className="h-3 w-3" />
                          <span>{item.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(item.completionDate), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditItem(item)}
                        className="flex items-center gap-1 flex-1"
                        data-testid={`button-edit-${item.id}`}
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{item.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="my-4">
                            <img 
                              src={item.imageUrl} 
                              alt={item.title}
                              className="w-full max-w-sm h-32 object-cover rounded mx-auto"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-${item.id}`}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(item.id)}
                              disabled={deleteMutation.isPending}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid={`button-confirm-delete-${item.id}`}
                            >
                              {deleteMutation.isPending ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8" data-testid="pagination-controls">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                  if (page > totalPages) return null;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      data-testid={`button-page-${page}`}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Photo Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project information and replace the Before or After cover photos.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4" data-testid="form-edit-photo">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FormLabel>After / Cover Photo</FormLabel>
                  <label className="block cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-2 text-center">
                    {editMainPreview ? <img src={editMainPreview} alt="Current after photo" className="h-36 w-full rounded object-cover" /> : <div className="flex h-36 items-center justify-center text-sm text-gray-500">Choose after photo</div>}
                    <span className="mt-2 block text-xs font-medium text-brand-blue">Tap to replace</span>
                    <Input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { handleEditImageSelect(event.target.files, 'main'); event.target.value = ''; }} data-testid="input-edit-main-image" />
                  </label>
                </div>
                <div className="space-y-2">
                  <FormLabel>Before Photo</FormLabel>
                  <label className="block cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-2 text-center">
                    {editBeforePreview && !removeEditBefore ? <img src={editBeforePreview} alt="Current before photo" className="h-36 w-full rounded object-cover" /> : <div className="flex h-36 items-center justify-center text-sm text-gray-500">Choose before photo</div>}
                    <span className="mt-2 block text-xs font-medium text-brand-blue">Tap to replace</span>
                    <Input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { handleEditImageSelect(event.target.files, 'before'); event.target.value = ''; }} data-testid="input-edit-before-image" />
                  </label>
                  {editBeforePreview && !removeEditBefore && <Button type="button" variant="ghost" size="sm" className="w-full text-red-600" onClick={() => { setEditBeforeImage(null); setEditBeforePreview(null); setRemoveEditBefore(true); }}>Remove Before Photo</Button>}
                </div>
              </div>

              {editingItem && (() => {
                const photoUrls = Array.from(new Set([editingItem.beforeImageUrl, editingItem.imageUrl, ...(editingItem.imageUrls || [])].filter((url): url is string => Boolean(url))));
                const selectedBefore = new Set(editForm.watch('beforeImageUrls') || []);
                return (
                  <div className="space-y-3 rounded-lg border bg-slate-50 p-3">
                    <div>
                      <FormLabel>Classify Every Photo</FormLabel>
                      <p className="text-xs text-muted-foreground">Tap Before or After under each photo. This controls the labels shown in the public gallery.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {photoUrls.map((photoUrl) => {
                        const isBefore = selectedBefore.has(photoUrl);
                        return (
                          <div key={photoUrl} className="overflow-hidden rounded-lg border bg-white p-2">
                            <img src={photoUrl} alt="Project classification" className="aspect-square w-full rounded object-cover" />
                            <div className="mt-2 grid grid-cols-2 gap-1">
                              <Button type="button" size="sm" variant={isBefore ? 'default' : 'outline'} className={isBefore ? 'bg-slate-800 hover:bg-slate-900' : ''} onClick={() => editForm.setValue('beforeImageUrls', Array.from(new Set([...(editForm.getValues('beforeImageUrls') || []), photoUrl])), { shouldDirty: true })}>Before</Button>
                              <Button type="button" size="sm" variant={!isBefore ? 'default' : 'outline'} className={!isBefore ? 'bg-emerald-600 hover:bg-emerald-700' : ''} onClick={() => editForm.setValue('beforeImageUrls', (editForm.getValues('beforeImageUrls') || []).filter((url) => url !== photoUrl), { shouldDirty: true })}>After</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="plumbing">Plumbing</SelectItem>
                          <SelectItem value="electrical">Electrical</SelectItem>
                          <SelectItem value="carpentry">Carpentry</SelectItem>
                          <SelectItem value="tech">Tech Support</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-edit-description" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-edit-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="completionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Completion Date</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date"
                          value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-edit-completion-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="featured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-edit-featured"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Featured Project</FormLabel>
                      <FormDescription>
                        This project will be highlighted on the main gallery
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="videoUrls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Video URLs</FormLabel>
                    <FormControl>
                      <Textarea
                        value={(field.value || []).join('\n')}
                        onChange={(event) => field.onChange(event.target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean))}
                        placeholder="One video URL per line"
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>Videos are displayed in the featured project section when this project is selected as Featured.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editMutation.isPending || optimizingImages}
                  data-testid="button-submit-edit"
                >
                  {optimizingImages ? "Preparing image..." : editMutation.isPending ? "Updating..." : "Save Project"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuthenticatedDashboard() {
  const queryClient = useQueryClient();
  const { logout } = useAdminAuth();
  const { toast } = useToast();
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedAppointmentForReschedule, setSelectedAppointmentForReschedule] = useState<Appointment | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<Appointment | null>(null);
  const [manualReviewDialogOpen, setManualReviewDialogOpen] = useState(false);
  const [manualReviewName, setManualReviewName] = useState("");
  const [manualReviewEmail, setManualReviewEmail] = useState("");
  const [manualReviewService, setManualReviewService] = useState("");
  const [manualReviewMessage, setManualReviewMessage] = useState("");


  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"]
  });


  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/admin/reviews"]
  });

  const { data: pendingReviewRequests } = useQuery<{
    count: number;
    customers: Array<{ customerId: number; customerName: string; email: string; serviceType: string; completedAt: string }>;
  }>({
    queryKey: ["/api/admin/review-requests/pending"]
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"]
  });

  const { data: maintenancePlans = [] } = useQuery<MaintenancePlan[]>({
    queryKey: ["/api/maintenance-plans"]
  });

  const { data: scheduleData } = useQuery<{
    appointments: Appointment[];
    blockedTimes: any[];
  }>({
    queryKey: ["/api/admin/schedule"]
  });

  const { data: googleCalendarStatus, refetch: refetchGoogleCalendarStatus, isFetching: checkingGoogleCalendar } = useQuery<{
    connected: boolean;
    calendarId?: string;
    calendarName?: string;
    timeZone?: string;
    message?: string;
  }>({ queryKey: ["/api/admin/google/status"] });
  
  const appointments = scheduleData?.appointments || [];

  const handleLogout = () => {
    logout();
  };

  const approveReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await apiRequest(`/api/reviews/${reviewId}/approve`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
    }
  });

  const sendReviewRequestsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/admin/review-requests/send", "POST", {});
      return response.json() as Promise<{ sent: number; failed: number; remaining: number }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/review-requests/pending"] });
      toast({
        title: "Review requests sent",
        description: `${result.sent} email${result.sent === 1 ? "" : "s"} delivered${result.failed ? `; ${result.failed} failed and can be retried` : ""}.`,
      });
    },
    onError: () => {
      toast({ title: "Review requests failed", description: "No customers were marked as contacted. Please retry.", variant: "destructive" });
    }
  });

  const sendManualReviewRequestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/admin/review-requests/send-manual", "POST", {
        customerName: manualReviewName,
        customerEmail: manualReviewEmail,
        serviceType: manualReviewService,
        personalMessage: manualReviewMessage,
      });
      return response.json();
    },
    onSuccess: () => {
      setManualReviewDialogOpen(false);
      setManualReviewName(""); setManualReviewEmail(""); setManualReviewService(""); setManualReviewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/review-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Review request sent", description: "The manual request was delivered and recorded." });
    },
    onError: (error: any) => {
      toast({ title: "Review request not sent", description: error?.message || "Please check the details and retry.", variant: "destructive" });
    },
  });

  const updateQuoteStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest(`/api/quotes/${id}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    }
  });

  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest(`/api/admin/appointments/${id}/status`, "PUT", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schedule"] });
      setDetailsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Status update failed", description: "Please try again.", variant: "destructive" });
    }
  });




  const totalRevenue = maintenancePlans.reduce((sum, plan) => sum + plan.price, 0);
  const pendingQuotes = quotes.filter(q => q.status === "pending").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                HandyTech Solutions - Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage your business operations and customer relationships
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/" 
                className="text-brand-red hover:underline inline-flex items-center gap-1 text-sm"
                data-testid="link-back-to-main-site"
              >
                <Home className="h-4 w-4" />
                Main Site
              </Link>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingQuotes}</div>
            </CardContent>
          </Card>

        </div>

        <Tabs defaultValue="services" className="space-y-6">
          <TabsList className="flex w-full flex-wrap lg:grid lg:grid-cols-10 gap-1 h-auto p-1">
            <TabsTrigger value="services" className="flex-1 min-w-[100px] text-sm font-semibold bg-brand-red text-white data-[state=active]:bg-brand-red-dark">
              Services
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 min-w-[100px] text-sm">
              Calendar
            </TabsTrigger>
            <TabsTrigger value="blocked-dates" className="flex-1 min-w-[100px] text-sm">
              Block Dates
            </TabsTrigger>
            <TabsTrigger value="availability-rules" className="flex-1 min-w-[100px] text-sm">
              Availability
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex-1 min-w-[100px] text-sm">
              Appointments
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex-1 min-w-[100px] text-sm">
              Gallery
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex-1 min-w-[100px] text-sm">
              Quotes
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 min-w-[100px] text-sm">
              Reviews
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex-1 min-w-[100px] text-sm">
              Customers
            </TabsTrigger>
            <TabsTrigger value="live-chat" className="flex-1 min-w-[100px] text-sm bg-blue-600 text-white data-[state=active]:bg-blue-700">
              Live Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <Card className="mb-4">
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CalendarDays className={`mt-0.5 h-5 w-5 ${googleCalendarStatus?.connected ? "text-green-600" : "text-amber-600"}`} />
                  <div>
                    <p className="font-semibold">Google Calendar</p>
                    <p className="text-sm text-muted-foreground">
                      {googleCalendarStatus?.connected
                        ? `Connected to ${googleCalendarStatus.calendarName || "Google Calendar"} · ${googleCalendarStatus.timeZone || "America/Chicago"}`
                        : googleCalendarStatus?.message || "Not connected — appointments currently appear only in this admin calendar."}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetchGoogleCalendarStatus()} disabled={checkingGoogleCalendar}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${checkingGoogleCalendar ? "animate-spin" : ""}`} />Check connection
                  </Button>
                  {!googleCalendarStatus?.connected && <Button asChild size="sm"><a href="/api/admin/google/auth" target="_blank" rel="noreferrer">Connect Google Calendar</a></Button>}
                </div>
              </CardContent>
            </Card>
            <CalendarView 
              appointments={appointments} 
              onEventClick={(appointment) => {
                setSelectedAppointmentForDetails(appointment);
                setDetailsDialogOpen(true);
              }} 
            />
          </TabsContent>

          <TabsContent value="blocked-dates">
            <BlockedDatesManager />
          </TabsContent>

          <TabsContent value="availability-rules">
            <AvailabilityRulesManager />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentsTab 
              appointments={appointments}
              updateAppointmentStatusMutation={updateAppointmentStatusMutation}
            />
          </TabsContent>

          <TabsContent value="gallery">
            <GalleryTab />
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-1">
              <ServicesManager />
            </div>
          </TabsContent>

          <TabsContent value="quotes">
            <Card>
              <CardHeader>
                <CardTitle>Quote Requests</CardTitle>
                <CardDescription>Manage incoming service quote requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quotes.map((quote) => (
                    <div key={quote.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{quote.firstName} {quote.lastName}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{quote.email}</p>
                          {quote.company && <p className="text-sm text-gray-500">{quote.company}</p>}
                        </div>
                        <Badge variant={quote.status === "pending" ? "secondary" : "default"}>
                          {quote.status}
                        </Badge>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm"><strong>Service:</strong> {quote.serviceNeeded}</p>
                        {quote.message && <p className="text-sm mt-1"><strong>Message:</strong> {quote.message}</p>}
                        {quote.photoUrls && quote.photoUrls.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{quote.photoUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Quote project ${index + 1}`} className="aspect-square w-full rounded object-cover" /></a>)}</div>}
                        {quote.videoUrls && quote.videoUrls.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{quote.videoUrls.map((url, index) => <video key={url} src={url} controls preload="metadata" className="max-h-64 w-full rounded bg-black" aria-label={`Quote project video ${index + 1}`} />)}</div>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <AdminQuoteBuilder quote={quote} />
                        <Button 
                          size="sm" 
                          onClick={() => updateQuoteStatusMutation.mutate({ id: quote.id, status: "contacted" })}
                          disabled={updateQuoteStatusMutation.isPending}
                        >
                          Mark Contacted
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateQuoteStatusMutation.mutate({ id: quote.id, status: "converted" })}
                          disabled={updateQuoteStatusMutation.isPending}
                        >
                          Mark Converted
                        </Button>
                      </div>
                    </div>
                  ))}
                  {quotes.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No quote requests yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Customer Reviews</CardTitle>
                    <CardDescription>Manage feedback and request reviews from eligible completed customers</CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                  <Dialog open={manualReviewDialogOpen} onOpenChange={setManualReviewDialogOpen}>
                    <DialogTrigger asChild><Button variant="outline"><Mail className="h-4 w-4 mr-2" />Manual Request</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send a Manual Review Request</DialogTitle>
                        <DialogDescription>Use this for completed work that was not booked through the website.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div><label className="text-sm font-medium">Customer name</label><Input value={manualReviewName} onChange={(event) => setManualReviewName(event.target.value)} placeholder="Customer name" /></div>
                        <div><label className="text-sm font-medium">Customer email</label><Input type="email" value={manualReviewEmail} onChange={(event) => setManualReviewEmail(event.target.value)} placeholder="customer@example.com" /></div>
                        <div><label className="text-sm font-medium">Service or job</label><Input value={manualReviewService} onChange={(event) => setManualReviewService(event.target.value)} placeholder="Describe the completed work" /></div>
                        <div><label className="text-sm font-medium">Personal note (optional)</label><Textarea value={manualReviewMessage} onChange={(event) => setManualReviewMessage(event.target.value)} placeholder="Thank the customer or mention a project detail" rows={4} /></div>
                        <Button className="w-full" disabled={!manualReviewName.trim() || !manualReviewEmail.trim() || !manualReviewService.trim() || sendManualReviewRequestMutation.isPending} onClick={() => sendManualReviewRequestMutation.mutate()}>
                          <Send className="h-4 w-4 mr-2" />{sendManualReviewRequestMutation.isPending ? "Sending…" : "Send and Record Request"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button disabled={!pendingReviewRequests?.count || sendReviewRequestsMutation.isPending}>
                        <Send className="h-4 w-4 mr-2" />
                        {sendReviewRequestsMutation.isPending
                          ? "Sending…"
                          : `Send Review Requests (${pendingReviewRequests?.count || 0})`}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Send review request emails?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will email {pendingReviewRequests?.count || 0} completed customer{pendingReviewRequests?.count === 1 ? "" : "s"} who has not submitted a review and has not already received a request. Successful sends will not be repeated.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => sendReviewRequestsMutation.mutate()}>
                          Send Emails
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{review.title}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                              />
                            ))}
                            <span className="text-sm text-gray-600 ml-2">({review.rating}/5)</span>
                          </div>
                        </div>
                        <Badge variant={review.isApproved ? "default" : "secondary"}>
                          {review.isApproved ? "Approved" : "Pending"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{review.content}</p>
                      {review.photoUrls && review.photoUrls.length > 0 && (
                        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {review.photoUrls.map((photoUrl, index) => (
                            <a key={photoUrl} href={photoUrl} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg border bg-gray-100">
                              <img src={photoUrl} alt={`Customer review photo ${index + 1}`} className="h-full w-full object-cover transition-transform hover:scale-105" loading="lazy" />
                            </a>
                          ))}
                        </div>
                      )}
                      {review.videoUrl && (
                        <video src={review.videoUrl} controls preload="metadata" className="mb-4 max-h-96 w-full rounded-lg bg-black" aria-label="Customer review video" />
                      )}
                      {!review.isApproved && (
                        <Button 
                          size="sm"
                          onClick={() => approveReviewMutation.mutate(review.id)}
                          disabled={approveReviewMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve Review
                        </Button>
                      )}
                    </div>
                  ))}
                  {reviews.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No reviews yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <CustomersTab customers={customers} />
          </TabsContent>

          <TabsContent value="live-chat">
            <LiveChatManagement />
          </TabsContent>

        </Tabs>
      </div>
      
      {/* Reschedule Appointment Dialog */}
      <AppointmentDetailsDialog
        appointment={selectedAppointmentForDetails}
        open={detailsDialogOpen}
        busy={updateAppointmentStatusMutation.isPending}
        onOpenChange={setDetailsDialogOpen}
        onStatusChange={async (id, status) => {
          await updateAppointmentStatusMutation.mutateAsync({ id, status });
        }}
        onReschedule={(appointment) => {
          setDetailsDialogOpen(false);
          setSelectedAppointmentForReschedule(appointment);
          setRescheduleDialogOpen(true);
        }}
      />

      <RescheduleAppointmentDialog
        appointment={selectedAppointmentForReschedule}
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
      />
    </div>
  );
}


export default function AdminDashboard() {
  const { isAuthenticated, isLoading: authLoading, login } = useAdminAuth();
  const [loginError, setLoginError] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError("");
    
    const result = await login(username, password);
    
    if (!result.success) {
      setLoginError(result.error || "Login failed");
    }
    
    setIsLoggingIn(false);
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>Admin Login | HandyTech Solutions</title>
          <meta name="description" content="Admin dashboard login for HandyTech Solutions business management system." />
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <AdminLogin 
          onLogin={handleLogin}
          error={loginError}
          isLoading={isLoggingIn}
        />
      </>
    );
  }

  // Show authenticated dashboard
  return (
    <>
      <Helmet>
        <title>Admin Dashboard | HandyTech Solutions Business Management</title>
        <meta name="description" content="Manage reviews, quotes, and customers for HandyTech Solutions handyman services." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AuthenticatedDashboard />
    </>
  );
}
