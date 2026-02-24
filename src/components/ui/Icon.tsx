import React from 'react';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function GumDropIcon({ className, size = 'md' }: IconProps) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className={cn('relative flex items-center justify-center', sizes[size], className)}>
      <div className="relative h-full w-full">
        <div className="absolute inset-x-[15%] bottom-0 top-[10%] rounded-b-[40%] rounded-t-full border-t border-white/30 bg-gradient-to-b from-brand-cyan to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.6)]">
          <div className="absolute inset-0 rounded-b-[40%] rounded-t-full bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
        </div>
        <div className="absolute left-[30%] top-[20%] h-[10%] w-[15%] rounded-full bg-white/70 blur-[1px]" />
      </div>
    </div>
  );
}

export function CandyIcon({ className }: { className?: string }) {
  return <NextImage src="/candy-main.svg" alt="Candy" width={96} height={96} className={cn('object-contain', className)} priority />;
}
