
import React from 'react';
// Fix: Import ThemeType and alias it as BackgroundType since that is how it's used in this component
import { GridConfig, AppSettings, ThemeType as BackgroundType } from '../types';

interface TileProps {
  value: number;
  row: number;
  col: number;
  config: GridConfig;
  settings: AppSettings;
  onClick: () => void;
  isCorrect: boolean;
  isHighlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const Tile: React.FC<TileProps> = ({ 
  value, row, col, config, settings, onClick, isCorrect, 
  isHighlighted, onMouseEnter, onMouseLeave 
}) => {
  if (value === 0) return null;

  const getBackgroundStyles = (): React.CSSProperties => {
    const common: React.CSSProperties = {
      opacity: settings.tileOpacity,
    };

    const background = settings.theme;

    if (background.type === BackgroundType.IMAGE) {
      // Calculate background position based on the tile's original value (goal position)
      const targetIdx = value - 1;
      const targetR = Math.floor(targetIdx / config.cols);
      const targetC = targetIdx % config.cols;
      
      // Calculate percentages for background-position
      // We need (col / (totalCols - 1)) * 100%
      const xPerc = config.cols > 1 ? (targetC / (config.cols - 1)) * 100 : 0;
      const yPerc = config.rows > 1 ? (targetR / (config.rows - 1)) * 100 : 0;

      return {
        ...common,
        backgroundImage: `url(${background.value})`,
        backgroundSize: `${config.cols * 100}% ${config.rows * 100}%`,
        backgroundPosition: `${xPerc}% ${yPerc}%`,
      };
    }

    if (background.type === BackgroundType.GRADIENT) {
      return {
        ...common,
        background: background.value,
      };
    }

    if (background.type === BackgroundType.TEXTURE) {
      return {
        ...common,
        backgroundColor: '#334155',
        backgroundImage: background.value,
      };
    }

    return {
      ...common,
      backgroundColor: background.value,
    };
  };

  const tileWidth = 100 / config.cols;
  const tileHeight = 100 / config.rows;

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    width: `${tileWidth}%`,
    height: `${tileHeight}%`,
    top: 0,
    left: 0,
    transform: `translate3d(${col * 100}%, ${row * 100}%, 0)`,
    transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
    padding: '4px', // This creates the gap between tiles
    zIndex: isCorrect ? 5 : 1,
  };

  return (
    <div 
      style={containerStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={onClick}
        className={`
          w-full h-full relative overflow-hidden rounded-xl transition-all duration-300 group
          flex items-center justify-center border shadow-2xl active:scale-95
          ${isCorrect 
            ? 'border-white/40 ring-1 ring-white/20 shadow-white/10' 
            : 'border-white/10 hover:border-white/30'}
          ${isHighlighted ? 'ring-2 ring-blue-400/50 border-blue-400/50 scale-[1.02] z-20' : ''}
        `}
        style={getBackgroundStyles()}
      >
        {/* Shine/Glare effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none"></div>
        
        {settings.showNumbers && (
          <span className={`
            relative z-10 text-white font-black drop-shadow-2xl select-none transition-transform
            ${isCorrect ? 'scale-110 text-white' : 'text-white/80'}
          `}
          style={{ 
            fontSize: `min(calc(40vw / ${Math.max(config.rows, config.cols)}), 2.5rem)`,
            lineHeight: 1
          }}
          >
            {value}
          </span>
        )}

        {/* Status indicators */}
        <div className={`absolute inset-0 rounded-xl border-2 transition-opacity pointer-events-none ${isCorrect ? 'border-emerald-400/40 opacity-100' : 'border-transparent opacity-0'}`}></div>
        
        {/* Subtle inner highlight for 3D effect */}
        <div className="absolute inset-0 border-t border-white/20 rounded-xl pointer-events-none"></div>
      </button>
    </div>
  );
};

export default Tile;
