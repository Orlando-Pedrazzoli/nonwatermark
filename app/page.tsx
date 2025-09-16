'use client';

import React, { useState, useCallback } from 'react';
import { Sparkles, Shield, Zap } from 'lucide-react';
import FileUpload from '@/components/file-upload';
import ImageComparison from '@/components/image-comparison';
import {
  advancedWatermarkProcessor as watermarkProcessor,
  ProcessingResult,
} from '@/lib/watermark-processor';

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setResult(null);

    try {
      const processingResult = await watermarkProcessor.processImage(file);
      setResult(processingResult);
    } catch (error) {
      console.error('Processing failed:', error);
      setResult({
        success: false,
        watermarksDetected: [],
        processingTime: 0,
        error: 'Processing failed. Please try another image.',
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    setIsProcessing(false);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    setIsProcessing(false);
  }, []);

  return (
    <div className='min-h-screen bg-black text-white'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <header className='text-center mb-12'>
          <div className='flex items-center justify-center gap-2 mb-6'>
            <div className='w-10 h-10 bg-primary rounded-xl flex items-center justify-center'>
              <Sparkles className='w-6 h-6 text-black' />
            </div>
            <h1 className='text-3xl font-bold bg-gradient-to-r from-primary to-green-300 bg-clip-text text-transparent'>
              NonWatermark
            </h1>
          </div>

          {/* Features */}
          <div className='flex items-center justify-center gap-8 text-sm text-gray-400 mb-8'>
            <div className='flex items-center gap-1'>
              <Shield className='w-4 h-4' />
              100% Private
            </div>
            <div className='flex items-center gap-1'>
              <Zap className='w-4 h-4' />
              3s Processing
            </div>
          </div>
        </header>

        {/* Hero Section */}
        {!selectedFile && !result && (
          <div className='text-center max-w-3xl mx-auto mb-16'>
            <h2 className='text-5xl md:text-6xl font-bold mb-6'>
              Your content.
              <br />
              <span className='bg-gradient-to-r from-primary to-green-300 bg-clip-text text-transparent'>
                No distractions.
              </span>
            </h2>
            <p className='text-xl text-gray-300 mb-12'>
              Remove watermarks from images in seconds with AI-powered
              technology. Perfect quality, complete privacy, zero uploads.
            </p>

            {/* Feature Cards */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-12'>
              {[
                {
                  icon: <Shield className='w-6 h-6' />,
                  title: '100% Local Processing',
                  description:
                    'Your images never leave your device. Complete privacy guaranteed.',
                },
                {
                  icon: <Zap className='w-6 h-6' />,
                  title: 'Lightning Fast',
                  description:
                    'Remove watermarks in just 3 seconds with AI algorithms.',
                },
                {
                  icon: <Sparkles className='w-6 h-6' />,
                  title: 'Perfect Quality',
                  description:
                    'Maintains original image quality while removing watermarks.',
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className='bg-gray-900 border border-gray-800 rounded-xl p-6 text-center'
                >
                  <div className='w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-primary'>
                    {feature.icon}
                  </div>
                  <h3 className='font-semibold mb-2'>{feature.title}</h3>
                  <p className='text-gray-400 text-sm'>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Section */}
        {!result && (
          <div className='max-w-2xl mx-auto mb-16'>
            <FileUpload
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              selectedFile={selectedFile}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {/* Results Section */}
        {result && selectedFile && (
          <div className='max-w-6xl mx-auto'>
            {result.success && result.processedImageUrl ? (
              <>
                {/* Success message */}
                <div className='text-center mb-8'>
                  <div className='inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4'>
                    <Sparkles className='w-4 h-4' />
                    Watermarks successfully removed!
                  </div>
                  <p className='text-gray-400'>
                    Processed in {(result.processingTime / 1000).toFixed(1)}s •
                    {result.watermarksDetected.length} watermark
                    {result.watermarksDetected.length !== 1 ? 's' : ''} detected
                  </p>
                </div>

                {/* Image comparison */}
                <ImageComparison
                  originalFile={selectedFile}
                  processedImageUrl={result.processedImageUrl}
                  watermarksDetected={result.watermarksDetected}
                  onReset={handleReset}
                />
              </>
            ) : (
              /* Error state */
              <div className='bg-gray-900 border border-gray-800 rounded-xl p-8 text-center max-w-md mx-auto'>
                <div className='w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4'>
                  <span className='text-red-500 text-2xl'>⚠️</span>
                </div>
                <h3 className='font-semibold mb-2'>Processing Failed</h3>
                <p className='text-gray-400 text-sm mb-4'>
                  {result.error ||
                    'Something went wrong. Please try another image.'}
                </p>
                <button
                  onClick={handleReset}
                  className='bg-primary hover:bg-primary-dark text-black px-6 py-3 rounded-lg font-medium transition-colors'
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className='text-center text-gray-500 text-sm mt-20 pt-8 border-t border-gray-800'>
          <p>© 2025 NonWatermark. Your privacy is our priority.</p>
        </footer>
      </div>
    </div>
  );
}
