
import React, { useState, useEffect } from 'react';
import { THEMES, FONTS } from '../constants';
import { AppSettings, GridConfig, GameMode, Theme } from '../types';

interface SettingsPanelProps {
  settings: AppSettings;
  config: GridConfig;
  mode: GameMode;
  onSettingsChange: (updates: Partial<AppSettings>) => void;
  onConfigChange: (updates: Partial<GridConfig>) => void;
  onModeChange: (mode: GameMode) => void;
  onGenerate: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings, config, mode, onSettingsChange, onConfigChange, onModeChange, onGenerate
}) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config.rows < 2 || config.rows > 100 || config.cols < 2 || config.cols > 100) {
      setError('Size must be between 2 and 100');
    } else {
      setError(null);
    }
  }, [config.rows, config.cols]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !error) {
      onGenerate();
    }
  };

  return (
    <div className="space-y-6 text-slate-300">
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl backdrop-blur-xl">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Player Profile</h3>
        <div className="space-y-2">
          <label className="text-[10px] text-slate-500 block mb-1">Player Name</label>
          <div className="relative">
            <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input 
              type="text" 
              maxLength={15}
              value={settings.username}
              onChange={(e) => onSettingsChange({ username: e.target.value || 'Player1' })}
              placeholder="Enter your name..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 ring-blue-500 outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl backdrop-blur-xl">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Grid Setup</h3>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Rows (N)</label>
            <input 
              type="number" min="1" max="101" 
              value={config.rows}
              onChange={(e) => onConfigChange({ rows: parseInt(e.target.value) || 0 })}
              onKeyDown={handleKeyDown}
              className={`w-full bg-slate-800 border ${config.rows < 2 || config.rows > 100 ? 'border-red-500' : 'border-slate-700'} rounded-lg px-3 py-2 text-sm focus:ring-2 ring-blue-500 outline-none transition-colors`}
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">Cols (M)</label>
            <input 
              type="number" min="1" max="101" 
              value={config.cols}
              onChange={(e) => onConfigChange({ cols: parseInt(e.target.value) || 0 })}
              onKeyDown={handleKeyDown}
              className={`w-full bg-slate-800 border ${config.cols < 2 || config.cols > 100 ? 'border-red-500' : 'border-slate-700'} rounded-lg px-3 py-2 text-sm focus:ring-2 ring-blue-500 outline-none transition-colors`}
            />
          </div>
        </div>
        
        {error && (
          <p className="text-[10px] text-red-400 font-bold mb-4 animate-pulse">
            <i className="fas fa-exclamation-triangle mr-1"></i>
            {error}
          </p>
        )}

        <button 
          onClick={onGenerate}
          disabled={!!error}
          className={`w-full ${error ? 'bg-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'} text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95`}
        >
          Generate Grid
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl backdrop-blur-xl">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Game Mode</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {Object.values(GameMode).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all border ${mode === m ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              {m.replace('_', ' ')}
            </button>
          ))}
        </div>

        {mode === GameMode.TIMED && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-[10px] text-slate-500 block mb-1">Time Limit (seconds)</label>
            <input 
              type="number" min="10" max="3600"
              value={config.timeLimit || 60}
              onChange={(e) => onConfigChange({ timeLimit: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-500"
            />
          </div>
        )}

        {mode === GameMode.LIMITED_MOVES && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-[10px] text-slate-500 block mb-1">Move Limit</label>
            <input 
              type="number" min="1" max="10000"
              value={config.moveLimit || 100}
              onChange={(e) => onConfigChange({ moveLimit: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-500"
            />
          </div>
        )}
      </div>

      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl backdrop-blur-xl">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Visuals</h3>
        
        <label className="text-[10px] text-slate-500 block mb-2">Theme</label>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => onSettingsChange({ theme })}
              title={theme.name}
              className={`h-8 rounded-md transition-all border-2 ${settings.theme.id === theme.id ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ background: theme.value }}
            />
          ))}
        </div>

        <label className="text-[10px] text-slate-500 block mb-2">Typography</label>
        <select 
          value={settings.font}
          onChange={(e) => onSettingsChange({ font: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-4 outline-none"
        >
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs">Numbers</span>
          <input 
            type="checkbox" checked={settings.showNumbers}
            onChange={(e) => onSettingsChange({ showNumbers: e.target.checked })}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
