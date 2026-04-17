"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface ImageFile {
  name: string;
  path: string;
  publicUrl: string;
  size?: number;
}

export default function AdminPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    const supabase = createClient();
    const folders = ["horizontal", "vertical", "square"];
    let allImages: ImageFile[] = [];

    for (const folder of folders) {
      const { data: files } = await supabase.storage
        .from("images")
        .list(folder, { limit: 100 });

      if (files) {
        const validFiles = files.filter(
          (f) => f.name && !f.name.endsWith("/") && f.name !== ".emptyFolderPlaceholder"
        );

        for (const file of validFiles) {
          const { data } = supabase.storage
            .from("images")
            .getPublicUrl(`${folder}/${file.name}`);

          allImages.push({
            name: file.name,
            path: `${folder}/${file.name}`,
            publicUrl: data.publicUrl,
            size: (file.metadata as Record<string, unknown>)?.size as number | undefined,
          });
        }
      }
    }

    setImages(allImages);
    setLoading(false);
  }, []);

  useEffect(() => {
    setTimeout(() => fetchImages(), 0);

    const supabase = createClient();
    
    const channel = supabase
      .channel("storage-images-admin")
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

  const handleDelete = async (image: ImageFile) => {
    if (!confirm(`¿Estás seguro de eliminar "${image.name}"?`)) return;

    setDeleting(image.path);
    const supabase = createClient();

    const { error } = await supabase.storage
      .from("images")
      .remove([image.path]);

    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      setImages((prev) => prev.filter((i) => i.path !== image.path));
      if (selectedImage?.path === image.path) {
        setSelectedImage(null);
      }
    }

    setDeleting(null);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Administración de Imágenes</h1>

        {images.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-gray-200 p-12 text-center border border-gray-100">
              <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-green-50 to-green-100 rounded-full flex items-center justify-center">
                <span className="text-6xl">📷</span>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-800 mb-4">
                No hay fotos cargadas
              </h1>
              
              <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                Cuando subas fotos desde la página principal, aparecerán aquí para administrar.
              </p>
              
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm">Esperando fotos...</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Vista previa</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Carpeta</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Tamaño</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {images.map((image) => (
                    <tr key={image.path} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedImage(image)}
                          className="w-16 h-16 relative rounded-lg overflow-hidden hover:ring-2 hover:ring-green-500 transition-all"
                        >
                          <img
                            src={image.publicUrl}
                            alt={image.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                          {image.path.split("/")[0]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 text-sm">{formatSize(image.size)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDelete(image)}
                          disabled={deleting === image.path}
                          className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {deleting === image.path ? (
                            <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8"
            onClick={() => setSelectedImage(null)}
          >
            <div className="max-w-5xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={selectedImage.publicUrl}
                alt={selectedImage.name}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
              <div className="text-white text-center mt-4">
                <p className="text-lg">{selectedImage.name}</p>
                <p className="text-gray-400 text-sm">{formatSize(selectedImage.size)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}