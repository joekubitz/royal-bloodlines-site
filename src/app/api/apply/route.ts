export async function POST(req: Request) {
  try {
    const body = await req.json();

    const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!scriptUrl) {
      return Response.json({ error: "Missing GOOGLE_APPS_SCRIPT_URL" }, { status: 500 });
    }

    const resp = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch {}

    if (!resp.ok) {
      return Response.json({ error: "Apps Script error", details: text }, { status: 500 });
    }

    return Response.json({ ok: true, status: json.status || "OK" });
  } catch (e: any) {
    return Response.json({ error: "Server error", details: String(e?.message || e) }, { status: 500 });
  }
}
