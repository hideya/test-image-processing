import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Simplified upload page that just redirects to home
export default function UploadPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Redirect to home page
    setLocation("/");
    
    // Show an informative toast about the new upload functionality
    toast({
      title: "Using new upload interface",
      description: "Use the upload button in the bottom bar to access the new upload experience.",
      variant: "default",
    });
  }, [setLocation, toast]);

  // Return an empty div while redirecting
  return <div className="bg-gray-50 min-h-screen"></div>; // Changed to gray-50 to match main page color
}
