import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  LogOut, 
  Send, 
  Trash2, 
  Fan,
  Server,
  BarChart3,
  Settings,
  Wrench,
  Circle,
  ExternalLink
} from "lucide-react";
import { FaDocker, FaGitAlt } from "react-icons/fa";

interface ChatMessage {
  id: number;
  userId: number;
  content: string;
  timestamp: string;
}

interface ChatMessageWithUser extends ChatMessage {
  user: {
    id: number;
    username: string;
    email: string;
  };
}

interface DynamicUrl {
  id: number;
  name: string;
  url: string;
  icon: string;
}

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Fetch chat messages
  const { data: chatMessages = [], refetch: refetchMessages } = useQuery<ChatMessageWithUser[]>({
    queryKey: ["/api/chat"],
    refetchInterval: 5000, // Fallback polling
  });

  // Fetch dynamic URLs
  const { data: dynamicUrls = [] } = useQuery<DynamicUrl[]>({
    queryKey: ["/api/dynamic-urls"],
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/chat", { content });
      return await res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clear chat mutation
  const clearChatMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/chat");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      toast({
        title: "Chat cleared",
        description: "All messages have been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to clear chat",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user messages mutation
  const deleteUserMessagesMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/chat/user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      toast({
        title: "Your messages deleted",
        description: "All your messages have been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete messages",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // WebSocket setup
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("WebSocket connected");
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'new_message':
              case 'chat_cleared':
              case 'user_messages_deleted':
                queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
                break;
            }
          } catch (error) {
            console.error("WebSocket message error:", error);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          setIsConnected(false);
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
        setIsConnected(false);
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleDynamicUrlClick = (url: DynamicUrl) => {
    window.open(url.url, '_blank');
    
    // Queue background task for analytics
    apiRequest("POST", "/api/tasks", {
      type: "url_click",
      data: { urlId: url.id, userId: user?.id }
    }).catch(console.error);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500", 
      "bg-emerald-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-indigo-500"
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <MessageCircle className="text-white" size={24} />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900">DevOps Chat</h1>
                </div>
              </div>
            </div>

            {/* User Profile Section */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <Avatar>
                <AvatarFallback className={`${getAvatarColor(user.username)} text-white font-semibold`}>
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: User Info & Dynamic Buttons */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{user.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1 flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
                    <span className="text-sm text-gray-900">Online</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dynamicUrls.map((url, index) => {
                  const buttonColors = [
                    "bg-blue-50 hover:bg-blue-100 text-blue-700",
                    "bg-purple-50 hover:bg-purple-100 text-purple-700",
                    "bg-emerald-50 hover:bg-emerald-100 text-emerald-700",
                    "bg-amber-50 hover:bg-amber-100 text-amber-700"
                  ];
                  
                  const icons = [
                    <Server key="server" className="mr-3" size={16} />,
                    <BarChart3 key="chart" className="mr-3" size={16} />,
                    <Settings key="settings" className="mr-3" size={16} />,
                    <Wrench key="wrench" className="mr-3" size={16} />
                  ];

                  return (
                    <Button
                      key={url.id}
                      variant="ghost"
                      className={`w-full justify-start font-medium transition-colors ${buttonColors[index % buttonColors.length]}`}
                      onClick={() => handleDynamicUrlClick(url)}
                    >
                      {icons[index % icons.length]}
                      {url.name}
                      <ExternalLink className="ml-auto" size={14} />
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Chat & Blog */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Real-time Chat Box */}
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CardTitle className="text-lg">Team Chat</CardTitle>
                    <div className="ml-3 flex items-center">
                      <Circle 
                        className={`w-2 h-2 mr-1 ${isConnected ? 'text-green-400 fill-current animate-pulse' : 'text-red-400 fill-current'}`}
                      />
                      <span className="text-xs text-gray-500">
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearChatMutation.mutate()}
                      disabled={clearChatMutation.isPending}
                      title="Clear all messages"
                    >
                      <Fan className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteUserMessagesMutation.mutate()}
                      disabled={deleteUserMessagesMutation.isPending}
                      title="Delete your messages"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Chat Messages */}
              <ScrollArea className="h-80 p-4" ref={chatScrollRef}>
                <div className="space-y-4">
                  {chatMessages.map((message) => {
                    const isOwnMessage = message.userId === user.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex items-start space-x-3 ${isOwnMessage ? 'justify-end' : ''}`}
                      >
                        {!isOwnMessage && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className={`${getAvatarColor(message.user?.username || 'U')} text-white text-sm font-semibold`}>
                              {(message.user?.username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
                          <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                            <span className="text-sm font-medium text-gray-900">
                              {isOwnMessage ? 'You' : message.user?.username || 'User'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                          <div className={`rounded-lg px-4 py-2 max-w-xs ${isOwnMessage ? 'ml-auto' : ''} ${
                            isOwnMessage
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>

                        {isOwnMessage && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-blue-500 text-white text-sm font-semibold">
                              {user.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })}
                  
                  {chatMessages.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <MessageCircle className="mx-auto h-8 w-8 mb-2 text-gray-300" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex space-x-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button 
                    type="submit" 
                    disabled={sendMessageMutation.isPending || !newMessage.trim()}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </Card>

            {/* DevOps Tools Blog/Info Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">DevOps Tools & Resources</CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Tool Cards */}
                  <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                        <FaDocker className="text-white" size={20} />
                      </div>
                      <h3 className="font-semibold text-gray-900">Docker</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Containerization platform for building, shipping, and running applications in isolated environments.
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Containerization
                      </Badge>
                      <Button variant="link" className="text-blue-500 hover:text-blue-600 text-sm p-0">
                        Learn More
                      </Button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                        <FaGitAlt className="text-white" size={20} />
                      </div>
                      <h3 className="font-semibold text-gray-900">Git & GitHub</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Version control system and collaborative platform for tracking changes and managing code repositories.
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        Version Control
                      </Badge>
                      <Button variant="link" className="text-red-500 hover:text-red-600 text-sm p-0">
                        Learn More
                      </Button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                        <Server className="text-white" size={20} />
                      </div>
                      <h3 className="font-semibold text-gray-900">Kubernetes</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Container orchestration platform for automating deployment, scaling, and management of applications.
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        Orchestration
                      </Badge>
                      <Button variant="link" className="text-purple-500 hover:text-purple-600 text-sm p-0">
                        Learn More
                      </Button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                        <BarChart3 className="text-white" size={20} />
                      </div>
                      <h3 className="font-semibold text-gray-900">Monitoring</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Tools like Prometheus, Grafana for monitoring application performance and infrastructure health.
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Monitoring
                      </Badge>
                      <Button variant="link" className="text-green-500 hover:text-green-600 text-sm p-0">
                        Learn More
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Recent Articles */}
                <Separator className="my-8" />
                <div>
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Recent Articles</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Best Practices for Docker Container Security</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">CI/CD Pipeline Optimization Techniques</p>
                        <p className="text-xs text-gray-500">1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Microservices Architecture with Kubernetes</p>
                        <p className="text-xs text-gray-500">3 days ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">© sagardeepak2002@gmail.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
