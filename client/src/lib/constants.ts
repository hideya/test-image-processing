import { 
  Sun, Moon, Cloud, CloudRain, 
  Activity, Heart, ThumbsUp, ThumbsDown, 
  Pill, AlertTriangle
} from "lucide-react";

// Icon definitions for measurements
export const MEASUREMENT_ICONS = [
  { id: "1", name: "Sun", icon: Sun, description: "Sunny day" },
  { id: "2", name: "Moon", icon: Moon, description: "Night time" },
  { id: "3", name: "Cloud", icon: Cloud, description: "Cloudy weather" },
  { id: "4", name: "Rain", icon: CloudRain, description: "Rainy day" },
  { id: "5", name: "Activity", icon: Activity, description: "Exercise/Active" },
  { id: "6", name: "Heart", icon: Heart, description: "Feeling good" },
  { id: "7", name: "ThumbsUp", icon: ThumbsUp, description: "Good results" },
  { id: "8", name: "ThumbsDown", icon: ThumbsDown, description: "Poor results" },
  { id: "9", name: "Medication", icon: Pill, description: "Took medication" },
  { id: "10", name: "Warning", icon: AlertTriangle, description: "Warning/Alert" }
];

// Max number of icons that can be selected
export const MAX_SELECTED_ICONS = 3;