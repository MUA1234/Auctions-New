'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@singha/ui';

/**
 * §4 — in-browser live camera capture for the seller listing flow. Opens the device camera via
 * `getUserMedia` (rear camera preferred on phones), previews the live feed, and captures a still
 * frame to a real JPEG `File` that flows through the SAME immutable-original upload pipeline as a
 * picked photo (pack rule 4: original media is immutable). Everything is local to the browser —
 * no frame ever leaves the device until the seller uploads it, and the stream is always stopped
 * when the panel closes or unmounts (no camera left running). Degrades gracefully where the API
 * is unavailable or permission is denied, pointing the seller back to file upload.
 */
export function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(
    async (mode: 'environment' | 'user') => {
      setError(null);
      setReady(false);
      stop();
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError(
          'This device or browser does not support in-app camera capture. Upload a photo instead.',
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (e) {
        const name = (e as { name?: string })?.name;
        setError(
          name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in your browser, or upload a photo instead.'
            : name === 'NotFoundError'
              ? 'No camera was found on this device. Upload a photo instead.'
              : 'Could not start the camera. Upload a photo instead.',
        );
      }
    },
    [stop],
  );

  useEffect(() => {
    void start(facing);
    return stop;
    // start/stop are stable; re-run only when the selected camera changes.
  }, [facing, start, stop]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setBusy(true);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setBusy(false);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      },
      'image/jpeg',
      0.92,
    );
  }, [onCapture]);

  return (
    <div className="rounded-xl border border-white/10 bg-coal-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-bone-200">Take a photo</span>
        <button
          type="button"
          onClick={() => {
            stop();
            onClose();
          }}
          className="text-xs text-bone-400 hover:text-bone"
        >
          Close camera
        </button>
      </div>

      {error ? (
        <p className="rounded-md bg-outbid/10 px-3 py-4 text-sm text-outbid">{error}</p>
      ) : (
        <div className="relative overflow-hidden rounded-lg bg-black">
          {/* muted + playsInline so mobile browsers show the live feed inline without going fullscreen. */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-[4/3] w-full object-cover"
            aria-label="Live camera preview"
          />
          {!ready && (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-bone-400">
              Starting camera…
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button variant="gold" onClick={capture} disabled={!ready || busy}>
          {busy ? 'Capturing…' : 'Capture photo'}
        </Button>
        <Button
          variant="outline"
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          disabled={!ready}
        >
          Switch camera
        </Button>
      </div>
    </div>
  );
}
