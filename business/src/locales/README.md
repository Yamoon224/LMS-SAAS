# i18n — dictionnaires JSON

Choix d'implémentation : dictionnaires JSON simples par locale (pas de
dépendance `next-intl` pour ce stub), chargés à la demande dans les Server
Components. Langues cibles (cahier des charges) : `fr` (défaut), `en`, `es`,
`de`, `ar` (RTL), `zh`, `ru`, `tr`. Seuls `fr`, `en` et `ar` sont fournis ici
à titre d'exemple ; dupliquer `fr.json` pour les locales manquantes.

La locale active est déterminée par le middleware (segment d'URL ou
préférence `Accept-Language`) et doit piloter l'attribut `dir` du layout
racine (`rtl` pour `ar`).
