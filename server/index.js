import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

const PORT = Number(process.env.PORT || 5174);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
  })
);
app.use(express.json({ limit: "200kb" }));

function sameId(a, b) {
  return String(a) === String(b);
}

function computeTvProgress(show) {
  const seasons = show?.seasons;
  if (!seasons || typeof seasons !== "object" || Array.isArray(seasons)) {
    return {
      watchedEpisodes: 0,
      totalEpisodes: null,
      completed: !!show?.completed,
    };
  }

  const watchedEpisodes = Object.values(seasons).reduce(
    (sum, season) => sum + (season?.watchedEpisodes?.length || 0),
    0
  );

  const totalEpisodes =
    typeof show?.number_of_episodes === "number" && show.number_of_episodes > 0
      ? show.number_of_episodes
      : null;

  const completed =
    typeof totalEpisodes === "number"
      ? watchedEpisodes >= totalEpisodes
      : !!show?.completed;

  return { watchedEpisodes, totalEpisodes, completed };
}

function toCandidate(item) {
  const mediaType = item.mediaType || (item.first_air_date ? "tv" : "movie");
  const title = item.title || item.name || "";

  const base = {
    id: item.id,
    mediaType,
    title,
    year: item.release_date
      ? String(item.release_date).slice(0, 4)
      : item.first_air_date
      ? String(item.first_air_date).slice(0, 4)
      : null,
    genres:
      Array.isArray(item.genres) && item.genres.length > 0
        ? item.genres
            .map((g) => (typeof g === "object" ? g.name : String(g)))
            .filter(Boolean)
        : [],
    popularity: typeof item.popularity === "number" ? item.popularity : null,
    vote_average:
      typeof item.vote_average === "number" ? item.vote_average : null,
  };

  if (mediaType === "tv") {
    const { watchedEpisodes, totalEpisodes, completed } =
      computeTvProgress(item);
    return {
      ...base,
      completed,
      watchedEpisodes,
      totalEpisodes,
    };
  }

  return {
    ...base,
    completed: true,
    watchedEpisodes: null,
    totalEpisodes: null,
  };
}

function buildCandidatePool({ favorites = [], watched = [] }) {
  const fav = Array.isArray(favorites) ? favorites : [];
  const wat = Array.isArray(watched) ? watched : [];

  const watchedIds = new Set(wat.map((w) => String(w.id)));

  const favoriteCandidates = fav
    .filter((i) => i && typeof i === "object" && i.id != null)
    .map(toCandidate)
    .slice(0, 30);

  const inProgressShows = wat
    .filter(
      (i) =>
        i && typeof i === "object" && (i.mediaType === "tv" || i.first_air_date)
    )
    .map(toCandidate)
    .filter((c) => c.mediaType === "tv" && c.completed === false)
    .sort((a, b) => (b.watchedEpisodes || 0) - (a.watchedEpisodes || 0))
    .slice(0, 20);

  // Fallback pool: if nothing else, allow rewatching favorites even if watched.
  const pool = [...favoriteCandidates, ...inProgressShows];

  // De-dupe (favorites and watched can overlap)
  const seen = new Set();
  const deduped = [];
  for (const c of pool) {
    const key = `${c.mediaType}:${String(c.id)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }

  // If we have no favorites and no in-progress, allow any watched show/movie as "rewatch" candidates.
  if (deduped.length === 0) {
    const fallback = wat
      .filter((i) => i && typeof i === "object" && i.id != null)
      .map(toCandidate)
      .slice(0, 40);
    return fallback;
  }

  // Small nudge: if candidate is already watched, demote.
  return deduped.map((c) => ({
    ...c,
    isWatched: watchedIds.has(String(c.id)),
  }));
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/ai/pick", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Missing OPENAI_API_KEY on server" });
      return;
    }

    const { favorites, watched } = req.body || {};
    const candidates = buildCandidatePool({ favorites, watched });

    if (!Array.isArray(candidates) || candidates.length === 0) {
      res.json({
        picks: [],
        message: "No candidates available (add favorites or start a show).",
      });
      return;
    }

    const client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const system =
      "Du är en hjälpsam rekommendationsassistent för en TV/film-tracker. Du måste välja från kandidatlistan och svara i strikt JSON.";

    const user = {
      task: "Välj 1-3 saker att titta på ikväll. Prioritera (1) favoriter, (2) serier som är påbörjade men inte klara. Svara på svenska.",
      rules: [
        "Välj ENDAST från candidates.",
        "Returnera max 3 picks.",
        "Varje pick: id, mediaType (tv|movie), title, reason (max 1 mening).",
        "Svara i JSON utan extra text.",
      ],
      candidates,
      output_schema: {
        picks: [
          {
            id: "number|string",
            mediaType: "tv|movie",
            title: "string",
            reason: "string",
          },
        ],
      },
    };

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
      temperature: 0.7,
    });

    const text = completion.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    const picksRaw = Array.isArray(parsed?.picks) ? parsed.picks : [];

    // Validate picks are from candidate list
    const allowed = new Map(
      candidates.map((c) => [`${c.mediaType}:${String(c.id)}`, c])
    );

    const picks = [];
    for (const p of picksRaw) {
      const key = `${p?.mediaType}:${String(p?.id)}`;
      const c = allowed.get(key);
      if (!c) continue;
      picks.push({
        id: c.id,
        mediaType: c.mediaType,
        title: c.title,
        reason: typeof p.reason === "string" ? p.reason : "",
      });
      if (picks.length >= 3) break;
    }

    // Fallback if model output was unusable
    if (picks.length === 0) {
      const first = candidates.slice(0, 3).map((c) => ({
        id: c.id,
        mediaType: c.mediaType,
        title: c.title,
        reason: "Känns som ett bra val just nu.",
      }));
      res.json({ picks: first });
      return;
    }

    res.json({ picks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI pick failed" });
  }
});

app.listen(PORT, () => {
  console.log(`AI server listening on http://localhost:${PORT}`);
});
