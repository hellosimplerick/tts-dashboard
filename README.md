# Multi-Provider TTS Lab

A self-hosted Next.js dashboard for testing and comparing cloud Text-to-Speech APIs from one local UI.

It started as an OpenAI TTS dashboard and now has a provider abstraction so you can compare OpenAI, ElevenLabs, Deepgram, Cartesia, Inworld, LMNT, Azure AI Speech, Google Cloud Text-to-Speech, and Amazon Polly without turning the app into a pile of vendor-specific spaghetti.

---

## What it does

- **A/B comparison panels** — compare two providers, voices, models, prompts, or scripts side-by-side.
- **Provider dropdown** — OpenAI, ElevenLabs, Deepgram, Cartesia, Inworld, LMNT, Azure, Google, AWS Polly.
- **Model + voice dropdowns** — seeded with practical defaults and examples.
- **Fetch provider voices** — pulls live account/region voices where the vendor API exposes a usable list endpoint, with fallbacks for providers that do not.
- **Voice instruction builder** — affect, tone, pacing, emphasis, pauses, avoid, and quick mutations.
- **Provider Options JSON** — provider-specific overrides without changing the UI every time a vendor moves the cheese.
- **Save configurations** — local SQLite config store.
- **Save generated runs** — save audio metadata, notes, prompt, provider, model, and voice to local history.
- **Export JSON** — portable config with derived `fetch()` and `curl` snippets.
- **Copy code** — copy a ready-to-use local API call for the selected panel.
- **Local audio output** — generated files are saved under `public/audio/`.

---

## Architecture

The important pieces:

```text
src/components/VoicePanel.tsx        UI for each A/B panel
src/lib/types.ts                     provider/model/voice catalog + config types
src/lib/tts/providers.ts             provider abstraction and API adapters
src/lib/db.ts                        SQLite schema and migrations
src/app/api/tts/route.ts             synthesize endpoint
src/app/api/voices/route.ts          live provider voice-list endpoint
src/app/api/configs/*                saved config API
src/app/api/runs/route.ts            saved generation-run API
src/app/api/export/route.ts          portable export API
```

The core expansion point is:

```ts
// src/lib/tts/providers.ts
export async function synthesizeTTS(config: VoiceConfig): Promise<TTSResult>
```

Add or change vendors there. Add provider metadata in:

```ts
// src/lib/types.ts
export const PROVIDERS = [...]
```

---

## Requirements

- Node.js 20+ recommended.
- npm 9+.
- A C++ build toolchain for `better-sqlite3`.

Native SQLite note:

- macOS: `xcode-select --install`
- Ubuntu/Debian: `sudo apt install build-essential python3`
- Windows: Visual Studio Build Tools with “Desktop development with C++”

---

## Install

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## API keys and docs

Fill in only the providers you want to test.

| Provider | Env vars | Where to get keys / docs |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | API keys: https://platform.openai.com/api-keys · TTS docs: https://developers.openai.com/api/docs/guides/text-to-speech |
| ElevenLabs | `ELEVENLABS_API_KEY` | API keys/settings: https://elevenlabs.io/app/settings/api-keys · TTS API: https://elevenlabs.io/docs/api-reference/text-to-speech/convert |
| Deepgram | `DEEPGRAM_API_KEY` | Console keys: https://console.deepgram.com/project/_/keys · TTS docs: https://developers.deepgram.com/docs/text-to-speech |
| Cartesia | `CARTESIA_API_KEY` | Keys: https://play.cartesia.ai/keys · Docs: https://docs.cartesia.ai/get-started/overview |
| Inworld | `INWORLD_API_KEY` | Portal: https://studio.inworld.ai/ · TTS quickstart: https://docs.inworld.ai/quickstart-tts |
| LMNT | `LMNT_API_KEY` | Account: https://app.lmnt.com/account · Website/API: https://www.lmnt.com/ |
| Azure AI Speech | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Azure portal: https://portal.azure.com/ · REST docs: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech |
| Google Cloud TTS | Service account JSON file | Credentials: https://console.cloud.google.com/apis/credentials · Docs: https://cloud.google.com/text-to-speech/docs/apis |
| Amazon Polly | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | AWS console/IAM: https://console.aws.amazon.com/iam/ · Polly docs: https://docs.aws.amazon.com/polly/ |

Your `.env.local` should look like this:

```env
OPENAI_API_KEY=sk-proj-...
ELEVENLABS_API_KEY=
DEEPGRAM_API_KEY=
CARTESIA_API_KEY=
INWORLD_API_KEY=
LMNT_API_KEY=
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
GOOGLE_TTS_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
```

Do **not** commit `.env.local`.

---

## Fetching provider voices

Each panel has a **Fetch voices** button beside the Voice dropdown. It calls:

```text
POST /api/voices
```

Request body:

```json
{
  "provider": "elevenlabs",
  "model": "eleven_flash_v2_5",
  "provider_options": "{}"
}
```

Response shape:

```json
{
  "provider": "elevenlabs",
  "voices": [
    { "id": "voice-id", "label": "Voice Name · voice-id" }
  ],
  "source": "api",
  "message": null,
  "count": 1
}
```

Voice fetching behavior by provider:

| Provider | Fetch behavior | Notes |
|---|---|---|
| OpenAI | Static fallback | OpenAI documents built-in TTS voices but does not expose a separate public voice-list endpoint. |
| ElevenLabs | Live API | Uses `GET /v1/voices`. |
| Deepgram Aura | Static fallback | Aura voices are model IDs, so the Model dropdown is the important selector. |
| Cartesia | Live API | Uses `GET /voices` with `Authorization: Bearer` and `Cartesia-Version`. |
| Inworld | Live API, legacy endpoint | Uses `GET /tts/v1/voices`; Inworld marks this endpoint deprecated, so expect future adjustment. |
| LMNT | Live API | Uses `GET /v1/ai/voices` with `X-API-Key` and `lmnt-version`. |
| Azure AI Speech | Live API | Uses region-specific `/cognitiveservices/voices/list`. |
| Google Cloud TTS | Live API | Uses `GET /v1/voices`. Add `{ "language_code": "en-US" }` in Provider Options to filter. |
| Amazon Polly | Live API | Uses signed `GET /v1/voices`, filtered by selected Polly engine. |

If a live fetch fails, the dashboard shows the provider error and keeps the seeded fallback voice list. That way you are not dead in the water just because one vendor is being a vendor.

## Provider Options JSON examples

Use `{}` when you do not need overrides.

### ElevenLabs custom voice

```json
{
  "voice_id": "your-elevenlabs-voice-id",
  "output_format": "mp3_44100_128",
  "voice_settings": {
    "stability": 0.45,
    "similarity_boost": 0.8,
    "style": 0.15,
    "use_speaker_boost": true
  }
}
```

### Cartesia custom voice

```json
{
  "voice_id": "your-cartesia-voice-id",
  "language": "en",
  "cartesia_version": "2025-04-16"
}
```

### LMNT custom voice

```json
{
  "voice_id": "your-lmnt-voice-id",
  "lmnt_version": "1.1"
}
```

### Google voice-list filtering

```json
{
  "language_code": "en-US"
}
```

### Inworld voice-list filtering

```json
{
  "filter": "language=en"
}
```

---

## Important implementation notes

### OpenAI

OpenAI uses the official SDK already present in the project. The dashboard supports `gpt-4o-mini-tts`, `tts-1`, and `tts-1-hd`.

### ElevenLabs

The adapter calls:

```text
POST https://api.elevenlabs.io/v1/text-to-speech/:voice_id
```

ElevenLabs voices are account-specific. The included IDs are examples. Paste your own `voice_id` in Provider Options when needed.

### Deepgram

Deepgram’s Aura voice is selected through the `model` query parameter, for example:

```text
aura-2-thalia-en
```

The Voice dropdown is intentionally boring for Deepgram because the selected model is the voice.

### Cartesia

The adapter uses the byte endpoint:

```text
POST https://api.cartesia.ai/tts/bytes
```

Cartesia version headers can change. If Cartesia rejects the version, update `cartesia_version` in Provider Options or edit `src/lib/tts/providers.ts`.

### Inworld

The adapter uses Basic auth with the Base64 API key from the Inworld portal.

### LMNT

The adapter is intentionally isolated because provider payloads can move. If LMNT changes the REST path or payload shape, edit only `synthesizeLmnt()` in `src/lib/tts/providers.ts`.

### Azure AI Speech

The adapter sends SSML to the Azure REST endpoint. Your `AZURE_SPEECH_REGION` must match the resource region.

### Google Cloud TTS

The adapter uses service-account JWT authentication. Place your service account JSON at `~/.config/google-cloud/google-tts-bobby.json`, or edit `getGoogleAccessToken()` in `src/lib/tts/providers.ts` to specify a different path.

### Amazon Polly

The adapter uses the official AWS SDK (`@aws-sdk/client-polly`). Credentials are loaded from environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`. Use a restricted IAM user/policy for Polly only.

---

## Usage workflow

1. Pick **Provider**.
2. Pick **Model**.
3. Click **Fetch voices** when you want the live account/region voice list.
4. Pick **Voice**.
5. Enter your **script**.
6. Add voice instructions if the provider/model supports or tolerates them.
7. Use **Provider Options JSON** for provider-specific fields.
8. Click **Generate**.
9. Add notes.
10. Click **Save Run** if the result is worth remembering.
11. Click **Export JSON** or **Copy Code** when you want to use the test externally.

---

## Export format

Exported JSON includes:

- the full config,
- derived voice instructions,
- a local `curl` command,
- a local JavaScript `fetch()` snippet.

This makes it easy to move a winning voice config into another app.

---

## Cost estimates

The dashboard includes rough per-generation estimates where a provider/model has a simple per-character public price. Some vendors use credits, plans, minutes, or account-specific pricing, so those display as `cost unknown` rather than making up fake precision. Very classy of us, frankly.

---

## Security notes

- Keep all provider keys server-side in `.env.local`.
- Do not expose this dashboard publicly unless you add auth.
- If you deploy it on a VPS, put it behind authentication or a VPN.
- Use restricted keys where possible, especially AWS IAM keys.
- Generated audio lands in `public/audio/`; clean that folder periodically.

---

## Known rough edges

This is a practical comparison lab, not a polished vendor marketplace.

- Some provider voice IDs are examples only until you click **Fetch voices** with that provider's API key configured.
- Cartesia, LMNT, and Inworld may require account-specific voice IDs or endpoint/version tweaks.
- Google and Azure voice names vary by region and account availability.
- AWS Polly engine/voice compatibility varies. If a selected voice does not support a selected engine, Polly will reject the request.

That is exactly why the provider abstraction exists: fix one adapter without breaking the dashboard.
