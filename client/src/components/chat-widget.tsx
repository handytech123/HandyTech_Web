import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Send, Bot, User, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  isAgent?: boolean;
  timestamp: Date;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState<'bot' | 'pending_handoff' | 'human'>('bot');
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Terminate conversation when customer leaves the website
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socketRef.current && conversationId) {
        // Terminate conversation when leaving site
        socketRef.current.emit('visitor:terminate', { convId: conversationId });
        localStorage.removeItem('handytech-chat-id');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [conversationId]);

  // Initialize socket connection
  useEffect(() => {
    if (isOpen && !socketRef.current) {
      // Get or create conversation ID from localStorage
      const savedConvId = localStorage.getItem('handytech-chat-id');
      const convId = savedConvId || null;
      
      socketRef.current = io({
        auth: {
          role: 'visitor',
          convId
        }
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        setIsConnected(true);
      });

      socket.on('connected', ({ convId }: { convId: string }) => {
        setConversationId(convId);
        localStorage.setItem('handytech-chat-id', convId);
        
        // Add welcome message if no messages yet
        if (messages.length === 0) {
          const welcomeMessage: Message = {
            id: Date.now().toString(),
            text: "Hi there! I'm your HandyTech assistant. How can I help you with your home improvement needs today?",
            isBot: true,
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
        }
      });

      socket.on('bot:message', ({ text }: { text: string }) => {
        setIsTyping(false);
        const message: Message = {
          id: Date.now().toString(),
          text,
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, message]);
      });

      socket.on('human:message', ({ text }: { text: string }) => {
        setIsTyping(false);
        setStatus('human');
        const message: Message = {
          id: Date.now().toString(),
          text,
          isBot: false,
          isAgent: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, message]);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [isOpen]);

  const sendMessage = () => {
    if (!inputValue.trim() || !socketRef.current || !isConnected) return;

    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      isBot: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Check for human handoff keywords
    if (/human|agent|representative|person|live/i.test(inputValue)) {
      setStatus('pending_handoff');
    }

    // Send to server
    socketRef.current.emit('visitor:message', { text: inputValue.trim() });
    
    // Show typing indicator for bot responses
    if (status === 'bot') {
      setIsTyping(true);
    }

    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Focus input when opening
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'bot':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Bot className="w-3 h-3 mr-1" />AI Assistant</Badge>;
      case 'pending_handoff':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Connecting to Agent...</Badge>;
      case 'human':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><User className="w-3 h-3 mr-1" />Human Agent</Badge>;
      default:
        return null;
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <>
      {/* Chat Widget Button */}
      <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
        {!isOpen && (
          <Button
            onClick={toggleChat}
            className="h-12 w-12 rounded-full bg-brand-blue shadow-lg transition-all duration-200 hover:scale-105 hover:bg-brand-blue-dark"
            data-testid="chat-widget-button"
            aria-label="Open HandyTech chat"
          >
            <MessageCircle className="h-6 w-6 text-white" />
          </Button>
        )}
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-3 left-3 right-3 z-50 h-[min(500px,calc(100vh-1.5rem))] shadow-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:w-96">
          <Card className="h-full flex flex-col bg-white border-gray-300">
            {/* Header */}
            <CardHeader className="bg-brand-red text-white p-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex flex-col">
                    <CardTitle className="text-lg font-semibold">HandyTech Chat</CardTitle>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge()}
                      {isConnected ? (
                        <div className="flex items-center text-green-200 text-xs">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                          Connected
                        </div>
                      ) : (
                        <div className="flex items-center text-red-200 text-xs">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                          Connecting...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleChat}
                  className="text-white hover:bg-brand-red-dark h-8 w-8 p-0"
                  data-testid="chat-close-button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="chat-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start space-x-2",
                    message.isBot || message.isAgent ? "justify-start" : "justify-end"
                  )}
                >
                  {(message.isBot || message.isAgent) && (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm",
                      message.isAgent ? "bg-green-600" : "bg-blue-600"
                    )}>
                      {message.isAgent ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[280px] rounded-lg p-3 shadow-sm",
                    message.isBot || message.isAgent
                      ? "bg-gray-100 text-gray-900"
                      : "bg-brand-red text-white"
                  )}>
                    <div className="text-sm whitespace-pre-wrap break-words">{message.text}</div>
                    <div className={cn(
                      "text-xs mt-1 opacity-70",
                      message.isBot || message.isAgent ? "text-gray-500" : "text-red-100"
                    )}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                  {!message.isBot && !message.isAgent && (
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-start space-x-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3 shadow-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <Input
                  ref={inputRef}
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={!isConnected}
                  className="flex-1"
                  data-testid="chat-input"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || !isConnected}
                  className="bg-brand-red hover:bg-brand-red-dark"
                  data-testid="chat-send-button"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputValue("I need help with electrical work")}
                  className="text-xs"
                >
                  Electrical
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputValue("I have a plumbing issue")}
                  className="text-xs"
                >
                  Plumbing
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInputValue("I'd like to speak with a human")}
                  className="text-xs flex items-center"
                >
                  <Phone className="w-3 h-3 mr-1" />
                  Human Agent
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
