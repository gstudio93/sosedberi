"use client";

import { useState } from "react";

type SafeImageProps = {
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
  src?: null | string;
};

export default function SafeImage({
  alt = "",
  className = "",
  fallbackClassName = "",
  fallbackLabel = "Фото скоро появится",
  src,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-[#EFEFEB] text-center text-xs font-black leading-5 text-[#8D8D8D] ${fallbackClassName}`}
      >
        <span className="px-3">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
