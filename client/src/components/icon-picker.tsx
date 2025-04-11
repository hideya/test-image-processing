import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { iconOptions, type IconOption } from "@/lib/icons";

interface IconPickerProps {
  selectedIcons: number[];
  onChange: (iconIds: number[]) => void;
  maxSelection?: number;
  size?: "sm" | "md";
}

export function IconPicker({
  selectedIcons,
  onChange,
  maxSelection = 3,
  size = "md",
}: IconPickerProps) {
  const iconSize = size === "sm" ? 16 : 20;
  const buttonSize = size === "sm" ? "w-6 h-6 p-1" : "w-8 h-8 p-2";

  const handleIconClick = (iconId: number) => {
    if (selectedIcons.includes(iconId)) {
      // Remove icon if already selected
      onChange(selectedIcons.filter((id) => id !== iconId));
    } else if (selectedIcons.length < maxSelection) {
      // Add icon if under the max selection limit
      onChange([...selectedIcons, iconId]);
    } else {
      // FIFO approach: Remove the oldest (first) icon and add the new one
      const newSelection = [...selectedIcons.slice(1), iconId];
      onChange(newSelection);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-1 justify-center">
        {iconOptions.map((icon) => (
          <Button
            key={icon.id}
            type="button"
            variant={selectedIcons.includes(icon.id) ? "default" : "outline"}
            size="icon"
            className={`${buttonSize} ${
              selectedIcons.includes(icon.id)
                ? "bg-primary text-primary-foreground"
                : "text-foreground"
            } ${
              selectedIcons.length === maxSelection &&
              selectedIcons[0] === icon.id
                ? "ring-2 ring-amber-300"
                : ""
            }`}
            onClick={() => handleIconClick(icon.id)}
          >
            {/* <icon.icon size={iconSize} /> */}
            <span>{icon.emoji}</span>
          </Button>
        ))}
      </div>

      {/* Simplified helper text */}
      {/* {selectedIcons.length === maxSelection && (
        <div className="mt-2 text-xs text-amber-600 italic">
          Max {maxSelection} icons. Selecting another will replace the oldest.
        </div>
      )} */}
    </div>
  );
}

// Smaller version for displaying selected icons only (no picking functionality)
export function IconDisplay({
  iconIds,
  size = "md",
}: {
  iconIds?: string | null;
  size?: "sm" | "md" | "xs";
}) {
  const [icons, setIcons] = useState<IconOption[]>([]);

  useEffect(() => {
    if (!iconIds) {
      setIcons([]);
      return;
    }

    // Handle comma-separated string of IDs
    const idArray = iconIds.split(",").map((id) => parseInt(id, 10));
    const foundIcons = idArray
      .map((id) => iconOptions.find((icon) => icon.id === id))
      .filter((icon): icon is IconOption => icon !== undefined);

    setIcons(foundIcons);
  }, [iconIds]);

  if (!icons.length) return null;

  const iconSize = size === "xs" ? 12 : size === "sm" ? 14 : 18;

  return (
    <span>
      {icons.map((icon) => (
        // <span key={icon.id} className="inline-flex">
        //   <icon.icon size={iconSize} className="text-primary mr-0.5" />
        // </span>
        <span>{icon.emoji}</span>
      ))}
    </span>
  );
}
