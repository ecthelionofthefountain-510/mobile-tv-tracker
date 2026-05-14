// Genre definitions with separate IDs for movies vs TV
export const AI_GENRES = [
  { name: "Action", movieId: 28, tvId: 10759 },
  { name: "Comedy", movieId: 35, tvId: 35 },
  { name: "Crime", movieId: 80, tvId: 80 },
  { name: "Documentary", movieId: 99, tvId: 99 },
  { name: "Drama", movieId: 18, tvId: 18 },
  { name: "Fantasy", movieId: 14, tvId: 10765 },
  { name: "Horror", movieId: 27, tvId: null },
  { name: "Mystery", movieId: 9648, tvId: 9648 },
  { name: "Romance", movieId: 10749, tvId: null },
  { name: "Sci-Fi", movieId: 878, tvId: 10765 },
  { name: "Thriller", movieId: 53, tvId: null },
  { name: "Animation", movieId: 16, tvId: 16 },
  { name: "Adventure", movieId: 12, tvId: 10759 },
  { name: "Family", movieId: 10751, tvId: 10751 },
  { name: "History", movieId: 36, tvId: null },
];

const KEY = "aiPreferences";

// { genres: [{ name, movieId, tvId }], actors: [{ id, name }] }
export function loadAiPreferences() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { genres: [], actors: [] };
  } catch {
    return { genres: [], actors: [] };
  }
}

export function saveAiPreferences(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota/private mode
  }
}
