import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { UploadSheet } from "@/components/upload-sheet";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// This is our new simplified upload page that just re-uses the UploadSheet component
export default function UploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const handleUploadComplete = () => {
    // Navigate to home page when upload is complete
    setLocation("/");
    
    // Optional: Show success message
    toast({
      title: "Upload Complete",
      description: "Your image has been processed and saved.",
      variant: "success",
    });
  };

  return (
    <div className="bg-neutral-50 min-h-screen pt-4 pb-20">
      <div className="max-w-md mx-auto">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          {/* Render the upload sheet's internal content directly */}
          <UploadSheet onComplete={handleUploadComplete} onCancel={() => setLocation("/")} />
        </div>
      </div>
    </div>
  );
}
