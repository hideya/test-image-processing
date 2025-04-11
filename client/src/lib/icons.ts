import {
  Sun,
  Cloud,
  CloudRain,
  Wind,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Footprints,
  Pill,
  Utensils,
  LucideIcon,
} from "lucide-react";

// Define the icon config type
export interface IconOption {
  id: number;
  icon: LucideIcon;
  name: string;
  description: string;
  emoji: string;
}

// Define 10 icons with meaningful health/lifestyle-related descriptions
export const iconOptions: IconOption[] = [
  {
    id: 1,
    icon: Sun,
    name: "Sunny",
    description: "Good weather/Clear day",
    emoji: "👠",
  },
  {
    id: 2,
    icon: Cloud,
    name: "Cloudy",
    description: "Cloudy/Overcast day",
    emoji: "👞",
  },
  {
    id: 3,
    icon: CloudRain,
    name: "Rainy",
    description: "Rainy day",
    emoji: "👟",
  },
  {
    id: 4,
    icon: Activity,
    name: "Exercise",
    description: "Exercise/Physical activity",
    emoji: "🩴",
  },
  {
    id: 5,
    icon: Wind,
    name: "Windy",
    description: "Windy conditions",
    emoji: "👣",
  },
  {
    id: 6,
    icon: ThumbsUp,
    name: "Good",
    description: "Good results/feeling",
    emoji: "🚶🏻‍♀️",
  },
  {
    id: 7,
    icon: ThumbsDown,
    name: "Bad",
    description: "Bad results/feeling",
    emoji: "🏃‍♂️",
  },
  {
    id: 8,
    icon: Footprints,
    name: "Walk",
    description: "Sleep related",
    emoji: "⭐",
  },
  {
    id: 9,
    icon: Pill,
    name: "Medication",
    description: "Took medication",
    emoji: "🩷",
  },
  {
    id: 10,
    icon: Utensils,
    name: "Food",
    description: "Food related",
    emoji: "💙",
  },
];

// Helper function to get icons from icon IDs string
export function getIconsFromIds(iconIdsString?: string | null): IconOption[] {
  if (!iconIdsString) return [];

  try {
    // Split comma-separated string into array of numbers
    const iconIds = iconIdsString.split(",").map((id) => parseInt(id, 10));

    // Return the icon objects for each ID
    return iconIds
      .map((id) => iconOptions.find((icon) => icon.id === id))
      .filter((icon): icon is IconOption => icon !== undefined);
  } catch (e) {
    console.error("Error parsing icon IDs:", e);
    return [];
  }
}
