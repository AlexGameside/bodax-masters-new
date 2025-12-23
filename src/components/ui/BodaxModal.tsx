import React, { useEffect } from 'react';

interface BodaxModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidthClassName?: string; // e.g. "max-w-3xl"
  footer?: React.ReactNode;
}

export const BodaxModal: React.FC<BodaxModalProps> = ({
  isOpen,
  title,
  subtitle,
  children,
  onClose,
  maxWidthClassName = 'max-w-3xl',
  footer,
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
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/80"
      />

      <div className="relative h-full w-full overflow-y-auto">
        <div className={`mx-auto ${maxWidthClassName} px-4 py-8`}>
          <div className="relative bg-[#0a0a0a] border border-gray-800 shadow-2xl overflow-hidden">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-600" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-600" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-600" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-600" />

            {/* Header */}
            {(title || subtitle) && (
              <div className="px-6 py-5 border-b border-gray-800 bg-black/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {title && (
                      <h2 className="text-2xl font-bold text-white font-bodax tracking-wide uppercase leading-none">
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <p className="mt-2 text-sm text-gray-400 font-mono tracking-widest uppercase">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-500 hover:text-red-500 transition-colors font-mono text-xl leading-none"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-6">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-5 border-t border-gray-800 bg-black/20">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


