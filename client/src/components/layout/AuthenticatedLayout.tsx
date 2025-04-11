import React from "react";
import { Header } from "./Header";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="flex flex-col">
      <Header />
      <main className="flex-1 p-4 pt-16"> {/* Add pt-16 for padding-top to offset the fixed header */}
        {children}
      </main>
      {/* BottomNav is already added in App.tsx, so we don't need it here */}
    </div>
  );
}
