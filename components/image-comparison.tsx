'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
} from 'lucide-react';
import { downloadFile } from '@/lib/utils';

interface ImageComparisonProps {
  originalFile: File;
  processedImageUrl: string;
  originalImageUrl?: string;
  watermarksDetected: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    type: string;
  }>;
  onReset: () => void;
  className?: string;
}

export default function ImageComparison({
  originalFile,
  processedImageUrl,
  originalImageUrl: propOriginalUrl,
  watermarksDetected,
  onReset,
  className,
}: ImageComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWatermarks, setShowWatermarks] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (propOriginalUrl) {
      setOriginalImageUrl(propOriginalUrl);
    } else {
      const url = URL.createObjectURL(originalFile);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [originalFile, propOriginalUrl]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const updateSliderPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      updateSliderPosition(e.clientX);
    },
    [isDragging, updateSliderPosition]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      updateSliderPosition(e.touches[0].clientX);
    },
    [isDragging, updateSliderPosition]
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleEnd]);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(processedImageUrl);
      const blob = await response.blob();
      const filename = `nonwatermark_${originalFile.name}`;
      downloadFile(blob, filename);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [processedImageUrl, originalFile.name]);

  const handleSliderClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === sliderRef.current) return;
      updateSliderPosition(e.clientX);
    },
    [updateSliderPosition]
  );

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Calcular estatísticas
  const avgConfidence =
    watermarksDetected.length > 0
      ? Math.round(
          (watermarksDetected.reduce((sum, w) => sum + w.confidence, 0) /
            watermarksDetected.length) *
            100
        )
      : 0;

  const typeCount = watermarksDetected.reduce((acc, w) => {
    acc[w.type] = (acc[w.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`w-full ${className}`}>
      {/* Estatísticas */}
      <div className='mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4'>
        <div className='bg-gray-900 border border-gray-800 rounded-xl p-4'>
          <div className='text-3xl font-bold text-green-400 mb-1'>
            {watermarksDetected.length}
          </div>
          <div className='text-gray-400 text-sm'>Watermarks Removed</div>
        </div>
        <div className='bg-gray-900 border border-gray-800 rounded-xl p-4'>
          <div className='text-3xl font-bold text-green-400 mb-1'>
            {avgConfidence}%
          </div>
          <div className='text-gray-400 text-sm'>Detection Accuracy</div>
        </div>
        <div className='bg-gray-900 border border-gray-800 rounded-xl p-4'>
          <div className='text-3xl font-bold text-green-400 mb-1'>100%</div>
          <div className='text-gray-400 text-sm'>Private Processing</div>
        </div>
        <div className='bg-gray-900 border border-gray-800 rounded-xl p-4'>
          <div className='text-3xl font-bold text-green-400 mb-1'>
            {Object.keys(typeCount).length}
          </div>
          <div className='text-gray-400 text-sm'>Types Detected</div>
        </div>
      </div>

      {/* Tipos de watermarks detectados */}
      {Object.keys(typeCount).length > 0 && (
        <div className='mb-6 flex flex-wrap gap-2'>
          {Object.entries(typeCount).map(([type, count]) => (
            <span
              key={type}
              className='px-3 py-1 bg-gray-900 border border-gray-800 rounded-full text-sm text-gray-300'
            >
              {type}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Container de comparação */}
      <div
        className={`relative ${
          isFullscreen
            ? 'fixed inset-0 z-50 bg-black flex items-center justify-center'
            : 'bg-gray-950 rounded-xl overflow-hidden'
        }`}
      >
        {/* Botão fullscreen */}
        {!isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className='absolute top-4 right-4 z-20 bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg transition-all'
            title='Fullscreen'
          >
            <Maximize2 className='w-5 h-5' />
          </button>
        )}

        {/* Botão sair fullscreen */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className='absolute top-4 right-4 z-20 bg-black/70 hover:bg-black/90 text-white p-3 rounded-lg transition-all'
          >
            <X className='w-6 h-6' />
          </button>
        )}

        {/* Botão mostrar/ocultar watermarks */}
        <button
          onClick={() => setShowWatermarks(!showWatermarks)}
          className={`absolute top-4 left-4 z-20 bg-black/70 hover:bg-black/90 text-white px-3 py-2 rounded-lg transition-all text-sm ${
            showWatermarks ? 'bg-green-600/70 hover:bg-green-600/90' : ''
          }`}
        >
          {showWatermarks ? 'Hide' : 'Show'} Watermarks
        </button>

        <div
          ref={containerRef}
          className={`relative cursor-ew-resize ${
            isFullscreen ? 'w-full h-full' : 'aspect-video'
          }`}
          onClick={handleSliderClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Imagem processada (fundo) */}
          <div className='absolute inset-0 flex items-center justify-center bg-gray-950'>
            <img
              src={processedImageUrl}
              alt='Processed'
              className={`max-w-full max-h-full object-contain ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } transition-opacity duration-300`}
              onLoad={() => setImageLoaded(true)}
              draggable={false}
            />
            {!imageLoaded && (
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-green-400' />
              </div>
            )}
          </div>

          {/* Imagem original (sobreposta, cortada) */}
          <div
            className='absolute inset-0 overflow-hidden pointer-events-none'
            style={{ width: `${sliderPosition}%` }}
          >
            <div className='relative w-full h-full flex items-center justify-center bg-gray-950'>
              <img
                src={originalImageUrl}
                alt='Original'
                className={`max-w-full max-h-full object-contain ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                } transition-opacity duration-300`}
                style={{
                  width: containerRef.current?.offsetWidth || '100%',
                  height: containerRef.current?.offsetHeight || '100%',
                  objectFit: 'contain',
                }}
                draggable={false}
              />
            </div>

            {/* Overlay de watermarks detectados */}
            {showWatermarks && imageLoaded && (
              <div className='absolute inset-0 pointer-events-none'>
                {watermarksDetected.map((watermark, index) => (
                  <div
                    key={index}
                    className='absolute border-2 border-red-500 bg-red-500/20'
                    style={{
                      left: `${
                        (watermark.x / containerRef.current!.offsetWidth) * 100
                      }%`,
                      top: `${
                        (watermark.y / containerRef.current!.offsetHeight) * 100
                      }%`,
                      width: `${
                        (watermark.width / containerRef.current!.offsetWidth) *
                        100
                      }%`,
                      height: `${
                        (watermark.height /
                          containerRef.current!.offsetHeight) *
                        100
                      }%`,
                    }}
                  >
                    <span className='absolute -top-6 left-0 text-xs bg-red-500 text-white px-1 rounded'>
                      {watermark.type} ({Math.round(watermark.confidence * 100)}
                      %)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linha do slider */}
          <div
            className='absolute top-0 bottom-0 w-1 bg-gradient-to-r from-green-400 to-green-500 pointer-events-none shadow-2xl'
            style={{
              left: `${sliderPosition}%`,
              transform: 'translateX(-50%)',
            }}
          />

          {/* Handle do slider */}
          <div
            ref={sliderRef}
            className='absolute top-1/2 transform -translate-y-1/2 pointer-events-none'
            style={{
              left: `${sliderPosition}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className='relative'>
              {/* Círculo central */}
              <div className='w-12 h-12 bg-green-400 rounded-full shadow-2xl flex items-center justify-center pointer-events-auto cursor-ew-resize'>
                <div className='w-8 h-8 bg-gray-950 rounded-full flex items-center justify-center'>
                  <ChevronLeft className='w-4 h-4 text-green-400 absolute -left-0.5' />
                  <ChevronRight className='w-4 h-4 text-green-400 absolute -right-0.5' />
                </div>
              </div>

              {/* Indicadores de direção */}
              <div className='absolute top-1/2 -left-8 transform -translate-y-1/2 text-white/50 pointer-events-none'>
                <ChevronLeft className='w-5 h-5' />
              </div>
              <div className='absolute top-1/2 -right-8 transform -translate-y-1/2 text-white/50 pointer-events-none'>
                <ChevronRight className='w-5 h-5' />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className='absolute top-4 left-20 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium'>
            Original
          </div>
          <div className='absolute top-4 right-4 bg-green-600/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium'>
            Cleaned
          </div>

          {/* Indicador de posição */}
          <div className='absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm'>
            Position: {Math.round(sliderPosition)}%
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className='mt-6 flex flex-col sm:flex-row items-center justify-between gap-4'>
        <div className='text-gray-400 text-sm text-center sm:text-left'>
          <p>Drag the slider to compare original and cleaned images</p>
          <p className='text-xs mt-1'>
            Processing completed in real-time • No data uploaded
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <button
            onClick={onReset}
            className='bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all hover:scale-105'
          >
            <RotateCcw className='w-4 h-4' />
            Try Another
          </button>

          <button
            onClick={handleDownload}
            className='bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all hover:scale-105 shadow-lg'
          >
            <Download className='w-4 h-4' />
            Download HD
          </button>
        </div>
      </div>
    </div>
  );
}
