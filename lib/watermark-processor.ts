import * as tf from '@tensorflow/tfjs';

export interface WatermarkRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface ProcessingResult {
  success: boolean;
  processedImageUrl?: string;
  watermarksDetected: WatermarkRegion[];
  processingTime: number;
  error?: string;
}

export class WatermarkProcessor {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await tf.ready();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TensorFlow.js:', error);
      throw new Error('Failed to initialize AI models');
    }
  }

  async detectWatermarks(imageData: ImageData): Promise<WatermarkRegion[]> {
    const regions: WatermarkRegion[] = [];

    try {
      const { width, height } = imageData;
      const data = imageData.data;

      // Detecção simplificada baseada em padrões visuais
      const blockSize = 32;

      for (let y = 0; y < height - blockSize; y += blockSize / 2) {
        for (let x = 0; x < width - blockSize; x += blockSize / 2) {
          const region = this.analyzeRegion(
            data,
            width,
            height,
            x,
            y,
            blockSize
          );
          if (region.confidence > 0.3) {
            regions.push(region);
          }
        }
      }

      return this.mergeOverlappingRegions(regions);
    } catch (error) {
      console.error('Watermark detection failed:', error);
      return [];
    }
  }

  private analyzeRegion(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number,
    blockSize: number
  ): WatermarkRegion {
    let totalVariance = 0;
    let pixelCount = 0;
    let avgBrightness = 0;

    // Analisar pixels na região
    for (let y = startY; y < Math.min(startY + blockSize, height); y++) {
      for (let x = startX; x < Math.min(startX + blockSize, width); x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const brightness = (r + g + b) / 3;

        avgBrightness += brightness;
        pixelCount++;
      }
    }

    avgBrightness /= pixelCount;

    // Calcular variância (watermarks tendem a ter baixa variância)
    for (let y = startY; y < Math.min(startY + blockSize, height); y++) {
      for (let x = startX; x < Math.min(startX + blockSize, width); x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const brightness = (r + g + b) / 3;

        totalVariance += Math.pow(brightness - avgBrightness, 2);
      }
    }

    const variance = totalVariance / pixelCount;

    // Lógica de detecção: baixa variância + certas características
    let confidence = 0;

    if (variance < 500 && (avgBrightness > 200 || avgBrightness < 100)) {
      confidence = Math.min(1, (1000 - variance) / 1000);
    }

    return {
      x: startX,
      y: startY,
      width: blockSize,
      height: blockSize,
      confidence,
    };
  }

  async removeWatermarks(
    canvas: HTMLCanvasElement,
    watermarkRegions: WatermarkRegion[]
  ): Promise<string> {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (const region of watermarkRegions) {
      await this.inpaintRegion(data, canvas.width, canvas.height, region);
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png', 1.0);
  }

  private async inpaintRegion(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    region: WatermarkRegion
  ): Promise<void> {
    const { x, y, width: regionWidth, height: regionHeight } = region;

    // Inpainting simples - média dos pixels vizinhos
    for (let dy = 0; dy < regionHeight; dy++) {
      for (let dx = 0; dx < regionWidth; dx++) {
        const currentX = x + dx;
        const currentY = y + dy;

        if (currentX >= width || currentY >= height) continue;

        const neighbors = this.getNeighborColors(
          data,
          width,
          height,
          currentX,
          currentY
        );
        if (neighbors.length > 0) {
          const avgColor = this.averageColors(neighbors);
          const idx = (currentY * width + currentX) * 4;

          data[idx] = avgColor.r;
          data[idx + 1] = avgColor.g;
          data[idx + 2] = avgColor.b;
          // Manter alpha original
        }
      }
    }
  }

  private getNeighborColors(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number
  ): Array<{ r: number; g: number; b: number }> {
    const neighbors: Array<{ r: number; g: number; b: number }> = [];

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4;
          neighbors.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2],
          });
        }
      }
    }

    return neighbors;
  }

  private averageColors(colors: Array<{ r: number; g: number; b: number }>): {
    r: number;
    g: number;
    b: number;
  } {
    const sum = colors.reduce(
      (acc, color) => ({
        r: acc.r + color.r,
        g: acc.g + color.g,
        b: acc.b + color.b,
      }),
      { r: 0, g: 0, b: 0 }
    );

    return {
      r: Math.round(sum.r / colors.length),
      g: Math.round(sum.g / colors.length),
      b: Math.round(sum.b / colors.length),
    };
  }

  private mergeOverlappingRegions(
    regions: WatermarkRegion[]
  ): WatermarkRegion[] {
    if (regions.length === 0) return [];

    const merged: WatermarkRegion[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < regions.length; i++) {
      if (processed.has(i)) continue;

      let current = regions[i];

      for (let j = i + 1; j < regions.length; j++) {
        if (processed.has(j)) continue;

        const other = regions[j];
        if (this.regionsOverlap(current, other)) {
          current = this.mergeRegions(current, other);
          processed.add(j);
        }
      }

      merged.push(current);
      processed.add(i);
    }

    return merged;
  }

  private regionsOverlap(r1: WatermarkRegion, r2: WatermarkRegion): boolean {
    return !(
      r1.x + r1.width < r2.x ||
      r2.x + r2.width < r1.x ||
      r1.y + r1.height < r2.y ||
      r2.y + r2.height < r1.y
    );
  }

  private mergeRegions(
    r1: WatermarkRegion,
    r2: WatermarkRegion
  ): WatermarkRegion {
    const minX = Math.min(r1.x, r2.x);
    const minY = Math.min(r1.y, r2.y);
    const maxX = Math.max(r1.x + r1.width, r2.x + r2.width);
    const maxY = Math.max(r1.y + r1.height, r2.y + r2.height);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      confidence: (r1.confidence + r2.confidence) / 2,
    };
  }

  async processImage(file: File): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      await this.initialize();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const img = new Image();
      const imageUrl = URL.createObjectURL(file);

      return new Promise(resolve => {
        img.onload = async () => {
          try {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );
            const watermarkRegions = await this.detectWatermarks(imageData);

            let processedImageUrl: string;

            if (watermarkRegions.length > 0) {
              processedImageUrl = await this.removeWatermarks(
                canvas,
                watermarkRegions
              );
            } else {
              processedImageUrl = canvas.toDataURL('image/png', 1.0);
            }

            URL.revokeObjectURL(imageUrl);

            resolve({
              success: true,
              processedImageUrl,
              watermarksDetected: watermarkRegions,
              processingTime: Date.now() - startTime,
            });
          } catch (error) {
            URL.revokeObjectURL(imageUrl);
            resolve({
              success: false,
              watermarksDetected: [],
              processingTime: Date.now() - startTime,
              error:
                error instanceof Error ? error.message : 'Processing failed',
            });
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          resolve({
            success: false,
            watermarksDetected: [],
            processingTime: Date.now() - startTime,
            error: 'Failed to load image',
          });
        };

        img.src = imageUrl;
      });
    } catch (error) {
      return {
        success: false,
        watermarksDetected: [],
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const watermarkProcessor = new WatermarkProcessor();
