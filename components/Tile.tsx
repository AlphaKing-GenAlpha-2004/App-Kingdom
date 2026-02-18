
import React from 'react';
import { GridConfig, AppSettings } from '../types';

interface TileProps {
  value: number;
  idx: number;
  config: GridConfig;
  settings: AppSettings;
  onClick: () => void;
  isCorrect: boolean;
}

const Tile: React.FC<TileProps> = ({ value, onClick, isCorrect, settings }) => {
  if (value === 0) return <div className="bg-black/20 rounded-2xl shadow-inner"></div>;

  return (
    <button
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl transition-all duration-300 group
        flex items-center justify-center border shadow-2xl active:scale-95
        ${isCorrect 
          ? 'bg-white/20 border-white/40 ring-1 ring-white/20 shadow-white/10' 
          : 'bg-white/5 border-white/10 hover:bg-white/15'}
      `}
      style={{ opacity: settings.tileOpacity }}
    >
      {/* Glare effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
      
      {settings.showNumbers && (
        <span className={`
          relative z-10 text-white font-black drop-shadow-2xl select-none
          ${isCorrect ? 'scale-110 text-white' : 'text-white/80'}
        `}
        style={{ fontSize: 'min(2.5rem, 5vw)' }}
        >
          {value}
        </span>
      )}

      {/* Border glow */}
      <div className={`absolute inset-0 rounded-2xl border-2 transition-opacity ${isCorrect ? 'border-emerald-400/30' : 'border-transparent opacity-0 group-hover:opacity-10'}`}></div>
    </button>
  );
};

export default Tile;
