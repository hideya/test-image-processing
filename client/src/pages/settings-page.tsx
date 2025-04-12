import React, { useState } from "react";
import { Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ArrowLeft, Save, CheckCircle, LogOut } from "lucide-react";

import { useSettings, timezones, dateFormats } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ColorPicker from '@/components/ColorPicker.tsx';

// Form schema
const settingsFormSchema = z.object({
  timezone: z.string({
    required_error: "Please select a timezone.",
  }),
  dateFormat: z.string({
    required_error: "Please select a date format.",
  }),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);

  // Initialize form with current settings
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
    },
  });

  // Handle form submission
  function onSubmit(data: SettingsFormValues) {
    // Update settings
    updateSettings(data);

    // Show success message
    setShowSuccess(true);

    // Set a timer to hide the success message after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);

    // Still try to show toast notification as a fallback
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
      variant: "success",
      duration: 3000,
    });

    // Reset form with new values
    form.reset(data);
  }

  return (
    <div className="bg-neutral-50">
      <Card className="mt-0">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your current account details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between py-1 border-b">
              <span className="font-medium text-gray-500">Username</span>
              <span>{user?.username}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="font-medium text-gray-500">Email</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="font-medium text-gray-500">
                Account Created
              </span>
              <span>April 2025</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-[var(--theme-color)]">testing...</div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Appearance Settings</CardTitle>
          <CardDescription>Appearance Settings</CardDescription>
        </CardHeader>
        <CardContent>
        <ColorPicker />
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button
          variant="destructive"
          className="w-full rounded-full"
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
