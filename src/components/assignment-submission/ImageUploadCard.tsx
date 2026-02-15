import React, { useEffect, useRef, useState } from "react";

type ImageUploadCardProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  errorMessage?: string | null;
};

const MAX_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const ImageUploadCard = ({ file, onFileChange, errorMessage }: ImageUploadCardProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const validateFile = (candidate: File) => {
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      return "Please upload a JPG, PNG, or WEBP image.";
    }
    if (candidate.size > MAX_SIZE) {
      return "That image is too big. Please keep it under 8MB.";
    }
    return null;
  };

  const handleFile = (candidate: File | null) => {
    if (!candidate) {
      setLocalError(null);
      onFileChange(null);
      return;
    }

    const validation = validateFile(candidate);
    if (validation) {
      setLocalError(validation);
      onFileChange(null);
      return;
    }

    setLocalError(null);
    onFileChange(candidate);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0] || null;
    handleFile(dropped);
  };

  return (
    <div className="rounded-3xl border border-dashed border-teal-300 bg-white/80 p-6 shadow-lg">
      <div
        className="flex flex-col items-center justify-center gap-4 text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="rounded-full bg-teal-100 px-4 py-1 text-sm font-semibold text-teal-700">
          Handwritten Upload
        </div>
        <p className="text-sm text-slate-600">
          Drag and drop your photo here, or click to choose a file.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-teal-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-teal-600"
        >
          Choose Photo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0] || null)}
        />
      </div>

      {(errorMessage || localError) && (
        <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {errorMessage || localError}
        </p>
      )}

      {file && (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Preview</p>
            <button
              type="button"
              onClick={() => handleFile(null)}
              className="text-sm font-semibold text-rose-600"
            >
              Remove
            </button>
          </div>
          <img
            src={previewUrl || ""}
            alt="Uploaded preview"
            className="mt-3 h-48 w-full rounded-2xl object-cover"
          />
        </div>
      )}
    </div>
  );
};
