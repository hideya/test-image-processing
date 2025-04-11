import React from "react";
import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { SettingsProvider } from "./hooks/use-settings";
import { ProtectedRoute } from "./lib/protected-route.tsx";
import AuthPage from "./pages/auth-page";
import MainPage from "./pages/main-page";
import UploadPage from "./pages/upload-page";
import SettingsPage from "./pages/settings-page";
import NotFound from "./pages/not-found";
import { Toaster } from "./components/ui/toaster";
import { BottomNav } from "./components/ui/bottom-nav";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <div className="pb-16 md:pb-0">
            <Switch>
              <Route path="/auth" component={AuthPage} />
              <ProtectedRoute path="/" component={MainPage} />
              <ProtectedRoute path="/upload" component={UploadPage} />
              <ProtectedRoute path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
            <BottomNav />
            <Toaster />
          </div>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
