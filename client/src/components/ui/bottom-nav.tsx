import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Settings, Home, Upload, Plus } from "lucide-react";
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
    <div>
      {/* Floating Action Button for Upload */}
      <div className="fixed bottom-20 right-4 z-50 md:right-8">
        <UploadSheet onComplete={handleUploadComplete}>
          <button
            className="flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-200 hover:shadow-xl transform hover:-translate-y-1">
            <Plus className="w-7 h-7" />
          </button>
        </UploadSheet>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t border-stone-200 shadow-md">
        <div className="flex justify-around items-center h-full mx-auto max-w-lg md:max-w-2xl px-4">
          <Link href="/">
            <button
              type="button"
              className={cn(
                "inline-flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-colors",
                location === "/" 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-stone-600 hover:bg-stone-50"
              )}
            >
              <Home className={cn("w-6 h-6", location === "/" ? "text-blue-600" : "text-stone-500")} />
              <span className="text-xs font-medium mt-1">Home</span>
            </button>
          </Link>

          {/* This middle space is for the floating action button */}
          <div className="w-10"></div>

          <Link href="/settings">
            <button
              type="button"
              className={cn(
                "inline-flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-colors",
                location === "/settings" 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-stone-600 hover:bg-stone-50"
              )}
            >
              <Settings className={cn("w-6 h-6", location === "/settings" ? "text-blue-600" : "text-stone-500")} />
              <span className="text-xs font-medium mt-1">Settings</span>
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
