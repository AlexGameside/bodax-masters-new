import React, { useEffect } from 'react';

interface BodaxFullscreenProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const BodaxFullscreen: React.FC<BodaxFullscreenProps> = ({
  isOpen,
  title,
  subtitle,
  children,
  onClose
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#050505]">
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Header */}
      <div className="relative border-b border-gray-800 bg-black/40 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white font-bodax tracking-wide uppercase leading-none">
              {title}
            </h2>
            {subtitle && (
              <div className="mt-2 text-sm text-gray-400 font-mono uppercase tracking-widest">
                {subtitle}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 font-bodax text-xl uppercase tracking-wider transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative h-[calc(100vh-73px)] overflow-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
};


