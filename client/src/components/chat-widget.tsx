import { useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send } from "lucide-react";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm here to help you with any questions about our handyman and smart home services. How can I assist you today?",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  
  // Mobile drag functionality
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const chatRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: "Thank you for your message! Our HandyTech team will get back to you shortly. You can also schedule an appointment directly on this page or call us at <a href=\"tel:+13143254575\" class=\"underline hover:text-brand-red\">(314) 325-4575</a> for immediate assistance.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  // Touch event handlers for mobile dragging
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth <= 768) { // Only on mobile
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || window.innerWidth > 768) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - 80; // 80px for button width + margin
    const maxY = window.innerHeight - 80;
    
    setPosition({
      x: Math.max(-20, Math.min(maxX, newX)),
      y: Math.max(-20, Math.min(maxY, newY))
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleButtonClick = () => {
    // Only toggle if not dragging (prevent accidental opens during drag)
    if (!isDragging) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div 
      ref={chatRef}
      className={`fixed z-50 transition-all duration-200 ${
        position.x === 0 && position.y === 0 ? 'bottom-6 right-6' : ''
      }`}
      style={{
        transform: position.x !== 0 || position.y !== 0 
          ? `translate(${position.x}px, ${position.y}px)` 
          : 'none',
        right: position.x === 0 && position.y === 0 ? '24px' : 'auto',
        bottom: position.x === 0 && position.y === 0 ? '24px' : 'auto',
        left: position.x !== 0 || position.y !== 0 ? '24px' : 'auto',
        top: position.x !== 0 || position.y !== 0 ? '24px' : 'auto'
      }}
    >
      <Button
        onClick={handleButtonClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`bg-brand-red text-white w-16 h-16 rounded-full shadow-lg hover:bg-brand-red-dark select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-pointer'
        } md:cursor-pointer`}
        size="icon"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </Button>
      
      {isOpen && (
        <Card className="absolute bottom-20 right-0 w-80 bg-white shadow-xl border">
          <CardHeader className="bg-brand-red text-white p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Live Support</h3>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="sm"
                className="text-white hover:text-gray-300 h-auto p-0"
              >
                <X size={16} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-64 overflow-y-auto bg-gray-50 p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-xs p-3 rounded-lg text-sm ${
                      message.isBot
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'bg-brand-red text-white'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button 
                  onClick={handleSendMessage}
                  className="bg-brand-red hover:bg-brand-red-dark"
                  size="sm"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
