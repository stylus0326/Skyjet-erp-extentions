// Design Tokens and Unified CSS Classes for Skyjet ERP Extension Helper
// This file serves as the single source of truth for UI/UX styles.

export const designTokens = {
  // Common Colors
  colors: {
    primary: "amber-500",
    primaryHover: "amber-600",
    textPrimary: "slate-900",
    textSecondary: "slate-600",
    textMuted: "slate-400",
    borderLight: "slate-200/80",
    borderFocus: "amber-500",
    bgCanvas: "slate-50",
    bgCard: "white",
  },

  // Panels & Containers
  card: "bg-white border border-slate-200/80 rounded-xl p-6",
  
  // Table Styling
  tableContainer: "bg-white border border-slate-200/80 rounded-xl overflow-hidden",
  tableHeader: "bg-slate-50/75 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider",
  tableHeaderCell: "px-3 py-2.5 font-bold uppercase tracking-wider text-slate-500 text-[10px]",
  tableRow: "hover:bg-slate-50/50 transition-colors border-b border-slate-100",
  tableCell: "px-3 py-2 text-[12px] text-slate-700",

  // Form Controls
  input: "block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all",
  label: "block text-xs font-bold text-slate-500 mb-1",
  heading: "text-lg font-bold text-slate-800 flex items-center gap-2",

  // Stats / Parameter Widget
  statCard: "bg-slate-50/50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow",
  statLabel: "text-[10px] font-bold text-slate-500 uppercase tracking-wider",
  statValue: "text-base font-black text-slate-850 mt-1",

  // Buttons
  buttonPrimary: "px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-[0.98] inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
  buttonSecondary: "px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-[0.98] inline-flex items-center justify-center gap-1.5 cursor-pointer",
  buttonIcon: "p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors bg-white flex items-center justify-center cursor-pointer",
  buttonDanger: "px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-[0.98] inline-flex items-center justify-center gap-1.5 cursor-pointer",

  // Modals & Dialogs
  modalOverlay: "fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4",
  modalContent: "bg-white border border-slate-200/80 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all",
  modalHeader: "px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between",
  modalBody: "p-6 space-y-4",
  modalFooter: "px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2",

  // Tabs & Navigation
  tabContainer: "flex gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80",
  tabButtonActive: "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold bg-white text-slate-900 shadow-sm border border-slate-200/50 cursor-pointer transition-all",
  tabButtonInactive: "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-950 hover:bg-slate-200/30 cursor-pointer transition-all",
};
