import fr from "./fr";
import ar from "./ar";

export type TranslationSet = typeof fr;

const translations: {
  fr: TranslationSet;
  ar: TranslationSet;
} = {
  fr,
  ar,
};

export { translations };
