'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { downloadFile } from '@/lib/utils';

interface ImageComparisonProps {
  originalFile: File;
  processedImageUrl: string;
  watermarksDetected: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  onReset: () => void;
  className?: string;
}

export default function ImageComparison({
  originalFile,
  processedImageUrl,
  watermarksDetected,
  onReset,
  className,
}: ImageComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(originalFile);
    setOriginalImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [originalFile]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(processedImageUrl);
      const blob = await response.blob();
      const filename = `cleaned_${originalFile.name}`;
      downloadFile(blob, filename);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [processedImageUrl, originalFile.name]);

  return (
    <div className={`w-full ${className}`}>
      {/* Stats */}
      <div className='mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div className='bg-surface border border-border rounded-xl p-4 text-center'>
          <div className='text-2xl font-bold text-primary'>
            {watermarksDetected.length}
          </div>
          <div className='text-gray-400 text-sm'>Watermarks Detected</div>
        </div>
        <div className='bg-surface border border-border rounded-xl p-4 text-center'>
          <div className='text-2xl font-bold text-primary'>
            {Math.round(
              (watermarksDetected.reduce((sum, w) => sum + w.confidence, 0) /
                watermarksDetected.length) *
                100
            ) || 0}
            %
          </div>
          <div className='text-gray-400 text-sm'>Average Confidence</div>
        </div>
        <div className='bg-surface border border-border rounded-xl p-4 text-center'>
          <div className='text-2xl font-bold text-primary'>100%</div>
          <div className='text-gray-400 text-sm'>Local Processing</div>
        </div>
      </div>

      {/* Comparison Container */}
      <div
        ref={containerRef}
        className='relative bg-black rounded-xl overflow-hidden aspect-video cursor-col-resize'
      >
        {/* Processed image (right side) */}
        <img
          src={processedImageUrl}
          alt='Processed image'
          className='absolute inset-0 w-full h-full object-contain'
          draggable={false}
        />

        {/* Original image (left side, clipped) */}
        <div
          className='absolute inset-0 overflow-hidden'
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={originalImageUrl}
            alt='Original image'
            className='w-full h-full object-contain'
            style={{ width: `${containerRef.current?.offsetWidth || 100}px` }}
            draggable={false}
          />
        </div>

        {/* Slider line */}
        <div
          className='absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none'
          style={{ left: `${sliderPosition}%` }}
        />

        {/* Slider handle */}
        <div
          className='absolute top-1/2 w-6 h-6 bg-primary rounded-full border-2 border-white shadow-lg cursor-col-resize z-10 transform -translate-y-1/2'
          style={{ left: `calc(${sliderPosition}% - 12px)` }}
          onMouseDown={handleMouseDown}
        >
          <div className='absolute inset-1 bg-black rounded-full flex items-center justify-center'>
            <div className='w-1 h-4 bg-primary rounded-full'></div>
          </div>
        </div>

        {/* Labels */}
        <div className='absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm font-medium'>
          Original
        </div>
        <div className='absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-sm font-medium'>
          Cleaned
        </div>
      </div>

      {/* Controls */}
      <div className='mt-6 flex flex-wrap items-center justify-between gap-4'>
        <div className='text-gray-400 text-sm'>
          Slider: {sliderPosition.toFixed(0)}% cleaned
        </div>

        <div className='flex items-center gap-3'>
          <button
            onClick={onReset}
            className='bg-surface hover:bg-surface-hover border border-border text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors'
          >
            <RotateCcw className='w-4 h-4' />
            Try Another
          </button>

          <button
            onClick={handleDownload}
            className='bg-primary hover:bg-primary-dark text-black px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors'
          >
            <Download className='w-4 h-4' />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
