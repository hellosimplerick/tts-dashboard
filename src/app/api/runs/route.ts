import { NextRequest, NextResponse } from "next/server";
import { getDb, TtsGeneration } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM generations ORDER BY created_at DESC LIMIT 50").all() as TtsGeneration[];
    return NextResponse.json(rows);
  } catch (error: unknown) {
    console.error("Error fetching runs:", error);
    return NextResponse.json({ error: "Failed to fetch saved runs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO generations (
        id, config_name, provider, model, voice, script, voice_instructions,
        quick_mutations, speed, format, sample_rate, provider_options, audio_url,
        filename, char_count, estimated_cost, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.config_name || "",
      body.provider || "openai",
      body.model || "",
      body.voice || "",
      body.script || "",
      body.voice_instructions || "",
      JSON.stringify(body.quick_mutations || []),
      body.speed || "1.0",
      body.format || "mp3",
      body.sample_rate || "44100",
      body.provider_options || "{}",
      body.audio_url || "",
      body.filename || "",
      Number(body.char_count || 0),
      body.estimated_cost || "",
      body.notes || "",
      now
    );
    const row = db.prepare("SELECT * FROM generations WHERE id = ?").get(id) as TtsGeneration;
    return NextResponse.json(row, { status: 201 });
  } catch (error: unknown) {
    console.error("Error saving run:", error);
    return NextResponse.json({ error: "Failed to save run" }, { status: 500 });
  }
}
