// Deklaracje rozwiązujące błędy TypeScript "Cannot find name 'gapi'" i "Cannot find name 'google'".
// Obiekty te są ładowane globalnie ze skryptu w index.html.
declare const gapi: any;
declare const google: any;

import { GameSettings, GoogleUser } from '../types';
import toast from 'react-hot-toast';

// --- WAŻNA KONFIGURACJA ---
// 1. Wejdź na https://console.cloud.google.com/
// 2. Utwórz nowy projekt lub wybierz istniejący.
// 3. W menu "Interfejsy API i usługi" -> "Dane logowania", utwórz "Identyfikator klienta OAuth 2.0".
// 4. Wybierz "Aplikacja internetowa".
// 5. W "Autoryzowane źródła JavaScript" dodaj adres URL, na którym działa aplikacja (np. adres deweloperski i produkcyjny).
// 6. Skopiuj wygenerowany "Identyfikator klienta" i wklej go poniżej.
const CLIENT_ID = '605086042485-ghrp167uhp12hj9tmc1r3b11m18f7bar.apps.googleusercontent.com'; // <--- ZASTĄP TO, JEŚLI CHCESZ UŻYĆ WŁASNEJ APLIKACJI GOOGLE CLOUD

const API_KEY = process.env.API_KEY; 
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
// Używamy zakresu 'drive.appdata', aby przechowywać dane w ukrytym folderze, do którego dostęp ma tylko ta aplikacja.
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

const SETTINGS_FILE_NAME = 'settings.json';

// @google/genai-codex-fix: Changed type to `any` to resolve "Cannot find namespace 'google'" error, as Google types are loaded from a script tag.
let tokenClient: any | null = null;

interface ServiceState {
  onUserChange: ((user: GoogleUser | null) => void) | null;
  isClientIdMissing: boolean;
}

const serviceState: ServiceState = {
  onUserChange: null,
  isClientIdMissing: false,
};

/**
 * Inicjalizuje klienta GAPI i Google Identity Services (GIS).
 */
export const initDriveClient = (onUserChange: (user: GoogleUser | null) => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    
    if (CLIENT_ID.includes('YOUR_CLIENT_ID') || CLIENT_ID.length < 20) {
        const errorMsg = "Integracja z Google Drive nie jest skonfigurowana. Wymagany jest poprawny identyfikator klienta OAuth 2.0 w pliku services/googleDriveService.ts.";
        console.error(errorMsg);
        serviceState.isClientIdMissing = true;
        // Nie odrzucamy promise, aby nie powodować awarii aplikacji, ale funkcja nie będzie działać.
        return resolve();
    }

    serviceState.onUserChange = onUserChange;
    
    const script = document.querySelector('script[src="https://apis.google.com/js/api.js"]') as HTMLScriptElement;
    if (!script) {
        const errorMsg = "Skrypt Google API nie został znaleziony w index.html.";
        console.error(errorMsg);
        return reject(errorMsg);
    }

    script.onload = () => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
          });
          
          tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // Callback jest ustawiany dynamicznie w `signIn`
          });
          resolve();
        } catch (error) {
          console.error("Błąd inicjalizacji klienta GAPI:", error);
          reject(error);
        }
      });
    };
    // Jeśli skrypt jest już załadowany, ręcznie wywołaj onload.
    // @google/genai-codex-fix: Use `gapi` directly instead of `window.gapi` to align with global declaration and fix TypeScript error.
    if (gapi && gapi.load) {
        script.onload(new Event('load'));
    }
  });
};

const notifyMissingClientId = () => {
    toast.error("Funkcja synchronizacji z Chmurą Google jest wyłączona z powodu braku konfiguracji CLIENT_ID.", { duration: 8000, id: 'gdrive-client-id-missing' });
}

/**
 * Rozpoczyna proces logowania użytkownika.
 */
export const signIn = () => {
  if (serviceState.isClientIdMissing) {
    notifyMissingClientId();
    return;
  }
  if (!tokenClient) {
    console.error("Klient tokenu Google nie jest zainicjalizowany.");
    toast.error("Serwis Google nie jest gotowy, spróbuj za chwilę.");
    return;
  }

  tokenClient.callback = async (resp: any) => {
    if (resp.error !== undefined) {
      console.error("Błąd logowania Google:", resp.error);
      toast.error(`Logowanie nie powiodło się: ${resp.error}`);
      return;
    }
    
    try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${gapi.client.getToken().access_token}` }
        });
        if (!res.ok) throw new Error(`Nie udało się pobrać danych użytkownika: ${res.statusText}`);

        const userProfile = await res.json();
        const user: GoogleUser = {
            name: userProfile.name,
            email: userProfile.email,
            picture: userProfile.picture,
        };
        serviceState.onUserChange?.(user);
        toast.success(`Zalogowano jako ${user.name}`);
    } catch(err) {
        console.error("Błąd pobierania profilu użytkownika:", err);
        toast.error("Nie udało się pobrać profilu po zalogowaniu.");
    }
  };

  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: '' });
  } else {
    tokenClient.requestAccessToken({ prompt: '' });
  }
};

/**
 * Wylogowuje użytkownika.
 */
export const signOut = () => {
  if (serviceState.isClientIdMissing) return; // Nie rób nic, jeśli nie skonfigurowano
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token, () => {
      gapi.client.setToken(null);
      serviceState.onUserChange?.(null);
    });
  }
};

/**
 * Znajduje metadane pliku ustawień w folderze aplikacji.
 */
const getSettingsFileMetadata = async (): Promise<{id: string} | null> => {
    if (serviceState.isClientIdMissing) return null;
    try {
        const response = await gapi.client.drive.files.list({
            q: `name='${SETTINGS_FILE_NAME}'`,
            spaces: 'appDataFolder',
            fields: 'files(id)',
        });
        if (response.result.files && response.result.files.length > 0) {
            return response.result.files[0];
        }
        return null;
    } catch (error) {
        console.error("Błąd podczas wyszukiwania pliku ustawień:", error);
        return null;
    }
}

/**
 * Zapisuje obiekt ustawień na Dysku Google.
 */
export const saveSettingsToDrive = async (settings: GameSettings): Promise<boolean> => {
    if (serviceState.isClientIdMissing) {
        notifyMissingClientId();
        return false;
    }
    const fileMetadata = await getSettingsFileMetadata();
    const content = JSON.stringify(settings, null, 2);
    const blob = new Blob([content], { type: 'application/json' });

    const metadata = {
        name: SETTINGS_FILE_NAME,
        mimeType: 'application/json',
        parents: fileMetadata ? undefined : ['appDataFolder'], 
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);

    const path = `/upload/drive/v3/files${fileMetadata ? `/${fileMetadata.id}` : ''}`;
    const method = fileMetadata ? 'PATCH' : 'POST';

    try {
        await gapi.client.request({
            path,
            method,
            params: { uploadType: 'multipart' },
            body: formData,
        });
        return true;
    } catch (error) {
        console.error("Błąd podczas zapisywania ustawień na Dysku:", error);
        return false;
    }
};

/**
 * Wczytuje obiekt ustawień z Dysku Google.
 */
export const loadSettingsFromDrive = async (): Promise<GameSettings | null> => {
    if (serviceState.isClientIdMissing) {
        notifyMissingClientId();
        return null;
    }
    const fileMetadata = await getSettingsFileMetadata();
    if (!fileMetadata) {
        console.log("Nie znaleziono pliku ustawień w folderze aplikacji.");
        return null; 
    }

    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileMetadata.id,
            alt: 'media',
        });
        return JSON.parse(response.body) as GameSettings;
    } catch (error) {
        console.error("Błąd podczas wczytywania ustawień z Dysku:", error);
        return null;
    }
};