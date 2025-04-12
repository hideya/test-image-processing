import { useTheme } from '@/contexts';

function ColorPicker(): JSX.Element {
  const { themeColor, setThemeColor } = useTheme();
  
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="theme-color-picker" className="text-sm font-medium">
        Choose theme color:
      </label>
      <input 
        id="theme-color-picker"
        type="color" 
        value={themeColor}
        onChange={(e) => setThemeColor(e.target.value)}
        className="w-20 h-10 cursor-pointer rounded border border-gray-300"
      />
    </div>
  );
}

export default ColorPicker;