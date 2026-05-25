"use client";

import { useState, useEffect, useCallback } from "react";
import VoicePanel from "@/components/VoicePanel";
import { CRANKYVC_PRESETS, CrankyVCPreset } from "@/lib/crankyvc-presets";
import { VoiceConfig } from "@/lib/types";

interface ConfigSummary {
  id: string;
  name: string;
}

export default function Home() {
  const [configs, setConfigs] = useState<ConfigSummary[]>([]);
  const [compareBoth, setCompareBoth] = useState(false);
  const [panelAExternalConfig, setPanelAExternalConfig] = useState<{ config: VoiceConfig; timestamp: number } | null>(null);
  const [panelBExternalConfig, setPanelBExternalConfig] = useState<{ config: VoiceConfig; timestamp: number } | null>(null);

  const handleLoadPreset = (preset: CrankyVCPreset, targetPanel: "A" | "B") => {
    const fullConfig: VoiceConfig = {
      name: preset.label,
      quick_mutations: [],
      format: "mp3",
      sample_rate: "44100",
      provider_options: "{}",
      ...preset.config,
    };
    
    const payload = {
      config: fullConfig,
      timestamp: Date.now(),
    };
    
    if (targetPanel === "A") {
      setPanelAExternalConfig(payload);
    } else {
      setPanelBExternalConfig(payload);
    }
  };

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/configs");
      const data = await res.json();
      setConfigs(
        data.map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch configs:", err);
    }
  }, []);

  useEffect(() => {
    // Initial load from the local config API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfigs();
  }, [fetchConfigs]);

  const generateBoth = async () => {
    setCompareBoth(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const genA = w.generate_panelA as (() => Promise<void>) | undefined;
    const genB = w.generate_panelB as (() => Promise<void>) | undefined;
    await Promise.all([genA?.(), genB?.()]);
    setCompareBoth(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Bar */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold">Multi-Provider TTS Lab</h1>
              <p className="text-xs text-gray-500">
                Cloud TTS voice testing, A/B comparison, and export
              </p>
            </div>
          </div>

          <button
            onClick={generateBoth}
            disabled={compareBoth}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30"
          >
            {compareBoth ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating Both...
              </span>
            ) : (
              "⚡ A/B Compare — Generate Both"
            )}
          </button>
        </div>
      </header>

      {/* Presets Bar */}
      <div className="max-w-[1800px] mx-auto px-6 pt-6">
        <section className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 rounded-2xl p-5 relative overflow-hidden">
          {/* Subtle glowing background orb */}
          <div className="absolute -right-20 -top-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-500 font-bold text-[10px] tracking-wider uppercase bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/20">
                  CrankyVC Presets
                </span>
                <span className="text-xs text-gray-500">·</span>
                <h2 className="text-md font-bold text-white">Voice Personas</h2>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Directly test and tune the 5 distinct voice characters used for podcasting. Compare them side-by-side.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {CRANKYVC_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-amber-500/50 transition-all duration-300 group shadow-md hover:shadow-lg hover:shadow-amber-500/5"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-2xl mt-0.5 group-hover:scale-110 transition-transform duration-300">
                    {preset.emoji}
                  </span>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-200 group-hover:text-amber-400 transition-colors">
                      {preset.label}
                    </h4>
                    <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
                      {preset.description}
                    </p>
                    <span className="inline-block mt-1.5 text-[9px] font-semibold bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700/60 uppercase tracking-wide">
                      {preset.config.voice}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-3 pt-2.5 border-t border-gray-800/60">
                  <button 
                    onClick={() => handleLoadPreset(preset, 'A')}
                    className="flex-1 text-[10px] font-semibold bg-gray-800 hover:bg-amber-600/20 hover:text-amber-300 border border-gray-700 hover:border-amber-500/40 text-gray-300 py-1.5 rounded-md transition-all active:scale-95 text-center"
                  >
                    Load A
                  </button>
                  <button 
                    onClick={() => handleLoadPreset(preset, 'B')}
                    className="flex-1 text-[10px] font-semibold bg-gray-800 hover:bg-cyan-600/20 hover:text-cyan-300 border border-gray-700 hover:border-cyan-500/40 text-gray-300 py-1.5 rounded-md transition-all active:scale-95 text-center"
                  >
                    Load B
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Main Content - A/B Panels */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-100px)]">
          <VoicePanel
            panelId="panelA"
            label="Panel A"
            configs={configs}
            onConfigSaved={fetchConfigs}
            externalConfig={panelAExternalConfig}
          />
          <VoicePanel
            panelId="panelB"
            label="Panel B"
            configs={configs}
            onConfigSaved={fetchConfigs}
            externalConfig={panelBExternalConfig}
          />
        </div>
      </main>
    </div>
  );
}
