/**
 * PUB-09 : adresse affichée dans la visionneuse PDF intégrée. Le fragment `#toolbar=0…` demande aux visionneuses
 * natives de masquer leur barre (donc le bouton de téléchargement) quand le téléchargement n'est pas autorisé.
 * Ce n'est pas une protection : c'est un confort, la règle de fond reste de ne proposer aucun lien de téléchargement.
 */
export function pdfViewerSrc(url: string, downloadAllowed: boolean): string {
  const base = url.split("#")[0] ?? url;
  return downloadAllowed ? `${base}#view=FitH` : `${base}#toolbar=0&navpanes=0&view=FitH`;
}
