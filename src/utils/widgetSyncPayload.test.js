import { describe, expect, it } from "vitest";
import { buildWidgetSyncPayload } from "./widgetSyncPayload";

describe("buildWidgetSyncPayload", () => {
  it("keeps only the minimal favorite fields the widget server reads", () => {
    const { favorites } = buildWidgetSyncPayload(
      [
        {
          id: 1,
          mediaType: "tv",
          title: "Severance",
          overview: "x".repeat(1000),
          genres: [{ id: 1, name: "Drama" }],
          poster_path: "/p.jpg",
          backdrop_path: "/b.jpg",
          popularity: 99,
          vote_average: 8.5,
        },
      ],
      [],
    );

    expect(favorites).toEqual([
      { id: 1, mediaType: "tv", title: "Severance" },
    ]);
  });

  it("resolves mediaType from first_air_date and falls back to name for title", () => {
    const { favorites } = buildWidgetSyncPayload(
      [{ id: 7, name: "Show Only Name", first_air_date: "2020-01-01" }],
      [],
    );

    expect(favorites[0]).toEqual({
      id: 7,
      mediaType: "tv",
      title: "Show Only Name",
    });
  });

  it("keeps season progress, number_of_episodes and completed for shows but drops metadata", () => {
    const { watched } = buildWidgetSyncPayload(
      [],
      [
        {
          id: 10,
          mediaType: "tv",
          title: "Dark",
          completed: false,
          number_of_episodes: 26,
          number_of_seasons: 3,
          overview: "y".repeat(2000),
          tmdbSeasons: [{ season_number: 1, episodes: [] }],
          seasons: {
            1: { watchedEpisodes: [1, 2, 3], extra: "junk" },
            2: { watchedEpisodes: [] },
          },
        },
      ],
    );

    expect(watched).toEqual([
      {
        id: 10,
        mediaType: "tv",
        title: "Dark",
        completed: false,
        number_of_episodes: 26,
        seasons: {
          1: { watchedEpisodes: [1, 2, 3] },
          2: { watchedEpisodes: [] },
        },
      },
    ]);
    expect(watched[0]).not.toHaveProperty("tmdbSeasons");
    expect(watched[0]).not.toHaveProperty("number_of_seasons");
  });

  it("reduces watched movies to a tiny base entry (no seasons)", () => {
    const { watched } = buildWidgetSyncPayload(
      [],
      [{ id: 20, mediaType: "movie", title: "Dune", release_date: "2021-10-22" }],
    );

    expect(watched).toEqual([{ id: 20, mediaType: "movie", title: "Dune" }]);
  });

  it("defends against malformed seasons and missing episode counts", () => {
    const { watched } = buildWidgetSyncPayload(
      [],
      [
        {
          id: 30,
          mediaType: "tv",
          title: "Legacy Entry",
          seasons: [], // array instead of progress object
        },
      ],
    );

    expect(watched[0].seasons).toEqual({});
    expect(watched[0]).not.toHaveProperty("number_of_episodes");
  });

  it("filters out items without an id and tolerates non-array input", () => {
    const payload = buildWidgetSyncPayload(
      [{ title: "No id" }, null, { id: 0, title: "Zero id kept" }],
      undefined,
    );

    expect(payload.favorites).toEqual([
      { id: 0, mediaType: "movie", title: "Zero id kept" },
    ]);
    expect(payload.watched).toEqual([]);
  });
});
