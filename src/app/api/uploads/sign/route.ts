import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getServiceSupabase, mediaUrl } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const SignRequestSchema = z.object({
  kind: z.enum(['image', 'video', 'audio', 'after']),
  contentType: z.string().min(1),
  size: z.number().positive(),
});

// Allowed MIME types and max size limits in bytes
const ALLOWED_MIME_TYPES: Record<string, { extensions: string[]; maxSize: number }> = {
  // Images up to 8 MB
  'image/jpeg': { extensions: ['jpg', 'jpeg'], maxSize: 8 * 1024 * 1024 },
  'image/png': { extensions: ['png'], maxSize: 8 * 1024 * 1024 },
  'image/webp': { extensions: ['webp'], maxSize: 8 * 1024 * 1024 },
  'image/heic': { extensions: ['heic'], maxSize: 8 * 1024 * 1024 },
  'image/heif': { extensions: ['heif'], maxSize: 8 * 1024 * 1024 },

  // Audio up to 5 MB
  'audio/wav': { extensions: ['wav'], maxSize: 5 * 1024 * 1024 },
  'audio/x-wav': { extensions: ['wav'], maxSize: 5 * 1024 * 1024 },
  'audio/mp3': { extensions: ['mp3'], maxSize: 5 * 1024 * 1024 },
  'audio/mpeg': { extensions: ['mp3'], maxSize: 5 * 1024 * 1024 },
  'audio/ogg': { extensions: ['ogg'], maxSize: 5 * 1024 * 1024 },
  'audio/webm': { extensions: ['webm'], maxSize: 5 * 1024 * 1024 },

  // Video up to 10 MB
  'video/mp4': { extensions: ['mp4'], maxSize: 10 * 1024 * 1024 },
  'video/webm': { extensions: ['webm'], maxSize: 10 * 1024 * 1024 },
  'video/quicktime': { extensions: ['mov'], maxSize: 10 * 1024 * 1024 },
};

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(ip, 'sign');

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Rate limit reached for uploads. Please retry in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = SignRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid upload request parameters.',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { kind, contentType, size } = parsed.data;

    // Check MIME type whitelist
    const mimeConfig = ALLOWED_MIME_TYPES[contentType.toLowerCase()];
    if (!mimeConfig) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unsupported file format (${contentType}). Please upload JPEG/PNG/WebP images, WAV/MP3 audio, or MP4 video.`,
        },
        { status: 400 }
      );
    }

    // Check size cap
    if (size > mimeConfig.maxSize) {
      const maxMb = Math.round(mimeConfig.maxSize / (1024 * 1024));
      return NextResponse.json(
        {
          ok: false,
          error: `File size exceeds the allowed limit of ${maxMb} MB.`,
        },
        { status: 400 }
      );
    }

    const ext = mimeConfig.extensions[0] || 'bin';
    const fileId = nanoid(16);
    const folder = kind === 'after' ? 'after' : 'reports';
    const path = `${folder}/${fileId}.${ext}`;

    const supabase = getServiceSupabase();
    const bucket = process.env.SUPABASE_BUCKET || 'civic-media';

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error('Failed to create signed upload URL in Supabase:', error);
      return NextResponse.json(
        {
          ok: false,
          error: 'Storage service unavailable. Please try again shortly.',
        },
        { status: 500 }
      );
    }

    const publicUrl = mediaUrl(path);

    return NextResponse.json({
      ok: true,
      data: {
        path,
        token: data.token,
        signedUrl: data.signedUrl,
        publicUrl,
      },
    });
  } catch (error) {
    console.error('Unexpected error in /api/uploads/sign:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error during upload authorization.' },
      { status: 500 }
    );
  }
}
