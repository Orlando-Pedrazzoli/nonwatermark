'use client';

import React, { useCallback, useState, useRef } from 'react';
import { Upload, X, FileImage, Sparkles } from 'lucide-react';
import {
  cn,
  formatFileSize,
  validateImageFile,
  getImageDimensions,
} from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile: File | null;
  isProcessing: boolean;
  className?: string;
}

export default function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  isProcessing,
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setError(null);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const file = files[0];
      if (!validateImageFile(file)) {
        setError(
          'Please select a valid image file (JPEG, PNG, WebP, GIF, BMP) under 50MB'
        );
        return;
      }

      // Criar preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Obter dimensões
      try {
        const dims = await getImageDimensions(file);
        setDimensions(dims);
      } catch (err) {
        console.error('Failed to get dimensions:', err);
      }

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setError(null);
      const file = files[0];

      if (!validateImageFile(file)) {
        setError(
          'Please select a valid image file (JPEG, PNG, WebP, GIF, BMP) under 50MB'
        );
        return;
      }

      // Criar preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Obter dimensões
      try {
        const dims = await getImageDimensions(file);
        setDimensions(dims);
      } catch (err) {
        console.error('Failed to get dimensions:', err);
      }

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleClick = useCallback(() => {
    if (isProcessing) return;
    fileInputRef.current?.click();
  }, [isProcessing]);

  const handleRemoveFile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFileRemove();
      setError(null);
      setPreview(null);
      setDimensions(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onFileRemove]
  );

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        onChange={handleFileInputChange}
        className='hidden'
        disabled={isProcessing}
      />

      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300',
          'bg-gray-950/50 backdrop-blur-sm',
          {
            'border-gray-700 hover:border-green-500/50 hover:bg-gray-900/50':
              !isDragOver && !selectedFile,
            'border-green-400 bg-green-400/10 scale-[1.02]': isDragOver,
            'border-green-500 bg-gray-900/80': selectedFile,
            'opacity-50 cursor-not-allowed': isProcessing,
          }
        )}
      >
        {selectedFile ? (
          <div className='space-y-4'>
            {preview && (
              <div className='relative mx-auto w-full max-w-md'>
                <img
                  src={preview}
                  alt='Preview'
                  className='w-full h-48 object-cover rounded-lg shadow-2xl'
                />
                {!isProcessing && (
                  <button
                    onClick={handleRemoveFile}
                    className='absolute -top-3 -right-3 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110'
                  >
                    <X className='w-4 h-4 text-white' />
                  </button>
                )}
              </div>
            )}

            <div className='bg-gray-900 rounded-lg p-4 space-y-2'>
              <div className='flex items-center justify-center gap-3'>
                <FileImage className='w-5 h-5 text-green-400' />
                <div className='text-white font-medium truncate max-w-xs'>
                  {selectedFile.name}
                </div>
              </div>
              <div className='flex items-center justify-center gap-4 text-sm text-gray-400'>
                <span>{formatFileSize(selectedFile.size)}</span>
                {dimensions && (
                  <>
                    <span>•</span>
                    <span>
                      {dimensions.width} × {dimensions.height}px
                    </span>
                  </>
                )}
              </div>
            </div>

            {isProcessing && (
              <div className='flex flex-col items-center gap-3'>
                <div className='relative'>
                  <div className='w-16 h-16 rounded-full border-4 border-gray-700'></div>
                  <div className='absolute inset-0 w-16 h-16 rounded-full border-4 border-green-400 border-t-transparent animate-spin'></div>
                </div>
                <div className='text-green-400 font-medium flex items-center gap-2'>
                  <Sparkles className='w-4 h-4 animate-pulse' />
                  Removing watermarks...
                </div>
                <div className='text-gray-500 text-sm'>
                  AI is analyzing your image
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className='mb-6'>
              <div
                className={cn(
                  'w-20 h-20 rounded-2xl mx-auto flex items-center justify-center transition-all duration-300',
                  'bg-gradient-to-br from-green-500/20 to-green-600/20',
                  {
                    'animate-bounce': isDragOver,
                    'hover:scale-110': !isDragOver,
                  }
                )}
              >
                <Upload className='w-10 h-10 text-green-400' />
              </div>
            </div>

            <h3 className='text-2xl font-bold text-white mb-2'>
              {isDragOver ? 'Drop your image here!' : 'Upload Image'}
            </h3>
            <div className='text-gray-400 mb-6 max-w-md mx-auto'>
              Drag and drop your image here, or click to browse. Supports JPEG,
              PNG, WebP, GIF, and BMP files up to 50MB.
            </div>

            <button className='bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black font-medium px-8 py-3 rounded-lg transition-all hover:scale-105 shadow-lg'>
              Choose Image
            </button>

            <div className='mt-8 flex items-center justify-center gap-6 text-xs text-gray-500'>
              <div className='flex items-center gap-1'>
                <div className='w-2 h-2 bg-green-400 rounded-full'></div>
                JPG/JPEG
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-2 h-2 bg-green-400 rounded-full'></div>
                PNG
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-2 h-2 bg-green-400 rounded-full'></div>
                WebP
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-2 h-2 bg-green-400 rounded-full'></div>
                GIF
              </div>
              <div className='flex items-center gap-1'>
                <div className='w-2 h-2 bg-green-400 rounded-full'></div>
                BMP
              </div>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className='mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg'>
          <div className='text-red-400 text-sm text-center flex items-center justify-center gap-2'>
            <X className='w-4 h-4' />
            {error}
          </div>
        </div>
      )}

      {!selectedFile && !error && (
        <div className='mt-6 text-center'>
          <div className='text-gray-500 text-xs flex items-center justify-center gap-2'>
            <div className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></div>
            100% Private - Your images never leave your device
          </div>
        </div>
      )}
    </div>
  );
}
