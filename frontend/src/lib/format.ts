// lib/format.ts

/**
 * Formate un nombre en devise MRU
 * @param amount - Montant à formater (toujours en MRU)
 * @param locale - Locale (par défaut : 'fr-MR')
 */
export const formatMRU = (amount: number, locale: string = 'fr-MR'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'MRU',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Formate une date
 * @param date - Date objet ou string ISO
 * @param locale - Locale (par défaut : 'fr-MR')
 */
export const formatDate = (
  date: Date | string,
  locale: string = 'fr-MR'
): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Capitalise la première lettre
 * @param text - Texte à capitaliser
 */
export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Formate un numéro de téléphone mauritanien
 * @param phone - Numéro à formater
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 8 
    ? `+222 ${cleaned.match(/.{1,2}/g)?.join(' ') || cleaned}`
    : phone;
};

// Extensions natives
declare global {
  interface Number {
    toMRU(): string;
  }
  interface String {
    toPhoneFormat(): string;
  }
}

Number.prototype.toMRU = function() {
  return formatMRU(Number(this));
};

String.prototype.toPhoneFormat = function() {
  return formatPhone(this.toString());
};

export default {
  formatMRU,
  formatDate,
  capitalize,
  formatPhone
};