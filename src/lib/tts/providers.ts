import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";
import OpenAI from "openai";
import { PollyClient, SynthesizeSpeechCommand, DescribeVoicesCommand } from "@aws-sdk/client-polly";
import { PROVIDER_BY_ID, TTSProviderId, VoiceConfig, ProviderVoice } from "@/lib/types";

export interface TTSResult {
  buffer: Buffer;
  extension: string;
  contentType: string;
  estimatedCost: string;
  providerRequest: Record<string, unknown>;
}

export function buildVoiceInstructions(config: Partial<VoiceConfig>): string {
  const parts: string[] = [];
  if (config.voice_affect) parts.push(`Voice Affect: ${config.voice_affect}`);
  if (config.tone) parts.push(`Tone: ${config.tone}`);
  if (config.pacing) parts.push(`Pacing: ${config.pacing}`);
  if (config.emphasis) parts.push(`Emphasis: ${config.emphasis}`);
  if (config.pauses) parts.push(`Pauses: ${config.pauses}`);
  if (config.avoid) parts.push(`Avoid: ${config.avoid}`);
  if (config.quick_mutations && config.quick_mutations.length > 0) {
    parts.push(`Style mutations: ${config.quick_mutations.join(", ")}`);
  }
  return parts.join("\n");
}

export function parseProviderOptions(raw: string | undefined): Record<string, unknown> {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    throw new Error("Provider Options must be valid JSON. Use {} if you do not need options.");
  }
}

function needEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured in .env.local`);
  return value;
}

function numericSpeed(speed: string | undefined, fallback = 1): number {
  const value = Number(speed || fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, 0.25), 4);
}

function contentTypeFor(format: string): string {
  switch (format) {
    case "wav":
      return "audio/wav";
    case "aac":
      return "audio/aac";
    case "opus":
      return "audio/opus";
    case "flac":
      return "audio/flac";
    case "pcm":
      return "audio/L16";
    default:
      return "audio/mpeg";
  }
}

function extensionFor(format: string): string {
  return format === "pcm" ? "pcm" : format || "mp3";
}

function estimateCost(provider: TTSProviderId, model: string, charCount: number): string {
  const def = PROVIDER_BY_ID[provider];
  const modelDef = def?.models.find((m) => m.id === model);
  const perMillion = modelDef?.estimatedCostPerMillionChars;
  if (!perMillion) return "unknown";
  return ((charCount / 1_000_000) * perMillion).toFixed(4);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSsml(config: VoiceConfig, instructions: string): string {
  const speed = Math.round(numericSpeed(config.speed) * 100);
  const instructionBlock = instructions ? `<p>${escapeXml(instructions)}</p>` : "";
  return `<speak version="1.0" xml:lang="en-US"><voice name="${escapeXml(config.voice)}"><prosody rate="${speed}%">${instructionBlock}<p>${escapeXml(config.script)}</p></prosody></voice></speak>`;
}

async function readBinaryResponse(response: Response, provider: string): Promise<Buffer> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${provider} TTS failed: ${response.status} ${response.statusText}${text ? ` — ${text.slice(0, 700)}` : ""}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function synthesizeOpenAI(config: VoiceConfig, instructions: string): Promise<TTSResult> {
  const openai = new OpenAI({ apiKey: needEnv("OPENAI_API_KEY") });
  const requestBody: Record<string, unknown> = {
    model: config.model,
    voice: config.voice,
    input: config.script,
    response_format: config.format || "mp3",
    speed: numericSpeed(config.speed),
  };
  if (instructions) requestBody.instructions = instructions;
  // The OpenAI SDK type is narrower than our provider-normalized request object.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await openai.audio.speech.create(requestBody as any);
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    extension: extensionFor(config.format),
    contentType: contentTypeFor(config.format),
    estimatedCost: estimateCost("openai", config.model, config.script.length),
    providerRequest: requestBody,
  };
}

async function synthesizeElevenLabs(config: VoiceConfig, instructions: string, options: Record<string, unknown>): Promise<TTSResult> {
  const apiKey = needEnv("ELEVENLABS_API_KEY");
  const voiceId = String(options.voice_id || (config.voice === "custom" ? "" : config.voice));
  if (!voiceId) throw new Error("ElevenLabs voice_id is required. Put it in Provider Options, e.g. {\"voice_id\":\"...\"}");
  const outputFormat = String(options.output_format || "mp3_44100_128");
  const body = {
    text: config.script,
    model_id: config.model,
    voice_settings: options.voice_settings || {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true,
    },
    ...(instructions ? { pronunciation_dictionary_locators: options.pronunciation_dictionary_locators || [] } : {}),
  };
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return {
    buffer: await readBinaryResponse(response, "ElevenLabs"),
    extension: "mp3",
    contentType: "audio/mpeg",
    estimatedCost: estimateCost("elevenlabs", config.model, config.script.length),
    providerRequest: { endpoint: "ElevenLabs create speech", voiceId, outputFormat, body },
  };
}

async function synthesizeDeepgram(config: VoiceConfig): Promise<TTSResult> {
  const apiKey = needEnv("DEEPGRAM_API_KEY");
  const encoding = config.format === "wav" ? "linear16" : "mp3";
  const container = config.format === "wav" ? "wav" : "mp3";
  const url = new URL("https://api.deepgram.com/v1/speak");
  url.searchParams.set("model", config.model);
  url.searchParams.set("encoding", encoding);
  url.searchParams.set("container", container);
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: config.script }),
  });
  return {
    buffer: await readBinaryResponse(response, "Deepgram"),
    extension: container,
    contentType: container === "wav" ? "audio/wav" : "audio/mpeg",
    estimatedCost: estimateCost("deepgram", config.model, config.script.length),
    providerRequest: { url: url.toString(), body: { text: config.script } },
  };
}

async function synthesizeCartesia(config: VoiceConfig, instructions: string, options: Record<string, unknown>): Promise<TTSResult> {
  const apiKey = needEnv("CARTESIA_API_KEY");
  const voiceId = String(options.voice_id || (config.voice === "custom" ? "" : config.voice));
  if (!voiceId) throw new Error("Cartesia voice_id is required. Put it in Provider Options, e.g. {\"voice_id\":\"...\"}");
  const body = {
    model_id: config.model,
    transcript: instructions ? `${instructions}\n\n${config.script}` : config.script,
    voice: { mode: "id", id: voiceId },
    output_format: {
      container: config.format === "wav" ? "wav" : "mp3",
      sample_rate: Number(config.sample_rate || 44100),
    },
    language: options.language || "en",
    speed: numericSpeed(config.speed),
  };
  const response = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Cartesia-Version": String(options.cartesia_version || "2025-04-16"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return {
    buffer: await readBinaryResponse(response, "Cartesia"),
    extension: config.format === "wav" ? "wav" : "mp3",
    contentType: config.format === "wav" ? "audio/wav" : "audio/mpeg",
    estimatedCost: estimateCost("cartesia", config.model, config.script.length),
    providerRequest: { endpoint: "https://api.cartesia.ai/tts/bytes", body },
  };
}

async function synthesizeInworld(config: VoiceConfig): Promise<TTSResult> {
  const apiKey = needEnv("INWORLD_API_KEY");
  const sampleRate = Number(config.sample_rate || 22050);
  const body = {
    text: config.script,
    voiceId: config.voice,
    modelId: config.model,
    audioConfig: {
      audioEncoding: config.format === "mp3" ? "MP3" : "LINEAR16",
      sampleRateHertz: sampleRate,
    },
    deliveryMode: "BALANCED",
    applyTextNormalization: "ON",
  };
  const response = await fetch("https://api.inworld.ai/tts/v1/voice", {
    method: "POST",
    headers: { Authorization: `Basic ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return {
    buffer: await readBinaryResponse(response, "Inworld"),
    extension: config.format === "mp3" ? "mp3" : "wav",
    contentType: config.format === "mp3" ? "audio/mpeg" : "audio/wav",
    estimatedCost: estimateCost("inworld", config.model, config.script.length),
    providerRequest: { endpoint: "https://api.inworld.ai/tts/v1/voice", body },
  };
}

async function synthesizeLmnt(config: VoiceConfig, options: Record<string, unknown>): Promise<TTSResult> {
  const apiKey = needEnv("LMNT_API_KEY");
  const body = {
    text: config.script,
    voice: options.voice_id || config.voice,
    format: config.format || "mp3",
    sample_rate: Number(config.sample_rate || 44100),
    speed: numericSpeed(config.speed),
  };
  const response = await fetch("https://api.lmnt.com/v1/speech/generate", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "lmnt-version": String(options.lmnt_version || "1.1"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return {
    buffer: await readBinaryResponse(response, "LMNT"),
    extension: extensionFor(config.format),
    contentType: contentTypeFor(config.format),
    estimatedCost: estimateCost("lmnt", config.model, config.script.length),
    providerRequest: { endpoint: "https://api.lmnt.com/v1/speech/generate", body },
  };
}

async function synthesizeAzure(config: VoiceConfig, instructions: string): Promise<TTSResult> {
  const key = needEnv("AZURE_SPEECH_KEY");
  const region = needEnv("AZURE_SPEECH_REGION");
  const outputFormat = config.format === "wav" ? "riff-24khz-16bit-mono-pcm" : "audio-24khz-160kbitrate-mono-mp3";
  const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": outputFormat,
      "User-Agent": "tts-voice-test-dashboard",
    },
    body: buildSsml(config, instructions),
  });
  return {
    buffer: await readBinaryResponse(response, "Azure Speech"),
    extension: config.format === "wav" ? "wav" : "mp3",
    contentType: config.format === "wav" ? "audio/wav" : "audio/mpeg",
    estimatedCost: estimateCost("azure", config.model, config.script.length),
    providerRequest: { region, outputFormat, ssml: buildSsml(config, instructions) },
  };
}

async function synthesizeGoogle(config: VoiceConfig, instructions: string): Promise<TTSResult> {
  const accessToken = await getGoogleAccessToken();
  const text = instructions ? `${instructions}\n\n${config.script}` : config.script;
  const body = {
    input: { text },
    voice: {
      languageCode: config.voice.startsWith("en-CA") ? "en-CA" : "en-US",
      name: config.voice,
    },
    audioConfig: {
      audioEncoding: config.format === "wav" ? "LINEAR16" : "MP3",
      speakingRate: numericSpeed(config.speed),
      sampleRateHertz: Number(config.sample_rate || 24000),
    },
  };
  const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const textResponse = await response.text().catch(() => "");
    throw new Error(`Google Cloud TTS failed: ${response.status} ${response.statusText}${textResponse ? ` — ${textResponse.slice(0, 700)}` : ""}`);
  }
  const json = await response.json();
  return {
    buffer: Buffer.from(json.audioContent, "base64"),
    extension: config.format === "wav" ? "wav" : "mp3",
    contentType: config.format === "wav" ? "audio/wav" : "audio/mpeg",
    estimatedCost: estimateCost("google", config.model, config.script.length),
    providerRequest: { endpoint: "Google text:synthesize", body },
  };
}

function hmac(key: Buffer | string, value: string): Buffer {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

async function getGoogleAccessToken(): Promise<string> {
  const credentialsPath = path.join(os.homedir(), ".config", "google-cloud", "google-tts-bobby.json");
  const credentialsJson = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentialsJson.client_email,
    sub: credentialsJson.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: credentialsJson.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64").replace(/[=+\/]/g, (c) => ({ "=": "", "+": "-", "/": "_" }[c] || c));
  const body = Buffer.from(JSON.stringify(payload)).toString("base64").replace(/[=+\/]/g, (c) => ({ "=": "", "+": "-", "/": "_" }[c] || c));
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${body}`)
    .sign(credentialsJson.private_key, "base64")
    .replace(/[+\/]/g, (c) => ({ "+": "-", "/": "_" }[c] || c));

  const jwt = `${header}.${body}.${signature}`;

  const tokenResponse = await fetch(credentialsJson.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Google OAuth failed: ${tokenResponse.status} ${error}`);
  }

  const { access_token } = await tokenResponse.json();
  return access_token;
}

async function synthesizeAwsPolly(config: VoiceConfig, instructions: string): Promise<TTSResult> {
  const region = process.env.AWS_REGION || "us-east-1";
  const client = new PollyClient({ region });
  const outputFormat = config.format === "wav" ? "pcm" : "mp3";
  const textType = instructions ? "ssml" : "text";
  const command = new SynthesizeSpeechCommand({
    Engine: config.model as "standard" | "neural" | "long-form",
    OutputFormat: outputFormat as "json" | "mp3" | "ogg_vorbis" | "pcm",
    Text: instructions ? buildAwsSsml(config, instructions) : config.script,
    TextType: textType as "text" | "ssml",
    VoiceId: config.voice,
    ...(outputFormat === "pcm" ? { SampleRate: String(config.sample_rate || 16000) } : {}),
  });
  const response = await client.send(command);
  const buffer = Buffer.from(await response.AudioStream!.transformToByteArray());
  return {
    buffer,
    extension: outputFormat === "pcm" ? "pcm" : "mp3",
    contentType: outputFormat === "pcm" ? "audio/L16" : "audio/mpeg",
    estimatedCost: estimateCost("aws_polly", config.model, config.script.length),
    providerRequest: {
      Engine: config.model,
      OutputFormat: outputFormat,
      TextType: textType,
      VoiceId: config.voice,
    },
  };
}

function buildAwsSsml(config: VoiceConfig, instructions: string): string {
  const speed = Math.round(numericSpeed(config.speed) * 100);
  return `<speak><prosody rate="${speed}%">${instructions ? `${escapeXml(instructions)}<break time="400ms"/>` : ""}${escapeXml(config.script)}</prosody></speak>`;
}

export async function synthesizeTTS(config: VoiceConfig): Promise<TTSResult> {
  const provider = config.provider || "openai";
  const options = parseProviderOptions(config.provider_options);
  const instructions = buildVoiceInstructions(config);

  switch (provider) {
    case "openai":
      return synthesizeOpenAI(config, instructions);
    case "elevenlabs":
      return synthesizeElevenLabs(config, instructions, options);
    case "deepgram":
      return synthesizeDeepgram(config);
    case "cartesia":
      return synthesizeCartesia(config, instructions, options);
    case "inworld":
      return synthesizeInworld(config);
    case "lmnt":
      return synthesizeLmnt(config, options);
    case "azure":
      return synthesizeAzure(config, instructions);
    case "google":
      return synthesizeGoogle(config, instructions);
    case "aws_polly":
      return synthesizeAwsPolly(config, instructions);
    default:
      throw new Error(`Unsupported TTS provider: ${provider}`);
  }
}

export interface VoiceListResult {
  provider: TTSProviderId;
  voices: ProviderVoice[];
  source: "api" | "static";
  message?: string;
  raw?: unknown;
}

function fallbackVoices(provider: TTSProviderId, message: string): VoiceListResult {
  return {
    provider,
    voices: PROVIDER_BY_ID[provider]?.voices || [],
    source: "static",
    message,
  };
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function voiceLabel(name: string, id: string, extra?: string): string {
  const base = name && name !== id ? `${name} · ${id}` : id;
  return extra ? `${base} · ${extra}` : base;
}

async function readJsonResponse(response: Response, providerName: string): Promise<unknown> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${providerName} voice fetch failed: ${response.status} ${response.statusText}${text ? ` — ${text.slice(0, 700)}` : ""}`);
  }
  return response.json();
}

function normalizeElevenLabsVoices(json: unknown): ProviderVoice[] {
  const data = json as { voices?: Array<Record<string, unknown>> };
  return (data.voices || [])
    .map((voice) => {
      const id = asString(voice.voice_id || voice.id);
      const name = asString(voice.name, id);
      const category = asString(voice.category);
      return id ? { id, label: voiceLabel(name, id, category) } : null;
    })
    .filter(Boolean) as ProviderVoice[];
}

function normalizeCartesiaVoices(json: unknown): ProviderVoice[] {
  const maybe = json as { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
  const rows = Array.isArray(maybe) ? maybe : maybe.data || [];
  return rows
    .map((voice) => {
      const id = asString(voice.id || voice.voice_id);
      const name = asString(voice.name, id);
      const language = asString(voice.language || voice.locale);
      return id ? { id, label: voiceLabel(name, id, language) } : null;
    })
    .filter(Boolean) as ProviderVoice[];
}

function normalizeLmntVoices(json: unknown): ProviderVoice[] {
  const maybe = json as { voices?: Array<Record<string, unknown>>; data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
  const rows = Array.isArray(maybe) ? maybe : maybe.voices || maybe.data || [];
  return rows
    .map((voice) => {
      const id = asString(voice.id || voice.voice || voice.voice_id);
      const name = asString(voice.name, id);
      const gender = asString(voice.gender);
      return id ? { id, label: voiceLabel(name, id, gender) } : null;
    })
    .filter(Boolean) as ProviderVoice[];
}

function normalizeAzureVoices(json: unknown): ProviderVoice[] {
  const rows = Array.isArray(json) ? json as Array<Record<string, unknown>> : [];
  return rows
    .map((voice) => {
      const id = asString(voice.ShortName || voice.Name);
      const localName = asString(voice.LocalName || voice.DisplayName, id);
      const locale = asString(voice.Locale);
      const gender = asString(voice.Gender);
      const extra = [locale, gender].filter(Boolean).join(" · ");
      return id ? { id, label: voiceLabel(localName, id, extra) } : null;
    })
    .filter(Boolean) as ProviderVoice[];
}

function normalizeGoogleVoices(json: unknown): ProviderVoice[] {
  const data = json as { voices?: Array<Record<string, unknown>> };
  return (data.voices || [])
    .map((voice) => {
      const id = asString(voice.name);
      const languages = Array.isArray(voice.languageCodes) ? voice.languageCodes.join(",") : "";
      const gender = asString(voice.ssmlGender);
      const extra = [languages, gender].filter(Boolean).join(" · ");
      return id ? { id, label: voiceLabel(id, id, extra) } : null;
    })
    .filter(Boolean) as ProviderVoice[];
}

function normalizeAwsPollyVoices(json: unknown): ProviderVoice[] {
  const data = json as { Voices?: Array<Record<string, unknown>> };
  return (data.Voices || [])
    .map((voice) => {
      const id = asString(voice.Id || voice.Name);
      const name = asString(voice.Name, id);
      const language = asString(voice.LanguageName || voice.LanguageCode);
      const gender = asString(voice.Gender);
      const extra = [language, gender].filter(Boolean).join(" · ");
      return id ? { id, label: voiceLabel(name, id, extra) } : null;
    })
    .filter(Boolean) as ProviderVoice[];
}

function normalizeInworldVoices(json: unknown): ProviderVoice[] {
  const maybe = json as { voices?: Array<Record<string, unknown>>; data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
  const rows = Array.isArray(maybe) ? maybe : maybe.voices || maybe.data || [];
  return rows
    .map((voice) => {
      const id = asString(voice.voiceId || voice.voice_id || voice.id || voice.name);
      const name = asString(voice.displayName || voice.name, id);
      const language = asString(voice.language || voice.languageCode);
      return id ? { id, label: voiceLabel(name, id, language) } : null;
    })
    .filter(Boolean) as ProviderVoice[];
}

async function listElevenLabsVoices(): Promise<VoiceListResult> {
  const apiKey = needEnv("ELEVENLABS_API_KEY");
  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });
  const json = await readJsonResponse(response, "ElevenLabs");
  const voices = normalizeElevenLabsVoices(json);
  return { provider: "elevenlabs", voices, source: "api", raw: json };
}

async function listCartesiaVoices(options: Record<string, unknown>): Promise<VoiceListResult> {
  const apiKey = needEnv("CARTESIA_API_KEY");
  const response = await fetch("https://api.cartesia.ai/voices?limit=100", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Cartesia-Version": String(options.cartesia_version || "2025-04-16"),
    },
  });
  const json = await readJsonResponse(response, "Cartesia");
  const voices = normalizeCartesiaVoices(json);
  return { provider: "cartesia", voices, source: "api", raw: json };
}

async function listLmntVoices(options: Record<string, unknown>): Promise<VoiceListResult> {
  const apiKey = needEnv("LMNT_API_KEY");
  const response = await fetch("https://api.lmnt.com/v1/voices/list", {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      "lmnt-version": String(options.lmnt_version || "1.1"),
    },
  });
  const json = await readJsonResponse(response, "LMNT");
  const voices = normalizeLmntVoices(json);
  return { provider: "lmnt", voices, source: "api", raw: json };
}

async function listAzureVoices(): Promise<VoiceListResult> {
  const key = needEnv("AZURE_SPEECH_KEY");
  const region = needEnv("AZURE_SPEECH_REGION");
  const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
    headers: { "Ocp-Apim-Subscription-Key": key },
  });
  const json = await readJsonResponse(response, "Azure Speech");
  const voices = normalizeAzureVoices(json);
  return { provider: "azure", voices, source: "api", raw: json };
}

async function listGoogleVoices(options: Record<string, unknown>): Promise<VoiceListResult> {
  const accessToken = await getGoogleAccessToken();
  const url = new URL("https://texttospeech.googleapis.com/v1/voices");
  if (typeof options.language_code === "string") url.searchParams.set("languageCode", options.language_code);
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const json = await readJsonResponse(response, "Google Cloud TTS");
  const voices = normalizeGoogleVoices(json);
  return { provider: "google", voices, source: "api", raw: json };
}

async function listAwsPollyVoices(model: string): Promise<VoiceListResult> {
  const region = process.env.AWS_REGION || "us-east-1";
  const client = new PollyClient({ region });
  const command = new DescribeVoicesCommand({
    Engine: model ? (model as "standard" | "neural" | "long-form") : undefined,
    IncludeAdditionalLanguageCodes: true,
  });
  const response = await client.send(command);
  const voices = normalizeAwsPollyVoices({ Voices: response.Voices || [] });
  return { provider: "aws_polly", voices, source: "api", raw: response };
}

async function listInworldVoices(options: Record<string, unknown>): Promise<VoiceListResult> {
  const apiKey = needEnv("INWORLD_API_KEY");
  const filter = String(options.filter || "language=en");
  const url = new URL("https://api.inworld.ai/tts/v1/voices");
  url.searchParams.set("filter", filter);
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${apiKey}` },
  });
  const json = await readJsonResponse(response, "Inworld");
  const voices = normalizeInworldVoices(json);
  return {
    provider: "inworld",
    voices,
    source: "api",
    message: "Inworld's tts/v1 voices endpoint is deprecated by Inworld; keep an eye on their newer Voices API.",
    raw: json,
  };
}

export async function listProviderVoices(provider: TTSProviderId, model = "", providerOptions = "{}"): Promise<VoiceListResult> {
  const options = parseProviderOptions(providerOptions);
  switch (provider) {
    case "openai":
      return fallbackVoices(provider, "OpenAI does not currently expose a dedicated public TTS voice-list endpoint; using the built-in voice catalog.");
    case "deepgram":
      return fallbackVoices(provider, "Deepgram Aura voices are selected as model IDs; using the seeded Aura model list.");
    case "elevenlabs":
      return listElevenLabsVoices();
    case "cartesia":
      return listCartesiaVoices(options);
    case "inworld":
      return listInworldVoices(options);
    case "lmnt":
      return listLmntVoices(options);
    case "azure":
      return listAzureVoices();
    case "google":
      return listGoogleVoices(options);
    case "aws_polly":
      return listAwsPollyVoices(model || "neural");
    default:
      return fallbackVoices(provider, `Unsupported provider: ${provider}`);
  }
}
