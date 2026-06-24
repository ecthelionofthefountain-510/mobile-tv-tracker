// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildExtraUpcomingItems,
  buildUpcomingCandidates,
  computePriority,
  toWidgetEpisodeItem,
  toWidgetItem,
  toWidgetPayload,
} from "./index.js";

describe("widget upcoming helpers", () => {
  it("builds de-duplicated tv candidates from favorites and in-progress watched", () => {
    const favorites = [
      { id: 100, mediaType: "tv", name: "Show A" },
      { id: 200, mediaType: "movie", title: "Movie" },
    ];
    const watched = [
      {
        id: 100,
        mediaType: "tv",
        name: "Show A",
        seasons: { 1: { watchedEpisodes: [1] } },
        number_of_episodes: 10,
      },
      {
        id: 300,
        mediaType: "tv",
        name: "Show B",
        seasons: { 1: { watchedEpisodes: [1, 2] } },
        number_of_episodes: 10,
      },
      {
        id: 400,
        mediaType: "tv",
        name: "Show C",
        seasons: { 1: { watchedEpisodes: [1] } },
        number_of_episodes: 1,
      },
    ];

    const candidates = buildUpcomingCandidates({ favorites, watched });
    const ids = candidates.map((c) => c.tmdbId).sort((a, b) => a - b);

    expect(ids).toEqual([100, 300]);

    const showA = candidates.find((c) => c.tmdbId === 100);
    expect(showA?.isFavorite).toBe(true);
    expect(showA?.isInProgress).toBe(true);
  });

  it("computes priority from favorite, progress and near-air-date", () => {
    expect(
      computePriority({
        isFavorite: true,
        isInProgress: true,
        daysUntil: 2,
      }),
    ).toBe(18);

    expect(
      computePriority({
        isFavorite: false,
        isInProgress: true,
        daysUntil: 10,
      }),
    ).toBe(5);
  });

  it("maps TMDb details to widget item", () => {
    const details = {
      id: 1399,
      name: "House of the Dragon",
      poster_path: "/abc.jpg",
      networks: [{ name: "HBO" }],
      next_episode_to_air: {
        season_number: 3,
        episode_number: 2,
        air_date: "2099-01-10",
      },
    };

    const item = toWidgetItem(details, {
      isFavorite: true,
      isInProgress: true,
      title: "House of the Dragon",
    });

    expect(item).toBeTruthy();
    expect(item?.id).toBe("tv:1399");
    expect(item?.mediaType).toBe("tv");
    expect(item?.season).toBe(3);
    expect(item?.episode).toBe(2);
    expect(item?.network).toBe("HBO");
    expect(item?.deepLink).toContain("mobiletvtracker://show/1399");
  });

  it("maps arbitrary future episodes to widget items", () => {
    const details = {
      id: 1399,
      name: "House of the Dragon",
      poster_path: "/abc.jpg",
      networks: [{ name: "HBO" }],
    };

    const item = toWidgetEpisodeItem(
      details,
      {
        isFavorite: true,
        isInProgress: true,
        title: "House of the Dragon",
      },
      {
        season_number: 3,
        episode_number: 3,
        air_date: "2099-01-17",
      },
    );

    expect(item).toBeTruthy();
    expect(item?.id).toBe("tv:1399:3:3");
    expect(item?.season).toBe(3);
    expect(item?.episode).toBe(3);
    expect(item?.network).toBe("HBO");
  });

  it("builds extra future episodes from the same season", () => {
    const details = {
      id: 1399,
      name: "House of the Dragon",
      poster_path: "/abc.jpg",
      networks: [{ name: "HBO" }],
      next_episode_to_air: {
        season_number: 3,
        episode_number: 2,
        air_date: "2099-01-10",
      },
    };

    const items = buildExtraUpcomingItems(
      details,
      {
        isFavorite: true,
        isInProgress: true,
        title: "House of the Dragon",
      },
      {
        episodes: [
          {
            season_number: 3,
            episode_number: 2,
            air_date: "2099-01-10",
          },
          {
            season_number: 3,
            episode_number: 3,
            air_date: "2099-01-17",
          },
          {
            season_number: 3,
            episode_number: 4,
            air_date: "2099-01-24",
          },
        ],
      },
      new Set(["1399:3:2"]),
    );

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.episode)).toEqual([3, 4]);
  });

  it("builds payload with metadata", () => {
    const payload = toWidgetPayload({
      items: [],
      widgetState: "empty",
      ttlSeconds: 3600,
      stale: false,
    });

    expect(payload.version).toBe("1");
    expect(payload.widgetState).toBe("empty");
    expect(payload.meta?.source).toBe("tmdb+profile");
  });
});
