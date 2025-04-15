import React from "react";
import { useLocation } from "wouter";
// Import any other components you need for the header
import { useAuth } from "../../hooks/use-auth";

export function Header() {
  const [location] = useLocation();
  
  // Determine page title based on current route
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Analysis History";
      case "/upload":
        return "Image Upload";
      case "/settings":
        return "Settings";
      default:
        return "Photo Analyzer";
    }
  };

  const { user, logoutMutation } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <h1 className="text-xl text-theme-dark font-semibold pl-2">{getPageTitle()}</h1>
      {/* Add any other header elements like user profile, notifications, etc. */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-theme-dark">
          Welcome, {user?.username || "User"}
        </span>
      </div>
    </header>
  );
}
