import { NextRequest, NextResponse } from "next/server";
import { getDb, TtsConfig } from "@/lib/db";
import { DEFAULT_CONFIG } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const config = db.prepare("SELECT * FROM configurations WHERE id = ?").get(id) as TtsConfig | undefined;
    if (!config) return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    return NextResponse.json(config);
  } catch (error: unknown) {
    console.error("Error fetching config:", error);
    return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const config = { ...DEFAULT_CONFIG, ...body };
    const db = getDb();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE configurations SET
        name = ?, provider = ?, model = ?, voice = ?, script = ?, voice_affect = ?,
        tone = ?, pacing = ?, emphasis = ?, pauses = ?, avoid = ?, quick_mutations = ?,
        speed = ?, format = ?, sample_rate = ?, provider_options = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
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
      id
    );

    const saved = db.prepare("SELECT * FROM configurations WHERE id = ?").get(id) as TtsConfig;
    return NextResponse.json(saved);
  } catch (error: unknown) {
    console.error("Error updating config:", error);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    db.prepare("DELETE FROM configurations WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting config:", error);
    return NextResponse.json({ error: "Failed to delete configuration" }, { status: 500 });
  }
}
