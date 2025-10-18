import { BotDifficulty, Category, KnowledgeBase } from '../types';
import { ALL_CATEGORIES } from '../constants'; // Import ALL_CATEGORIES
import toast from 'react-hot-toast';

export let kb: KnowledgeBase | null = null; // Export kb
let kbLoadingPromise: Promise<boolean> | null = null;

const normalizeText = (text: string): string => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const normalizeCategoryForFileName = (category: Category): string => {
    return category.toLowerCase()
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/[^a-z0-9_]/g, ''); // Remove any remaining non-alphanumeric characters except underscore
};

export const loadKnowledgeBase = async (): Promise<boolean> => {
  if (kb) {
    console.log("Lokalna baza wiedzy (KB) jest już załadowana.");
    return true;
  }
  if (kbLoadingPromise) {
    console.log("Lokalna baza wiedzy (KB) jest w trakcie ładowania...");
    return kbLoadingPromise;
  }

  const categoriesToLoad: Category[] = ALL_CATEGORIES;
  const fetchPromises: Promise<{ category: Category, data: Record<string, string[]> | null, filePath: string, success: boolean }>[] = [];

  console.log("%cRozpoczynanie ładowania lokalnej bazy wiedzy opartej na kategoriach...", "color: blue; font-weight: bold;");

  for (const category of categoriesToLoad) {
    const fileName = normalizeCategoryForFileName(category);
    if (!fileName) {
        console.warn(`Nie można wygenerować nazwy pliku dla kategorii: ${category}. Pomijanie.`);
        fetchPromises.push(Promise.resolve({ category, data: null, filePath: "N/A", success: false }));
        continue;
    }
    const relativePath = `data/kb_categories/${fileName}.json`;
    // Create a full, absolute URL to avoid any relative path ambiguity.
    const absoluteUrl = new URL(relativePath, document.baseURI).href;
    console.log(`Próba załadowania pliku dla kategorii: "${category}", absolutna ścieżka: ${absoluteUrl}`);

    fetchPromises.push(
      fetch(absoluteUrl)
        .then(response => {
          if (!response.ok) {
            const errorMsg = `Nie udało się załadować pliku dla kategorii "${category}" (${response.status} ${response.statusText}).`;
            console.error(`❌ Błąd ładowania KB: ${errorMsg} Ścieżka: ${absoluteUrl}`);
            // toast.error(errorMsg, { id: `kb-load-err-${fileName}` });
            return { category, data: null, filePath: absoluteUrl, success: false };
          }
          console.log(`✅ Pomyślnie pobrano plik: ${absoluteUrl} dla kategorii "${category}"`);
          return response.json().then(data => ({ category, data, filePath: absoluteUrl, success: true }))
            .catch(jsonError => {
              const errorMsg = `Błąd parsowania danych dla kategorii "${category}". Plik może być uszkodzony.`;
              console.error(`❌ Błąd parsowania JSON z KB: ${errorMsg} Ścieżka: ${absoluteUrl}`, jsonError.message, jsonError);
              // toast.error(errorMsg, { id: `kb-parse-err-${fileName}` });
              return { category, data: null, filePath: absoluteUrl, success: false };
            });
        })
        .catch(networkError => {
          const errorMsg = `Błąd sieci podczas ładowania danych dla kategorii "${category}".`;
          console.error(`❌ Błąd sieciowy KB: ${errorMsg} Ścieżka: ${absoluteUrl}`, networkError.message, networkError);
          // toast.error(errorMsg, { id: `kb-net-err-${fileName}` });
          return { category, data: null, filePath: absoluteUrl, success: false };
        })
    );
  }

  kbLoadingPromise = Promise.all(fetchPromises)
    .then(results => {
      const newKb: KnowledgeBase = {};
      let filesLoadedCount = 0;
      let filesFailedCount = 0;
      
      console.log("%c--- Podsumowanie ładowania plików KB ---", "color: blue;");
      results.forEach(result => {
        if (result.success && result.data) {
          newKb[result.category] = result.data;
          filesLoadedCount++;
          console.log(`👍 Kategoria "${result.category}" (${result.filePath}) załadowana.`);
        } else {
          newKb[result.category] = {}; // Ensure category exists even if loading failed
          filesFailedCount++;
          console.warn(`👎 Kategoria "${result.category}" (${result.filePath}) NIE załadowana.`);
        }
      });
      console.log("--- Koniec podsumowania ---");

      kb = newKb;
      
      if (filesFailedCount > 0) {
        console.warn(`Ukończono ładowanie bazy wiedzy. ${filesLoadedCount} kategorie załadowane pomyślnie, ${filesFailedCount} kategorie nie zostały załadowane lub wystąpił błąd.`);
      } else if (filesLoadedCount === 0 && categoriesToLoad.length > 0) {
        console.error("Nie udało się załadować żadnego pliku kategorii. Lokalna baza wiedzy jest pusta.");
      } else if (categoriesToLoad.length === 0) {
        console.log("Brak kategorii do załadowania (ALL_CATEGORIES jest puste). Lokalna baza wiedzy jest pusta.");
      } else {
        console.log("%cVszystkie zdefiniowane kategorie lokalnej bazy wiedzy załadowane pomyślnie!", "color: green; font-weight: bold;");
      }

      // Log a sample of loaded data
      if (kb && kb["Państwo"] && kb["Państwo"]["A"]) {
        console.log("Przykładowe dane z KB (Państwo, A):", kb["Państwo"]["A"].slice(0, 3));
      } else {
        console.warn("Nie można wyświetlić próbki dla 'Państwo'/'A' - brak danych.");
      }
      if (kb && kb["Miasto"] && kb["Miasto"]["K"]) {
        console.log("Przykładowe dane z KB (Miasto, K):", kb["Miasto"]["K"].slice(0, 3));
      } else {
         console.warn("Nie można wyświetlić próbki dla 'Miasto'/'K' - brak danych.");
      }
       if (kb && kb["Zwierzę"] && kb["Zwierzę"]["K"]) {
        console.log("Przykładowe dane z KB (Zwierzę, K):", kb["Zwierzę"]["K"].slice(0, 3));
      } else {
         console.warn("Nie można wyświetlić próbki dla 'Zwierzę'/'K' - brak danych.");
      }


      return Object.keys(kb).length > 0 && filesLoadedCount > 0;
    })
    .catch(error => {
      console.error("Krytyczny błąd podczas Promise.all w ładowaniu lokalnej bazy wiedzy:", error);
      kb = null; 
      return false;
    })
    .finally(() => {
        kbLoadingPromise = null; 
    });

  return kbLoadingPromise;
};

export const isKBSystemReady = (): boolean => {
    return !!kb || !!kbLoadingPromise;
};

export const getKnowledgeBaseStatus = (): { loaded: boolean, message?: string } => {
    if (kbLoadingPromise) {
        return { loaded: false, message: "Baza wiedzy jest w trakcie ładowania..." };
    }
    if (kb && Object.keys(kb).length > 0) {
        const loadedCategoriesCount = Object.values(kb).filter(categoryData => Object.keys(categoryData).length > 0).length;
        const totalExpectedCategories = ALL_CATEGORIES.length;
        
        if (loadedCategoriesCount === 0 && totalExpectedCategories > 0) {
             return { loaded: false, message: "Baza wiedzy jest pusta lub nie udało się załadować żadnej kategorii." };
        }
        if (loadedCategoriesCount < totalExpectedCategories) {
             return { loaded: true, message: `Załadowano ${loadedCategoriesCount} z ${totalExpectedCategories} kategorii. Niektóre mogą być niedostępne lub puste.` };
        }
        return { loaded: true, message: "Wszystkie kategorie bazy wiedzy załadowane." };
    }
    return { loaded: false, message: "Baza wiedzy niezaładowana lub pusta. Sprawdź konsolę pod kątem błędów ładowania plików." };
};


export const getAnswerFromKB = (category: Category, letter: string, difficulty: BotDifficulty): string => {
  if (!kb) {
    console.warn(`Lokalna baza wiedzy (KB) nie jest załadowana. Wywołaj najpierw 'loadKnowledgeBase'. Nie można pobrać odpowiedzi dla ${category} - ${letter}.`);
    return "Nie wiem (Błąd KB: Baza niezaładowana)";
  }

  const categoryData = kb[category];
  if (categoryData) {
    const answersForLetter = categoryData[letter.toUpperCase()];
    if (answersForLetter && answersForLetter.length > 0) {
      const randomIndex = Math.floor(Math.random() * answersForLetter.length);
      return answersForLetter[randomIndex];
    } else {
        console.warn(`KB: Brak odpowiedzi dla kategorii "${category}", litera "${letter.toUpperCase()}".`);
    }
  } else {
      console.warn(`KB: Brak danych dla kategorii "${category}".`);
  }
  return "Nie wiem";
};

export const validateAnswerWithKB = (
  answer: string,
  category: Category,
  letter: string
): { isValid: boolean; reason?: string; bonusPoints: number } => {
  // @google/genai-codex-fix: Add `bonusPoints: 0` to all return paths to match the expected return type.
  if (!kb) {
    return { isValid: false, reason: `Lokalna baza wiedzy (KB) nie jest załadowana.`, bonusPoints: 0 };
  }
  if (!answer || answer.trim() === "") {
    return { isValid: false, reason: "Nie podano odpowiedzi.", bonusPoints: 0 };
  }

  const upperLetter = letter.toUpperCase();
  const normalizedAnswer = normalizeText(answer.trim());
  const normalizedCurrentRoundLetter = normalizeText(letter);

  if (!normalizedAnswer.startsWith(normalizedCurrentRoundLetter)) {
    return { isValid: false, reason: `Odpowiedź "${answer}" nie zaczyna się na literę "${upperLetter}".`, bonusPoints: 0 };
  }

  const categoryData = kb[category];
  if (categoryData && Object.keys(categoryData).length > 0) { // Check if categoryData is not an empty object
    const validAnswersForLetter = categoryData[upperLetter];
    if (validAnswersForLetter && validAnswersForLetter.length > 0) {
      const isValidAnswer = validAnswersForLetter.some(kbAnswer => normalizeText(kbAnswer) === normalizedAnswer);
      if (isValidAnswer) {
        return { isValid: true, reason: "Odpowiedź poprawna (wg lokalnej bazy).", bonusPoints: 0 };
      } else {
        return { isValid: false, reason: `Odpowiedź "${answer}" nieznaleziona w lokalnej bazie dla kategorii "${category}" na literę "${upperLetter}".`, bonusPoints: 0 };
      }
    } else {
       return { isValid: false, reason: `Brak odpowiedzi w lokalnej bazie dla kategorii "${category}" i litery "${upperLetter}".`, bonusPoints: 0 };
    }
  } else {
    return { isValid: false, reason: `Brak danych w lokalnej bazie dla kategorii "${category}" lub kategoria jest pusta.`, bonusPoints: 0 };
  }
};
