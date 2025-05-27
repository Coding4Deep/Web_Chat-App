import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Mail, Lock, User, Eye, EyeOff, UserPlus, Sun, Moon, Github, Linkedin, ExternalLink } from "lucide-react";

interface SafeUser {
  id: number;
  username: string;
  email: string;
}

interface AppSetting {
  id: number;
  key: string;
  value: string;
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Login form state
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
    rememberMe: false
  });
  
  // Register form state
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false
  });

  // Fetch users for display
  const { data: users = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });

  // Fetch app settings for contact info
  const { data: settings = [] } = useQuery<AppSetting[]>({
    queryKey: ["/api/settings"],
  });

  const getSetting = (key: string) => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || '';
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync({
        username: loginData.username,
        password: loginData.password,
      });
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    
    if (!registerData.acceptTerms) {
      alert("Please accept the terms and conditions");
      return;
    }

    try {
      await registerMutation.mutateAsync({
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
      });
    } catch (error) {
      console.error("Registration failed:", error);
    }
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

  const getOnlineStatus = (index: number) => {
    // Simulate some users being offline
    return index % 4 !== 2;
  };

  if (isLogin) {
    return (
      <div className="min-h-screen animated-background floating-elements flex items-center justify-center p-4 relative overflow-hidden">
        {/* Floating particles */}
        <div className="particles">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${10 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="fixed top-4 right-4 z-50 glass-button"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center z-10">
          {/* Login Form Section */}
          <Card className="glass-card animate-slide-in-left">
            <CardHeader className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 animate-scale-in">
                <MessageCircle className="text-white text-2xl" size={32} />
              </div>
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                DeepDevApp
              </CardTitle>
              <p className="text-xs text-muted-foreground">-- By - Deepak Sagar</p>
              <p className="text-gray-600 dark:text-gray-300">Sign in to your DevOps Chat Platform</p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      className="pl-10"
                      value={loginData.username}
                      onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-10"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={loginData.rememberMe}
                      onCheckedChange={(checked) => 
                        setLoginData(prev => ({ ...prev, rememberMe: checked as boolean }))
                      }
                    />
                    <Label htmlFor="remember" className="text-sm">Remember me</Label>
                  </div>
                  <Button variant="link" className="p-0 text-sm">
                    Forgot password?
                  </Button>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-500 hover:bg-blue-600"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-300">
                  Don't have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 text-blue-500 hover:text-blue-600"
                    onClick={() => setIsLogin(false)}
                  >
                    Sign up here
                  </Button>
                </p>
              </div>

              {/* Learn More Button */}
              <div className="text-center">
                <Button
                  variant="outline"
                  className="glass-button"
                  onClick={() => window.open(getSetting('learn_more_url'), '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Learn More
                </Button>
              </div>
            </CardContent>

            {/* Contact Footer */}
            <div className="p-6 border-t border-border/50 bg-card/50">
              <div className="flex justify-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="glass-button"
                  onClick={() => window.open(getSetting('github_url'), '_blank')}
                >
                  <Github className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="glass-button"
                  onClick={() => window.open(`mailto:${getSetting('email')}`, '_blank')}
                >
                  <Mail className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="glass-button"
                  onClick={() => window.open(getSetting('linkedin_url'), '_blank')}
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">
                © {getSetting('email')}
              </p>
            </div>
          </Card>

          {/* Users List Section */}
          <Card className="glass-card animate-slide-in-right">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold">Active Users</CardTitle>
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                  {users.filter((_, index) => getOnlineStatus(index)).length} Online
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {users.map((user, index) => (
                    <div 
                      key={user.id}
                      className="flex items-center p-3 bg-card/50 rounded-lg hover:bg-card/70 transition-all duration-300 glass-button animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <Avatar className="mr-3">
                        <AvatarFallback className={`${getAvatarColor(user.username)} text-white font-semibold`}>
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        getOnlineStatus(index) ? 'bg-green-400 animate-pulse' : 'bg-gray-300'
                      }`} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-background floating-elements flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating particles */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 glass-button"
      >
        {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </Button>

      <div className="w-full max-w-md z-10">
        <Card className="glass-card animate-scale-in">
          <CardHeader className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-4 animate-scale-in">
              <UserPlus className="text-white text-2xl" size={32} />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Create Account</CardTitle>
            <p className="text-gray-600 dark:text-gray-300">Join the DevOps Chat Platform</p>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="regUsername">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="regUsername"
                    type="text"
                    placeholder="Enter your username"
                    className="pl-10"
                    value={registerData.username}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regEmail">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="regEmail"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    value={registerData.email}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="regPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    className="pl-10 pr-10"
                    value={registerData.password}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="pl-10 pr-10"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={registerData.acceptTerms}
                  onCheckedChange={(checked) => 
                    setRegisterData(prev => ({ ...prev, acceptTerms: checked as boolean }))
                  }
                  required
                />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the{" "}
                  <Button variant="link" className="p-0 text-purple-500 hover:text-purple-600">
                    Terms of Service
                  </Button>{" "}
                  and{" "}
                  <Button variant="link" className="p-0 text-purple-500 hover:text-purple-600">
                    Privacy Policy
                  </Button>
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-purple-500 hover:bg-purple-600"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-gray-600">
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 text-purple-500 hover:text-purple-600"
                  onClick={() => setIsLogin(true)}
                >
                  Sign in here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
