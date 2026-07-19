"use client";

import { useEffect, useMemo } from "react";
import { Upload, X } from "lucide-react";
import { Label } from "@/components/ui/label";

export function ExistingImageGrid({ title, images, onRemove }) {
  if (!images?.length) return null;

  return (
    <div className="space-y-3">
      <Label>{title}</Label>
      <div className="grid gap-3 sm:grid-cols-3">
        {images.map((image) => (
          <div key={image.path} className="group relative overflow-hidden rounded-2xl border bg-muted">
            {image.url ? (
              <img src={image.url} alt={title} className="h-40 w-full object-cover transition group-hover:scale-105" />
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Image URL missing</div>
            )}
            <button type="button" onClick={() => onRemove(image.path)} className="absolute right-2 top-2 rounded-full bg-black/75 p-1.5 text-white hover:bg-black" aria-label="Remove image">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewImageUploader({ title, files, setFiles, existingCount, max, error, setError }) {
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => () => previews.forEach((image) => URL.revokeObjectURL(image.url)), [previews]);

  return (
    <div className="space-y-3">
      <div>
        <Label>{title}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{existingCount} existing, {files.length} selected. Max {max} total.</p>
      </div>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed bg-muted/30 p-6 text-center transition hover:bg-muted/50">
        <Upload className="h-7 w-7 text-muted-foreground" />
        <div className="mt-3 text-sm font-medium">Upload images</div>
        <div className="mt-1 text-xs text-muted-foreground">PNG, JPG or WebP</div>
        <input
          className="hidden"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            const selected = Array.from(event.target.files || []);
            if (selected.length + existingCount > max) {
              setError(`${title} can be maximum ${max} images total.`);
              event.target.value = "";
              setFiles([]);
              return;
            }
            setError("");
            setFiles(selected);
          }}
        />
      </label>
      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
      {previews.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {previews.map((image, index) => (
            <div key={`${image.file.name}-${index}`} className="group relative overflow-hidden rounded-2xl border bg-muted">
              <img src={image.url} alt={`${title} ${index + 1}`} className="h-40 w-full object-cover transition group-hover:scale-105" />
              <button type="button" onClick={() => setFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))} className="absolute right-2 top-2 rounded-full bg-black/75 p-1.5 text-white hover:bg-black" aria-label="Remove selected image">
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-2 max-w-[85%] rounded-full bg-black/70 px-2 py-1 text-xs text-white">{image.file.name}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
