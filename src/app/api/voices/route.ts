import { NextRequest, NextResponse } from "next/server";
import { listProviderVoices } from "@/lib/tts/providers";
import { PROVIDER_BY_ID, TTSProviderId } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const provider = String(body.provider || "openai") as TTSProviderId;
    const model = String(body.model || "");
    const providerOptions = String(body.provider_options || "{}");

    if (!PROVIDER_BY_ID[provider]) {
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
    }

    const result = await listProviderVoices(provider, model, providerOptions);
    return NextResponse.json({
      provider,
      voices: result.voices,
      source: result.source,
      message: result.message || null,
      count: result.voices.length,
    });
  } catch (error: unknown) {
    console.error("Voice fetch error:", error);
    const message = error instanceof Error ? error.message : "Voice fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
