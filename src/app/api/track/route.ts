import { NextResponse } from "next/server";
import { createClient } from "../../supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { agent, linkKey, pagePath } = body;

    if (!linkKey) {
      return NextResponse.json(
        { error: "Missing linkKey" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.from("clicks").insert({
      agent: agent || null,
      link_key: linkKey,
      page_path: pagePath || null,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
