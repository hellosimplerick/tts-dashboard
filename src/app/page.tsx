"use client";

import { useState, useEffect, useCallback } from "react";
import VoicePanel from "@/components/VoicePanel";
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
