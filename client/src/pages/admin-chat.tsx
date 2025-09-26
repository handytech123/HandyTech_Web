import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageCircle, 
  Bot, 
  User, 
  Clock, 
  Send, 
  UserCheck,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format } from "date-fns";

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
  lastMessageAt: string;
  createdAt: string;
}

export default function AdminChat() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await fetch('/api/admin/chat/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (!response.ok) {
        throw new Error('Invalid password');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        setAdminToken(data.token);
        setIsAuthenticated(true);
        localStorage.setItem('admin-chat-token', data.token);
        
        // Initialize Socket.IO connection
        const newSocket = io({
          auth: {
            role: 'admin',
            token: data.token
          }
        });
        
        setSocket(newSocket);
        toast({ title: "Logged in successfully" });
      }
    },
    onError: () => {
      toast({ 
        title: "Login failed", 
        description: "Invalid password",
        variant: "destructive" 
      });
    }
  });

  // Get conversations
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['admin-chat-conversations'],
    queryFn: async () => {
      const response = await fetch('/api/admin/chat/conversations', {
        headers: {
          'X-Admin-Token': adminToken || ''
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      return data.conversations as ChatConversation[];
    },
    enabled: isAuthenticated && !!adminToken,
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Get messages for selected conversation
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['admin-chat-history', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      const response = await fetch(`/api/admin/chat/history/${selectedConversation}`, {
        headers: {
          'X-Admin-Token': adminToken || ''
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      return data.messages as ChatMessage[];
    },
    enabled: isAuthenticated && !!adminToken && !!selectedConversation
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check for existing token on load
  useEffect(() => {
    const token = localStorage.getItem('admin-chat-token');
    if (token) {
      setAdminToken(token);
      setIsAuthenticated(true);
      
      // Initialize Socket.IO connection
      const newSocket = io({
        auth: {
          role: 'admin',
          token
        }
      });
      
      setSocket(newSocket);
    }
  }, []);

  // Socket.IO event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on('handoff:requested', (data) => {
      toast({
        title: "Handoff Requested",
        description: `Customer in conversation ${data.conversationId.slice(-8)} wants human help`
      });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
    });

    return () => {
      socket.off('handoff:requested');
    };
  }, [socket, queryClient, toast]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(password);
  };

  const takeoverConversation = () => {
    if (!socket || !selectedConversation) return;
    
    socket.emit('admin:takeover', { convId: selectedConversation });
    toast({ title: "Conversation taken over" });
    queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
  };

  const returnToBot = () => {
    if (!socket || !selectedConversation) return;
    
    socket.emit('admin:botback', { convId: selectedConversation });
    toast({ title: "Returned to AI assistant" });
    queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
  };

  const sendMessage = () => {
    if (!socket || !selectedConversation || !messageInput.trim()) return;
    
    socket.emit('admin:message', { 
      convId: selectedConversation, 
      text: messageInput.trim() 
    });
    
    setMessageInput("");
    
    // Refresh messages after sending
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-history', selectedConversation] });
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Live Chat Admin
            </CardTitle>
            <p className="text-gray-600">Enter admin password to access chat management</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Site
                </Button>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Live Chat Admin</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] })}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Conversations ({conversations?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-220px)]">
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
            {selectedConversation ? (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Conversation {selectedConversation.slice(-8)}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {conversations?.find(c => c.id === selectedConversation)?.status === 'bot' ? (
                        <Button onClick={takeoverConversation} size="sm">
                          <UserCheck className="w-4 h-4 mr-2" />
                          Take Over
                        </Button>
                      ) : (
                        <Button onClick={returnToBot} variant="outline" size="sm">
                          <Bot className="w-4 h-4 mr-2" />
                          Return to AI
                        </Button>
                      )}
                      {getStatusBadge(conversations?.find(c => c.id === selectedConversation)?.status || 'bot')}
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="p-0 flex flex-col h-[calc(100vh-300px)]">
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {messagesLoading ? (
                      <div className="text-center text-gray-500">Loading messages...</div>
                    ) : messages?.length === 0 ? (
                      <div className="text-center text-gray-500">No messages yet</div>
                    ) : (
                      <div className="space-y-4">
                        {messages?.map((message) => (
                          <div
                            key={message.id}
                            className={`flex items-start space-x-3 ${
                              message.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {message.role !== 'user' && (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                                message.role === 'admin' ? 'bg-green-600' : 'bg-blue-600'
                              }`}>
                                {message.role === 'admin' ? <UserCheck className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                              </div>
                            )}
                            <div className={`max-w-[70%] rounded-lg p-3 ${
                              message.role === 'user'
                                ? 'bg-red-600 text-white'
                                : message.role === 'admin'
                                ? 'bg-green-100 text-green-900'
                                : 'bg-gray-100 text-gray-900'
                            }`}>
                              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                              <div className={`text-xs mt-1 opacity-70 ${
                                message.role === 'user' ? 'text-red-100' : 'text-gray-500'
                              }`}>
                                {formatTime(message.createdAt)}
                              </div>
                            </div>
                            {message.role === 'user' && (
                              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <div className="flex space-x-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        className="flex-1 min-h-[60px] max-h-[120px]"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!messageInput.trim()}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to start managing</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}