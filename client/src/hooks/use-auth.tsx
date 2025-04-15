import React, { createContext, ReactNode, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, setAuthToken, getAuthToken, clearAuthToken } from "@/lib/queryClient";

// User interface
interface User {
  id: number;
  username: string;
  email: string;
}

// Auth context type
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: { 
    mutate: (data: { username: string, password: string }) => void, 
    isPending: boolean 
  };
  registerMutation: { 
    mutate: (data: { username: string, email: string, password: string }) => void, 
    isPending: boolean 
  };
  logoutMutation: { 
    mutate: () => void, 
    isPending: boolean 
  };
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check if token exists on initialization
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      console.log('*** Found existing auth token on app start, length:', token.length);
      // The token will be used in API requests
    } else {
      console.log('*** No auth token found on app start');
    }
  }, []);

  // Fetch current user
  const { 
    data: user, 
    isLoading, 
    error 
  } = useQuery<User | null, Error>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      console.log('*** Running user query function');
      // Skip if no token exists
      if (!getAuthToken()) {
        console.log('*** No token available, skipping user fetch');
        return null;
      }
      
      try {
        console.log('*** Fetching current user data');
        // Use apiRequest which includes token handling
        const res = await apiRequest('GET', '/api/user');
        const userData = await res.json();
        console.log('*** User data fetched successfully:', userData ? { id: userData.id, username: userData.username } : 'No user data');
        return userData;
      } catch (error) {
        console.error("*** Error fetching user:", error);
        // Clear token if invalid
        if (error instanceof Error && error.message.includes('401')) {
          console.log('*** Authentication error, clearing token');
          clearAuthToken();
        }
        return null;
      }
    }
  });

  // Login mutation
  const login = useMutation({
    mutationFn: async (credentials: { username: string, password: string }) => {
      console.log("*** Login mutation started for user:", credentials.username);
      const res = await apiRequest('POST', '/api/login', credentials);
      const data = await res.json();
      
      console.log('*** Login response received:', { 
        userReceived: !!data.user, 
        username: data.user?.username,
        tokenReceived: !!data.token,
        tokenLength: data.token?.length
      });
      
      // Save JWT token when login is successful
      if (data.token) {
        console.log('*** Saving JWT token to localStorage');
        setAuthToken(data.token);
      } else {
        console.log('*** WARNING: No token received from server!');
      }
      
      return data.user || data;
    },
    onSuccess: (userData) => {
      console.log('*** Login successful, user data received:', userData ? { id: userData.id, username: userData.username } : 'No user data');
      console.log('*** Invalidating user query cache');
      
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      console.log('*** Navigating to home page');
      setLocation('/');
      toast({
        title: "Login successful",
        description: "Welcome back!",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
    }
  });

  // Register mutation
  const register = useMutation({
    mutationFn: async (userData: { username: string, email: string, password: string }) => {
      console.log("*** Register mutation started for user:", userData.username);
      try {
        const res = await apiRequest('POST', '/api/register', userData);
        const data = await res.json();
        
        console.log('*** Registration response received:', data);
        
        // Save JWT token when registration is successful
        if (data.token) {
          console.log('*** Saving JWT token after registration');
          setAuthToken(data.token);
        }
        
        return data.user || data;
      } catch (error) {
        console.error('*** Registration error:', error);
        throw error; // Re-throw to be caught by onError
      }
    },
    onSuccess: () => {
      console.log('*** Registration successful');
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setLocation('/');
      toast({
        title: "Registration successful",
        description: "Your account has been created",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      console.error('*** Registration error in onError handler:', error.message);
      // Handle specific error cases
      const errorMessage = error.message.includes('Username already exists')
        ? "This username is already taken. Please choose another username."
        : error.message || "Please try again with different information";
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Logout mutation
  const logout = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/logout');
      // Clear JWT token on logout
      clearAuthToken();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setLocation('/auth');
      toast({
        title: "Logout successful",
        description: "You have been logged out",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Create auth context value with properly typed mutations
  const loginMutation = {
    mutate: login.mutate,
    isPending: login.isPending
  };

  const registerMutation = {
    mutate: register.mutate,
    isPending: register.isPending
  };

  const logoutMutation = {
    mutate: logout.mutate,
    isPending: logout.isPending
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}