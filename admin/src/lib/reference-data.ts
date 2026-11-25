/** Listes de référence des formulaires (pays, devises, langues) : codes ISO, noms localisés par `Intl.DisplayNames`. */

export interface ReferenceOption {
  value: string;
  label: string;
}

const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );

const CURRENCY_CODES =
  "XOF XAF MAD DZD TND EGP NGN GHS KES TZS UGX RWF ETB ZAR MGA MUR CDF GNF BIF DJF KMF MRU CVE AED SAR QAR KWD BHD OMR JOD LBP ILS TRY EUR USD GBP CHF CAD AUD NZD JPY CNY HKD SGD INR PKR BDT LKR IDR MYR THB VND PHP KRW BRL ARS CLP COP PEN MXN RUB UAH PLN CZK HUF RON SEK NOK DKK".split(
    " ",
  );

/** Langues de l'interface (mêmes codes que l'espace apprenant). */
const LOCALE_CODES = ["fr", "en", "es", "de", "ar", "zh", "ru", "tr"] as const;

const collator = new Intl.Collator("fr", { sensitivity: "base" });

function displayNames(type: "region" | "currency" | "language") {
  try {
    return new Intl.DisplayNames(["fr"], { type });
  } catch {
    return null;
  }
}

function build(codes: readonly string[], type: "region" | "currency" | "language", format: (name: string, code: string) => string): ReferenceOption[] {
  const names = displayNames(type);
  return codes
    .map((code) => ({ value: code, label: format(names?.of(code) ?? code, code) }))
    .sort((a, b) => collator.compare(a.label, b.label));
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const COUNTRY_OPTIONS: ReferenceOption[] = build(COUNTRY_CODES, "region", (name, code) => `${name} (${code})`);
export const CURRENCY_OPTIONS: ReferenceOption[] = build(CURRENCY_CODES, "currency", (name, code) => `${code} — ${capitalize(name)}`);
export const LOCALE_OPTIONS: ReferenceOption[] = build(LOCALE_CODES, "language", (name, code) => `${capitalize(name)} (${code})`);

/** Garantit que la valeur actuelle reste choisissable même si elle n'est pas dans la liste de référence. */
export function withCurrent(options: ReferenceOption[], current: string | undefined): ReferenceOption[] {
  if (!current || options.some((option) => option.value === current)) return options;
  return [{ value: current, label: current }, ...options];
}
