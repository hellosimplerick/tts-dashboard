import { NextRequest, NextResponse } from "next/server";
import { getDb, TtsConfig } from "@/lib/db";
import { DEFAULT_CONFIG } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const db = getDb();
    const configs = db
      .prepare("SELECT * FROM configurations ORDER BY updated_at DESC")
      .all() as TtsConfig[];
    return NextResponse.json(configs);
  } catch (error: unknown) {
    console.error("Error fetching configs:", error);
    return NextResponse.json({ error: "Failed to fetch configurations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = { ...DEFAULT_CONFIG, ...body };
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO configurations (
        id, name, provider, model, voice, script, voice_affect, tone, pacing,
        emphasis, pauses, avoid, quick_mutations, speed, format, sample_rate,
        provider_options, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      config.name || "Untitled",
      config.provider || "openai",
      config.model || "gpt-4o-mini-tts",
      config.voice || "alloy",
      config.script || "",
      config.voice_affect || "",
      config.tone || "",
      config.pacing || "",
      config.emphasis || "",
      config.pauses || "",
      config.avoid || "",
      JSON.stringify(config.quick_mutations || []),
      config.speed || "1.0",
      config.format || "mp3",
      config.sample_rate || "44100",
      config.provider_options || "{}",
      now,
      now
    );

    const saved = db.prepare("SELECT * FROM configurations WHERE id = ?").get(id) as TtsConfig;
    return NextResponse.json(saved, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating config:", error);
    return NextResponse.json({ error: "Failed to create configuration" }, { status: 500 });
  }
}
