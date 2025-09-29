import { useEffect, useState } from 'react';

interface StageParty3DProps {
  width?: number;
  height?: number;
  animate?: boolean;
  showControls?: boolean;
  className?: string;
  scale?: number;
}

export const StageParty3D = ({ 
  width = 200, 
  height = 150, 
  animate = true,
  showControls = false,
  className = "",
  scale = 1
}: StageParty3DProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div 
        className={`overflow-hidden rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 ${className}`} 
        style={{ width, height }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-sm">Loading stage...</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`overflow-hidden rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 ${className}`} 
      style={{ width, height, transform: `scale(${scale})` }}
    >
      <div className="relative w-full h-full perspective-1000">
        {/* Stage Platform */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-24 h-3 bg-slate-700 rounded-sm shadow-lg"></div>
        
        {/* Backdrop */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-24 h-12 bg-slate-800 rounded-t-sm"></div>
        
        {/* Light Stands */}
        <div className="absolute bottom-8 left-8 w-1 h-12 bg-slate-600 rounded-full"></div>
        <div className="absolute bottom-8 right-8 w-1 h-12 bg-slate-600 rounded-full"></div>
        
        {/* Lights with animation */}
        <div 
          className={`absolute top-4 left-8 w-3 h-3 rounded-full shadow-lg ${animate ? 'animate-pulse' : ''}`}
          style={{ 
            backgroundColor: '#ff0040',
            boxShadow: animate ? '0 0 10px #ff0040' : 'none'
          }}
        ></div>
        <div 
          className={`absolute top-4 right-8 w-3 h-3 rounded-full shadow-lg ${animate ? 'animate-pulse' : ''}`}
          style={{ 
            backgroundColor: '#0080ff',
            boxShadow: animate ? '0 0 10px #0080ff' : 'none',
            animationDelay: '0.5s'
          }}
        ></div>
        
        {/* Speakers */}
        <div className="absolute bottom-4 left-4 w-4 h-8 bg-slate-900 rounded border border-slate-600">
          <div className="w-2 h-2 bg-slate-600 rounded-full mx-auto mt-2"></div>
          <div className="w-2 h-2 bg-slate-600 rounded-full mx-auto mt-1"></div>
        </div>
        <div className="absolute bottom-4 right-4 w-4 h-8 bg-slate-900 rounded border border-slate-600">
          <div className="w-2 h-2 bg-slate-600 rounded-full mx-auto mt-2"></div>
          <div className="w-2 h-2 bg-slate-600 rounded-full mx-auto mt-1"></div>
        </div>
        
        {/* DJ Booth */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-12 h-6 bg-slate-700 rounded-t border border-slate-600">
          <div className="w-2 h-1 bg-green-400 rounded mx-auto mt-1"></div>
          <div className="flex gap-1 justify-center mt-1">
            <div className="w-1 h-1 bg-red-400 rounded-full"></div>
            <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
          </div>
        </div>
        
        {/* Stage title */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-white text-xs font-mono opacity-75">
          🎪 STAGE
        </div>
      </div>
    </div>
  );
};