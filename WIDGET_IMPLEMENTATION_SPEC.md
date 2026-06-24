# Widget Implementation Spec (Android + iOS)

Detta dokument beskriver en robust, plattformsoberoende datamodell och native implementation for widgets.
Målet är att widgetar for Android och iOS ska visa samma upcoming-data med hog stabilitet.

## 1. Scope

MVP (v1):

- Read-only upcoming widget.
- 1 huvudrad + upp till 5 extra rader beroende pa widgetstorlek.
- Klick pa rad oppnar appen till ratt vy via deep link.
- Fallback till senast cachad data vid natverksfel.

Fas 2:

- Interaktivitet (mark as watched, quick actions).
- Flera widgetvarianter (Upcoming, Continue Watching).

## 2. Why Native Widgets

- Web/PWA kan inte leverera samma hemskarm-widgetfunktioner pa iOS/Android.
- Native ger battre refresh-kontroll, prestanda och stabilitet.
- Gemensam backend payload minimerar dubbel logik.

## 3. Existing App Inputs (Current Repo)

Nuvarande upcoming-logik i appen:

- watched + favorites samlas i frontend.
- TV-detaljer hamtas fran TMDb (`/tv/{id}`).
- `next_episode_to_air` blir upcoming-rad.

Referenser:

- [src/components/UpcomingPage.jsx](src/components/UpcomingPage.jsx)
- [src/components/overview/UpcomingSection.jsx](src/components/overview/UpcomingSection.jsx)
- [src/utils/watchedStorage.js](src/utils/watchedStorage.js)
- [src/config.js](src/config.js)

## 4. Recommended Architecture

- Frontend fortsatter som idag.
- Ny backend endpoint: `GET /api/widget/upcoming`.
- Endpoint aggregerar watched/favorites + TMDb details + sortering.
- Android/iOS-widget renderar bara payloaden.

Datakalla-prioritet i widgetklient:

1. Farsk API payload.
2. Lokal cache (stale but useful).
3. Empty/error state.

## 5. API Contract (v1)

Endpoint:

- `GET /api/widget/upcoming?limit=6&locale=sv-SE&tz=Europe/Stockholm`

Headers:

- `Authorization: Bearer <widget_token_or_user_token>`
- `If-None-Match: <etag>` (optional)

Success 200:

```json
{
  "version": "1",
  "generatedAt": "2026-06-24T18:30:00.000Z",
  "ttlSeconds": 1800,
  "widgetState": "ok",
  "items": [
    {
      "id": "tv:1399",
      "tmdbId": 1399,
      "mediaType": "tv",
      "title": "House of the Dragon",
      "season": 3,
      "episode": 2,
      "airDate": "2026-06-29",
      "daysUntil": 5,
      "isToday": false,
      "isTomorrow": false,
      "network": "HBO",
      "posterUrl": "https://image.tmdb.org/t/p/w342/abc.jpg",
      "deepLink": "mobiletvtracker://show/1399?season=3&episode=2",
      "priority": 10
    }
  ],
  "meta": {
    "source": "tmdb+profile",
    "stale": false
  }
}
```

No content state 200:

```json
{
  "version": "1",
  "generatedAt": "2026-06-24T18:30:00.000Z",
  "ttlSeconds": 3600,
  "widgetState": "empty",
  "items": []
}
```

Recoverable error 200 (use with cached rendering):

```json
{
  "version": "1",
  "generatedAt": "2026-06-24T18:30:00.000Z",
  "ttlSeconds": 900,
  "widgetState": "error",
  "items": []
}
```

Transport errors:

- `401` unauthorized.
- `429` rate limited.
- `5xx` upstream/server issue.

## 6. Sorting and Business Rules

Urval:

- Endast TV-objekt med `next_episode_to_air.air_date`.
- Kandidater = union av favorites + watched shows som ej ar completed.

Sortering:

1. Tidigast `airDate` forst.
2. Vid samma dag: hogre `priority` forst.
3. Sedan alfabetiskt pa titel.

Priority forslag:

- +10 om show finns i favorites.
- +5 om show ar in-progress i watched.
- +3 om avsnitt kommer inom 3 dagar.

## 7. Backend Changes (This Project)

Placering:

- Bygg endpoint i [server/index.js](server/index.js).

Nya server-funktioner:

- `buildUpcomingCandidates(favorites, watched)`
- `fetchTvDetailsBatch(ids)` med tidsbegransad in-memory cache
- `toWidgetItem(details)`
- `buildWidgetResponse(items, state)`

Sakerhet:

- Ateranvand befintligt rate limit-monster.
- Krav pa server-token i header (likt AI-endpoint), men separat token rekomenderas:
  - `WIDGET_SERVER_TOKEN`

Miljovariabler:

- `WIDGET_RATE_LIMIT_WINDOW_MS=60000`
- `WIDGET_RATE_LIMIT_MAX=60`
- `WIDGET_SERVER_TOKEN=`
- `WIDGET_DEFAULT_LIMIT=6`

## 8. Android Implementation Plan

Teknik:

- App Widget + Glance (rekommenderat) eller RemoteViews.
- WorkManager for periodic refresh.

Flode:

1. Worker hamtar payload fran endpoint.
2. Payload skrivs till lokal cache (SharedPreferences/DataStore).
3. Widget renderar cache direkt.
4. Vid klick: deep link till app route.

Refresh-policy:

- Periodisk: var 30-60 min.
- Event-driven: trigga refresh vid app open + nar watched/favorites andras.
- Retry: exponential backoff vid 5xx/natverksfel.

UI states:

- Loading skeleton (kort).
- Data list.
- Empty state.
- Error state med senaste cache + diskret feltext.

Praktisk start i detta repo:

- Se Android-klientmodulen i `native/android/widget-client/`.
- Innehaller parser, API-klient och cache-policy for endpointen.

## 9. iOS Implementation Plan

Teknik:

- WidgetKit + TimelineProvider.

Flode:

1. Provider hamtar payload (eller app group cache).
2. Entry skapas med datum och items.
3. Timeline schedule enligt `ttlSeconds`.
4. Klick leder till deep link i appen.

Refresh-policy:

- Respektera systemets budget.
- Satt nasta refresh enligt payload TTL (minst 30 min i normalfall).
- Vid fel: kortare retry-fonster men begransad frekvens.

Delad data:

- App Group container for cache mellan app och widget.

## 10. Caching Strategy

Server cache:

- TMDb details cache per show-id i 6h (som frontend redan anvander som riktlinje).
- Guard mot stampede med enkel in-flight map.

Client cache:

- Spara senaste lyckade payload + timestamp + etag.
- Visa stale payload upp till 24h innan hard-empty.

## 11. Deep Link Contract

Foreslag:

- `mobiletvtracker://overview/upcoming`
- `mobiletvtracker://show/{tmdbId}?season={s}&episode={e}`

Krav:

- Bade Android intent-filter och iOS URL scheme/universal link.
- Fallback till overview om show inte kan laddas.

## 12. Observability

Logga minst:

- fetch duration
- payload bytes
- cache hit/miss
- stale age
- response state (ok/empty/error)

Mata for MVP:

- widget refresh success rate
- median fetch latency
- crash-free sessions (widget extension)

## 13. Testing Checklist

Backend:

- Union favorites+watched de-dupas korrekt.
- Completed shows filtreras bort.
- Sortering stammer for samma datum.
- Empty-state returneras stabilt.
- Rate-limit och auth testas.

Android:

- Render med data, empty, error.
- Klick pa rad oppnar ratt screen.
- Cache visas offline.
- Refresh fungerar efter watched/favorites-andring.

iOS:

- Small + Medium layouts.
- Timeline update pa TTL.
- Deep link fungerar i cold start + warm start.
- Cache fallback vid timeout/fel.

## 14. Rollout Plan

Sprint 1:

- Backend endpoint + kontrakt + tester.
- Android widget MVP.

Sprint 2:

- iOS widget MVP.
- Gemensam metrics/logging.

Sprint 3:

- Interaktivitet och polish.
- Gradvis rollout via feature flag.

## 15. Risks and Mitigations

Risk:

- TMDb latency/rate-limits.
  Mitigation:
- server-side cache + batchning + fallback payload.

Risk:

- Inkonsekvent data mellan app och widget.
  Mitigation:
- en enda server payload som source of truth.

Risk:

- Over-refresh som bryter plattformsregler.
  Mitigation:
- TTL-styrd schedule + backoff.

## 16. Ready-to-Start Task List

1. Skapa `GET /api/widget/upcoming` i servern med auth + rate-limit.
2. Flytta upcoming-berakning till serverfunktioner som kan testas isolerat.
3. Definiera deep link mapping for show + overview.
4. Bygg Android widget MVP med cache och 3 UI states.
5. Bygg iOS WidgetKit MVP med samma payload parser.
6. Lagg till logging och enkel metrics export.
7. Verifiera med testchecklistan ovan.
