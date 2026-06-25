// TMDB genre id -> name, covering both movie and TV genre ids.
// (Overlapping ids such as 16/35/80/99/18 share the same name across both.)
export const GENRE_MAP = {
  // Movie genres
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  // TV genres
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

// Resolve up to `max` genre names from an item that may carry either
// `genres` (objects or ids) or `genre_ids` (ids).
export function genreNamesFromItem(item, max = 2) {
  if (!item) return [];
  let names = [];
  if (Array.isArray(item.genres) && item.genres.length > 0) {
    names = item.genres.map((g) =>
      typeof g === "object" ? g?.name : GENRE_MAP[g],
    );
  } else if (Array.isArray(item.genre_ids) && item.genre_ids.length > 0) {
    names = item.genre_ids.map((id) => GENRE_MAP[id]);
  }
  return names.filter(Boolean).slice(0, max);
}
