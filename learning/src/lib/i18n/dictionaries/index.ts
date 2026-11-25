import type { Locale } from "../locales";
import type { Copy } from "../types";

import { ar } from "./ar";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { ru } from "./ru";
import { tr } from "./tr";
import { zh } from "./zh";

export const dictionaries: Record<Locale, Copy> = { fr, en, es, de, ar, zh, ru, tr };
