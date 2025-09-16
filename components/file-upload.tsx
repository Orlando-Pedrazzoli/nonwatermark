'use client';

import React, { useCallback, useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { cn, formatFileSize, validateImageFile } from '@/lib/utils';

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
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setError(null);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const file = files[0];
      if (!validateImageFile(file)) {
        setError(
          'Please select a valid image file (JPEG, PNG, WebP) under 10MB'
        );
        return;
      }

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setError(null);
      const file = files[0];

      if (!validateImageFile(file)) {
        setError(
          'Please select a valid image file (JPEG, PNG, WebP) under 10MB'
        );
        return;
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
          'border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer transition-all duration-300',
          'hover:border-primary bg-surface hover:bg-surface-hover',
          {
            'border-primary bg-primary/10': isDragOver,
            'opacity-50 cursor-not-allowed': isProcessing,
          }
        )}
      >
        {selectedFile ? (
          <div className='relative'>
            <div className='flex items-center gap-3 bg-surface-hover rounded-lg p-4'>
              <ImageIcon className='w-8 h-8 text-primary' />
              <div className='flex-1 text-left'>
                <p className='text-white font-medium text-sm truncate'>
                  {selectedFile.name}
                </p>
                <p className='text-gray-400 text-xs'>
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>

            {!isProcessing && (
              <button
                onClick={handleRemoveFile}
                className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center'
              >
                <X className='w-3 h-3 text-white' />
              </button>
            )}

            {isProcessing && (
              <div className='mt-4 text-primary'>
                <div className='flex items-center justify-center gap-2'>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-primary'></div>
                  <span className='text-sm'>Processing...</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className='mb-4 p-4 rounded-full bg-primary/10 inline-block'>
              <Upload
                className={cn('w-12 h-12 text-primary', {
                  'animate-bounce': isDragOver,
                })}
              />
            </div>
            <h3 className='text-xl font-semibold text-white mb-2'>
              {isDragOver ? 'Drop your image here' : 'Upload your image'}
            </h3>
            <p className='text-gray-400 mb-4'>
              Drag and drop your image here, or click to browse
            </p>
            <button className='bg-primary hover:bg-primary-dark text-black font-medium px-6 py-3 rounded-lg transition-colors'>
              Choose File
            </button>
          </>
        )}
      </div>

      {error && (
        <div className='mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg'>
          <p className='text-red-400 text-sm text-center'>{error}</p>
        </div>
      )}

      {!selectedFile && !error && (
        <p className='text-gray-500 text-xs text-center mt-4'>
          Your images are processed locally. We never store or see your files.
        </p>
      )}
    </div>
  );
}
