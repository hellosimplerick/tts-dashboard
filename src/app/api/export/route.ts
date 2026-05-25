import { NextRequest, NextResponse } from "next/server";
import { buildVoiceInstructions } from "@/lib/tts/providers";
import { DEFAULT_CONFIG, VoiceConfig } from "@/lib/types";

function snippetFor(config: VoiceConfig) {
  const voiceInstructions = buildVoiceInstructions(config);
  const configJson = JSON.stringify(config, null, 2);
  const curl = `curl -X POST http://localhost:3000/api/tts \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(config).replace(/'/g, "'\\''")}'`;
  const javascript = `const response = await fetch('/api/tts', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(${configJson})\n});\nconst result = await response.json();`;
  return { voiceInstructions, curl, javascript };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config: VoiceConfig = {
      ...DEFAULT_CONFIG,
      ...body,
      quick_mutations: Array.isArray(body.quick_mutations) ? body.quick_mutations : [],
      provider_options: body.provider_options || "{}",
    };

    const exportData = {
      exported_at: new Date().toISOString(),
      purpose: "Portable TTS test configuration for external apps",
      configuration: config,
      derived: snippetFor(config),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="tts-config-${Date.now()}.json"`,
      },
    });
  } catch (error: unknown) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export configuration" }, { status: 500 });
  }
}
