import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Settings, Home } from "lucide-react";
import { UploadSheet } from "@/components/upload-sheet";
import { useToast } from "@/hooks/use-toast";

export function BottomNav() {
  const [location] = useLocation();
  const { toast } = useToast();

  const handleUploadComplete = () => {
    // Optional: You can show a toast message or trigger other actions when upload completes
    toast({
      title: "Upload Complete",
      description: "Your image has been processed and saved.",
      variant: "success",
    });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t border-gray-200">
      <div className="grid justify-items-center pt-3 h-full grid-cols-3 mx-auto max-w-lg md:max-w-2xl md:grid-cols-3">
        {/* Replace the Upload Link with the UploadSheet component */}
        <UploadSheet onComplete={handleUploadComplete} />

        <Link href="/">
          <button
            type="button"
            className={cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 md:flex-row md:gap-2",
              location === "/" && "text-blue-600",
            )}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs md:text-sm">Home</span>
          </button>
        </Link>

        <Link href="/settings">
          <button
            type="button"
            className={cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 md:flex-row md:gap-2",
              location === "/settings" && "text-blue-600",
            )}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs md:text-sm">Settings</span>
          </button>
        </Link>
      </div>
    </nav>
  );
}
