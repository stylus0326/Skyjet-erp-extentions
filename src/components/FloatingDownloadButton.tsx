import React, { useState } from 'react';
import JSZip from 'jszip';
import { extensionFiles } from '../data';
import { iconBase64 } from '../iconData';
import { Download, Loader2, Check } from 'lucide-react';

export default function FloatingDownloadButton() {
  const [downloading, setDownloading] = useState(false);
  const [ready, setReady] = useState(false);

  const generateIconBlob = (size: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob((blob) => {
          resolve(blob || new Blob());
        }, 'image/png');
      };
      img.onerror = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#2aa7dd';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        canvas.toBlob((blob) => {
          resolve(blob || new Blob());
        }, 'image/png');
      };
      img.src = iconBase64;
    });
  };

  const handleDownloadZip = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      const zip = new JSZip();

      // Append code text files
      extensionFiles.forEach((file) => {
        zip.file(file.path, file.content);
      });

      // Append icons
      const iconsFolder = zip.folder('icons')!;
      
      const blob16 = await generateIconBlob(16);
      const blob48 = await generateIconBlob(48);
      const blob128 = await generateIconBlob(128);

      iconsFolder.file('icon16.png', blob16);
      iconsFolder.file('icon48.png', blob48);
      iconsFolder.file('icon128.png', blob128);

      // Generate the package ZIP
      const content = await zip.generateAsync({ type: 'blob' });

      // Trigger standard browser download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'skyjet-erp-helper-extension.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setReady(true);
      setTimeout(() => setReady(false), 3000);
    } catch (err) {
      console.error('Lỗi đóng gói Extension ZIP: ', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={handleDownloadZip}
        disabled={downloading}
        className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl border border-white/10 cursor-pointer transition-colors duration-205 ${
          ready 
            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' 
            : 'bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 shadow-indigo-600/20'
        }`}
        title="Tải Tiện ích Chrome (.ZIP)"
      >
        {downloading ? (
          <Loader2 size={20} className="animate-spin text-white" />
        ) : ready ? (
          <Check size={20} className="text-white" />
        ) : (
          <Download size={20} className="text-white" />
        )}
      </button>
    </div>
  );
}
