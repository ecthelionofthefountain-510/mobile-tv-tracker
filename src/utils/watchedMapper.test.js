import { describe, expect, it } from "vitest";
import { createWatchedMovie, createWatchedShow } from "./watchedMapper";

describe("watchedMapper", () => {
  it("normalizes movies with consistent media fields", () => {
    const mapped = createWatchedMovie({
      id: 42,
      name: "Arrival",
      posterPath: "/poster.jpg",
      backdropPath: "/backdrop.jpg",
      completed: 1,
    });

    expect(mapped.id).toBe(42);
    expect(mapped.mediaType).toBe("movie");
    expect(mapped.title).toBe("Arrival");
    expect(mapped.poster_path).toBe("/poster.jpg");
    expect(mapped.backdrop_path).toBe("/backdrop.jpg");
    expect(mapped.completed).toBe(true);
    expect(typeof mapped.dateAdded).toBe("string");
  });

  it("normalizes shows and keeps season metadata", () => {
    const mapped = createWatchedShow({
      id: 7,
      name: "Dark",
      first_air_date: "2017-12-01",
      number_of_seasons: 3,
      number_of_episodes: 26,
      seasons: { 1: { watchedEpisodes: [1, 2] } },
    });

    expect(mapped.id).toBe(7);
    expect(mapped.mediaType).toBe("tv");
    expect(mapped.title).toBe("Dark");
    expect(mapped.number_of_seasons).toBe(3);
    expect(mapped.number_of_episodes).toBe(26);
    expect(mapped.seasons).toEqual({ 1: { watchedEpisodes: [1, 2] } });
  });
});
