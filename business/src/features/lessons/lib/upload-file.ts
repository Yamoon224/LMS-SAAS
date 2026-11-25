export class UploadAbortedError extends Error {
  constructor() {
    super("Téléversement annulé.");
    this.name = "UploadAbortedError";
  }
}

/**
 * Envoi direct du fichier vers l'URL présignée (PUT), avec progression et annulation. XMLHttpRequest plutôt que fetch :
 * seul XHR expose la progression de l'envoi. Le bucket doit autoriser l'origine de l'application (CORS, PUT).
 */
export function uploadFileToUrl(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new UploadAbortedError());
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`L'envoi du fichier a échoué (code ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("L'envoi du fichier a échoué (réseau ou autorisation du stockage)."));
    xhr.onabort = () => reject(new UploadAbortedError());
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
