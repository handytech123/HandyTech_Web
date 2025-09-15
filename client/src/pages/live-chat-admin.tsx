import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Clock, User, MessageSquare, AlertCircle, Home } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

interface ChatMessage {
  type: 'customer' | 'admin';
  message: string;
  timestamp: string;
}

interface LiveChatSession {
  sessionId: string;
  isLive: boolean;
  needsHandoff: boolean;
  customerMessage: string;
  messages: ChatMessage[];
  startTime: string;
  adminTakeoverTime?: string;
}

export default function LiveChatAdmin() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const queryClient = useQueryClient();

  // Fetch live chat sessions
  const { data: sessions = [], refetch } = useQuery<LiveChatSession[]>({
    queryKey: ['/api/admin/live-chats'],
    refetchInterval: 10000, // Refresh every 10 seconds (reduced from 2 seconds to prevent rate limiting)
  });

  // Take over chat mutation
  const takeChatMutation = useMutation({
    mutationFn: (sessionId: string) =>
      apiRequest('/api/admin/take-chat', {
        method: 'POST',
        body: { sessionId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/live-chats'] });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) =>
      apiRequest('/api/admin/send-message', {
        method: 'POST',
        body: { sessionId, message },
      }),
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/live-chats'] });
    },
  });

  // End chat mutation
  const endChatMutation = useMutation({
    mutationFn: (sessionId: string) =>
      apiRequest('/api/admin/end-chat', {
        method: 'POST',
        body: { sessionId },
      }),
    onSuccess: () => {
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/live-chats'] });
    },
  });

  const handleTakeChat = (sessionId: string) => {
    takeChatMutation.mutate(sessionId);
    setSelectedSession(sessionId);
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedSession) {
      sendMessageMutation.mutate({
        sessionId: selectedSession,
        message: newMessage.trim(),
      });
    }
  };

  const handleEndChat = (sessionId: string) => {
    endChatMutation.mutate(sessionId);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const selectedSessionData = sessions.find((s: LiveChatSession) => s.sessionId === selectedSession);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live Chat Management</h1>
            <p className="text-gray-600">Monitor and respond to customer chat requests</p>
          </div>
          <Link 
            href="/" 
            className="text-brand-red hover:underline inline-flex items-center gap-1 text-sm"
            data-testid="link-back-to-main-site"
          >
            <Home className="h-4 w-4" />
            Main Site
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Sessions List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Active Sessions ({sessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active chat sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session: LiveChatSession) => (
                    <div
                      key={session.sessionId}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSession === session.sessionId
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedSession(session.sessionId)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant={session.needsHandoff && !session.isLive ? 'destructive' : 'secondary'}
                        >
                          {session.needsHandoff && !session.isLive ? (
                            <>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Needs Handoff
                            </>
                          ) : session.isLive ? (
                            'Live'
                          ) : (
                            'Active'
                          )}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatTime(session.startTime)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {session.customerMessage}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <User className="h-3 w-3" />
                        Session: {session.sessionId.slice(0, 8)}...
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
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {selectedSessionData
                  ? `Chat Session: ${selectedSessionData.sessionId.slice(0, 12)}...`
                  : 'Select a Chat Session'}
              </span>
              {selectedSessionData && (
                <div className="flex gap-2">
                  {!selectedSessionData.isLive && selectedSessionData.needsHandoff && (
                    <Button
                      onClick={() => handleTakeChat(selectedSessionData.sessionId)}
                      disabled={takeChatMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Take Chat
                    </Button>
                  )}
                  {selectedSessionData.isLive && (
                    <Button
                      onClick={() => handleEndChat(selectedSessionData.sessionId)}
                      variant="outline"
                      disabled={endChatMutation.isPending}
                    >
                      End Chat
                    </Button>
                  )}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSessionData ? (
              <>
                {/* Messages */}
                <ScrollArea className="h-[400px] mb-4 p-4 border rounded-lg bg-gray-50">
                  {selectedSessionData.messages.map((msg: ChatMessage, index: number) => (
                    <div key={index} className="mb-4">
                      <div
                        className={`flex ${
                          msg.type === 'customer' ? 'justify-start' : 'justify-end'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            msg.type === 'customer'
                              ? 'bg-white border'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              msg.type === 'customer' ? 'text-gray-500' : 'text-red-100'
                            }`}
                          >
                            {msg.type === 'customer' ? 'Customer' : 'You'} •{' '}
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>

                {/* Message Input */}
                {selectedSessionData.isLive ? (
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your response..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Send
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 bg-gray-100 rounded-lg">
                    {selectedSessionData.needsHandoff
                      ? 'Click "Take Chat" to respond to this customer'
                      : 'This session is not requesting live assistance'}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Chat Selected</h3>
                <p>Select a chat session from the left to start responding to customers</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}