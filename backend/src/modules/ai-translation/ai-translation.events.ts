/**
 * Événements de domaine publics du module ai-translation. Contrairement aux
 * fichiers de domain/application/infrastructure/presentation, ce fichier est
 * une sortie publique au même titre que la façade — les autres modules
 * peuvent s'y abonner (@OnEvent) sans violer les frontières de couches
 * (section 13.2, "communication entre modules... par événements de domaine").
 */

/** ADM-18: la confirmation déclenche l'exécution asynchrone de la traduction. */
export class TranslationConfirmedEvent {
  constructor(public readonly jobId: string) {}
}
