"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";

type UploadStatus = "idle" | "compressing" | "uploading" | "success" | "error";

export default function HomePage() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [uploadCount, setUploadCount] = useState(0);
  const [currentUpload, setCurrentUpload] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  };

  const getOrientation = async (
    file: File,
  ): Promise<"horizontal" | "vertical" | "square"> => {
    return new Promise((resolve) => {
      const img = document.createElement("img");
      img.onload = () => {
        const orientation =
          img.naturalWidth > img.naturalHeight
            ? "horizontal"
            : img.naturalWidth < img.naturalHeight
              ? "vertical"
              : "square";
        URL.revokeObjectURL(img.src);
        resolve(orientation);
      };
      img.onerror = () => resolve("square");
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadFile = async (file: File) => {
    const supabase = getSupabase();
    const orientation = await getOrientation(file);
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.[^.]+$/, ".webp")}`;
    const filePath = `${orientation}/${fileName}`;

    const { error } = await supabase.storage
      .from("images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;
  };

  const clearMessages = () => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    clearMessages();
    const count = files.length;
    setUploadCount(count);
    setStatus("compressing");

    try {
      for (let i = 0; i < Array.from(files).length; i++) {
        setCurrentUpload(i + 1);
        setStatus(i === 0 ? "compressing" : "uploading");

        const file = Array.from(files)[i];

        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: "image/webp",
        });

        setStatus("uploading");
        await uploadFile(compressedFile);
      }

      setStatus("success");
      setSuccessMessage(
        `${count} ${count === 1 ? "foto subida" : "fotos subidas"} correctamente`,
      );

      successTimeoutRef.current = setTimeout(() => {
        setStatus("idle");
        setSuccessMessage(null);
      }, 4000);
    } catch (error) {
      console.error("Upload error:", error);
      setStatus("error");
      setErrorMessage("Error al subir las fotos. Intenta de nuevo.");

      setTimeout(() => {
        setStatus("idle");
        setErrorMessage(null);
      }, 5000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const isProcessing = status === "compressing" || status === "uploading";

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-gray-800 mb-3">📸</h1>
          <p className="text-gray-500 text-lg">
            Sube tus fotos para el recuerdo
          </p>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`
            relative rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 min-h-[320px] flex flex-col items-center justify-center border-4 border-dashed shadow-lg
            ${
              dragOver
                ? "border-green-500 bg-green-50 scale-[1.02]"
                : status === "error"
                  ? "border-red-400 bg-red-50"
                  : status === "success"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
            }
            ${isProcessing ? "cursor-wait" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          {isProcessing ? (
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin" />
                <span className="absolute inset-0 flex items-center justify-center text-2xl">
                  {status === "compressing" ? "📦" : "☁️"}
                </span>
              </div>
              <p className="text-gray-700 text-xl font-semibold">
                {status === "compressing" ? "Comprimiendo..." : "Subiendo..."}
              </p>
              <p className="text-gray-500 text-lg">
                {currentUpload} de {uploadCount}
              </p>
              <div className="w-56 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300"
                  style={{ width: `${(currentUpload / uploadCount) * 100}%` }}
                />
              </div>
            </div>
          ) : status === "success" ? (
            <div className="flex flex-col items-center gap-5">
              <span className="text-7xl">✨</span>
              <p className="text-green-600 text-2xl font-bold">
                {successMessage}
              </p>
              <p className="text-gray-500">
                Puedes cerrar esta ventana o subir más fotos
              </p>
            </div>
          ) : status === "error" ? (
            <div className="flex flex-col items-center gap-5">
              <span className="text-7xl">❌</span>
              <p className="text-red-600 text-2xl font-bold">{errorMessage}</p>
              <p className="text-gray-500">
                Haz clic aquí para intentar de nuevo
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <span className="text-7xl">📁</span>
              <p className="text-gray-800 text-2xl font-semibold">
                Arrastra tus fotos aquí
              </p>
              <p className="text-gray-500 text-lg">
                o haz clic para seleccionar
              </p>
              <div className="mt-3 flex items-center gap-2 text-gray-400 text-sm bg-white px-4 py-2 rounded-full shadow-sm">
                <span>✓</span>
                <span>Fotos comprimidas automáticamente</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
