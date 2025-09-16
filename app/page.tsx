'use client';

import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  Shield,
  Zap,
  Star,
  CheckCircle2,
  TrendingUp,
  Award,
  X,
} from 'lucide-react';
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
  const [processingStats, setProcessingStats] = useState({
    totalProcessed: 0,
    totalWatermarksRemoved: 0,
  });

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setResult(null);

    try {
      const processingResult = await watermarkProcessor.processImage(file);
      setResult(processingResult);

      // Atualizar estatísticas
      if (processingResult.success) {
        setProcessingStats(prev => ({
          totalProcessed: prev.totalProcessed + 1,
          totalWatermarksRemoved:
            prev.totalWatermarksRemoved +
            processingResult.watermarksDetected.length,
        }));
      }
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
    <div className='min-h-screen bg-black'>
      {/* Gradient Background */}
      <div className='fixed inset-0 bg-gradient-to-br from-green-950/20 via-black to-gray-950 pointer-events-none' />

      {/* Pattern Overlay */}
      <div className='fixed inset-0 opacity-5 pointer-events-none'>
        <div
          className='absolute inset-0'
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className='relative container mx-auto px-4 py-8'>
        {/* Header */}
        <header className='text-center mb-12'>
          <div className='flex items-center justify-center gap-3 mb-6'>
            <div className='w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-xl'>
              <Sparkles className='w-7 h-7 text-black' />
            </div>
            <h1 className='text-4xl font-bold'>
              <span className='bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent'>
                NonWatermark
              </span>
              <span className='text-gray-500 text-lg ml-2'>Pro</span>
            </h1>
          </div>

          {/* Features Row */}
          <div className='flex flex-wrap items-center justify-center gap-6 text-sm mb-8'>
            <div className='flex items-center gap-2 text-gray-400'>
              <Shield className='w-4 h-4 text-green-400' />
              <span>100% Private</span>
            </div>
            <div className='flex items-center gap-2 text-gray-400'>
              <Zap className='w-4 h-4 text-yellow-400' />
              <span>Instant Processing</span>
            </div>
            <div className='flex items-center gap-2 text-gray-400'>
              <Award className='w-4 h-4 text-blue-400' />
              <span>AI Powered</span>
            </div>
            <div className='flex items-center gap-2 text-gray-400'>
              <TrendingUp className='w-4 h-4 text-purple-400' />
              <span>HD Quality</span>
            </div>
          </div>

          {/* Stats */}
          {processingStats.totalProcessed > 0 && (
            <div className='flex items-center justify-center gap-8 mb-8'>
              <div className='text-center'>
                <div className='text-2xl font-bold text-green-400'>
                  {processingStats.totalProcessed}
                </div>
                <div className='text-xs text-gray-500'>Images Cleaned</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-green-400'>
                  {processingStats.totalWatermarksRemoved}
                </div>
                <div className='text-xs text-gray-500'>Watermarks Removed</div>
              </div>
            </div>
          )}
        </header>

        {/* Hero Section */}
        {!selectedFile && !result && (
          <div className='text-center max-w-4xl mx-auto mb-16'>
            <h2 className='text-5xl md:text-7xl font-bold mb-6 leading-tight'>
              Remove Watermarks
              <br />
              <span className='bg-gradient-to-r from-green-400 via-green-300 to-emerald-400 bg-clip-text text-transparent'>
                Like Magic
              </span>
            </h2>
            <p className='text-xl text-gray-300 mb-12 max-w-2xl mx-auto'>
              The world's most advanced AI-powered watermark remover. Perfect
              quality, instant results, complete privacy.
            </p>

            {/* Feature Cards */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-12'>
              {[
                {
                  icon: <Shield className='w-6 h-6' />,
                  title: 'Zero Upload',
                  description:
                    'Everything happens in your browser. Your images never leave your device.',
                  color: 'from-blue-500 to-blue-600',
                },
                {
                  icon: <Zap className='w-6 h-6' />,
                  title: 'Lightning Fast',
                  description:
                    'Advanced AI algorithms remove watermarks in seconds, not minutes.',
                  color: 'from-yellow-500 to-orange-500',
                },
                {
                  icon: <Sparkles className='w-6 h-6' />,
                  title: 'Perfect Quality',
                  description:
                    'Intelligent reconstruction maintains original image quality.',
                  color: 'from-purple-500 to-pink-500',
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className='group relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all hover:scale-[1.02]'
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`}
                  />
                  <div
                    className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl`}
                  >
                    <div className='text-white'>{feature.icon}</div>
                  </div>
                  <h3 className='font-bold text-lg mb-2 text-white'>
                    {feature.title}
                  </h3>
                  <p className='text-gray-400 text-sm leading-relaxed'>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Trust Badges */}
            <div className='flex flex-wrap items-center justify-center gap-6 mb-12'>
              {[
                'No Sign-up Required',
                'Unlimited Usage',
                'No Watermarks Added',
                'Works Offline',
              ].map((badge, index) => (
                <div
                  key={index}
                  className='flex items-center gap-2 px-4 py-2 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-full'
                >
                  <CheckCircle2 className='w-4 h-4 text-green-400' />
                  <span className='text-sm text-gray-300'>{badge}</span>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div className='bg-gradient-to-r from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 max-w-2xl mx-auto'>
              <div className='flex items-center gap-1 justify-center mb-3'>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className='w-5 h-5 fill-yellow-400 text-yellow-400'
                  />
                ))}
              </div>
              <p className='text-gray-300 italic'>
                "The best watermark remover I've ever used. Fast, private, and
                the results are incredible!"
              </p>
              <p className='text-gray-500 text-sm mt-3'>
                - Professional Photographer
              </p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        {!result && (
          <div className='max-w-3xl mx-auto mb-16'>
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
          <div className='max-w-7xl mx-auto animate-fadeIn'>
            {result.success && result.processedImageUrl ? (
              <>
                {/* Success Banner */}
                <div className='text-center mb-8'>
                  <div className='inline-flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-sm border border-green-500/30 px-6 py-3 rounded-full mb-4'>
                    <CheckCircle2 className='w-5 h-5 text-green-400' />
                    <span className='text-green-400 font-medium'>
                      Successfully removed {result.watermarksDetected.length}{' '}
                      watermark
                      {result.watermarksDetected.length !== 1 ? 's' : ''}!
                    </span>
                  </div>
                  <p className='text-gray-400 text-sm'>
                    Processed in {(result.processingTime / 1000).toFixed(2)}{' '}
                    seconds • 100% locally on your device
                  </p>
                </div>

                {/* Image Comparison */}
                <ImageComparison
                  originalFile={selectedFile}
                  processedImageUrl={result.processedImageUrl}
                  originalImageUrl={result.originalImageUrl}
                  watermarksDetected={result.watermarksDetected}
                  onReset={handleReset}
                />
              </>
            ) : (
              /* Error State */
              <div className='max-w-md mx-auto'>
                <div className='bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-2xl p-8 text-center'>
                  <div className='w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                    <X className='w-8 h-8 text-red-400' />
                  </div>
                  <h3 className='font-bold text-xl mb-2 text-white'>
                    Processing Failed
                  </h3>
                  <p className='text-gray-400 mb-6'>
                    {result.error ||
                      'Something went wrong. Please try another image.'}
                  </p>
                  <button
                    onClick={handleReset}
                    className='bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black px-6 py-3 rounded-lg font-medium transition-all hover:scale-105'
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className='text-center text-gray-500 text-sm mt-20 pt-8 border-t border-gray-800/50'>
          <p className='mb-2'>
            © 2025 NonWatermark Pro • Advanced AI Watermark Removal
          </p>
          <p className='text-xs'>
            Your privacy is our priority. All processing happens locally in your
            browser.
          </p>
        </footer>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
