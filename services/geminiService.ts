

import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AIValidationResponse, BotDifficulty } from "../types";

let mainAi: GoogleGenAI | null = null;
// botAi and verificationAi removed
let mainApiKeyOk = false;
// botApiKeyOk and verificationApiKeyOk removed

const GEMINI_MODEL_TEXT = 'gemini-2.5-flash';

const initializeMainAI = () => {
  if (typeof process.env.API_KEY === 'string' && process.env.API_KEY.trim() !== '') {
    try {
      mainAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
      mainApiKeyOk = true;
      console.log("Serwis Gemini AI: Główny AI (API_KEY) zainicjowany pomyślnie.");
    } catch (error) {
      console.error("Serwis Gemini AI: Nie udało się zainicjować Głównego AI z API_KEY:", error);
      mainApiKeyOk = false;
      mainAi = null;
    }
  } else {
    mainApiKeyOk = false;
    mainAi = null;
    console.warn("Serwis Gemini AI: Zmienna środowiskowa API_KEY nie jest ustawiona. Funkcje AI (walidacja online, boty online) będą niedostępne.");
  }
};

// initializeBotAI and initializeVerificationAI removed

// Initialize AI instances on load
initializeMainAI();
// Calls to initializeBotAI and initializeVerificationAI removed

export const checkMainApiKey = (): boolean => {
  // If mainAi is null but status was false, and key is present, try re-init.
  // This handles cases where env var might be set after initial load in some dev environments.
  if (!mainAi && mainApiKeyOk === false && typeof process.env.API_KEY === 'string' && process.env.API_KEY.trim() !== '') {
    initializeMainAI();
  }
  return mainApiKeyOk;
};

// checkBotApiKey and checkVerificationApiKey removed


const parseAIValidationResponse = (responseText: string): AIValidationResponse => {
    let jsonStr = responseText.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; 
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    try {
        const result = JSON.parse(jsonStr) as AIValidationResponse;
        if (typeof result.isValid !== 'boolean') {
            console.error("Nieprawidłowa struktura AIValidationResponse z serwisu AI (brak 'isValid'):", result, "Oryginalny tekst:", responseText);
            return { isValid: false, reason: "Błąd parsowania odpowiedzi AI: brak pola 'isValid'.", bonusPoints: 0};
        }
        
        // Bonus points check
        if (result.bonusPoints !== undefined && (typeof result.bonusPoints !== 'number' || !Number.isInteger(result.bonusPoints) || result.bonusPoints < 0 || result.bonusPoints > 3)) {
            console.warn("AIValidationResponse zawiera nieprawidłowe 'bonusPoints' (nie jest liczbą 0-3). Ignorowanie.", result.bonusPoints);
            delete result.bonusPoints; // Remove invalid field
        }

        return {
            ...result,
            bonusPoints: result.bonusPoints ?? 0 // Default to 0 if undefined
        };
    } catch (e: any) {
        console.error("Nie udało się sparsować odpowiedzi JSON z AI:", e.message, "Oryginalny tekst:", responseText);
        return { isValid: false, reason: `Błąd parsowania JSON: ${e.message}`, bonusPoints: 0 };
    }
};


export const validateAnswerWithAI = async (
  answer: string, 
  category: string, 
  letter: string
  // keyTypeToUse parameter removed
): Promise<AIValidationResponse> => {
  
  const apiKeyEnvVarName = 'API_KEY'; // Always using main API_KEY

  if (!mainAi || !mainApiKeyOk) {
    const reason = !mainAi 
        ? `Serwis AI (${apiKeyEnvVarName}) nie został zainicjowany (brak klucza).`
        : `Serwis AI (${apiKeyEnvVarName}) niedostępny. Sprawdź konfigurację klucza i limity (quota).`;
    return { isValid: false, reason };
  }

  const prompt = `Jesteś ekspertem w polskiej grze "Państwa Miasta". Zwaliduj odpowiedź. Cała odpowiedź, w tym pole "reason", MUSI być w języku polskim.
Kategoria: "${category}"
Litera: "${letter.toUpperCase()}"
Odpowiedź gracza: "${answer}"

Zasady (musisz ich przestrzegać):
1. Odpowiedź musi być sensowna i należeć do podanej kategorii.
2. Odpowiedź musi zaczynać się na podaną literę. **Wielkość pierwszej litery odpowiedzi gracza jest ignorowana przy sprawdzaniu zgodności z podaną literą.** Na przykład, jeśli gra jest na literę 'P', a kategoria to 'Państwo', to odpowiedzi 'Polska', 'polska', czy 'POLSKA' są wszystkie traktowane jako rozpoczynające się na 'P'. **Jeśli odpowiedź jest merytorycznie poprawna (np. 'Polska' to państwo), to warianty różniące się tylko wielkością liter (np. 'polska') również powinny być uznane za poprawne.** Wyjątek: dla kategorii "Rzeka" akceptowalne są odpowiedzi typu "Nil (rzeka)", gdzie "Nil" zaczyna się na literę, a dopisek jest w nawiasie. Dla "Imię" to samo, np. "Anna (imię żeńskie)".
3. Odpowiedź nie może być zbyt ogólna (np. "rzecz" dla kategorii "Rzecz").
4. Odpowiedź "nie wiem", "brak", "-", "pass" itp. są niepoprawne. Puste odpowiedzi też.
5. Polskie znaki diakrytyczne w odpowiedzi są ważne. Sprawdzaj poprawność ortograficzną.
6. Jeśli kategoria to "Państwo" lub "Miasto", odpowiedź musi być faktycznie istniejącym państwem/miastem. Nazwy własne z wielkiej litery (patrz też zasada nr 2 dotycząca elastyczności wielkości liter).
7. Kategoria "Fetysze i Fantazje" jest specyficzna - odpowiedzi powinny być kreatywne i pasujące do tematu, ale nie wulgarne. Bądź liberalny, ale z zachowaniem dobrego smaku. Absolutnie żadnych treści nielegalnych lub szkodliwych.
8. Odpowiedzi jednoliterowe są niepoprawne, chyba że stanowią uznany skrót lub akronim pasujący do kategorii (rzadkie).
9. **Specjalna zasada dla kategorii "Miasto":** Odpowiedź jest poprawna tylko wtedy, gdy miejscowość ma udokumentowaną populację powyżej 1000 mieszkańców według oficjalnych, aktualnych danych. Zweryfikuj to kryterium populacji. Jeśli nie możesz potwierdzić populacji lub jest ona poniżej 1000, odpowiedź jest niepoprawna.
10. **Specjalna zasada dla kategorii "Środki Transportu":** Interpretuj odpowiedzi bardzo szeroko. Akceptowalne są również odpowiedzi żartobliwe, fantastyczne lub nietypowe (np. "latający dywan", "miotła czarownicy", "papamobile", "krowa jako środek transportu"), o ile można je uznać za jakikolwiek środek przemieszczania się lub transportu, nawet w kontekście fikcyjnym lub humorystycznym. Bądź bardzo liberalny i kreatywny w ocenie tej kategorii. Nie odrzucaj odpowiedzi tylko dlatego, że jest nietypowa.
11. **Punkty Bonusowe za Kreatywność:** Niezależnie od poprawności merytorycznej, oceń odpowiedź pod kątem jej kreatywności, humoru lub "inteligentnego idiotyzmu". Jeśli odpowiedź jest wyjątkowo zabawna, zaskakująca lub twórczo absurdalna, przyznaj jej punkty bonusowe od 1 do 3. Jeśli nie jest specjalnie kreatywna, przyznaj 0. Umieść tę wartość w nowym polu JSON \`bonusPoints\`. Odpowiedzi poprawne merytorycznie również mogą dostać punkty bonusowe.

Uzasadnienie ("reason") MUSI być po polsku.`;

  try {
    const response: GenerateContentResponse = await mainAi.models.generateContent({ // Always use mainAi
        model: GEMINI_MODEL_TEXT,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isValid: { 
                        type: Type.BOOLEAN,
                        description: "Czy odpowiedź jest poprawna."
                    },
                    reason: { 
                        type: Type.STRING,
                        description: "Uzasadnienie walidacji w języku polskim."
                    },
                    bonusPoints: { 
                        type: Type.INTEGER,
                        description: "Punkty bonusowe (0-3) za kreatywność."
                    }
                },
                required: ["isValid"]
            },
            temperature: 0.1,
        }
    });
    return parseAIValidationResponse(response.text);
  } catch (error: any) {
    console.error(`[Gemini Service] Błąd podczas walidacji odpowiedzi z Gemini API (Klucz ${apiKeyEnvVarName}):`, error);
    const errorMessageLower = error.message?.toLowerCase() || "";
    let reasonMessage = `Błąd komunikacji z Gemini API. Spróbuj ponownie. (${error.message || 'Nieznany błąd'})`;

    if (errorMessageLower.includes("quota") || errorMessageLower.includes("resource_exhausted") || error.details?.code === 429 || (error.cause as any)?.status === 429) {
        mainApiKeyOk = false; 
        reasonMessage = `Przekroczono limit zapytań (quota) do API Gemini. Sprawdź swoje konto Google Cloud lub spróbuj ponownie później.`;
        console.error(`[Gemini Service] QUOTA WYCZERPANE lub przekroczono limit zapytań.`, error);
    } else if (errorMessageLower.includes("api key") || errorMessageLower.includes("authentication")) {
        mainApiKeyOk = false;
        reasonMessage = `Problem z kluczem API Gemini. Klucz jest nieprawidłowy, wygasł lub brak mu uprawnień.`;
        console.error(`[Gemini Service] Błąd klucza API lub uwierzytelniania.`, error);
    } else if (error.status === 500 || error.status === 503) {
         reasonMessage = `Wystąpił tymczasowy błąd po stronie serwera Gemini API. Spróbuj ponownie za chwilę.`;
    }
    return { isValid: false, reason: reasonMessage };
  }
};

const generateBotAnswerInternal = async (
    aiInstance: GoogleGenAI, // This will always be mainAi
    category: string, 
    letter: string, 
    difficulty: BotDifficulty
    // apiKeyTypeForMessage parameter removed
): Promise<string> => {
    
  const apiKeyTypeForMessage = 'API_KEY'; // Always using main API_KEY for messaging

  if (!mainApiKeyOk) { // Check status of mainAi
    const reason = `AI Bota (${apiKeyTypeForMessage}) niedostępny (problem z kluczem/quota).`;
    console.warn(`Serwis AI: ${reason} Kategoria: ${category}, Litera: ${letter}.`);
    return `Nie wiem (${reason})`;
  }

  let difficultyDescription = "przeciętnym";
  let temperature = 0.7;
  let instruction = "Staraj się być kreatywny i unikać najczęstszych odpowiedzi. Czasem możesz popełnić drobny, ludzki błąd (np. literówka, lub odpowiedź nie do końca idealna, ale pasująca). Wszystkie odpowiedzi muszą być po polsku.";

  switch (difficulty) {
    case BotDifficulty.VERY_EASY:
      difficultyDescription = "jak 13-latek, z ograniczoną wiedzą, czasem prostymi odpowiedziami, może popełniać błędy typowe dla tego wieku.";
      temperature = 0.9;
      instruction = "Odpowiadaj jak typowy 13-latek. Możesz nie znać trudnych słów. Czasem podaj coś bardzo prostego albo pomyl się. Nie używaj wulgaryzmów. Czasem możesz napisać 'nie wiem'. Wszystkie odpowiedzi muszą być po polsku.";
      break;
    case BotDifficulty.EASY:
      difficultyDescription = "łatwym, podstawowym poziomie, czasem popełniając błędy lub dając bardzo proste odpowiedzi.";
      temperature = 0.8;
      instruction = "Odpowiadaj prosto. Czasem możesz podać odpowiedź nie do końca poprawną lub bardzo oczywistą. Możesz napisać 'nie wiem'. Wszystkie odpowiedzi muszą być po polsku.";
      break;
    case BotDifficulty.MEDIUM:
      difficultyDescription = "przeciętnym poziomie, starając się być poprawnym, ale bez wyszukanej wiedzy.";
      temperature = 0.7; // Default
      instruction = "Odpowiadaj jak osoba o przeciętnej wiedzy. Staraj się być poprawny. Jeśli nie masz pomysłu, napisz 'nie wiem'. Wszystkie odpowiedzi muszą być po polsku.";
      break;
    case BotDifficulty.HARD:
      difficultyDescription = "trudnym poziomie, z dobrą wiedzą ogólną, starając się podawać mniej oczywiste, ale poprawne odpowiedzi.";
      temperature = 0.5;
      instruction = "Masz dużą wiedzę. Podawaj poprawne, czasem mniej oczywiste odpowiedzi. Rzadko pisz 'nie wiem'. Wszystkie odpowiedzi muszą być po polsku.";
      break;
    case BotDifficulty.VERY_HARD:
      difficultyDescription = "bardzo trudnym poziomie, z szeroką i specjalistyczną wiedzą, często podając unikalne i precyzyzyjne odpowiedzi.";
      temperature = 0.3;
      instruction = "Jesteś ekspertem. Twoje odpowiedzi są precyzyjne, często unikalne i świadczą o głębokiej wiedzy. Prawie nigdy nie piszesz 'nie wiem'. Wszystkie odpowiedzi muszą być po polsku.";
      break;
    case BotDifficulty.EXPERT:
      difficultyDescription = "jak zwycięzca Milionerów, z ogromną, wszechstronną wiedzą, podając bardzo trafne, czasem zaskakujące i niszowe odpowiedzi.";
      temperature = 0.2;
      instruction = "Jesteś omnibuskiem, jak zwycięzca Milionerów. Twoje odpowiedzi są błyskotliwe, precyzyjne i często niszowe. Nigdy nie piszesz 'nie wiem'. Dla kategorii 'Fetysze i Fantazje' bądź bardzo kreatywny i odważny, ale bez wulgaryzmów. Wszystkie odpowiedzi muszą być po polsku.";
      break;
  }

  const prompt = `Jesteś botem grającym w polską grę "Państwa Miasta".
Twoim zadaniem jest podanie JEDNEJ polskiej odpowiedzi dla podanej kategorii, zaczynającej się na podaną literę.
Odpowiadasz ${difficultyDescription}.
Kategoria: "${category}"
Litera: "${letter.toUpperCase()}"
${instruction}
Podaj TYLKO SAMĄ ODPOWIEDŹ po polsku (np. "Polska", "Krzesło", "Słoń"). Nie dodawaj żadnych prefiksów typu "Odpowiedź:", cudzysłowów, formatowania JSON, ani nie mów o sobie.
Jeśli nie masz pomysłu na odpowiedź (zgodnie z Twoim poziomem trudności), odpowiedz po prostu "Nie wiem".

Przykłady jak masz odpowiadać (tylko tekst odpowiedzi po polsku):
Polska
Krzesło
Słoń
Skolopendra olbrzymia
Wrocław
Lot balonem nad Kapadocją o wschodzie słońca
Nie wiem
`;
  const MAX_RETRIES = 3; 
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Serwis AI (Klucz Bota: ${apiKeyTypeForMessage}): Próba ${attempt}/${MAX_RETRIES} dla kat: "${category}", lit: "${letter}", trudność: ${difficulty}`);
      
      const response: GenerateContentResponse = await aiInstance.models.generateContent({ // aiInstance is mainAi
        model: GEMINI_MODEL_TEXT,
        contents: prompt,
        config: {
          temperature: temperature,
        }
      });

      let cleanedResponse = response.text.trim();
      
      if (cleanedResponse.toLowerCase().startsWith("odpowiedź:")) {
          cleanedResponse = cleanedResponse.substring("odpowiedź:".length).trim();
      }
      if (cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) {
          cleanedResponse = cleanedResponse.substring(1, cleanedResponse.length - 1).trim();
      }
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = cleanedResponse.match(fenceRegex);
      if (match && match[2]) {
        cleanedResponse = match[2].trim();
      }

      if (!cleanedResponse) { // Empty response from AI
          if (attempt === MAX_RETRIES) return "Nie wiem (pusta odp. AI)";
          console.warn(`Serwis AI (Klucz Bota: ${apiKeyTypeForMessage}): Pusta odpowiedź z AI dla kat: "${category}", lit: "${letter}". Próba ${attempt}/${MAX_RETRIES}.`);
          await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // wait before retrying
          continue;
      }
      if (cleanedResponse.toUpperCase() === "NIE WIEM" || cleanedResponse.toUpperCase() === "NIE WIEM.") {
        return "Nie wiem";
      }
      // Basic check if it starts with the letter, case-insensitive.
      // Normalize to handle diacritics if necessary, but for now simple check.
      const firstLetterOfResponse = cleanedResponse.trim()[0]?.toUpperCase();
      if (firstLetterOfResponse !== letter.toUpperCase()) {
          console.warn(`Serwis AI (Klucz Bota: ${apiKeyTypeForMessage}): Odpowiedź bota "${cleanedResponse}" nie zaczyna się na literę "${letter.toUpperCase()}". Próba ${attempt}/${MAX_RETRIES}. Zwracam "Nie wiem".`);
          if (attempt === MAX_RETRIES) return `Nie wiem (Błąd: ${cleanedResponse})`; // Return problematic answer for debug if all retries fail
          await new Promise(resolve => setTimeout(resolve, 300 * attempt));
          // Don't continue to next attempt if this specific error occurs, instead return "Nie wiem" or the faulty answer.
          // This behavior might need adjustment based on desired strictness.
          // For now, let's assume if AI fails to follow letter rule after 1 try, we give up on this specific prompt.
          return `Nie wiem (AI: ${cleanedResponse})`; 
      }

      return cleanedResponse;

    } catch (error: any) {
      console.error(`[Gemini Service] Błąd podczas generowania odpowiedzi bota (Klucz ${apiKeyTypeForMessage}, próba ${attempt}/${MAX_RETRIES}):`, error);
      const errorMessageLower = error.message?.toLowerCase() || "";
      let reasonMessage = `Błąd AI (${apiKeyTypeForMessage}): ${error.message || 'Nieznany błąd'}`;

      if (errorMessageLower.includes("quota") || errorMessageLower.includes("resource_exhausted") || error.details?.code === 429 || (error.cause as any)?.status === 429) {
          mainApiKeyOk = false; // Update main API key status
          reasonMessage = `Problem z limitem (quota) API Gemini.`;
          console.error(`[Gemini Service] QUOTA WYCZERPANE lub przekroczono limit zapytań.`);
          return `Nie wiem (${reasonMessage})`; // Stop retrying on quota issues
      } else if (errorMessageLower.includes("api key") || errorMessageLower.includes("authentication")) {
          mainApiKeyOk = false; // Update main API key status
          reasonMessage = `Problem z kluczem API Gemini.`;
          console.error(`[Gemini Service] Błąd klucza API lub uwierzytelniania.`);
          return `Nie wiem (${reasonMessage})`; // Stop retrying on auth issues
      }
      
      if (attempt === MAX_RETRIES) {
        return `Nie wiem (${reasonMessage})`;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff for retries
    }
  }
  return "Nie wiem (Błąd: Nie udało się wygenerować odpowiedzi po kilku próbach)"; // Fallback after all retries
};

export const generateAnswerForBotWithMainAI = async (category: string, letter: string, difficulty: BotDifficulty): Promise<string> => {
  if (!mainAi || !mainApiKeyOk) {
    const keyStatusMessage = !mainAi ? "instancja AI nie istnieje (np. brak klucza)" : "problem ze statusem klucza (np. quota)";
    console.warn(`Generowanie odpowiedzi przez Główne AI (API_KEY) niemożliwe: ${keyStatusMessage}.`);
    return "Nie wiem (Błąd konfiguracji Głównego AI)";
  }
  return generateBotAnswerInternal(mainAi, category, letter, difficulty);
};

// generateAnswerForBotWithDedicatedAI function removed