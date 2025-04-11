import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Settings, Home, Upload } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t border-gray-200 md:hidden">
      <div className="grid justify-items-center pt-3 h-full max-w-lg grid-cols-3 mx-auto">
        <Link href="/upload">
          <button
            type="button"
            className={cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50",
              location === "/upload" && "text-blue-600",
            )}
          >
            <Upload className="w-6 h-6" />
            <span className="text-xs">Upload</span>
          </button>
        </Link>

        <Link href="/">
          <button
            type="button"
            className={cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50",
              location === "/" && "text-blue-600",
            )}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs">Home</span>
          </button>
        </Link>

        <Link href="/settings">
          <button
            type="button"
            className={cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50",
              location === "/settings" && "text-blue-600",
            )}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs">Settings</span>
          </button>
        </Link>
      </div>
    </nav>
  );
}
