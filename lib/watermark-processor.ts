export interface WatermarkRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  type: 'text' | 'logo' | 'pattern' | 'transparent';
}

export interface ProcessingResult {
  success: boolean;
  processedImageUrl?: string;
  originalImageUrl?: string;
  watermarksDetected: WatermarkRegion[];
  processingTime: number;
  error?: string;
}

export class AdvancedWatermarkProcessor {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  async processImage(file: File): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      // Criar canvas
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

      if (!this.ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Carregar imagem
      const img = new Image();
      const originalImageUrl = URL.createObjectURL(file);

      return new Promise(resolve => {
        img.onload = async () => {
          try {
            if (!this.canvas || !this.ctx) {
              throw new Error('Canvas not initialized');
            }

            // Configurar canvas com tamanho da imagem
            this.canvas.width = img.naturalWidth;
            this.canvas.height = img.naturalHeight;
            this.ctx.drawImage(img, 0, 0);

            // Detectar watermarks simulados para demonstração
            const watermarks = this.simulateWatermarkDetection(
              this.canvas.width,
              this.canvas.height
            );

            // Aplicar processamento de remoção
            await this.applyWatermarkRemoval(watermarks);

            // Gerar URL da imagem processada
            const processedImageUrl = this.canvas.toDataURL('image/png', 1.0);

            resolve({
              success: true,
              processedImageUrl,
              originalImageUrl,
              watermarksDetected: watermarks,
              processingTime: Date.now() - startTime,
            });
          } catch (error) {
            console.error('Processing error:', error);
            resolve({
              success: false,
              originalImageUrl,
              watermarksDetected: [],
              processingTime: Date.now() - startTime,
              error:
                error instanceof Error ? error.message : 'Processing failed',
            });
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(originalImageUrl);
          resolve({
            success: false,
            watermarksDetected: [],
            processingTime: Date.now() - startTime,
            error: 'Failed to load image',
          });
        };

        img.src = originalImageUrl;
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

  private simulateWatermarkDetection(
    width: number,
    height: number
  ): WatermarkRegion[] {
    const watermarks: WatermarkRegion[] = [];

    // Simular detecção de 1-3 watermarks em posições aleatórias
    const count = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < count; i++) {
      const size = 80 + Math.random() * 120; // 80-200px
      watermarks.push({
        x: Math.random() * (width - size),
        y: Math.random() * (height - size),
        width: size,
        height: size * 0.6,
        confidence: 0.7 + Math.random() * 0.3,
        type: ['text', 'logo', 'pattern', 'transparent'][
          Math.floor(Math.random() * 4)
        ] as any,
      });
    }

    return watermarks;
  }

  private async applyWatermarkRemoval(
    watermarks: WatermarkRegion[]
  ): Promise<void> {
    if (!this.canvas || !this.ctx) return;

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const { data, width, height } = imageData;

    // Aplicar remoção de watermarks
    for (const watermark of watermarks) {
      await this.removeWatermark(data, width, height, watermark);
    }

    // Aplicar suavização
    this.applySmoothing(data, width, height);

    // Colocar dados de volta no canvas
    this.ctx.putImageData(imageData, 0, 0);

    // Aplicar ajustes finais
    await this.applyFinalAdjustments();
  }

  private async removeWatermark(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    region: WatermarkRegion
  ): Promise<void> {
    const startX = Math.max(0, Math.floor(region.x));
    const startY = Math.max(0, Math.floor(region.y));
    const endX = Math.min(width, Math.floor(region.x + region.width));
    const endY = Math.min(height, Math.floor(region.y + region.height));

    // Aplicar inpainting baseado nos pixels vizinhos
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = (y * width + x) * 4;

        // Obter média dos pixels vizinhos fora da região
        const neighbors = this.getNeighborPixels(
          data,
          width,
          height,
          x,
          y,
          5,
          region
        );

        if (neighbors.length > 0) {
          const avg = this.averageColors(neighbors);

          // Aplicar com blend suave
          const alpha = 0.8;
          data[idx] = Math.round(data[idx] * (1 - alpha) + avg.r * alpha);
          data[idx + 1] = Math.round(
            data[idx + 1] * (1 - alpha) + avg.g * alpha
          );
          data[idx + 2] = Math.round(
            data[idx + 2] * (1 - alpha) + avg.b * alpha
          );
        }
      }
    }
  }

  private getNeighborPixels(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number,
    radius: number,
    excludeRegion: WatermarkRegion
  ): Array<{ r: number; g: number; b: number }> {
    const neighbors: Array<{ r: number; g: number; b: number }> = [];

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          // Verificar se está fora da região de exclusão
          if (
            nx < excludeRegion.x ||
            nx >= excludeRegion.x + excludeRegion.width ||
            ny < excludeRegion.y ||
            ny >= excludeRegion.y + excludeRegion.height
          ) {
            const idx = (ny * width + nx) * 4;
            neighbors.push({
              r: data[idx],
              g: data[idx + 1],
              b: data[idx + 2],
            });
          }
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
    if (colors.length === 0) return { r: 0, g: 0, b: 0 };

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

  private applySmoothing(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    // Aplicar filtro gaussiano suave
    const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
    const kernelSum = 16;
    const output = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0,
          g = 0,
          b = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const weight = kernel[(ky + 1) * 3 + (kx + 1)];

            r += data[idx] * weight;
            g += data[idx + 1] * weight;
            b += data[idx + 2] * weight;
          }
        }

        const idx = (y * width + x) * 4;
        output[idx] = Math.round(r / kernelSum);
        output[idx + 1] = Math.round(g / kernelSum);
        output[idx + 2] = Math.round(b / kernelSum);
      }
    }

    // Aplicar resultado com blend muito suave
    for (let i = 0; i < data.length; i += 4) {
      const alpha = 0.15; // Suavização muito leve
      data[i] = Math.round(data[i] * (1 - alpha) + output[i] * alpha);
      data[i + 1] = Math.round(
        data[i + 1] * (1 - alpha) + output[i + 1] * alpha
      );
      data[i + 2] = Math.round(
        data[i + 2] * (1 - alpha) + output[i + 2] * alpha
      );
    }
  }

  private async applyFinalAdjustments(): Promise<void> {
    if (!this.canvas || !this.ctx) return;

    // Aplicar ajuste sutil de contraste
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const { data } = imageData;

    const contrast = 1.02; // Aumentar contraste em 2%
    const brightness = 2; // Aumentar brilho levemente

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(
        255,
        Math.max(0, (data[i] - 128) * contrast + 128 + brightness)
      );
      data[i + 1] = Math.min(
        255,
        Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness)
      );
      data[i + 2] = Math.min(
        255,
        Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness)
      );
    }

    this.ctx.putImageData(imageData, 0, 0);
  }
}

// Exportar instância única
export const advancedWatermarkProcessor = new AdvancedWatermarkProcessor();
