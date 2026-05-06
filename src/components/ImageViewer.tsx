import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, isOpen, onClose, alt }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out"
        >
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X size={24} />
          </motion.button>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center overflow-hidden rounded-[2rem] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={src} 
              alt={alt || 'Product View'} 
              className="max-w-full max-h-full object-contain select-none"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const ImageThumbnail: React.FC<{ 
  src: string; 
  onClick: (e: React.MouseEvent) => void; 
  className?: string;
  alt?: string;
}> = ({ src, onClick, className, alt }) => {
  return (
    <div className={`relative group cursor-zoom-in ${className}`}>
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      <div 
        onClick={onClick}
        className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
      >
        <ZoomIn className="text-white" size={20} />
      </div>
    </div>
  );
};
