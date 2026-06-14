# Supabase-setup (engångsjobb)

Den här appen använder Supabase för inloggning (e-post + lösenord) och för att
spara din data i molnet, så att samma konto fungerar i alla webbläsare och på
mobilen. Följ stegen en gång.

## 1. Skapa ett projekt

1. Gå till https://supabase.com och skapa ett konto (gratis).
2. Klicka **New project**. Välj ett namn (t.ex. `mobile-tv-tracker`) och ett
   lösenord för databasen (spara det någonstans).
3. Välj region nära dig (t.ex. `Europe (Stockholm)` eller `Frankfurt`).
4. Vänta ~1 minut tills projektet är klart.

## 2. Hämta dina nycklar

1. I projektet: **Settings → API**.
2. Kopiera **Project URL** och **anon public**-nyckeln.
3. Klistra in dem i filen `.env` i projektroten:

   ```
   VITE_SUPABASE_URL=din-project-url
   VITE_SUPABASE_ANON_KEY=din-anon-key
   ```

   > `anon`-nyckeln är säker att ha i frontend — datan skyddas av Row Level
   > Security (se steg 3), inte av att nyckeln är hemlig.

## 3. Skapa tabellerna

1. I Supabase: **SQL Editor → New query**.
2. Öppna filen `supabase/schema.sql` i det här repot, kopiera allt innehåll,
   klistra in i editorn och klicka **Run**.
3. Du ska se "Success". Detta skapar tabellerna `watched`, `favorites` och
   `profiles` och låser dem så att varje användare bara når sin egen data.

## 4. (Valfritt) Stäng av e-postbekräftelse under utveckling

Som standard kräver Supabase att man klickar en bekräftelselänk i mejlet innan
man kan logga in. Vill du slippa det medan du testar:

1. **Authentication → Sign In / Providers → Email**.
2. Stäng av **Confirm email**.

(Slå gärna på det igen när appen är skarp.)

## 5. Starta om dev-servern

Efter att du ändrat `.env` måste Vite startas om:

```
npm run dev
```

Klart! Säg till så fortsätter vi med själva inloggningen och flytten av din data.
