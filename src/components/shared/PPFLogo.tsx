import React from "react";
import Image from "next/image";

export type LogoSize = "sm" | "md" | "lg" | "responsive";

export interface PPFLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  onClick?: () => void;
  size?: LogoSize | string;
  priority?: boolean;
  alt?: string;
  [key: string]: any;
}

export const Logo: React.FC<PPFLogoProps> = ({
  className = "",
  onClick,
  size = "responsive",
  priority = true,
  alt = "Power Point Familia",
  ...props
}) => {
  // Size Configurations for sm, md, lg, responsive
  const sizeMap: Record<LogoSize, { img: string; width: number; height: number }> = {
    sm: {
      img: "h-7 sm:h-8 w-auto object-contain",
      width: 118,
      height: 32,
    },
    md: {
      img: "h-9 sm:h-10 w-auto object-contain",
      width: 147,
      height: 40,
    },
    lg: {
      img: "h-12 sm:h-14 md:h-16 w-auto object-contain",
      width: 235,
      height: 64,
    },
    responsive: {
      img: "h-8 sm:h-9 md:h-10 w-auto object-contain",
      width: 147,
      height: 40,
    },
  };

  const currentSize = sizeMap[size as LogoSize] || sizeMap.responsive;
  const hasCustomDisplay = /\b(hidden|block|flex|inline-flex|inline-block)\b/.test(className);
  const baseDisplay = hasCustomDisplay ? "" : "inline-flex";

  return (
    <div
      onClick={onClick}
      {...props}
      className={`${baseDisplay} items-center select-none cursor-pointer transition-all ${className}`}
    >
      <Image
        src="/PPF-logo.png"
        alt={alt}
        width={currentSize.width}
        height={currentSize.height}
        priority={priority}
        className={`${currentSize.img} select-none`}
      />
    </div>
  );
};

export const PPFLogo = Logo;
export default Logo;
