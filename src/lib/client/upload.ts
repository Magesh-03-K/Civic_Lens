/**
 * Direct-to-storage client upload helper.
 * Requests a signed upload URL from /api/uploads/sign, then uploads the file directly
 * to Supabase Storage, bypassing Vercel's 4.5 MB request limit.
 */
export async function uploadMediaDirect(
  blob: Blob | File,
  kind: 'image' | 'video' | 'audio' | 'after',
  contentType: string
): Promise<{ mediaPath: string; publicUrl: string }> {
  // Step 1: Request signed upload token and path
  const signResponse = await fetch('/api/uploads/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kind,
      contentType,
      size: blob.size,
    }),
  });

  const signJson = await signResponse.json();

  if (!signResponse.ok || !signJson.ok) {
    throw new Error(signJson.error || 'Failed to authorize storage upload.');
  }

  const { path, signedUrl, publicUrl } = signJson.data;

  // Step 2: Upload directly to Supabase storage signed URL
  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error('Direct upload to storage failed. Please check network connection.');
  }

  return {
    mediaPath: path,
    publicUrl,
  };
}
