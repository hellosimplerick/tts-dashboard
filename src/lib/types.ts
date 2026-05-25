export type TTSProviderId =
  | "openai"
  | "elevenlabs"
  | "deepgram"
  | "cartesia"
  | "inworld"
  | "lmnt"
  | "azure"
  | "google"
  | "aws_polly";

export interface ProviderVoice {
  id: string;
  label: string;
}

export interface ProviderModel {
  id: string;
  label: string;
  estimatedCostPerMillionChars?: number;
}

export interface ProviderDefinition {
  id: TTSProviderId;
  label: string;
  envVars: string[];
  models: ProviderModel[];
  voices: ProviderVoice[];
  supportsInstructions: boolean;
  supportsSpeed: boolean;
  supportsFormat: boolean;
  notes: string;
}

export interface VoiceConfig {
  id?: string;
  name: string;
  provider: TTSProviderId;
  model: string;
  voice: string;
  script: string;
  voice_affect: string;
  tone: string;
  pacing: string;
  emphasis: string;
  pauses: string;
  avoid: string;
  quick_mutations: string[];
  speed: string;
  format: string;
  sample_rate: string;
  provider_options: string;
}

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: "openai",
    label: "OpenAI",
    envVars: ["OPENAI_API_KEY"],
    supportsInstructions: true,
    supportsSpeed: true,
    supportsFormat: true,
    notes: "Good default. gpt-4o-mini-tts supports natural-language voice instructions best.",
    models: [
      { id: "gpt-4o-mini-tts-2025-03-20", label: "gpt-4o-mini-tts-2025-03-20 (pinned)", estimatedCostPerMillionChars: 15 },
      { id: "gpt-4o-mini-tts", label: "gpt-4o-mini-tts", estimatedCostPerMillionChars: 15 },
      { id: "tts-1", label: "tts-1", estimatedCostPerMillionChars: 15 },
      { id: "tts-1-hd", label: "tts-1-hd", estimatedCostPerMillionChars: 30 },
    ],
    voices: [
      "alloy",
      "ash",
      "ballad",
      "cedar",
      "coral",
      "echo",
      "fable",
      "marin",
      "nova",
      "onyx",
      "sage",
      "shimmer",
      "verse",
    ].map((v) => ({ id: v, label: v })),
  },
  {
    id: "elevenlabs",
    label: "ElevenLabs",
    envVars: ["ELEVENLABS_API_KEY"],
    supportsInstructions: true,
    supportsSpeed: false,
    supportsFormat: true,
    notes: "Use a voice_id. Default voices are examples; paste your own voice IDs from ElevenLabs.",
    models: [
      { id: "eleven_flash_v2_5", label: "Flash v2.5", estimatedCostPerMillionChars: 50 },
      { id: "eleven_turbo_v2_5", label: "Turbo v2.5", estimatedCostPerMillionChars: 50 },
      { id: "eleven_multilingual_v2", label: "Multilingual v2", estimatedCostPerMillionChars: 100 },
    ],
    voices: [
      { id: "JBFqnCBsd6RMkjVDRZzb", label: "George / default example" },
      { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel / common example" },
      { id: "EXAVITQu4vr4xnSDxMaL", label: "Bella / common example" },
      { id: "custom", label: "custom — paste voice_id in Provider Options" },
    ],
  },
  {
    id: "deepgram",
    label: "Deepgram Aura",
    envVars: ["DEEPGRAM_API_KEY"],
    supportsInstructions: false,
    supportsSpeed: false,
    supportsFormat: true,
    notes: "Voice is encoded in the model name, e.g. aura-2-thalia-en.",
    models: [
      { id: "aura-2-thalia-en", label: "Aura-2 Thalia EN", estimatedCostPerMillionChars: 30 },
      { id: "aura-2-asteria-en", label: "Aura-2 Asteria EN", estimatedCostPerMillionChars: 30 },
      { id: "aura-2-helena-en", label: "Aura-2 Helena EN", estimatedCostPerMillionChars: 30 },
      { id: "aura-2-orion-en", label: "Aura-2 Orion EN", estimatedCostPerMillionChars: 30 },
      { id: "aura-asteria-en", label: "Aura-1 Asteria EN", estimatedCostPerMillionChars: 15 },
      { id: "aura-luna-en", label: "Aura-1 Luna EN", estimatedCostPerMillionChars: 15 },
      { id: "aura-orion-en", label: "Aura-1 Orion EN", estimatedCostPerMillionChars: 15 },
    ],
    voices: [{ id: "model_voice", label: "voice comes from selected model" }],
  },
  {
    id: "cartesia",
    label: "Cartesia Sonic",
    envVars: ["CARTESIA_API_KEY"],
    supportsInstructions: true,
    supportsSpeed: true,
    supportsFormat: true,
    notes: "Paste real Cartesia voice IDs in Provider Options when you outgrow the sample IDs.",
    models: [
      { id: "sonic-3.5", label: "Sonic 3.5" },
      { id: "sonic-3", label: "Sonic 3" },
      { id: "sonic-2", label: "Sonic 2" },
    ],
    voices: [
      { id: "a0e99841-438c-4a64-b679-ae501e7d6091", label: "sample voice id" },
      { id: "custom", label: "custom — paste voice_id in Provider Options" },
    ],
  },
  {
    id: "inworld",
    label: "Inworld TTS",
    envVars: ["INWORLD_API_KEY"],
    supportsInstructions: false,
    supportsSpeed: false,
    supportsFormat: true,
    notes: "Uses Basic auth with the Base64 credential from Inworld Portal.",
    models: [
      { id: "inworld-tts-2", label: "inworld-tts-2" },
      { id: "inworld-tts-1", label: "inworld-tts-1" },
    ],
    voices: ["Dennis", "Hades", "Pixie", "Ashley"].map((v) => ({ id: v, label: v })),
  },
  {
    id: "lmnt",
    label: "LMNT",
    envVars: ["LMNT_API_KEY"],
    supportsInstructions: false,
    supportsSpeed: true,
    supportsFormat: true,
    notes: "REST endpoint details can change; edit src/lib/tts/providers.ts if LMNT updates payload shape.",
    models: [
      { id: "blizzard", label: "blizzard" },
      { id: "aurora", label: "aurora" },
    ],
    voices: ["leah", "daniel", "morgan", "custom"].map((v) => ({ id: v, label: v })),
  },
  {
    id: "azure",
    label: "Azure AI Speech",
    envVars: ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"],
    supportsInstructions: true,
    supportsSpeed: true,
    supportsFormat: true,
    notes: "Uses SSML. Region matters. Example: eastus, westus2, canadacentral.",
    models: [{ id: "neural", label: "Neural / SSML" }],
    voices: [
      "en-US-JennyNeural",
      "en-US-GuyNeural",
      "en-US-AriaNeural",
      "en-US-DavisNeural",
      "en-CA-ClaraNeural",
      "en-CA-LiamNeural",
    ].map((v) => ({ id: v, label: v })),
  },
  {
    id: "google",
    label: "Google Cloud TTS",
    envVars: ["GOOGLE_TTS_API_KEY"],
    supportsInstructions: true,
    supportsSpeed: true,
    supportsFormat: true,
    notes: "Uses API-key REST mode for local testing. Service-account auth is better for production.",
    models: [{ id: "google-cloud", label: "Google Cloud TTS" }],
    voices: [
      "en-US-Chirp3-HD-Charon",
      "en-US-Chirp3-HD-Aoede",
      "en-US-Wavenet-D",
      "en-US-Wavenet-F",
      "en-CA-Wavenet-A",
      "en-CA-Wavenet-B",
    ].map((v) => ({ id: v, label: v })),
  },
  {
    id: "aws_polly",
    label: "Amazon Polly",
    envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
    supportsInstructions: true,
    supportsSpeed: true,
    supportsFormat: true,
    notes: "Uses AWS Signature V4 without extra dependencies. Neural engine by default.",
    models: [
      { id: "standard", label: "Standard", estimatedCostPerMillionChars: 4 },
      { id: "neural", label: "Neural", estimatedCostPerMillionChars: 16 },
      { id: "generative", label: "Generative", estimatedCostPerMillionChars: 30 },
      { id: "long-form", label: "Long-form", estimatedCostPerMillionChars: 100 },
    ],
    voices: ["Joanna", "Matthew", "Amy", "Brian", "Danielle", "Gregory", "Ruth", "Stephen"].map((v) => ({ id: v, label: v })),
  },
];

export const PROVIDER_BY_ID = Object.fromEntries(
  PROVIDERS.map((provider) => [provider.id, provider])
) as Record<TTSProviderId, ProviderDefinition>;

export const QUICK_MUTATIONS = [
  "dryer",
  "less_theatrical",
  "slower_verdict",
  "warmer",
  "more_skeptical",
  "less_polished",
  "more_podcast",
  "more_conversational",
  "crisp_and_direct",
] as const;

export const AUDIO_FORMATS = ["mp3", "wav", "aac", "opus", "flac", "pcm"] as const;

export const DEFAULT_CONFIG: VoiceConfig = {
  name: "",
  provider: "openai",
  model: "gpt-4o-mini-tts",
  voice: "alloy",
  script: "",
  voice_affect: "",
  tone: "",
  pacing: "",
  emphasis: "",
  pauses: "",
  avoid: "",
  quick_mutations: [],
  speed: "1.0",
  format: "mp3",
  sample_rate: "44100",
  provider_options: "{}",
};
