"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

export default function Slideshow() {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const fetchedRef = useRef(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchImages = useCallback(async () => {
    const supabase = createClient();
    const folders = ["horizontal", "vertical", "square"];
    let allFiles: { name: string }[] = [];

    for (const folder of folders) {
      const { data: files } = await supabase.storage
        .from("images")
        .list(folder, { limit: 100 });
      
      if (files) {
        const validFiles = files.filter(f => 
          f.name && 
          !f.name.endsWith("/") && 
          f.name !== ".emptyFolderPlaceholder"
        );
        allFiles = [...allFiles, ...validFiles.map(f => ({ name: `${folder}/${f.name}` }))];
      }
    }

    const urls = allFiles
      .filter((file) => file.name && !file.name.endsWith("/"))
      .map((file) => {
        const { data: { publicUrl } } = supabase.storage
          .from("images")
          .getPublicUrl(file.name);
        return publicUrl;
      });

    setImages(urls);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchImages();

    const supabase = createClient();
    
    const channel = supabase
      .channel("storage-images")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "storage",
          table: "objects",
          filter: "bucket_id=eq.images",
        },
        () => {
          fetchImages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchImages]);

  const hideControlsTemporarily = useCallback(() => {
    setShowControls(false);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(true);
    }, 3000);
  }, []);

  const goToNext = useCallback(() => {
    if (transitioning || images.length === 0) return;
    setTransitioning(true);
    hideControlsTemporarily();
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setTimeout(() => setTransitioning(false), 500);
  }, [images.length, transitioning, hideControlsTemporarily]);

  const goToPrev = useCallback(() => {
    if (transitioning || images.length === 0) return;
    setTransitioning(true);
    hideControlsTemporarily();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setTimeout(() => setTransitioning(false), 500);
  }, [images.length, transitioning, hideControlsTemporarily]);
  
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
    hideControlsTemporarily();
  }, [hideControlsTemporarily]);

  useEffect(() => {
    if (!isPlaying || images.length === 0) return;

    const interval = setInterval(goToNext, 7000);
    return () => clearInterval(interval);
  }, [isPlaying, images.length, goToNext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          goToNext();
          break;
        case "ArrowLeft":
          goToPrev();
          break;
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
        case "F":
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, togglePlay]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mb-6" />
        <p className="text-gray-600 text-xl">Cargando fotos...</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-gray-200 p-12 text-center border border-gray-100">
          <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-green-50 to-green-100 rounded-full flex items-center justify-center">
            <span className="text-6xl">📷</span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Aquí se mostrarán las fotos
          </h1>
          
          <p className="text-gray-500 text-lg mb-8 leading-relaxed">
            Cuando subas fotos desde la página de subida, aparecerán aquí automáticamente en forma de slideshow.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm">Esperando fotos...</span>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100">
            <Link
              href="/"
              className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-500 text-white text-lg font-semibold rounded-full transition-all hover:scale-105 shadow-lg shadow-green-600/20"
            >
              <span className="text-xl">📸</span>
              Subir Fotos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const safeIndex = images.length > 0 && currentIndex >= images.length ? 0 : currentIndex;
  const currentImage = images[safeIndex];

  return (
    <div 
      className="fixed inset-0 bg-white flex flex-col cursor-pointer"
      onClick={hideControlsTemporarily}
    >
      <div className="flex-1 relative flex items-center justify-center">
        <div
          className={`
            relative w-full h-full transition-opacity duration-500
            ${transitioning ? "opacity-0" : "opacity-100"}
          `}
          style={{ maxWidth: "100vw", maxHeight: "100vh" }}
        >
          <Image
            key={safeIndex}
            src={currentImage}
            alt={`Foto ${safeIndex + 1} de ${images.length}`}
            fill
            className="object-contain"
            priority
            sizes="100vw"
          />
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); goToPrev(); }}
          className="absolute left-6 p-5 bg-gray-900/60 hover:bg-gray-900/80 rounded-full transition-all text-white hover:scale-110"
          aria-label="Foto anterior"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); goToNext(); }}
          className="absolute right-6 p-5 bg-gray-900/60 hover:bg-gray-900/80 rounded-full transition-all text-white hover:scale-110"
          aria-label="Siguiente foto"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div
        className={`
          absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white via-white to-transparent transition-all duration-300
          ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
        `}
      >
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="p-4 bg-gray-900 hover:bg-gray-800 rounded-full transition-all text-white shadow-lg"
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="flex items-center gap-1">
            <span className="text-gray-800 text-2xl font-bold">
              {safeIndex + 1}
            </span>
            <span className="text-gray-400 text-lg mx-1">/</span>
            <span className="text-gray-500 text-lg">
              {images.length}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                document.documentElement.requestFullscreen();
              }
            }}
            className="p-4 bg-gray-900 hover:bg-gray-800 rounded-full transition-all text-white shadow-lg"
            aria-label="Pantalla completa"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>

        <div className="flex justify-center mt-6 gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setTransitioning(true);
                setCurrentIndex(index);
                setTimeout(() => setTransitioning(false), 500);
              }}
              className={`
                h-1.5 rounded-full transition-all
                ${index === safeIndex ? "bg-gray-800 w-8" : "bg-gray-300 hover:bg-gray-400 w-1.5"}
              `}
              aria-label={`Ir a foto ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
