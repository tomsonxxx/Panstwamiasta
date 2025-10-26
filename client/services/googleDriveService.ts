// @google/genai-codex-fix: Augment the Window interface to include the 'google' property, resolving TypeScript errors.
declare global {
  interface Window {
    google: any;
  }
}

import { GameSettings, GoogleUser } from '../types';
import toast from 'react-hot-toast';

// --- WAŻNA KONFIGURACJA ---
const CLIENT_ID = '605086042485-ghrp167uhp12hj9tmc1r3b11m18f7bar.apps.googleusercontent.com';

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const SETTINGS_FILE_NAME = 'settings.json';

let tokenClient: any | null = null;
let accessToken: string | null = null;

interface ServiceState {
  onUserChange: ((user: GoogleUser | null) => void) | null;
  isClientIdMissing: boolean;
}

const serviceState: ServiceState = {
  onUserChange: null,
  isClientIdMissing: false,
};

/**
 * Inicjalizuje klienta Google Identity Services (GIS).
 */
export const initDriveClient = (onUserChange: (user: GoogleUser | null) => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (CLIENT_ID.includes('YOUR_CLIENT_ID') || CLIENT_ID.length < 20) {
        const errorMsg = "Integracja z Google Drive nie jest skonfigurowana. Wymagany jest poprawny identyfikator klienta OAuth 2.0 w pliku services/googleDriveService.ts.";
        console.error(errorMsg);
        serviceState.isClientIdMissing = true;
        return resolve();
    }

    serviceState.onUserChange = onUserChange;

    const checkGsiLoaded = () => {
        if (window.google && window.google.accounts) {
            try {
                // @google/genai-codex-fix: Use `window.google` to access the global object.
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: '', // Ustawiany dynamicznie w signIn
                });
                resolve();
            } catch (error) {
                console.error("Błąd inicjalizacji klienta Google Identity Services:", error);
                reject(error);
            }
        } else {
            setTimeout(checkGsiLoaded, 100);
        }
    };

    checkGsiLoaded();
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
      console.error("Błąd logowania Google:", resp);
      toast.error(`Logowanie nie powiodło się: ${resp.error_description || resp.error}`);
      return;
    }
    
    accessToken = resp.access_token;

    try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
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
        accessToken = null;
    }
  };

  tokenClient.requestAccessToken({ prompt: '' });
};

/**
 * Wylogowuje użytkownika.
 */
export const signOut = () => {
  if (serviceState.isClientIdMissing || !accessToken) return;
  // @google/genai-codex-fix: Use `window.google` to access the global object.
  window.google.accounts.oauth2.revoke(accessToken, () => {
    accessToken = null;
    serviceState.onUserChange?.(null);
  });
};

const getAuthHeader = (): Record<string, string> | null => {
    if (!accessToken) {
        toast.error("Brak autoryzacji. Zaloguj się ponownie.");
        return null;
    }
    return { 'Authorization': `Bearer ${accessToken}` };
}

/**
 * Znajduje metadane pliku ustawień w folderze aplikacji.
 */
const getSettingsFileMetadata = async (): Promise<{id: string} | null> => {
    if (serviceState.isClientIdMissing) return null;
    const headers = getAuthHeader();
    if (!headers) return null;

    try {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${SETTINGS_FILE_NAME}'&spaces=appDataFolder&fields=files(id)`, { headers });
        if (!response.ok) throw new Error(`Błąd sieci: ${response.statusText}`);
        const data = await response.json();
        if (data.files && data.files.length > 0) {
            return data.files[0];
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
    const headers = getAuthHeader();
    if (!headers) return false;

    try {
        const fileMetadata = await getSettingsFileMetadata();
        const content = JSON.stringify(settings, null, 2);
        const blob = new Blob([content], { type: 'application/json' });

        const metadata = {
            name: SETTINGS_FILE_NAME,
            mimeType: 'application/json',
            ...(fileMetadata ? {} : { parents: ['appDataFolder'] }),
        };

        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', blob);

        const path = `https://www.googleapis.com/upload/drive/v3/files${fileMetadata ? `/${fileMetadata.id}` : ''}?uploadType=multipart`;
        const method = fileMetadata ? 'PATCH' : 'POST';

        const response = await fetch(path, {
            method,
            headers: headers,
            body: formData,
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Błąd zapisu: ${errorBody.error?.message || response.statusText}`);
        }
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
    const headers = getAuthHeader();
    if (!headers) return null;

    try {
        const fileMetadata = await getSettingsFileMetadata();
        if (!fileMetadata) {
            console.log("Nie znaleziono pliku ustawień w folderze aplikacji.");
            return null; 
        }

        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileMetadata.id}?alt=media`, { headers });
        if (!response.ok) throw new Error(`Błąd odczytu: ${response.statusText}`);

        return await response.json() as GameSettings;
    } catch (error) {
        console.error("Błąd podczas wczytywania ustawień z Dysku:", error);
        return null;
    }
};