import React, { createContext, ReactNode, useContext } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

  // Fetch current user
  const { 
    data: user, 
    isLoading, 
    error 
  } = useQuery<User | null, Error>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user');
        if (!res.ok) {
          if (res.status === 401) {
            return null;
          }
          throw new Error('Failed to fetch user');
        }
        return await res.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    }
  });

  // Login mutation
  const login = useMutation({
    mutationFn: async (credentials: { username: string, password: string }) => {
      const res = await apiRequest('POST', '/api/login', credentials);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
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
      const res = await apiRequest('POST', '/api/register', userData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setLocation('/');
      toast({
        title: "Registration successful",
        description: "Your account has been created",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again with different information",
        variant: "destructive",
      });
    }
  });

  // Logout mutation
  const logout = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/logout');
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