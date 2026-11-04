import React from "react";

export type LogoSize = 'sm' | 'md' | 'lg' | 'responsive';

interface PPFLogoProps {
  className?: string;
  onClick?: () => void;
  size?: LogoSize | string;
  [key: string]: any;
}

export const Logo: React.FC<PPFLogoProps> = ({
  className = "",
  onClick,
  size = 'responsive',
  ...props
}) => {
  // Size Configurations for responsive, sm, md, lg (Mobile & Desktop responsive)
  // Preserves 100% exact design, gradients, colors, typography and proportions
  const sizeMap = {
    responsive: {
      container: 'px-2.5 py-1 sm:px-3 sm:py-1 md:px-3.5 md:py-1.5 gap-2 sm:gap-2 md:gap-2.5 rounded-xl',
      pText: 'text-2xl sm:text-2xl md:text-3xl font-black',
      pShadow: 'drop-shadow-[0_2px_8px_rgba(56,189,248,0.3)]',
      stackedBox: 'h-5 sm:h-5 md:h-6 text-[7.5px] sm:text-[8px] md:text-[9.5px] pl-0.5',
      divider: 'h-4 sm:h-4 md:h-5 w-[1.5px]',
      familiaText: 'text-sm sm:text-sm md:text-base font-black',
      familiaShadow: 'drop-shadow-[0_2px_8px_rgba(249,115,22,0.25)]',
      subText: 'text-[6px] sm:text-[6.5px] md:text-[7px] -mt-0.5',
    },
    sm: {
      container: 'px-2 py-0.5 sm:px-2.5 sm:py-1 gap-1.5 sm:gap-2 rounded-xl',
      pText: 'text-2xl md:text-3xl font-black',
      pShadow: 'drop-shadow-[0_2px_6px_rgba(56,189,248,0.3)]',
      stackedBox: 'h-5 md:h-6 text-[7.5px] md:text-[9px] pl-0.5',
      divider: 'h-4 md:h-5 w-[1.5px]',
      familiaText: 'text-sm md:text-base font-black',
      familiaShadow: 'drop-shadow-[0_2px_6px_rgba(249,115,22,0.25)]',
      subText: 'text-[6px] md:text-[7px] -mt-0.5',
    },
    md: {
      container: 'px-3.5 py-1.5 md:px-4 md:py-1.5 gap-2.5 md:gap-3 rounded-xl sm:rounded-2xl',
      pText: 'text-3xl font-black',
      pShadow: 'drop-shadow-[0_2px_10px_rgba(56,189,248,0.3)]',
      stackedBox: 'h-6 sm:h-7 text-[9px] sm:text-[10px] pl-0.5',
      divider: 'h-5 sm:h-5.5 w-[1.5px] sm:w-[2px]',
      familiaText: 'text-base sm:text-lg font-black',
      familiaShadow: 'drop-shadow-[0_2px_10px_rgba(249,115,22,0.25)]',
      subText: 'text-[7px] sm:text-[7.5px] -mt-0.5',
    },
    lg: {
      container: 'px-5 py-2.5 sm:px-6 sm:py-3 gap-3.5 sm:gap-4 rounded-2xl sm:rounded-3xl',
      pText: 'text-4xl sm:text-5xl font-black',
      pShadow: 'drop-shadow-[0_2px_14px_rgba(56,189,248,0.35)]',
      stackedBox: 'h-8 sm:h-10 text-[10px] sm:text-[13px] pl-1',
      divider: 'h-7 sm:h-9 w-[2px]',
      familiaText: 'text-xl sm:text-2xl font-black',
      familiaShadow: 'drop-shadow-[0_2px_14px_rgba(249,115,22,0.3)]',
      subText: 'text-[8px] sm:text-[10px] -mt-1',
    },
  };

  const currentSize = sizeMap[(size as LogoSize)] || sizeMap.responsive;
  const hasCustomDisplay = /\b(hidden|block|flex|inline-flex|inline-block)\b/.test(className);
  const baseDisplay = hasCustomDisplay ? '' : 'inline-flex';

  return (
    <div
      onClick={onClick}
      {...props}
      className={`${baseDisplay} items-center bg-[#0F0F0F] border border-zinc-800/80 select-none cursor-pointer transition-all hover:border-zinc-700/80 ${currentSize.container} ${className}`}
    >
      {/* POWER POINT Typography Block */}
      <div className="flex items-center font-black tracking-tight leading-none">
        {/* Giant Hero 'P' */}
        <span className={`${currentSize.pText} font-black bg-gradient-to-br from-sky-400 via-sky-500 to-cyan-500 bg-clip-text text-transparent ${currentSize.pShadow}`}>
          P
        </span>

        {/* Stacked 'ower' and 'oint' */}
        <div className={`flex flex-col justify-between ${currentSize.stackedBox} font-extrabold tracking-widest text-sky-300 uppercase`}>
          <span className="leading-none bg-gradient-to-r from-sky-300 to-cyan-400 bg-clip-text text-transparent">
            ower
          </span>
          <span className="leading-none bg-gradient-to-r from-sky-400 to-cyan-500 bg-clip-text text-transparent">
            oint
          </span>
        </div>
      </div>

      {/* Sleek Vertical Divider Dot / Line */}
      <div className={`${currentSize.divider} bg-gradient-to-b from-sky-500/50 via-zinc-700 to-orange-500/50 rounded-full`} />

      {/* FAMILIA Wordmark */}
      <div className="flex flex-col">
        <span className={`${currentSize.familiaText} font-black tracking-wider bg-gradient-to-r from-orange-500 via-amber-400 to-amber-500 bg-clip-text text-transparent ${currentSize.familiaShadow} uppercase`}>
          Familia
        </span>
        <span className={`${currentSize.subText} font-bold tracking-[0.25em] text-zinc-500 uppercase`}>
          Meal System
        </span>
      </div>
    </div>
  );
};

export const PPFLogo = Logo;
export default Logo;
