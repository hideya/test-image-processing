import React from 'react';
import { useAuth } from "../hooks/use-auth";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Route, Redirect } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading } = useAuth();
  console.log(`*** ProtectedRoute (${path}): user=${!!user}, isLoading=${isLoading}`);

  if (isLoading) {
    console.log(`*** ProtectedRoute (${path}): Showing loading state`);
    return (
      <Route path={path}>
        <div className="flex items-center justify-center h-screen w-full">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      </Route>
    );
  }

  if (!user) {
    console.log(`*** ProtectedRoute (${path}): No user found, redirecting to /auth`);
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Render component directly as children of the Route
  console.log(`*** ProtectedRoute (${path}): User authenticated, rendering component`);
  return (
    <Route
      path={path}
      component={() => (
        <AuthenticatedLayout>
          <Component />
        </AuthenticatedLayout>
      )}
    />
  );
}
