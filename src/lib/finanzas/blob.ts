import { put } from "@vercel/blob";

// Sube el PDF del estado de cuenta a Vercel Blob. Si no hay token configurado,
// devuelve null y el import sigue sin adjunto (el PDF es referencia, no fuente).
export async function uploadStatementPdf(
  ownerId: string,
  file: File,
): Promise<{ url: string; pathname: string } | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const blob = await put(`statements/${ownerId}/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: "application/pdf",
  });
  return { url: blob.url, pathname: blob.pathname };
}
