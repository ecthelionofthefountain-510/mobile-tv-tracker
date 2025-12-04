// src/utils/watchedMapper.js

// Normaliserad form för allt i "watched"
export function createWatchedMovie(movie) {
  // se till att vi har en poster att jobba med
  const poster = movie.poster_path ?? movie.posterPath ?? null;

  return {
    // behåll originalfält (så du inte tappar något du använder någon annanstans)
    ...movie,

    id: movie.id,
    mediaType: "movie",
    title: movie.title || movie.name || "",
    // VIKTIGT: behåll poster_path så alla gamla komponenter funkar
    poster_path: poster,
    // valfritt: camelCase-variant om du vill använda det i framtiden
    posterPath: poster,

    dateAdded: movie.dateAdded || new Date().toISOString(),
    completed: !!movie.completed,
  };
}

export function createWatchedShow(show) {
  const poster = show.poster_path ?? show.posterPath ?? null;

  return {
    ...show,

    id: show.id,
    mediaType: "tv",
    title: show.name || show.title || "",
    poster_path: poster,
    posterPath: poster,

    dateAdded: show.dateAdded || new Date().toISOString(),
    completed: !!show.completed,

    seasons: show.seasons || undefined,
    number_of_seasons: show.number_of_seasons,
  };
}