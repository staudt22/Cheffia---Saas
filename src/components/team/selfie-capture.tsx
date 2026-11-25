"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RefreshCw, Upload } from "lucide-react";
import { DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Takes a selfie with the device's front camera (or the photo picker as a fallback)
 * and hands back a JPEG blob. Nothing is uploaded here.
 */
export function SelfieCapture({ kind, busy, onConfirm, onCancel }: {
  kind: "in" | "out"; busy: boolean; onConfirm: (photo: Blob) => void; onCancel: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<"starting" | "live" | "denied" | "unsupported">("starting");
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);

  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setState("unsupported"); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
      stream.current = s;
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
      setState("live");
    } catch (e) {
      setState((e as DOMException)?.name === "NotAllowedError" ? "denied" : "unsupported");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void startCamera(), 0);
    return () => { window.clearTimeout(t); stop(); };
  }, [startCamera]);
  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);

  function take() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const size = Math.min(v.videoWidth, v.videoHeight);
    const c = document.createElement("canvas");
    c.width = 480; c.height = 480;
    const ctx = c.getContext("2d")!;
    // mirror, like the preview, and crop to a centred square
    ctx.translate(480, 0); ctx.scale(-1, 1);
    ctx.drawImage(v, (v.videoWidth - size) / 2, (v.videoHeight - size) / 2, size, size, 0, 0, 480, 480);
    c.toBlob((b) => { if (b) setShot({ blob: b, url: URL.createObjectURL(b) }); }, "image/jpeg", 0.82);
  }

  async function fromFile(f: File | undefined) {
    if (!f) return;
    const bmp = await createImageBitmap(f).catch(() => null);
    if (!bmp) return;
    const size = Math.min(bmp.width, bmp.height);
    const c = document.createElement("canvas");
    c.width = 480; c.height = 480;
    c.getContext("2d")!.drawImage(bmp, (bmp.width - size) / 2, (bmp.height - size) / 2, size, size, 0, 0, 480, 480);
    c.toBlob((b) => { if (b) setShot({ blob: b, url: URL.createObjectURL(b) }); }, "image/jpeg", 0.82);
  }

  const verb = kind === "in" ? "entrada" : "saída";

  return (
    <DialogContent size="sm" title={`Selfie da ${verb}`} description="A foto confirma que é você batendo o ponto. Só você e o gerente conseguem ver."
      footer={shot ? (
        <>
          <Button variant="ghost" onClick={() => setShot(null)} disabled={busy}><RefreshCw /> Tirar outra</Button>
          <Button variant="primary" size="lg" loading={busy} onClick={() => onConfirm(shot.blob)}>Confirmar {verb}</Button>
        </>
      ) : (
        <>
          <Button variant="ghost" onClick={() => { stop(); onCancel(); }}>Cancelar</Button>
          {state === "live" && <Button variant="primary" size="lg" onClick={take}><Camera /> Tirar foto</Button>}
        </>
      )}>
      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-surface-3 ring-1 ring-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {shot && <img src={shot.url} alt="Sua selfie" className="absolute inset-0 size-full object-cover" />}
        <video ref={video} playsInline muted className={shot || state !== "live" ? "hidden" : "absolute inset-0 size-full -scale-x-100 object-cover"} />
        {!shot && state === "live" && <div className="pointer-events-none absolute inset-[12%] rounded-full border-2 border-dashed border-white/50" aria-hidden />}
        {!shot && state === "starting" && <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-3">Abrindo a câmera…</p>}
        {!shot && (state === "denied" || state === "unsupported") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
            <CameraOff className="size-8 text-ink-3" />
            <p className="text-sm text-ink-2">
              {state === "denied"
                ? "A câmera está bloqueada. Toque no cadeado ao lado do endereço do site e permita a câmera, ou use o botão abaixo."
                : "Não conseguimos abrir a câmera aqui. Use o botão abaixo para tirar a foto."}
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground">
              <Upload className="size-4" /> Tirar ou escolher foto
              <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => void fromFile(e.target.files?.[0])} />
            </label>
            {state === "denied" && <Button size="sm" variant="ghost" onClick={() => void startCamera()}>Tentar de novo</Button>}
          </div>
        )}
      </div>
      {!shot && state === "live" && <p className="mt-3 text-center text-sm text-ink-3">Centralize o rosto no círculo e toque em “Tirar foto”.</p>}
      {shot && <p className="mt-3 text-center text-sm text-ink-3">Ficou boa? Confirme para registrar a {verb}.</p>}
    </DialogContent>
  );
}
