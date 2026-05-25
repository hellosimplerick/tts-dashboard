"use client";

import { useState, useRef, useEffect } from "react";
import {
  VoiceConfig,
  PROVIDERS,
  PROVIDER_BY_ID,
  QUICK_MUTATIONS,
  AUDIO_FORMATS,
  DEFAULT_CONFIG,
  TTSProviderId,
  ProviderVoice,
} from "@/lib/types";

interface AudioResult {
  audioUrl: string;
  filename: string;
  charCount: number;
  estimatedCost: string;
  provider: string;
  model: string;
  voice: string;
  format: string;
  timestamp: string;
  voiceInstructions?: string;
  providerRequest?: Record<string, unknown>;
}

interface VoicePanelProps {
  panelId: string;
  label: string;
  configs: Array<{ id: string; name: string; provider?: string }>;
  onConfigSaved: () => void;
  externalConfig?: { config: VoiceConfig; timestamp: number } | null;
}

export default function VoicePanel({ panelId, label, configs, onConfigSaved, externalConfig }: VoicePanelProps) {
  const [config, setConfig] = useState<VoiceConfig>({ ...DEFAULT_CONFIG });

  useEffect(() => {
    if (externalConfig) {
      setVoiceOptions(null);
      setVoiceFetchMessage("");
      setConfig(externalConfig.config);
    }
  }, [externalConfig]);
  const [loading, setLoading] = useState(false);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [savedRunMessage, setSavedRunMessage] = useState("");
  const [voiceOptions, setVoiceOptions] = useState<ProviderVoice[] | null>(null);
  const [fetchingVoices, setFetchingVoices] = useState(false);
  const [voiceFetchMessage, setVoiceFetchMessage] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  const provider = PROVIDER_BY_ID[config.provider] || PROVIDER_BY_ID.openai;
  const activeVoiceOptions = voiceOptions || provider.voices;

  const updateField = (field: keyof VoiceConfig, value: string | string[]) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const selectProvider = (providerId: TTSProviderId) => {
    const nextProvider = PROVIDER_BY_ID[providerId];
    setVoiceOptions(null);
    setVoiceFetchMessage("");
    setConfig((prev) => ({
      ...prev,
      provider: providerId,
      model: nextProvider.models[0]?.id || "",
      voice: nextProvider.voices[0]?.id || "",
      provider_options: "{}",
    }));
  };

  const toggleMutation = (mutation: string) => {
    setConfig((prev) => {
      const mutations = [...prev.quick_mutations];
      const idx = mutations.indexOf(mutation);
      if (idx >= 0) mutations.splice(idx, 1);
      else mutations.push(mutation);
      return { ...prev, quick_mutations: mutations };
    });
  };

  const fetchProviderVoices = async () => {
    setFetchingVoices(true);
    setError("");
    setVoiceFetchMessage("");
    try {
      const res = await fetch("/api/voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: config.provider,
          model: config.model,
          provider_options: config.provider_options,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Voice fetch failed");
      const voices = Array.isArray(data.voices) ? data.voices : [];
      if (voices.length === 0) throw new Error("Provider returned no voices.");
      setVoiceOptions(voices);
      setConfig((prev) => ({
        ...prev,
        voice: voices.some((v: ProviderVoice) => v.id === prev.voice) ? prev.voice : voices[0].id,
      }));
      const source = data.source === "api" ? "live provider API" : "local fallback catalog";
      setVoiceFetchMessage(`${voices.length} voices loaded from ${source}.${data.message ? ` ${data.message}` : ""}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Voice fetch failed");
    } finally {
      setFetchingVoices(false);
    }
  };

  const generateTTS = async () => {
    setLoading(true);
    setError("");
    setSavedRunMessage("");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setAudioResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!saveName.trim()) return;
    try {
      const payload = { ...config, name: saveName };
      const res = await fetch("/api/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveName("");
      setShowSave(false);
      onConfigSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const saveRun = async () => {
    if (!audioResult) return;
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config_name: saveName || config.name || label,
          provider: config.provider,
          model: config.model,
          voice: config.voice,
          script: config.script,
          voice_instructions: audioResult.voiceInstructions || "",
          quick_mutations: config.quick_mutations,
          speed: config.speed,
          format: config.format,
          sample_rate: config.sample_rate,
          provider_options: config.provider_options,
          audio_url: audioResult.audioUrl,
          filename: audioResult.filename,
          char_count: audioResult.charCount,
          estimated_cost: audioResult.estimatedCost,
          notes,
        }),
      });
      if (!res.ok) throw new Error("Run save failed");
      setSavedRunMessage("Saved run to local history.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Run save failed");
    }
  };

  const loadConfig = async (id: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/configs/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const providerId = (data.provider || "openai") as TTSProviderId;
      const nextProvider = PROVIDER_BY_ID[providerId] || PROVIDER_BY_ID.openai;
      setVoiceOptions(null);
      setVoiceFetchMessage("");
      setConfig({
        id: data.id,
        name: data.name,
        provider: providerId,
        model: data.model || nextProvider.models[0]?.id || "",
        voice: data.voice || nextProvider.voices[0]?.id || "",
        script: data.script || "",
        voice_affect: data.voice_affect || "",
        tone: data.tone || "",
        pacing: data.pacing || "",
        emphasis: data.emphasis || "",
        pauses: data.pauses || "",
        avoid: data.avoid || "",
        quick_mutations: JSON.parse(data.quick_mutations || "[]"),
        speed: data.speed || "1.0",
        format: data.format || "mp3",
        sample_rate: data.sample_rate || "44100",
        provider_options: data.provider_options || "{}",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  };

  const exportConfig = async () => {
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tts-config-${panelId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  };

  const copyCode = async () => {
    const code = `await fetch('/api/tts', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(${JSON.stringify(config, null, 2)})\n});`;
    await navigator.clipboard.writeText(code);
    setSavedRunMessage("Copied fetch() code to clipboard.");
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[`generate_${panelId}`] = generateTTS;
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any)[`generate_${panelId}`];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
        <div>
          <h3 className="text-lg font-semibold text-white">{label}</h3>
          <p className="text-xs text-gray-500">{provider.label} · {provider.notes}</p>
        </div>
        <div className="flex gap-2">
          <select
            className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1 border border-gray-600 max-w-48"
            defaultValue=""
            onChange={(e) => loadConfig(e.target.value)}
          >
            <option value="">Load config...</option>
            {configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button onClick={() => setShowSave(!showSave)} className="btn-gray">Save</button>
          <button onClick={exportConfig} className="btn-gray">Export JSON</button>
          <button onClick={copyCode} className="btn-gray">Copy Code</button>
        </div>
      </div>

      {showSave && (
        <div className="px-5 py-3 border-b border-gray-700 bg-gray-800 flex gap-2">
          <input
            type="text"
            placeholder="Configuration name..."
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            className="flex-1 input"
          />
          <button onClick={saveConfig} className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded transition-colors">Save</button>
          <button onClick={() => setShowSave(false)} className="btn-gray">Cancel</button>
        </div>
      )}

      {error && (
        <div className="mx-5 mt-3 px-3 py-2 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-400 hover:text-red-200">✕</button>
        </div>
      )}

      {savedRunMessage && (
        <div className="mx-5 mt-3 px-3 py-2 bg-emerald-900/40 border border-emerald-700 rounded text-emerald-300 text-sm">
          {savedRunMessage}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <section>
          <h4 className="section-title">Provider Settings</h4>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Provider" value={config.provider} onChange={(v) => selectProvider(v as TTSProviderId)} options={PROVIDERS.map((p) => ({ id: p.id, label: p.label }))} />
            <Select label="Model" value={config.model} onChange={(v) => updateField("model", v)} options={provider.models} />
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-gray-400">Voice</label>
                <button
                  type="button"
                  onClick={fetchProviderVoices}
                  disabled={fetchingVoices}
                  className="text-[11px] px-2 py-0.5 rounded border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white disabled:opacity-50"
                >
                  {fetchingVoices ? "Fetching..." : "Fetch voices"}
                </button>
              </div>
              <select value={config.voice} onChange={(e) => updateField("voice", e.target.value)} className="w-full input">
                {activeVoiceOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <Select label="Audio Format" value={config.format} onChange={(v) => updateField("format", v)} options={AUDIO_FORMATS.map((f) => ({ id: f, label: f }))} />
            <Field label="Speed" value={config.speed} onChange={(v) => updateField("speed", v)} placeholder="1.0" rows={1} />
            <Field label="Sample Rate" value={config.sample_rate} onChange={(v) => updateField("sample_rate", v)} placeholder="44100" rows={1} />
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Required env: <span className="text-gray-300">{provider.envVars.join(", ")}</span>
          </div>
          {voiceFetchMessage && (
            <div className="mt-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800 rounded px-2 py-1.5">
              {voiceFetchMessage}
            </div>
          )}
        </section>

        <section>
          <h4 className="section-title">Voice Instructions Prompt</h4>
          <div className="space-y-3">
            <Field label="Voice Affect" value={config.voice_affect} onChange={(v) => updateField("voice_affect", v)} placeholder="Tired, frustrated, skeptical, warm, precise..." />
            <Field label="Tone" value={config.tone} onChange={(v) => updateField("tone", v)} placeholder="Sarcastic, conversational, measured, founder-to-founder..." />
            <Field label="Pacing" value={config.pacing} onChange={(v) => updateField("pacing", v)} placeholder="Slow before punchlines; faster through obvious details..." />
            <Field label="Emphasis" value={config.emphasis} onChange={(v) => updateField("emphasis", v)} placeholder="Stress risks, numbers, contradictions, final verdicts..." />
            <Field label="Pauses" value={config.pauses} onChange={(v) => updateField("pauses", v)} placeholder="Brief pause before verdict; long pause after question..." />
            <Field label="Avoid" value={config.avoid} onChange={(v) => updateField("avoid", v)} placeholder="No announcer voice, no fake excitement, no singsong..." />
          </div>
        </section>

        <section>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Mutations</h4>
          <div className="flex flex-wrap gap-2">
            {QUICK_MUTATIONS.map((m) => (
              <button
                key={m}
                onClick={() => toggleMutation(m)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${config.quick_mutations.includes(m) ? "bg-cyan-600 border-cyan-500 text-white" : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4 className="section-title">Test Script</h4>
          <textarea
            value={config.script}
            onChange={(e) => updateField("script", e.target.value)}
            rows={6}
            placeholder="Enter the text to be spoken..."
            className="w-full input resize-y"
          />
        </section>

        <section>
          <h4 className="section-title">Provider Options JSON</h4>
          <textarea
            value={config.provider_options}
            onChange={(e) => updateField("provider_options", e.target.value)}
            rows={5}
            placeholder={'{"voice_id":"paste-custom-provider-voice-id-here"}'}
            className="w-full input font-mono text-xs resize-y"
          />
          <p className="text-xs text-gray-500 mt-1">Use this for provider-specific voice IDs, output formats, language, stability, similarity_boost, etc.</p>
        </section>

        <button
          onClick={generateTTS}
          disabled={loading || !config.script.trim()}
          className="w-full py-3 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white"
        >
          {loading ? "Generating..." : `Generate with ${provider.label}`}
        </button>

        {audioResult && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <Badge>{audioResult.provider}</Badge>
              <Badge>{audioResult.voice}</Badge>
              <Badge>{audioResult.model}</Badge>
              <span>{audioResult.charCount} chars</span>
              <span>{audioResult.estimatedCost === "unknown" ? "cost unknown" : `$${audioResult.estimatedCost}`}</span>
              <span className="ml-auto">{new Date(audioResult.timestamp).toLocaleTimeString()}</span>
            </div>
            <audio ref={audioRef} controls src={audioResult.audioUrl} className="w-full h-10" />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes for this run</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="What worked? What was awful? What should be tried next?" className="w-full bg-gray-900 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-gray-500 focus:outline-none resize-y" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveRun} className="btn-gray">Save Run</button>
              <a href={audioResult.audioUrl} download={audioResult.filename} className="btn-gray">Download Audio</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="bg-gray-700 px-2 py-0.5 rounded text-cyan-400">{children}</span>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ id: string; label: string }> }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full input">
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full input resize-y" />
    </div>
  );
}
