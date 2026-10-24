"use client";

import { useRef, useState } from "react";
import { recordImageAction, deleteImageAction, setCoverImageAction } from "@/actions/hotels";
import { createClient } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export type ImageRow = {
  id: string;
  storage_path: string;
  caption: string | null;
  is_cover: boolean;
  signed_url: string | null;
};

export default function ImageUploader({
  locale,
  t,
  hotelId,
  userId,
  images,
}: {
  locale: Locale;
  t: Dictionary;
  hotelId: string;
  userId: string;
  images: ImageRow[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    setError(null);
    const file = files[0];
    if (!file) return;
    if (!ALLOWED.includes(file.type) || file.size > MAX_SIZE) {
      setError(t.errors.uploadFailed);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/${hotelId}/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("hotel-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(t.errors.uploadFailed);
        return;
      }
      const fd = new FormData();
      fd.set("locale", locale);
      fd.set("hotelId", hotelId);
      fd.set("storagePath", path);
      await recordImageAction(null, fd);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{t.partner.uploadHint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="text-sm"
        disabled={uploading}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      {uploading && <p className="text-xs text-slate-500">{t.common.loading}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <div key={img.id} className="rounded-lg border border-slate-200 p-2">
              {img.signed_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.signed_url} alt={img.caption ?? ""} className="h-28 w-full rounded object-cover" />
              ) : (
                <div className="h-28 w-full rounded bg-slate-100" />
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {img.is_cover ? (
                  <span className="badge bg-brand-green-light text-brand-green-dark">{t.partner.cover}</span>
                ) : (
                  <form action={setCoverImageAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="hotelId" value={hotelId} />
                    <input type="hidden" name="imageId" value={img.id} />
                    <button type="submit" className="text-xs text-brand-blue hover:underline">
                      {t.partner.setCover}
                    </button>
                  </form>
                )}
                <form action={deleteImageAction} className="ml-auto">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="hotelId" value={hotelId} />
                  <input type="hidden" name="imageId" value={img.id} />
                  <button type="submit" className="text-xs text-red-600 hover:underline">
                    {t.common.remove}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
