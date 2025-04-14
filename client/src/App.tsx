import React from "react";
import { Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { SettingsProvider } from "./hooks/use-settings";
import { ProtectedRoute } from "./lib/protected-route.tsx";
import AuthPage from "./pages/auth-page";
import MainPage from "./pages/main-page";
// Settings page now converted to a sheet component
import NotFound from "./pages/not-found";
import { Toaster } from "./components/ui/toaster";
// Bottom nav removed in favor of floating action buttons
import { ThemeProvider } from '@/contexts/ThemeProvider.tsx';
import { RouterDebugger } from './debug-router';

export default function App() {
  const [location] = useLocation();
  // No longer need to track bottom nav visibility

  console.log('*** App rendering, current location:', location);

  const containerClass = location === "/auth" 
    ? "h-screen flex flex-col overflow-hidden" 
    : ""; // Removed bottom padding since we no longer have bottom nav

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <ThemeProvider>
            <div className={containerClass}>
              <Switch>
                <Route path="/auth" component={AuthPage} />
                <ProtectedRoute path="/" component={MainPage} />
                {/* Upload route removed as it's now a upload component */}
                {/* Settings route removed as it's now a sheet component */}
                <Route component={NotFound} />
              </Switch>
              {/* Bottom navigation bar removed */}
              <RouterDebugger />
              <Toaster />
            </div>
          </ThemeProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
