/**
 * Client-side audio decoder & resampler using the Web Audio API.
 * Encodes recorded or uploaded audio into 16 kHz mono 16-bit PCM WAV.
 */

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encode16BitPcmWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length minus RIFF identifier & length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // channel count (1 = mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * 1 * 16 / 8)
  view.setUint32(28, sampleRate * 2, true);
  // block align (1 * 16 / 8)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples (clamp float between -1.0 and 1.0 -> 16-bit signed integer)
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

export async function convertTo16kHzMonoWav(blob: Blob): Promise<Blob> {
  if (typeof window === 'undefined') {
    return blob;
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      return blob;
    }

    const audioCtx = new AudioContextClass();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);

    // Resample to 16,000 Hz Mono using OfflineAudioContext
    const targetSampleRate = 16000;
    const targetLength = Math.ceil(decoded.duration * targetSampleRate);
    const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const monoSamples = renderedBuffer.getChannelData(0);

    const wavArrayBuffer = encode16BitPcmWav(monoSamples, targetSampleRate);
    return new Blob([wavArrayBuffer], { type: 'audio/wav' });
  } catch (err) {
    console.warn('Client Web Audio conversion failed, checking fallback formats:', err);
    // If decoding fails, upload original only if wav, mp3, ogg, or mpeg
    if (['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg'].includes(blob.type)) {
      return blob;
    }
    throw new Error(
      'Unable to decode audio. Please ensure the recording is clear or upload an MP3/WAV file.'
    );
  }
}
