import React from 'react';
import { Trash2 } from 'lucide-react';
import { designTokens } from '../designTokens';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}: ConfirmDeleteDialogProps) {
  if (!isOpen) return null;

  return (
    <div className={designTokens.modalOverlay}>
      <div className={`${designTokens.modalContent} max-w-sm`}>
        <div className="p-4 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
          </div>
          <div className="flex gap-2.5 justify-center pt-1">
            <button
              onClick={onCancel}
              type="button"
              className={`${designTokens.buttonSecondary} flex-1`}
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              type="button"
              className={`${designTokens.buttonDanger} flex-1`}
            >
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
