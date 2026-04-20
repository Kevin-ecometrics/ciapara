"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

export default function Slideshow() {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [slideDuration, setSlideDuration] = useState(7);
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const fetchedRef = useRef(false);

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
    const supabase = createClient();
    
    setTimeout(() => fetchImages(), 0);

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
          setTimeout(() => fetchImages(), 100);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchImages();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchImages]);

  const goToNext = useCallback(() => {
    if (transitioning || images.length === 0) return;
    setTransitioning(true);
    setProgress(0);
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setTimeout(() => setTransitioning(false), 500);
  }, [images.length, transitioning]);

  const goToPrev = useCallback(() => {
    if (transitioning || images.length === 0) return;
    setTransitioning(true);
    setProgress(0);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setTimeout(() => setTransitioning(false), 500);
  }, [images.length, transitioning]);
  
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!isPlaying || images.length === 0) return;

    let startTime = Date.now();
    let rafId: number;
    progressRef.current = 0;
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      progressRef.current = Math.min((elapsed / (slideDuration * 1000)) * 100, 100);
      setProgress(progressRef.current);
      
      if (progressRef.current < 100) {
        rafId = requestAnimationFrame(updateProgress);
      }
    };
    
    rafId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isPlaying, images.length, slideDuration, currentIndex]);

  useEffect(() => {
    if (!isPlaying || images.length === 0) return;

    const timeout = setTimeout(() => {
      goToNext();
    }, slideDuration * 1000);

    return () => clearTimeout(timeout);
  }, [isPlaying, images.length, slideDuration, currentIndex, goToNext]);

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
        case "s":
        case "S":
          setShowSettings(true);
          break;
        case "Escape":
          setShowSettings(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, togglePlay]);

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
        </div>
      </div>
    );
  }

  const safeIndex = images.length > 0 && currentIndex >= images.length ? 0 : currentIndex;
  const currentImage = images[safeIndex];

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
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

        {!isPlaying && (
          <>
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
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <div className="flex items-center justify-center text-xs gap-4">
          <span className="flex items-center gap-1 text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono text-[10px]">←→</kbd>
            <span className="text-gray-400">Navegar</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1 text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono text-[10px]">Espacio</kbd>
            <span className="text-gray-400">Play/Pausa</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1 text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono text-[10px]">F</kbd>
            <span className="text-gray-400">Fullscreen</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1 text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono text-[10px]">S</kbd>
            <span className="text-gray-400">Ajustes</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-2 text-gray-600">
            <span className="font-semibold">{safeIndex + 1}</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-500">{images.length}</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1">
            {isPlaying ? (
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            ) : (
              <span className="w-2 h-2 bg-gray-400 rounded-full" />
            )}
            <span className={isPlaying ? "text-green-600 font-medium" : "text-gray-500"}>
              {isPlaying ? "Play" : "Pausa"}
            </span>
          </span>
          {isPlaying && (
            <>
              <span className="text-gray-300">|</span>
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {showSettings && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 w-80 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6">Configuración</h3>
            
            <div className="mb-6">
              <label className="block text-gray-600 text-sm mb-2">
                Tiempo por slide (segundos)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={slideDuration}
                  onChange={(e) => setSlideDuration(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-gray-800 font-semibold w-8">{slideDuration}s</span>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
