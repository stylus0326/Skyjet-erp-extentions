import React from 'react';

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  ...props
}) => {
  let baseColors = 'bg-[#4727B5] text-white border border-[#4727B5]';
  let span1Color = 'bg-[#381e9c]';
  let span2Color = 'bg-[#29127d]';

  if (variant === 'danger') {
    baseColors = 'bg-rose-600 text-white border border-rose-600';
    span1Color = 'bg-rose-700';
    span2Color = 'bg-rose-900';
  } else if (variant === 'secondary') {
    baseColors = 'bg-zinc-900 text-zinc-350 border border-zinc-800 hover:text-zinc-100';
    span1Color = 'bg-zinc-850';
    span2Color = 'bg-zinc-800';
  }

  let sizeClass = 'px-3.5 h-9 text-xs font-bold';
  if (size === 'sm') {
    sizeClass = 'px-2.5 h-7.5 text-[10px] font-bold';
  } else if (size === 'lg') {
    sizeClass = 'px-6 h-12 text-sm font-bold';
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={`relative overflow-hidden group z-10 duration-1000 rounded-lg transition-all flex items-center justify-center gap-1.5 active:scale-97 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none shrink-0 ${baseColors} ${sizeClass} ${className}`}
      {...props}
    >
      {!disabled && (
        <>
          <span
            className={`absolute ${span1Color} w-[200%] aspect-square rounded-full group-hover:scale-100 scale-0 -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:duration-500 duration-700 origin-center transform transition-all`}
          />
          <span
            className={`absolute ${span2Color} w-[200%] aspect-square rounded-full group-hover:scale-100 scale-0 -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:duration-700 duration-500 origin-center transform transition-all`}
          />
        </>
      )}
      {children}
    </button>
  );
};
