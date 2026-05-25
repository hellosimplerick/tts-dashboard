import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { synthesizeTTS, buildVoiceInstructions } from "@/lib/tts/providers";
import { DEFAULT_CONFIG, VoiceConfig } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config: VoiceConfig = {
      ...DEFAULT_CONFIG,
      ...body,
      quick_mutations: Array.isArray(body.quick_mutations) ? body.quick_mutations : [],
      provider_options: body.provider_options || "{}",
    };

    if (!config.script || !config.script.trim()) {
      return NextResponse.json(
        { error: "Script/prompt text is required" },
        { status: 400 }
      );
    }

    const audioDir = path.join(process.cwd(), "public", "audio");
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

    const result = await synthesizeTTS(config);
    const filename = `tts-${config.provider}-${uuidv4()}.${result.extension}`;
    const filePath = path.join(audioDir, filename);
    fs.writeFileSync(filePath, result.buffer);

    return NextResponse.json({
      audioUrl: `/audio/${filename}`,
      filename,
      contentType: result.contentType,
      charCount: config.script.length,
      estimatedCost: result.estimatedCost,
      provider: config.provider,
      model: config.model,
      voice: config.voice,
      format: result.extension,
      providerRequest: result.providerRequest,
      voiceInstructions: buildVoiceInstructions(config),
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("TTS generation error:", error);
    const message = error instanceof Error ? error.message : "TTS generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
