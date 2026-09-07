# Ziel
Erstelle eine schlanke, mobile-first Web-App (Kochbuch) für GitHub Pages mit Firebase-Anbindung und PWA-Funktionalität.

# Tech-Stack
- **Frontend:** HTML5, Tailwind CSS (via CDN), Vanilla JavaScript (ES6 Modules)
- **Backend/DB:** Firebase Cloud Firestore (Sparke Plan / Free Tier)
- **Image Hosting:** ImgBB API (Kostenloser Bild-Upload via API)
- **Hosting:** GitHub Pages (statisch)

# PWA-Konfiguration
- Erstelle eine `manifest.json`-Datei im Stammverzeichnis.
- Der Name der App im Manifest soll "[Dein App-Name]" sein.
- Die App soll im "standalone"-Modus starten.
- Füge im Manifest Verweise auf ein Icon namens `icon-512x512.png` hinzu.
- Füge in der `index.html` die notwendigen `<link rel="manifest">` und `<link rel="apple-touch-icon">` Tags hinzu.

# Design & UI/UX (Mobile-First)
- **Layout & Layout-Bounds:** Modernes App-Appearence auf Mobilgeräten. Auf Desktop/Tablets soll die App zentriert mit einer maximalen Breite (`max-w-md` oder `max-w-lg`) dargestellt werden, damit das App-Feeling erhalten bleibt.
- **Farbschema & Styling:**
  - Modernes, warmes Farbschema passend zum Thema Kochen/Genuss (z. B. smarte Slate-/Zink-Töne für Hintergründe, warme Accent-Farben wie Amber/Emerald für Buttons und Highlights).
  - Nutzen von abgerundeten Ecken (`rounded-2xl` / `rounded-xl`), dezenten Schatten (`shadow-sm` bis `shadow-md`) und viel "White Space" für ein luftiges Design.
- **Navigation:**
  - Fixierte Bottom-Navigation-Bar auf Mobilgeräten (z. B. Übersicht, Suchen, Rezept hinzufügen).
  - In der Detailansicht ein sauberer Header mit einem "Zurück"-Button.
- **Karten & Komponenten:**
  - **Rezept-Karten:** Bild oben mit abgerundeten Ecken, Title in fett, dezente Badges für Zubereitungszeit und Tags. Hover/Active-Effekte für besseres haptisches Feedback.
  - **Detailansicht:** Großes Hero-Image oben, übersichtliche Zutatenliste mit Checkboxen (zum Haken beim Kochen) und gut lesbarer, strukturierter Anleitung.
  - **Formulare:** Cleane, große Input-Felder mit sichtbarem Focus-State (`focus:ring-2`), intuitive Buttons zum dynamischen Hinzufügen/Entfernen von Zutatenreihen.
- **Feedback & Loading States:**
  - Skeleton-Loader oder Lade-Spinner beim Abrufen der Firestore-Daten und beim Upload von Bildern via ImgBB API.
  - Toast-Benachrichtigungen oder kurze Bestätigungsmeldungen beim Speichern/Löschen von Rezepten.

# Datenmodell (Firestore Collection: "recipes")
- `title`: string
- `prepTimeMinutes`: number
- `totalTimeMinutes`: number
- `servings`: number
- `ingredients`: Array<{ name: string, amount: number, unit: string }>
- `instructions`: string (Freitext / Markdown)
- `imageUrl`: string (Generierte URL von ImgBB oder Fallback-URL)
- `tags`: Array<string>
- `createdAt`: timestamp

# Anwendungsfälle / Features
1. **Rezept-Übersicht:** Raster/Liste aller Rezepte mit Bild, Titel, Gesamtdauer und Tags.
2. **Suche & Filter:** Live-Suchfeld über Titel, Anleitung und Zutaten sowie Tag-Filter.
3. **Rezept-Detailansicht:** Anzeige aller Infos inklusive Bild, Portionsumrechnung und abhaktbaren Zutaten.
4. **Rezept erstellen/bearbeiten:** Formular inkl. dynamischem Hinzufügen von Zutaten und Bild-Upload über die kostenlose ImgBB API (oder manuelle Bild-URL-Eingabe als Fallback).

# Anforderung an Code
Schreibe modularen, gut strukturierten Code in einer einzigen `index.html` (oder getrennt in `index.html`, `app.js`, `firebase-config.js`). Nutze die Firebase JS SDK v10 (Modular) für Firestore. Nutze Tailwind CSS Klassen für das gesamte Styling.
