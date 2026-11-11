type Env = {
  DB?: D1Database;
  thevault?: D1Database;
};

type PagesContext = {
  env: Env;
};

function getD1(env: Env): D1Database | undefined {
  return env.DB || env.thevault;
}

export const onRequestGet = async (context: PagesContext) => {
  const db = getD1(context.env);

  if (!db) {
    return Response.json({ ok: false, error: "D1 binding missing" }, { status: 500 });
  }

  try {
    await db.prepare("SELECT 1 as ok").first();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "D1 query failed" }, { status: 500 });
  }
};
