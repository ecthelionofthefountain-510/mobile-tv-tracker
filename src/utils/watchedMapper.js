// src/utils/watchedMapper.js

// Normaliserad form för allt i "watched"
export function createWatchedMovie(movie) {
  // se till att vi har en poster att jobba med
  const poster = movie.poster_path ?? movie.posterPath ?? null;
  const backdrop = movie.backdrop_path ?? movie.backdropPath ?? null;

  return {
    id: movie.id,
    mediaType: "movie",
    title: movie.title || movie.name || "",
    poster_path: poster,
    posterPath: poster,
    backdrop_path: backdrop,
    backdropPath: backdrop,

    overview: movie.overview,
    genre_ids: movie.genre_ids,
    genres: movie.genres,
    vote_average: movie.vote_average,
    popularity: movie.popularity,
    release_date: movie.release_date,

    dateAdded: movie.dateAdded || new Date().toISOString(),
    completed: !!movie.completed,
  };
}

export function createWatchedShow(show) {
  const poster = show.poster_path ?? show.posterPath ?? null;
  const backdrop = show.backdrop_path ?? show.backdropPath ?? null;

  return {
    id: show.id,
    mediaType: "tv",
    title: show.name || show.title || "",
    name: show.name,
    poster_path: poster,
    posterPath: poster,
    backdrop_path: backdrop,
    backdropPath: backdrop,

    overview: show.overview,
    genre_ids: show.genre_ids,
    genres: show.genres,
    vote_average: show.vote_average,
    popularity: show.popularity,
    first_air_date: show.first_air_date,

    dateAdded: show.dateAdded || new Date().toISOString(),
    completed: !!show.completed,

    seasons: show.seasons || undefined,
    number_of_seasons: show.number_of_seasons,
    number_of_episodes: show.number_of_episodes,
  };
}
