import React, { useState } from 'react';
import { PhotoMemory } from '../types';
import { Camera, Maximize2, X, Sparkles } from 'lucide-react';

interface MemoriesGalleryProps {
  photos: PhotoMemory[];
}

export default function MemoriesGallery({ photos }: MemoriesGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMemory | null>(null);

  return (
    <section id="memories" className="py-20 px-6 max-w-6xl mx-auto space-y-12">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
          <Camera className="w-3.5 h-3.5 text-purple-400" />
          <span>Interactive Photo Album</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Little Moments, Big Memories 📸
        </h2>
        <p className="text-sm text-purple-200/70 max-w-lg mx-auto">
          Hover over any photo to inspect or tap to enlarge in full-screen lightbox.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {photos.map((photo) => (
          <div
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-all duration-300 shadow-xl cursor-pointer hover:-translate-y-1"
          >
            <div className="aspect-[4/5] overflow-hidden relative">
              <img
                src={photo.url}
                alt={photo.caption}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
            </div>

            <div className="absolute bottom-0 inset-x-0 p-4 space-y-1 text-slate-100">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest bg-slate-950/80 px-2 py-0.5 rounded-md border border-amber-500/20">
                {photo.date}
              </span>
              <p className="font-semibold text-sm leading-snug">{photo.caption}</p>
            </div>

            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-950/70 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 border border-purple-500/30 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption}
              className="w-full max-h-[65vh] object-contain rounded-2xl bg-slate-950"
            />

            <div className="flex items-center justify-between pt-2 text-slate-200">
              <div className="space-y-1">
                <h3 className="font-bold text-lg">{selectedPhoto.caption}</h3>
                <p className="text-xs text-purple-300 font-mono">{selectedPhoto.date}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cherished Memory</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
