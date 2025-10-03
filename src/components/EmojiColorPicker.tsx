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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Live Preview */}
      <Card style={{
        padding: '24px',
        backgroundColor: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '16px'
        }}>Preview</h3>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div 
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s',
              backgroundColor: selectedColor
            }}
          >
            <span style={{
              fontSize: '48px',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}>{selectedEmoji}</span>
          </div>
        </div>
        <p style={{
          textAlign: 'center',
          marginTop: '12px',
          fontSize: '14px',
          color: 'hsl(var(--muted-foreground))'
        }}>
          This is how you'll appear on the map
        </p>
      </Card>

      {/* Emoji Selector */}
      <Card style={{
        padding: '24px',
        backgroundColor: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '16px'
        }}>Choose Emoji</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: '8px',
          maxHeight: '256px',
          overflowY: 'auto'
        }}>
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setSelectedEmoji(emoji)}
              style={{
                width: '48px',
                height: '48px',
                fontSize: '24px',
                borderRadius: '8px',
                transition: 'all 0.2s',
                cursor: 'pointer',
                border: selectedEmoji === emoji ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                backgroundColor: selectedEmoji === emoji ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--muted))',
                transform: selectedEmoji === emoji ? 'scale(1.1)' : 'scale(1)',
                boxShadow: selectedEmoji === emoji ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
              }}
              onMouseOver={(e) => {
                if (selectedEmoji !== emoji) {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.backgroundColor = 'hsl(var(--muted) / 0.8)';
                }
              }}
              onMouseOut={(e) => {
                if (selectedEmoji !== emoji) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.backgroundColor = 'hsl(var(--muted))';
                }
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </Card>

      {/* Color Selector */}
      <Card style={{
        padding: '24px',
        backgroundColor: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '16px'
        }}>Choose Background Color</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: '12px'
        }}>
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                transition: 'all 0.2s',
                cursor: 'pointer',
                backgroundColor: color,
                border: selectedColor === color ? '4px solid hsl(var(--primary))' : '1px solid #d1d5db',
                transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)',
                boxShadow: selectedColor === color ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                outline: selectedColor === color ? '2px solid transparent' : 'none',
                outlineOffset: selectedColor === color ? '2px' : '0'
              }}
              onMouseOver={(e) => {
                if (selectedColor !== color) {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (selectedColor !== color) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
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
