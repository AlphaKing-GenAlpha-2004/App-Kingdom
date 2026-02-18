
import React, { useRef } from 'react';
// Corrected: THEMES is the exported member in constants.tsx
import { THEMES as PRESET_BACKGROUNDS } from '../constants';
// Corrected: ThemeType and Theme are the exported members in types.ts
import { ThemeType as BackgroundType, Theme as PuzzleBackground } from '../types';

interface BackgroundSelectorProps {
  currentBackground: PuzzleBackground;
  onSelect: (bg: PuzzleBackground) => void;
}

const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({ currentBackground, onSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        // Corrected: Added id property to match Theme interface
        onSelect({
          id: 'custom-image',
          name: 'Custom Image',
          type: BackgroundType.IMAGE,
          value: dataUrl
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-md">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <i className="fas fa-palette text-blue-400"></i>
        Customize Background
      </h3>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {PRESET_BACKGROUNDS.map((bg) => (
          <button
            key={bg.id}
            onClick={() => onSelect(bg)}
            className={`
              h-16 rounded-lg border-2 transition-all overflow-hidden relative group
              ${currentBackground.value === bg.value ? 'border-blue-500 scale-105 shadow-lg' : 'border-transparent hover:border-white/20'}
            `}
            style={{ 
              background: bg.type === BackgroundType.GRADIENT ? bg.value : undefined,
              backgroundColor: bg.type === BackgroundType.COLOR ? bg.value : '#334155',
              backgroundImage: bg.type === BackgroundType.TEXTURE ? bg.value : undefined
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
              <span className="text-[10px] font-bold text-white uppercase tracking-tighter">{bg.name}</span>
            </div>
          </button>
        ))}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="h-16 rounded-lg border-2 border-dashed border-slate-600 hover:border-blue-400 hover:bg-slate-700/50 flex flex-col items-center justify-center transition-all group"
        >
          <i className="fas fa-upload text-slate-400 group-hover:text-blue-400 mb-1"></i>
          <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-blue-400">Custom</span>
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="space-y-4">
        <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Current Theme</label>
            <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                <div 
                    className="w-10 h-10 rounded-lg shadow-inner"
                    style={{ 
                        background: currentBackground.type === BackgroundType.GRADIENT ? currentBackground.value : undefined,
                        backgroundColor: currentBackground.type === BackgroundType.COLOR ? currentBackground.value : (currentBackground.type === BackgroundType.IMAGE ? '#000' : '#334155'),
                        backgroundImage: (currentBackground.type === BackgroundType.IMAGE || currentBackground.type === BackgroundType.TEXTURE) ? `url(${currentBackground.value})` : undefined,
                        backgroundSize: 'cover'
                    }}
                ></div>
                <div>
                    <p className="text-sm font-medium">{currentBackground.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{currentBackground.type}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BackgroundSelector;
