import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface EmojiColorPickerProps {
  currentEmoji?: string;
  currentColor?: string;
  onSave: (emoji: string, color: string) => void;
}

// Popular emoji options for user avatars
const EMOJI_OPTIONS = [
  '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
  '😎', '🤓', '🧐', '😏', '😌', '😔', '😴', '🤤',
  '🥳', '🤠', '🤡', '🤖', '👽', '👾', '🎃', '🎅',
  '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '🦸',
  '🦹', '🥷', '👮', '👷', '💂', '🕵️', '👩‍⚕️', '👨‍🚀',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈',
];

// Predefined color palette for avatar backgrounds
const COLOR_OPTIONS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Dark Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#A855F7', // Violet
  '#F43F5E', // Rose
  '#6366F1', // Indigo
  '#22D3EE', // Light Cyan
  '#FBBF24', // Amber
  '#6B7280', // Gray
];

export const EmojiColorPicker = ({ 
  currentEmoji = '🙂', 
  currentColor = '#3B82F6',
  onSave 
}: EmojiColorPickerProps) => {
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji);
  const [selectedColor, setSelectedColor] = useState(currentColor);

  const handleSave = () => {
    onSave(selectedEmoji, selectedColor);
  };

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Preview</h3>
        <div className="flex justify-center">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-200"
            style={{ backgroundColor: selectedColor }}
          >
            <span className="text-5xl select-none">{selectedEmoji}</span>
          </div>
        </div>
        <p className="text-center mt-3 text-sm text-muted-foreground">
          This is how you'll appear on the map
        </p>
      </Card>

      {/* Emoji Selector */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Choose Emoji</h3>
        <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setSelectedEmoji(emoji)}
              className={`
                w-12 h-12 text-2xl rounded-lg transition-all duration-200
                hover:scale-110 hover:shadow-md
                ${selectedEmoji === emoji 
                  ? 'bg-primary/20 ring-2 ring-primary scale-110' 
                  : 'bg-muted hover:bg-muted/80'
                }
              `}
            >
              {emoji}
            </button>
          ))}
        </div>
      </Card>

      {/* Color Selector */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Choose Background Color</h3>
        <div className="grid grid-cols-8 gap-3">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`
                w-12 h-12 rounded-lg transition-all duration-200
                hover:scale-110 hover:shadow-md
                ${selectedColor === color 
                  ? 'ring-4 ring-primary ring-offset-2 scale-110' 
                  : 'ring-1 ring-gray-300'
                }
              `}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </Card>

      {/* Save Button */}
      <Button 
        onClick={handleSave}
        className="w-full"
        size="lg"
      >
        Save Avatar
      </Button>
    </div>
  );
};
