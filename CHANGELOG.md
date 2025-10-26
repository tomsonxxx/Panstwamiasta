# Dziennik Zmian i Dokumentacja Aplikacji "Państwa Miasta"

Ten plik służy jako oficjalny dziennik zmian (changelog) oraz jako dokumentacja techniczna opisująca aktualny stan aplikacji.

---

## Historia Zmian

### 26.07.2024
- **Poprawka:** Naprawiono błąd połączenia z serwerem WebSocket (`timeout`) poprzez poprawną konfigurację projektu do pracy z Vite. Utworzono główny plik `vite.config.ts` i zaktualizowano `package.json` o skrypty do jednoczesnego uruchamiania klienta i serwera.
- **Poprawka:** Rozwiązano problem z odtwarzaniem dźwięków w niektórych przeglądarkach (`Failed to load because no supported source was found`) przez zmianę typu MIME w danych audio z `audio/mpeg` na `audio/mp3` w `constants.ts`.
- **Refaktoryzacja:** Sfinalizowano refaktoryzację struktury projektu opisaną w poprzednim wpisie. Usunięto zbędne pliki konfiguracyjne klienta i scalono zależności w głównym `package.json`, eliminując duplikację.
- **Poprawka:** Usunięto niepotrzebny blok `importmap` z pliku `index.html`, ponieważ za zarządzanie zależnościami odpowiada teraz Vite.

### 25.07.2024
- **Refaktoryzacja:** Przeprowadzono gruntowną refaktoryzację struktury projektu. Usunięto zduplikowany katalog `/client` wraz z jego zawartością, co znacząco uprościło strukturę i usunęło potencjalne źródła błędów.
- **Aktualizacja:** Zaktualizowano skrypty w głównym pliku `package.json` oraz konfigurację serwera `server/index.js`, aby odzwierciedlały nową, spłaszczoną strukturę projektu.
- **Optymalizacja:** Wprowadzono optymalizację w komponencie `GamePlayScreen.tsx`. Logika rozpoznawania mowy została zrefaktoryzowana, aby instancja `SpeechRecognition` była tworzona tylko raz, co poprawia wydajność i stabilność tej funkcji.
- **Weryfikacja:** Dokonano ogólnego przeglądu kodu pod kątem spójności i potencjalnych problemów.

### 24.07.2024
- **Dodano:** Utworzono plik `CHANGELOG.md`.
- **Dodano:** Stworzono szczegółową dokumentację techniczną opisującą aktualny stan aplikacji.
- **Dodano:** Zaimplementowano funkcję rozpoznawania mowy na ekranie `GamePlayScreen.tsx`, pozwalającą na dyktowanie odpowiedzi. Dodano ikonę mikrofonu przy każdym polu tekstowym.
- **Poprawka:** Wprowadzono drobne poprawki typów w kilku plikach (`App.tsx`, `contexts/GameContext.tsx`, `components/PlayerAvatar.tsx`, `components/PlayerVoteModal.tsx`, `components/HelpModal.tsx`) w celu rozwiązania problemów z inferencją typów przez TypeScript, co poprawia stabilność i czytelność kodu.
- **Poprawka:** Naprawiono błąd w `constants.ts`, gdzie brakowało eksportu obiektu `SOUNDS`, co uniemożliwiało odtwarzanie dźwięków.
- **Poprawka:** Usunięto błąd w `validateAllAnswers` w `GameContext.tsx`, gdzie `JSON.parse` mogło powodować błędy typowania.
- **Poprawka:** Poprawiono typowanie w `screens/LetterDrawingScreen.tsx` w celu prawidłowego użycia enuma `PlayerActivityState`.
- **Poprawka:** Uzupełniono brakujące pole `bonusPoints` w niektórych ścieżkach zwrotnych funkcji `validateAnswerWithKB` w `localKnowledgeBaseService.ts`.
- **Poprawka:** Dodano globalną definicję typu dla `window.google` w `googleDriveService.ts`, aby uniknąć błędów TypeScript.

---

## Dokumentacja Aktualnego Stanu Aplikacji (stan na 24.07.2024)

### 1. Ogólna Architektura

Aplikacja jest zbudowana w oparciu o bibliotekę **React** z użyciem **TypeScript**. Wykorzystuje architekturę komponentową i zarządza stanem globalnym za pomocą mechanizmu Kontekstu (React Context). Nawigacja opiera się na `react-router-dom`. Aplikacja posiada również backend w Node.js z Express i Socket.IO do obsługi trybu multiplayer.

### 2. Struktura Projektu

Projekt jest monorepo z dwoma głównymi katalogami:
- `/client`: Zawiera kod frontendowy aplikacji React.
- `/server`: Zawiera kod backendowy serwera Socket.IO.

### 3. Opis Plików i Funkcji

#### `index.html`
- **Cel:** Główny plik HTML, punkt wejścia aplikacji.
- **Zawartość:**
    - Importuje czcionki z Google Fonts (`Inter`, `Permanent Marker`).
    - Importuje skrypt Google Identity Services do integracji z Dyskiem Google.
    - Definiuje zmienne CSS (`:root`) dla dwóch motywów (`classic` i `modern`), zarządzając kolorami i czcionkami.
    - Konfiguruje Tailwind CSS `on-the-fly` do używania zdefiniowanych zmiennych CSS.
    - Używa `importmap` do zarządzania zależnościami JavaScript (React, Framer Motion, @google/genai, itp.) bezpośrednio w przeglądarce, co eliminuje potrzebę tradycyjnego bundlera w środowisku deweloperskim.
    - Zawiera globalne style, w tym dla trybu pełnoekranowego oraz specyficzne style dla motywów.
    - Montuje aplikację React w elemencie `<div id="root"></div>`.

#### `index.tsx`
- **Cel:** Punkt startowy dla aplikacji React.
- **Funkcjonalność:**
    - Renderuje główny komponent `<App />`.
    - Opakowuje aplikację w niezbędne dostawców kontekstu (Providers):
        - `HashRouter`: Obsługuje routing po stronie klienta.
        - `ThemeProvider`: Zarządza motywem wizualnym (klasyczny/nowoczesny).
        - `GameProvider`: Zarządza globalnym stanem gry.

#### `App.tsx`
- **Cel:** Główny komponent aplikacji, który zarządza layoutem i routingiem.
- **Funkcjonalność:**
    - **Routing:** Używa `react-router-dom` do renderowania odpowiednich ekranów (`MainMenuScreen`, `GamePlayScreen` itp.) w zależności od ścieżki URL.
    - **Zarządzanie Motywem:** W oparciu o `ThemeContext`, dynamicznie dodaje klasę `theme-classic` lub `theme-modern` do głównego elementu `<html>`, co pozwala na globalną zmianę wyglądu.
    - **Zarządzanie Trybem Pełnoekranowym:** Posiada logikę do włączania/wyłączania trybu pełnoekranowego i dostosowywania stylów `<body>`.
    - **Nawigacja Sterowana Stanem Gry:** Kluczowy `useEffect` monitoruje `gameState.gamePhase` i automatycznie przekierowuje użytkownika do odpowiedniego ekranu (np. z lobby do ekranu gry), zapewniając spójność przepływu gry.
    - **Animacje Przejść:** Używa `framer-motion` (`AnimatePresence`) do animowania przejść między stronami.
    - **Tła Dynamiczne:** Renderuje `ClassicBackground` lub `ModernBackground` w zależności od wybranego motywu.

#### `contexts/GameContext.tsx`
- **Cel:** Serce logiki biznesowej aplikacji. Zarządza całym stanem gry.
- **Kluczowe Elementy:**
    - **`initialState`:** Definiuje początkowy, domyślny stan gry.
    - **`gameReducer`:** Reducer, który obsługuje wszystkie akcje modyfikujące stan (`GameActionType`). Jest to centralne miejsce, gdzie zmienia się stan gry w odpowiedzi na działania użytkownika lub zdarzenia z serwera. Obsługuje m.in.:
        - Inicjalizację gry, ustawianie graczy.
        - Rozpoczynanie i kończenie rund.
        - Zapisywanie odpowiedzi gracza.
        - Przetwarzanie wyników walidacji AI.
        - Obsługę logiki multiplayer (dołączanie/opuszczanie pokoju, synchronizacja stanu).
        - Zarządzanie maszyną losującą literę i odliczaniem.
        - Logikę głosowania graczy.
    - **`GameProvider`:** Komponent dostawcy, który udostępnia `gameState` i `dispatch` do całej aplikacji.
    - **Funkcje Asynchroniczne:** Zawiera logikę do interakcji z zewnętrznymi serwisami:
        - `validateAllAnswers`: Komunikuje się z `geminiService` (dla gry online) lub `localKnowledgeBaseService` (dla gry offline), aby zweryfikować odpowiedzi wszystkich graczy i wygenerować odpowiedzi dla botów.
        - `finalizeAndRecalculateScores`: Przelicza punkty po zakończeniu rundy i po głosowaniach.
    - **Funkcje Multiplayer:** Udostępnia funkcje opakowujące logikę z `multiplayerService` (np. `createRoom`, `joinRoom`, `leaveRoom`, `startGameAsHost`).
    - **Efekty (useEffect):** Zarządza połączeniem z serwerem WebSocket, nasłuchuje na zdarzenia i synchronizuje stan.

#### `contexts/ThemeContext.tsx`
- **Cel:** Prosty kontekst do zarządzania motywem aplikacji.
- **Funkcjonalność:**
    - Przechowuje aktualny motyw (`classic` lub `modern`).
    - Zapisuje wybór motywu w `localStorage`, aby był on pamiętany między sesjami.
    - Udostępnia funkcję `toggleTheme` do przełączania motywu.

#### `services/geminiService.ts`
- **Cel:** Izoluje logikę komunikacji z Google Gemini API.
- **Główne Funkcje:**
    - `initializeMainAI`: Inicjalizuje klienta API na podstawie klucza `process.env.API_KEY`.
    - `validateAnswerWithAI`: Tworzy szczegółowy prompt systemowy, wysyła odpowiedź gracza, kategorię i literę do modelu Gemini z prośbą o walidację w formacie JSON. Obsługuje parsowanie odpowiedzi i podstawową obsługę błędów (np. przekroczenie limitu zapytań).
    - `generateAnswerForBotWithMainAI`: Tworzy prompt dla bota w zależności od poziomu trudności i prosi Gemini o wygenerowanie odpowiedzi.

#### `services/multiplayerService.ts`
- **Cel:** Zarządza połączeniem WebSocket z serwerem backendowym za pomocą `socket.io-client`.
- **Funkcjonalność:**
    - `connectToServer` / `disconnectFromServer`: Nawiązuje i zamyka połączenie.
    - **Emitery:** Funkcje wysyłające zdarzenia do serwera (np. `createRoom`, `joinRoom`, `relayMessage`).
    - **Nasłuchiwacze (Listeners):** Funkcje (`on...`), które pozwalają komponentom (głównie `GameContext`) subskrybować zdarzenia przychodzące z serwera (np. `onGameStateSync`, `onRoomListUpdate`).

#### `services/googleDriveService.ts`
- **Cel:** Obsługa integracji z Dyskiem Google w celu synchronizacji ustawień gry.
- **Funkcjonalność:**
    - Używa biblioteki Google Identity Services do autoryzacji OAuth 2.0.
    - `initDriveClient`: Inicjalizuje klienta.
    - `signIn` / `signOut`: Zarządza logowaniem i wylogowaniem użytkownika.
    - `saveSettingsToDrive` / `loadSettingsFromDrive`: Zapisuje i odczytuje plik `settings.json` w specjalnym, ukrytym folderze aplikacji na Dysku Google użytkownika (`appDataFolder`).

#### `screens/*` (Ekrany aplikacji)
- **`MainMenuScreen.tsx`:** Ekran główny z opcjami rozpoczęcia gry, profilu gracza i nawigacją do innych sekcji.
- **`SettingsScreen.tsx`:** Ekran konfiguracji gry (liczba rund, czas, kategorie). Zawiera komponent `GoogleDriveSync`.
- **`OfflineBotConfigScreen.tsx`:** Ekran do konfiguracji botów przed rozpoczęciem gry w trybie offline.
- **`LetterDrawingScreen.tsx`:** Ekran z "jednorękim bandytą" do losowania litery na daną rundę.
- **`GamePlayScreen.tsx`:** Główny ekran rozgrywki. Zawiera pola do wpisywania odpowiedzi, timer, listę graczy oraz przyciski do zakończenia rundy/gry. **Dodano tu funkcjonalność rozpoznawania mowy do wprowadzania odpowiedzi.**
- **`RoundResultsScreen.tsx`:** Ekran podsumowania rundy, wyświetlający tabelę z odpowiedziami wszystkich graczy, punktacją i statusem walidacji. Umożliwia głosowanie nad odpowiedziami w trybie multiplayer.
- **`GameSummaryScreen.tsx`:** Ekran końcowy gry, pokazujący ostateczną tabelę wyników, zwycięzcę i szczegółową punktację z każdej rundy.
- **`MultiplayerNavScreen.tsx`:** Lobby do przeglądania dostępnych gier multiplayer lub tworzenia własnej.
- **`LobbyScreen.tsx`:** Poczekalnia dla gry wieloosobowej, gdzie gracze zbierają się przed startem. Host może zarządzać grą (dodawać boty, rozpoczynać).
- **`HighScoresScreen.tsx`:** Wyświetla listę najlepszych wyników zapisanych lokalnie.

#### `components/*` (Komponenty reużywalne)
- **`Button.tsx`, `InputField.tsx`, `LoadingSpinner.tsx`:** Podstawowe, stylizowane komponenty UI.
- **`TimerDisplay.tsx`:** Wyświetla i zarządza odliczaniem czasu rundy.
- **`PlayerAvatar.tsx`:** Renderuje awatar gracza i dynamicznie wyświetla ikony statusu (myśli, pisze, czeka, zatwierdził).
- **`WindowControls.tsx`, `ThemeToggle.tsx`:** Małe komponenty do zarządzania oknem i motywem.
- **`*Background.tsx`:** Komponenty odpowiedzialne za animowane tła.
- **`SlotMachineComponent.tsx`:** Komponent "jednorękiego bandyty" używany na ekranie losowania litery.
- **`PlayerVoteModal.tsx`:** Modal do głosowania nad poprawnością odpowiedzi gracza.
- **`HelpModal.tsx`:** Modal z instrukcjami dotyczącymi gry i uruchomienia serwera.

#### `constants.ts`
- **Cel:** Centralne miejsce na stałe wartości używane w całej aplikacji.
- **Zawartość:**
    - Listy (np. `ALL_CATEGORIES`, `POLISH_ALPHABET`).
    - Domyślne ustawienia gry.
    - Wartości punktacji.
    - Konfiguracje poziomów trudności botów.
    - Zakodowane w base64 dane dźwiękowe (`SOUNDS`).

#### `types.ts`
- **Cel:** Definicje typów i interfejsów TypeScript.
- **Zawartość:**
    - Typy dla stanu gry (`GameState`, `Player`, `Answer`).
    - Enumy dla akcji, statusów, trybów gry (`GameActionType`, `PlayerActivityState`, `GameMode`).
    - Interfejsy dla komunikacji z AI i serwerem.