import * as tf from '@tensorflow/tfjs';

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
  watermarksDetected: WatermarkRegion[];
  processingTime: number;
  error?: string;
}

export class AdvancedWatermarkProcessor {
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

      // Múltiplas estratégias de detecção
      const textRegions = await this.detectTextWatermarks(data, width, height);
      const transparentRegions = await this.detectTransparentOverlays(
        data,
        width,
        height
      );
      const patternRegions = await this.detectRepeatingPatterns(
        data,
        width,
        height
      );
      const edgeRegions = await this.detectEdgeAnomalies(data, width, height);

      regions.push(
        ...textRegions,
        ...transparentRegions,
        ...patternRegions,
        ...edgeRegions
      );

      // Filtrar e unir regiões sobrepostas
      return this.mergeAndFilterRegions(regions);
    } catch (error) {
      console.error('Watermark detection failed:', error);
      return [];
    }
  }

  private async detectTextWatermarks(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Promise<WatermarkRegion[]> {
    const regions: WatermarkRegion[] = [];
    const blockSize = 24;

    // Converter para tensor para análise mais avançada
    const tensor = tf.browser.fromPixels({ data, width, height } as any);
    const grayscale = tf.image.rgbToGrayscale(tensor);
    const grayscaleData = await grayscale.data();

    for (let y = 0; y < height - blockSize; y += 8) {
      for (let x = 0; x < width - blockSize; x += 8) {
        const textScore = this.analyzeTextPattern(
          grayscaleData,
          width,
          x,
          y,
          blockSize
        );

        if (textScore > 0.4) {
          regions.push({
            x,
            y,
            width: blockSize,
            height: blockSize,
            confidence: textScore,
            type: 'text',
          });
        }
      }
    }

    tensor.dispose();
    grayscale.dispose();
    return regions;
  }

  private analyzeTextPattern(
    grayscaleData: Float32Array | Int32Array | Uint8Array,
    width: number,
    startX: number,
    startY: number,
    blockSize: number
  ): number {
    let edgeCount = 0;
    let pixelCount = 0;
    let brightness = 0;

    // Analisar gradientes para detectar bordas características de texto
    for (let y = startY; y < startY + blockSize - 1; y++) {
      for (let x = startX; x < startX + blockSize - 1; x++) {
        const idx = y * width + x;
        const current = grayscaleData[idx];
        const right = grayscaleData[idx + 1];
        const down = grayscaleData[idx + width];

        // Gradiente horizontal e vertical
        const gradX = Math.abs(right - current);
        const gradY = Math.abs(down - current);
        const gradient = Math.sqrt(gradX * gradX + gradY * gradY);

        if (gradient > 0.1) edgeCount++;
        brightness += current;
        pixelCount++;
      }
    }

    const avgBrightness = brightness / pixelCount;
    const edgeDensity = edgeCount / pixelCount;

    // Texto geralmente tem densidade de bordas moderada e brilho específico
    let score = 0;
    if (edgeDensity > 0.15 && edgeDensity < 0.4) {
      score += 0.3;
    }

    // Watermarks de texto geralmente são semi-transparentes
    if (avgBrightness > 0.3 && avgBrightness < 0.8) {
      score += 0.3;
    }

    // Verificar padrões repetitivos (características de watermarks)
    const repetitionScore = this.analyzeRepetition(
      grayscaleData,
      width,
      startX,
      startY,
      blockSize
    );
    score += repetitionScore * 0.4;

    return Math.min(score, 1);
  }

  private analyzeRepetition(
    data: Float32Array | Int32Array | Uint8Array,
    width: number,
    startX: number,
    startY: number,
    blockSize: number
  ): number {
    // Verificar se há padrões similares em outras partes da imagem
    const pattern = this.extractPattern(data, width, startX, startY, blockSize);
    let matches = 0;
    let comparisons = 0;

    // Procurar padrões similares em outras regiões
    const step = blockSize * 2;
    for (let y = 0; y < width - blockSize; y += step) {
      for (let x = 0; x < width - blockSize; x += step) {
        if (x === startX && y === startY) continue;

        const otherPattern = this.extractPattern(data, width, x, y, blockSize);
        const similarity = this.calculatePatternSimilarity(
          pattern,
          otherPattern
        );

        if (similarity > 0.7) matches++;
        comparisons++;
      }
    }

    return comparisons > 0 ? matches / comparisons : 0;
  }

  private extractPattern(
    data: Float32Array | Int32Array | Uint8Array,
    width: number,
    startX: number,
    startY: number,
    size: number
  ): number[] {
    const pattern = [];
    for (let y = 0; y < size; y += 2) {
      for (let x = 0; x < size; x += 2) {
        const idx = (startY + y) * width + (startX + x);
        pattern.push(data[idx]);
      }
    }
    return pattern;
  }

  private calculatePatternSimilarity(
    pattern1: number[],
    pattern2: number[]
  ): number {
    if (pattern1.length !== pattern2.length) return 0;

    let totalDiff = 0;
    for (let i = 0; i < pattern1.length; i++) {
      totalDiff += Math.abs(pattern1[i] - pattern2[i]);
    }

    const avgDiff = totalDiff / pattern1.length;
    return Math.max(0, 1 - avgDiff);
  }

  private async detectTransparentOverlays(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Promise<WatermarkRegion[]> {
    const regions: WatermarkRegion[] = [];
    const blockSize = 32;

    for (let y = 0; y < height - blockSize; y += 16) {
      for (let x = 0; x < width - blockSize; x += 16) {
        const transparency = this.analyzeTransparency(
          data,
          width,
          x,
          y,
          blockSize
        );

        if (transparency > 0.3) {
          regions.push({
            x,
            y,
            width: blockSize,
            height: blockSize,
            confidence: transparency,
            type: 'transparent',
          });
        }
      }
    }

    return regions;
  }

  private analyzeTransparency(
    data: Uint8ClampedArray,
    width: number,
    startX: number,
    startY: number,
    blockSize: number
  ): number {
    let suspiciousPixels = 0;
    let totalPixels = 0;

    for (let y = startY; y < startY + blockSize; y++) {
      for (let x = startX; x < startX + blockSize; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Verificar características de watermarks semi-transparentes
        const brightness = (r + g + b) / 3;
        const isTextLike =
          (brightness > 200 || brightness < 100) && // Alto contraste
          (a < 255 || this.hasTextCharacteristics(data, width, x, y));

        if (isTextLike) suspiciousPixels++;
        totalPixels++;
      }
    }

    return totalPixels > 0 ? suspiciousPixels / totalPixels : 0;
  }

  private hasTextCharacteristics(
    data: Uint8ClampedArray,
    width: number,
    x: number,
    y: number
  ): boolean {
    // Verificar se tem características típicas de texto (bordas, contraste)
    const neighbors = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0) {
          const idx = (ny * width + nx) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          neighbors.push(brightness);
        }
      }
    }

    if (neighbors.length === 0) return false;

    const avgNeighbor = neighbors.reduce((a, b) => a + b) / neighbors.length;
    const variance =
      neighbors.reduce((sum, val) => sum + Math.pow(val - avgNeighbor, 2), 0) /
      neighbors.length;

    return variance > 500; // Alto contraste sugere bordas de texto
  }

  private async detectRepeatingPatterns(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Promise<WatermarkRegion[]> {
    // Implementação simplificada - em produção usaria FFT
    return [];
  }

  private async detectEdgeAnomalies(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Promise<WatermarkRegion[]> {
    const regions: WatermarkRegion[] = [];

    // Usar TensorFlow.js para detecção de bordas mais precisa
    try {
      const tensor = tf.browser.fromPixels({ data, width, height } as any);
      const grayscale = tf.image.rgbToGrayscale(tensor);

      // Aplicar filtros de detecção de bordas
      const sobelX = tf.image.sobelEdges(grayscale.expandDims(0)).squeeze();
      const edgeData = await sobelX.data();

      // Analisar densidade de bordas anômala
      const blockSize = 40;
      for (let y = 0; y < height - blockSize; y += 20) {
        for (let x = 0; x < width - blockSize; x += 20) {
          const edgeDensity = this.calculateEdgeDensity(
            edgeData,
            width,
            x,
            y,
            blockSize
          );

          if (edgeDensity > 0.25 && edgeDensity < 0.7) {
            regions.push({
              x,
              y,
              width: blockSize,
              height: blockSize,
              confidence: edgeDensity,
              type: 'pattern',
            });
          }
        }
      }

      tensor.dispose();
      grayscale.dispose();
      sobelX.dispose();
    } catch (error) {
      console.error('Edge detection failed:', error);
    }

    return regions;
  }

  private calculateEdgeDensity(
    edgeData: Float32Array | Int32Array | Uint8Array,
    width: number,
    startX: number,
    startY: number,
    blockSize: number
  ): number {
    let edgeSum = 0;
    let pixelCount = 0;

    for (let y = startY; y < startY + blockSize; y++) {
      for (let x = startX; x < startX + blockSize; x++) {
        const idx = y * width + x;
        edgeSum += edgeData[idx];
        pixelCount++;
      }
    }

    return pixelCount > 0 ? edgeSum / pixelCount : 0;
  }

  private mergeAndFilterRegions(regions: WatermarkRegion[]): WatermarkRegion[] {
    if (regions.length === 0) return [];

    // Filtrar por confiança
    const filtered = regions.filter(r => r.confidence > 0.3);

    // Unir regiões sobrepostas
    const merged: WatermarkRegion[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < filtered.length; i++) {
      if (processed.has(i)) continue;

      let current = filtered[i];
      const similar = [i];

      for (let j = i + 1; j < filtered.length; j++) {
        if (processed.has(j)) continue;

        if (
          this.regionsOverlap(current, filtered[j]) ||
          this.regionsNearby(current, filtered[j])
        ) {
          similar.push(j);
          processed.add(j);
        }
      }

      if (similar.length > 1) {
        current = this.mergeMultipleRegions(similar.map(idx => filtered[idx]));
      }

      merged.push(current);
      processed.add(i);
    }

    return merged.sort((a, b) => b.confidence - a.confidence);
  }

  private regionsOverlap(r1: WatermarkRegion, r2: WatermarkRegion): boolean {
    return !(
      r1.x + r1.width < r2.x ||
      r2.x + r2.width < r1.x ||
      r1.y + r1.height < r2.y ||
      r2.y + r2.height < r1.y
    );
  }

  private regionsNearby(r1: WatermarkRegion, r2: WatermarkRegion): boolean {
    const distance = Math.sqrt(
      Math.pow(r1.x - r2.x, 2) + Math.pow(r1.y - r2.y, 2)
    );
    return distance < 50 && r1.type === r2.type;
  }

  private mergeMultipleRegions(regions: WatermarkRegion[]): WatermarkRegion {
    const minX = Math.min(...regions.map(r => r.x));
    const minY = Math.min(...regions.map(r => r.y));
    const maxX = Math.max(...regions.map(r => r.x + r.width));
    const maxY = Math.max(...regions.map(r => r.y + r.height));
    const avgConfidence =
      regions.reduce((sum, r) => sum + r.confidence, 0) / regions.length;
    const mostCommonType = regions[0].type; // Simplificado

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      confidence: avgConfidence,
      type: mostCommonType,
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

    // Processar por tipo de watermark
    for (const region of watermarkRegions) {
      switch (region.type) {
        case 'text':
          await this.removeTextWatermark(
            data,
            canvas.width,
            canvas.height,
            region
          );
          break;
        case 'transparent':
          await this.removeTransparentWatermark(
            data,
            canvas.width,
            canvas.height,
            region
          );
          break;
        default:
          await this.inpaintRegion(data, canvas.width, canvas.height, region);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png', 1.0);
  }

  private async removeTextWatermark(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    region: WatermarkRegion
  ): Promise<void> {
    // Inpainting mais sofisticado para texto
    const { x, y, width: regionWidth, height: regionHeight } = region;

    // Usar múltiplas direções para inpainting
    const directions = [
      { dx: 1, dy: 0 }, // horizontal
      { dx: 0, dy: 1 }, // vertical
      { dx: 1, dy: 1 }, // diagonal
      { dx: -1, dy: 1 }, // diagonal reversa
    ];

    for (let dy = 0; dy < regionHeight; dy++) {
      for (let dx = 0; dx < regionWidth; dx++) {
        const currentX = x + dx;
        const currentY = y + dy;

        if (currentX >= width || currentY >= height) continue;

        // Coletar amostras de múltiplas direções
        const samples: Array<{ r: number; g: number; b: number }> = [];

        for (const dir of directions) {
          const sample = this.sampleInDirection(
            data,
            width,
            height,
            currentX,
            currentY,
            dir.dx,
            dir.dy,
            5
          );
          if (sample) samples.push(sample);
        }

        if (samples.length > 0) {
          const avgColor = this.averageColors(samples);
          const idx = (currentY * width + currentX) * 4;

          data[idx] = avgColor.r;
          data[idx + 1] = avgColor.g;
          data[idx + 2] = avgColor.b;
          // Manter alpha original
        }
      }
    }
  }

  private sampleInDirection(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number,
    dx: number,
    dy: number,
    distance: number
  ): { r: number; g: number; b: number } | null {
    const sampleX = startX + dx * distance;
    const sampleY = startY + dy * distance;

    if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) {
      return null;
    }

    const idx = (sampleY * width + sampleX) * 4;
    return {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
    };
  }

  private async removeTransparentWatermark(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    region: WatermarkRegion
  ): Promise<void> {
    // Técnica específica para watermarks semi-transparentes
    const { x, y, width: regionWidth, height: regionHeight } = region;

    for (let dy = 0; dy < regionHeight; dy++) {
      for (let dx = 0; dx < regionWidth; dx++) {
        const currentX = x + dx;
        const currentY = y + dy;

        if (currentX >= width || currentY >= height) continue;

        const idx = (currentY * width + currentX) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Detectar se é provável ser watermark
        const brightness = (r + g + b) / 3;
        if (brightness > 180 || brightness < 80) {
          // Usar contexto mais amplo para substituir
          const replacement = this.getContextualReplacement(
            data,
            width,
            height,
            currentX,
            currentY,
            8
          );

          if (replacement) {
            data[idx] = replacement.r;
            data[idx + 1] = replacement.g;
            data[idx + 2] = replacement.b;
          }
        }
      }
    }
  }

  private getContextualReplacement(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    radius: number
  ): { r: number; g: number; b: number } | null {
    const samples: Array<{ r: number; g: number; b: number }> = [];

    // Coletar amostras em um círculo ao redor do pixel
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
      const sampleX = Math.round(centerX + Math.cos(angle) * radius);
      const sampleY = Math.round(centerY + Math.sin(angle) * radius);

      if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
        const idx = (sampleY * width + sampleX) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        // Ignorar pixels que também podem ser watermark
        if (brightness > 100 && brightness < 180) {
          samples.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2],
          });
        }
      }
    }

    return samples.length > 0 ? this.averageColors(samples) : null;
  }

  private async inpaintRegion(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    region: WatermarkRegion
  ): Promise<void> {
    // Inpainting genérico melhorado
    const { x, y, width: regionWidth, height: regionHeight } = region;

    // Múltiplas passadas para melhor resultado
    for (let pass = 0; pass < 3; pass++) {
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

            // Aplicar com blend parcial para suavizar
            const blendFactor = 0.7;
            data[idx] = Math.round(
              data[idx] * (1 - blendFactor) + avgColor.r * blendFactor
            );
            data[idx + 1] = Math.round(
              data[idx + 1] * (1 - blendFactor) + avgColor.g * blendFactor
            );
            data[idx + 2] = Math.round(
              data[idx + 2] * (1 - blendFactor) + avgColor.b * blendFactor
            );
          }
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

    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
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

export const advancedWatermarkProcessor = new AdvancedWatermarkProcessor();
