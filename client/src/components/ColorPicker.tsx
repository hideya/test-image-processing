import { useTheme } from '@/contexts';
import React from 'react';
import { THEME_COLORS } from '@/lib/theme-colors';

function ColorPicker(): JSX.Element {
  const { themeColor, setThemeColor } = useTheme();
  
  // Handle color selection
  const handleColorChange = (color: string) => {
    setThemeColor(color);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 flex-wrap">
        {Object.values(THEME_COLORS).map((colorObj) => (
          <ColorOption 
            key={colorObj.name}
            color={colorObj.DEFAULT}
            isSelected={themeColor === colorObj.DEFAULT}
            onClick={() => handleColorChange(colorObj.DEFAULT)}
            name={colorObj.name}
          />
        ))}
      </div>
    </div>
  );
}

interface ColorOptionProps {
  color: string;
  isSelected: boolean;
  onClick: () => void;
  name: string;
}

function ColorOption({ color, isSelected, onClick, name }: ColorOptionProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Select ${name.toLowerCase()} theme color`}
      aria-pressed={isSelected}
      className={`
        relative w-14 h-14 rounded-lg transition-all duration-200
        hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2
        focus:ring-theme-dark transform hover:scale-105
        ${isSelected ? 'ring-2 ring-offset-2 ring-theme scale-105' : 'ring-0'}
      `}
      style={{ backgroundColor: color }}
    >
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white bg-opacity-80 rounded-full p-1">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4" 
              viewBox="0 0 20 20" 
              fill="currentColor"
              style={{ color }}
            >
              <path 
                fillRule="evenodd" 
                d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586l-2.293-2.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}

export default ColorPicker;
