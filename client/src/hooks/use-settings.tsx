import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Define settings types
type TimezoneOption = {
  label: string;
  value: string;
};

export interface UserSettings {
  timezone: string;
  dateFormat: string;
}

// Default settings
const defaultSettings: UserSettings = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'MM/dd/yyyy'
};

// Common timezones
export const timezones: TimezoneOption[] = [
  { label: 'UTC (Coordinated Universal Time)', value: 'UTC' },
  { label: 'America/New_York (Eastern Time)', value: 'America/New_York' },
  { label: 'America/Chicago (Central Time)', value: 'America/Chicago' },
  { label: 'America/Denver (Mountain Time)', value: 'America/Denver' },
  { label: 'America/Los_Angeles (Pacific Time)', value: 'America/Los_Angeles' },
  { label: 'Europe/London (Greenwich Mean Time)', value: 'Europe/London' },
  { label: 'Europe/Paris (Central European Time)', value: 'Europe/Paris' },
  { label: 'Europe/Moscow (Moscow Time)', value: 'Europe/Moscow' },
  { label: 'Asia/Tokyo (Japan Standard Time)', value: 'Asia/Tokyo' },
  { label: 'Asia/Shanghai (China Standard Time)', value: 'Asia/Shanghai' },
  { label: 'Australia/Sydney (Australian Eastern Time)', value: 'Australia/Sydney' },
  { label: 'Pacific/Auckland (New Zealand Standard Time)', value: 'Pacific/Auckland' },
];

// Date format options
export const dateFormats = [
  { label: 'MM/DD/YYYY', value: 'MM/dd/yyyy' },
  { label: 'DD/MM/YYYY', value: 'dd/MM/yyyy' },
  { label: 'YYYY-MM-DD', value: 'yyyy-MM-dd' },
];

// Define context type
type SettingsContextType = {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
};

// Create context
const SettingsContext = createContext<SettingsContextType | null>(null);

// Provider component
export function SettingsProvider({ children }: { children: ReactNode }) {
  // Initialize settings from localStorage or use defaults
  const [settings, setSettings] = useState<UserSettings>(() => {
    const savedSettings = localStorage.getItem('userSettings');
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });

  // Update settings
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(current => {
      const updated = { ...current, ...newSettings };
      localStorage.setItem('userSettings', JSON.stringify(updated));
      return updated;
    });
  };

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

// Hook for using settings
export function useSettings() {
  const context = useContext(SettingsContext);
  
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  
  return context;
}

// Utility function to format a date using the user's settings
export function formatDate(date: Date | string, settings: UserSettings): string {
  if (!date) {
    return "";  // Handle null/undefined dates
  }

  // Parse the date string if needed
  let dateObj: Date;
  if (typeof date === 'string') {
    // Make sure we handle ISO date strings correctly
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  // For YYYY-MM-DD format, we use a manual approach that's more reliable across browsers
  if (settings.dateFormat === 'YYYY-MM-DD') {
    // Get date in the user's timezone
    const options: Intl.DateTimeFormatOptions = { timeZone: settings.timezone };
    const formatter = new Intl.DateTimeFormat('en-US', {
      ...options,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(dateObj);
    const partValues: Record<string, string> = {};
    parts.forEach(part => {
      partValues[part.type] = part.value;
    });

    // Build ISO format from parts
    return `${partValues.year}-${partValues.month}-${partValues.day}`;
  }
  
  // For other formats, use Intl.DateTimeFormat
  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    'MM/DD/YYYY': {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: settings.timezone
    },
    'DD/MM/YYYY': {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: settings.timezone
    },
    'MMM DD, YYYY': {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      timeZone: settings.timezone
    },
    'MMMM DD, YYYY': {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      timeZone: settings.timezone
    }
  };
  
  // Default to full month format if not specified
  const options = formatOptions[settings.dateFormat] || formatOptions['MMMM DD, YYYY'];
  
  // Use appropriate locale based on format
  const locale = settings.dateFormat === 'DD/MM/YYYY' ? 'en-GB' : 'en-US';
  
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}