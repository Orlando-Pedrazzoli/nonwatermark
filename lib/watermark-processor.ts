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

            // Detectar watermarks
            const imageData = this.ctx.getImageData(
              0,
              0,
              this.canvas.width,
              this.canvas.height
            );
            const watermarks = this.detectWatermarks(imageData);

            // Processar remoção de watermarks
            if (watermarks.length > 0) {
              await this.removeWatermarks(imageData, watermarks);
              this.ctx.putImageData(imageData, 0, 0);
            }

            // Aplicar pós-processamento
            await this.applyPostProcessing();

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

  private detectWatermarks(imageData: ImageData): WatermarkRegion[] {
    const watermarks: WatermarkRegion[] = [];
    const { data, width, height } = imageData;

    // 1. Detecção de watermarks por análise de frequência
    const frequencyWatermarks = this.detectByFrequencyAnalysis(
      data,
      width,
      height
    );
    watermarks.push(...frequencyWatermarks);

    // 2. Detecção de texto por análise de contraste
    const textWatermarks = this.detectTextByContrast(data, width, height);
    watermarks.push(...textWatermarks);

    // 3. Detecção de padrões repetitivos
    const patternWatermarks = this.detectRepeatingPatterns(data, width, height);
    watermarks.push(...patternWatermarks);

    // 4. Detecção de transparência
    const transparentWatermarks = this.detectTransparentOverlays(
      data,
      width,
      height
    );
    watermarks.push(...transparentWatermarks);

    // 5. Detecção por análise de bordas
    const edgeWatermarks = this.detectByEdgeAnalysis(data, width, height);
    watermarks.push(...edgeWatermarks);

    // Consolidar regiões detectadas
    return this.consolidateRegions(watermarks);
  }

  private detectByFrequencyAnalysis(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): WatermarkRegion[] {
    const regions: WatermarkRegion[] = [];
    const blockSize = 64;
    const threshold = 0.4;

    for (let y = 0; y < height - blockSize; y += blockSize / 2) {
      for (let x = 0; x < width - blockSize; x += blockSize / 2) {
        const block = this.extractBlock(data, width, x, y, blockSize);
        const frequencyScore = this.analyzeBlockFrequency(block);

        if (frequencyScore > threshold) {
          regions.push({
            x,
            y,
            width: blockSize,
            height: blockSize,
            confidence: frequencyScore,
            type: 'pattern',
          });
        }
      }
    }

    return regions;
  }

  private extractBlock(
    data: Uint8ClampedArray,
    width: number,
    x: number,
    y: number,
    size: number
  ): number[] {
    const block: number[] = [];
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const idx = ((y + dy) * width + (x + dx)) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        block.push(gray);
      }
    }
    return block;
  }

  private analyzeBlockFrequency(block: number[]): number {
    // Análise simplificada de frequência usando variância
    const mean = block.reduce((a, b) => a + b, 0) / block.length;
    const variance =
      block.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      block.length;

    // Blocos com watermark tendem a ter padrões específicos de variância
    if (variance > 100 && variance < 2000) {
      // Verificar se há padrão de gradiente suave (típico de watermark)
      let gradientScore = 0;
      for (let i = 1; i < block.length; i++) {
        const diff = Math.abs(block[i] - block[i - 1]);
        if (diff > 5 && diff < 50) gradientScore++;
      }

      return Math.min(gradientScore / block.length, 1);
    }

    return 0;
  }

  private detectTextByContrast(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): WatermarkRegion[] {
    const regions: WatermarkRegion[] = [];
    const blockSize = 32;

    for (let y = 0; y < height - blockSize; y += 16) {
      for (let x = 0; x < width - blockSize; x += 16) {
        const contrastScore = this.analyzeTextContrast(
          data,
          width,
          x,
          y,
          blockSize
        );

        if (contrastScore > 0.5) {
          regions.push({
            x,
            y,
            width: blockSize,
            height: blockSize,
            confidence: contrastScore,
            type: 'text',
          });
        }
      }
    }

    return regions;
  }

  private analyzeTextContrast(
    data: Uint8ClampedArray,
    width: number,
    x: number,
    y: number,
    size: number
  ): number {
    let edgePixels = 0;
    let totalPixels = 0;

    for (let dy = 1; dy < size - 1; dy++) {
      for (let dx = 1; dx < size - 1; dx++) {
        const idx = ((y + dy) * width + (x + dx)) * 4;
        const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        // Verificar gradientes horizontais e verticais
        const idxLeft = ((y + dy) * width + (x + dx - 1)) * 4;
        const idxRight = ((y + dy) * width + (x + dx + 1)) * 4;
        const idxUp = ((y + dy - 1) * width + (x + dx)) * 4;
        const idxDown = ((y + dy + 1) * width + (x + dx)) * 4;

        const left =
          (data[idxLeft] + data[idxLeft + 1] + data[idxLeft + 2]) / 3;
        const right =
          (data[idxRight] + data[idxRight + 1] + data[idxRight + 2]) / 3;
        const up = (data[idxUp] + data[idxUp + 1] + data[idxUp + 2]) / 3;
        const down =
          (data[idxDown] + data[idxDown + 1] + data[idxDown + 2]) / 3;

        const gradH = Math.abs(right - left);
        const gradV = Math.abs(down - up);

        if (gradH > 20 || gradV > 20) {
          edgePixels++;
        }
        totalPixels++;
      }
    }

    const edgeDensity = edgePixels / totalPixels;
    // Texto geralmente tem densidade de bordas entre 0.1 e 0.4
    if (edgeDensity > 0.1 && edgeDensity < 0.4) {
      return edgeDensity * 2; // Normalizar para 0-1
    }

    return 0;
  }

  private detectRepeatingPatterns(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): WatermarkRegion[] {
    const regions: WatermarkRegion[] = [];
    const patternSize = 48;
    const stride = 24;

    // Criar mapa de padrões
    const patterns = new Map<string, Array<{ x: number; y: number }>>();

    for (let y = 0; y < height - patternSize; y += stride) {
      for (let x = 0; x < width - patternSize; x += stride) {
        const hash = this.getPatternHash(data, width, x, y, patternSize);

        if (!patterns.has(hash)) {
          patterns.set(hash, []);
        }
        patterns.get(hash)!.push({ x, y });
      }
    }

    // Encontrar padrões que se repetem
    patterns.forEach((locations, hash) => {
      if (locations.length >= 3) {
        // Pelo menos 3 repetições
        locations.forEach(loc => {
          regions.push({
            x: loc.x,
            y: loc.y,
            width: patternSize,
            height: patternSize,
            confidence: Math.min(locations.length / 10, 1),
            type: 'pattern',
          });
        });
      }
    });

    return regions;
  }

  private getPatternHash(
    data: Uint8ClampedArray,
    width: number,
    x: number,
    y: number,
    size: number
  ): string {
    // Criar hash simplificado do padrão
    const samples = [];
    const step = 4;

    for (let dy = 0; dy < size; dy += step) {
      for (let dx = 0; dx < size; dx += step) {
        const idx = ((y + dy) * width + (x + dx)) * 4;
        const gray =
          Math.round((data[idx] + data[idx + 1] + data[idx + 2]) / 3 / 32) * 32;
        samples.push(gray);
      }
    }

    return samples.join(',');
  }

  private detectTransparentOverlays(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): WatermarkRegion[] {
    const regions: WatermarkRegion[] = [];
    const blockSize = 40;

    for (let y = 0; y < height - blockSize; y += 20) {
      for (let x = 0; x < width - blockSize; x += 20) {
        const transparencyScore = this.analyzeTransparency(
          data,
          width,
          x,
          y,
          blockSize
        );

        if (transparencyScore > 0.4) {
          regions.push({
            x,
            y,
            width: blockSize,
            height: blockSize,
            confidence: transparencyScore,
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
    x: number,
    y: number,
    size: number
  ): number {
    let consistentBrightness = 0;
    let totalPixels = 0;

    const samples: number[] = [];

    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const idx = ((y + dy) * width + (x + dx)) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        samples.push(brightness);
        totalPixels++;
      }
    }

    // Calcular estatísticas
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const std = Math.sqrt(
      samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        samples.length
    );

    // Watermarks transparentes têm baixo desvio padrão e brilho específico
    if (std < 30 && (mean > 180 || mean < 80)) {
      return 0.8;
    }

    return 0;
  }

  private detectByEdgeAnalysis(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): WatermarkRegion[] {
    const regions: WatermarkRegion[] = [];
    const blockSize = 50;

    // Aplicar detecção de bordas Sobel simplificada
    const edges = this.applySobelFilter(data, width, height);

    for (let y = 0; y < height - blockSize; y += 25) {
      for (let x = 0; x < width - blockSize; x += 25) {
        const edgeScore = this.analyzeEdges(edges, width, x, y, blockSize);

        if (edgeScore > 0.3) {
          regions.push({
            x,
            y,
            width: blockSize,
            height: blockSize,
            confidence: edgeScore,
            type: 'logo',
          });
        }
      }
    }

    return regions;
  }

  private applySobelFilter(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Float32Array {
    const edges = new Float32Array(width * height);

    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0,
          gy = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const kernelIdx = (dy + 1) * 3 + (dx + 1);

            gx += gray * sobelX[kernelIdx];
            gy += gray * sobelY[kernelIdx];
          }
        }

        edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    return edges;
  }

  private analyzeEdges(
    edges: Float32Array,
    width: number,
    x: number,
    y: number,
    size: number
  ): number {
    let edgeSum = 0;
    let pixelCount = 0;

    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const idx = (y + dy) * width + (x + dx);
        edgeSum += edges[idx];
        pixelCount++;
      }
    }

    const avgEdge = edgeSum / pixelCount;
    // Normalizar para 0-1
    return Math.min(avgEdge / 100, 1);
  }

  private consolidateRegions(regions: WatermarkRegion[]): WatermarkRegion[] {
    if (regions.length === 0) return [];

    // Filtrar por confiança
    let filtered = regions.filter(r => r.confidence > 0.3);

    // Ordenar por confiança
    filtered.sort((a, b) => b.confidence - a.confidence);

    // Mesclar regiões sobrepostas
    const merged: WatermarkRegion[] = [];
    const used = new Set<number>();

    for (let i = 0; i < filtered.length; i++) {
      if (used.has(i)) continue;

      let current = filtered[i];
      const group = [i];

      for (let j = i + 1; j < filtered.length; j++) {
        if (used.has(j)) continue;

        if (this.regionsOverlap(current, filtered[j])) {
          group.push(j);
          used.add(j);
        }
      }

      if (group.length > 1) {
        current = this.mergeRegions(group.map(idx => filtered[idx]));
      }

      merged.push(current);
      used.add(i);
    }

    // Limitar a 10 watermarks mais confiáveis
    return merged.slice(0, 10);
  }

  private regionsOverlap(a: WatermarkRegion, b: WatermarkRegion): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }

  private mergeRegions(regions: WatermarkRegion[]): WatermarkRegion {
    const minX = Math.min(...regions.map(r => r.x));
    const minY = Math.min(...regions.map(r => r.y));
    const maxX = Math.max(...regions.map(r => r.x + r.width));
    const maxY = Math.max(...regions.map(r => r.y + r.height));

    const avgConfidence =
      regions.reduce((sum, r) => sum + r.confidence, 0) / regions.length;
    const types = regions.map(r => r.type);
    const mostCommonType =
      types
        .sort(
          (a, b) =>
            types.filter(v => v === a).length -
            types.filter(v => v === b).length
        )
        .pop() || 'pattern';

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      confidence: avgConfidence,
      type: mostCommonType,
    };
  }

  private async removeWatermarks(
    imageData: ImageData,
    watermarks: WatermarkRegion[]
  ): Promise<void> {
    const { data, width, height } = imageData;

    for (const watermark of watermarks) {
      switch (watermark.type) {
        case 'text':
          await this.removeTextWatermark(data, width, height, watermark);
          break;
        case 'transparent':
          await this.removeTransparentWatermark(data, width, height, watermark);
          break;
        case 'pattern':
          await this.removePatternWatermark(data, width, height, watermark);
          break;
        case 'logo':
          await this.removeLogoWatermark(data, width, height, watermark);
          break;
        default:
          await this.inpaintRegion(data, width, height, watermark);
      }
    }
  }

  private async removeTextWatermark(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    region: WatermarkRegion
  ): Promise<void> {
    // Usar inpainting baseado em contexto para texto
    const expandedRegion = {
      x: Math.max(0, region.x - 5),
      y: Math.max(0, region.y - 5),
      width: Math.min(width - region.x, region.width + 10),
      height: Math.min(height - region.y, region.height + 10),
    };

    await this.contentAwareInpaint(data, width, height, expandedRegion);
  }

  private async removeTransparentWatermark(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    region: WatermarkRegion
  ): Promise<void> {
    // Técnica de deblending para watermarks transparentes
    for (let y = region.y; y < region.y + region.height && y < height; y++) {
      for (let x = region.x; x < region.x + region.width && x < width; x++) {
        const idx = (y * width + x) * 4;

        // Analisar vizinhança
        const neighbors = this.getNeighborPixels(data, width, height, x, y, 3);

        if (neighbors.length > 0) {
          // Estimar cor original baseada na vizinhança
          const estimated = this.estimateOriginalColor(data, idx, neighbors);

          data[idx] = estimated.r;
          data[idx + 1] = estimated.g;
          data[idx + 2] = estimated.b;
        }
      }
    }
  }

  private async removePatternWatermark(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    region: WatermarkRegion
  ): Promise<void> {
    // Usar FFT simplificada para remover padrões repetitivos
    await this.fourierInpaint(data, width, height, region);
  }

  private async removeLogoWatermark(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    region: WatermarkRegion
  ): Promise<void> {
    // Usar inpainting com patches para logos
    await this.patchBasedInpaint(data, width, height, region);
  }

  private async contentAwareInpaint(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    region: any
  ): Promise<void> {
    // Implementação de inpainting consciente do conteúdo
    const patchSize = 7;
    const searchRadius = 30;

    for (let y = region.y; y < region.y + region.height && y < height; y++) {
      for (let x = region.x; x < region.x + region.width && x < width; x++) {
        // Encontrar melhor patch correspondente
        const bestPatch = this.findBestPatch(
          data,
          width,
          height,
          x,
          y,
          patchSize,
          searchRadius,
          region
        );

        if (bestPatch) {
          const idx = (y * width + x) * 4;
          const patchIdx = (bestPatch.y * width + bestPatch.x) * 4;

          // Copiar cor do melhor patch
          data[idx] = data[patchIdx];
          data[idx + 1] = data[patchIdx + 1];
          data[idx + 2] = data[patchIdx + 2];
        }
      }
    }
  }

  private findBestPatch(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    targetX: number,
    targetY: number,
    patchSize: number,
    searchRadius: number,
    excludeRegion: any
  ): { x: number; y: number } | null {
    let bestMatch = null;
    let bestScore = Infinity;

    const halfPatch = Math.floor(patchSize / 2);

    for (
      let sy = Math.max(halfPatch, targetY - searchRadius);
      sy < Math.min(height - halfPatch, targetY + searchRadius);
      sy++
    ) {
      for (
        let sx = Math.max(halfPatch, targetX - searchRadius);
        sx < Math.min(width - halfPatch, targetX + searchRadius);
        sx++
      ) {
        // Pular se está dentro da região a ser removida
        if (
          sx >= excludeRegion.x &&
          sx < excludeRegion.x + excludeRegion.width &&
          sy >= excludeRegion.y &&
          sy < excludeRegion.y + excludeRegion.height
        ) {
          continue;
        }

        // Calcular diferença entre patches
        let score = 0;
        let validPixels = 0;

        for (let dy = -halfPatch; dy <= halfPatch; dy++) {
          for (let dx = -halfPatch; dx <= halfPatch; dx++) {
            const tx = targetX + dx;
            const ty = targetY + dy;
            const sx2 = sx + dx;
            const sy2 = sy + dy;

            // Verificar se está fora da região a ser inpainted
            if (
              tx < excludeRegion.x ||
              tx >= excludeRegion.x + excludeRegion.width ||
              ty < excludeRegion.y ||
              ty >= excludeRegion.y + excludeRegion.height
            ) {
              const tidx = (ty * width + tx) * 4;
              const sidx = (sy2 * width + sx2) * 4;

              const dr = data[tidx] - data[sidx];
              const dg = data[tidx + 1] - data[sidx + 1];
              const db = data[tidx + 2] - data[sidx + 2];

              score += dr * dr + dg * dg + db * db;
              validPixels++;
            }
          }
        }

        if (validPixels > 0) {
          score /= validPixels;
          if (score < bestScore) {
            bestScore = score;
            bestMatch = { x: sx, y: sy };
          }
        }
      }
    }

    return bestMatch;
  }

  private async fourierInpaint(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    region: WatermarkRegion
  ): Promise<void> {
    // Implementação simplificada de remoção por análise de frequência
    for (let y = region.y; y < region.y + region.height && y < height; y++) {
      for (let x = region.x; x < region.x + region.width && x < width; x++) {
        // Usar interpolação bilinear dos vizinhos
        const interpolated = this.bilinearInterpolate(
          data,
          width,
          height,
          x,
          y,
          5
        );

        if (interpolated) {
          const idx = (y * width + x) * 4;
          data[idx] = interpolated.r;
          data[idx + 1] = interpolated.g;
          data[idx + 2] = interpolated.b;
        }
      }
    }
  }

  private async patchBasedInpaint(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    region: WatermarkRegion
  ): Promise<void> {
    // Inpainting baseado em patches para logos
    const patchSize = 9;

    // Processo iterativo
    for (let iter = 0; iter < 3; iter++) {
      for (
        let y = region.y;
        y < region.y + region.height && y < height;
        y += 2
      ) {
        for (
          let x = region.x;
          x < region.x + region.width && x < width;
          x += 2
        ) {
          const patches = this.findSimilarPatches(
            data,
            width,
            height,
            x,
            y,
            patchSize,
            region
          );

          if (patches.length > 0) {
            const blended = this.blendPatches(data, width, patches);
            const idx = (y * width + x) * 4;

            data[idx] = blended.r;
            data[idx + 1] = blended.g;
            data[idx + 2] = blended.b;
          }
        }
      }
    }
  }

  private findSimilarPatches(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number,
    patchSize: number,
    excludeRegion: WatermarkRegion
  ): Array<{ x: number; y: number; weight: number }> {
    const patches: Array<{ x: number; y: number; weight: number }> = [];
    const searchRadius = 50;
    const halfPatch = Math.floor(patchSize / 2);

    for (
      let sy = Math.max(halfPatch, y - searchRadius);
      sy < Math.min(height - halfPatch, y + searchRadius);
      sy++
    ) {
      for (
        let sx = Math.max(halfPatch, x - searchRadius);
        sx < Math.min(width - halfPatch, x + searchRadius);
        sx++
      ) {
        // Pular região do watermark
        if (
          sx >= excludeRegion.x &&
          sx < excludeRegion.x + excludeRegion.width &&
          sy >= excludeRegion.y &&
          sy < excludeRegion.y + excludeRegion.height
        ) {
          continue;
        }

        const similarity = this.computePatchSimilarity(
          data,
          width,
          x,
          y,
          sx,
          sy,
          patchSize
        );

        if (similarity > 0.7) {
          patches.push({ x: sx, y: sy, weight: similarity });
        }
      }
    }

    // Retornar top 5 patches mais similares
    return patches.sort((a, b) => b.weight - a.weight).slice(0, 5);
  }

  private computePatchSimilarity(
    data: Uint8ClampedArray,
    width: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    patchSize: number
  ): number {
    let sum = 0;
    let count = 0;
    const halfPatch = Math.floor(patchSize / 2);

    for (let dy = -halfPatch; dy <= halfPatch; dy++) {
      for (let dx = -halfPatch; dx <= halfPatch; dx++) {
        const idx1 = ((y1 + dy) * width + (x1 + dx)) * 4;
        const idx2 = ((y2 + dy) * width + (x2 + dx)) * 4;

        const dr = data[idx1] - data[idx2];
        const dg = data[idx1 + 1] - data[idx2 + 1];
        const db = data[idx1 + 2] - data[idx2 + 2];

        sum += Math.sqrt(dr * dr + dg * dg + db * db);
        count++;
      }
    }

    const avgDiff = sum / count;
    return Math.max(0, 1 - avgDiff / 441); // 441 = sqrt(255^2 * 3)
  }

  private blendPatches(
    data: Uint8ClampedArray,
    width: number,
    patches: Array<{ x: number; y: number; weight: number }>
  ): { r: number; g: number; b: number } {
    let r = 0,
      g = 0,
      b = 0;
    let totalWeight = 0;

    for (const patch of patches) {
      const idx = (patch.y * width + patch.x) * 4;
      r += data[idx] * patch.weight;
      g += data[idx + 1] * patch.weight;
      b += data[idx + 2] * patch.weight;
      totalWeight += patch.weight;
    }

    return {
      r: Math.round(r / totalWeight),
      g: Math.round(g / totalWeight),
      b: Math.round(b / totalWeight),
    };
  }

  private async inpaintRegion(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    region: WatermarkRegion
  ): Promise<void> {
    // Inpainting genérico melhorado
    const iterations = 5;

    for (let iter = 0; iter < iterations; iter++) {
      for (let y = region.y; y < region.y + region.height && y < height; y++) {
        for (let x = region.x; x < region.x + region.width && x < width; x++) {
          const neighbors = this.getValidNeighbors(
            data,
            width,
            height,
            x,
            y,
            2,
            region
          );

          if (neighbors.length > 0) {
            const avg = this.averageColors(neighbors);
            const idx = (y * width + x) * 4;

            // Aplicar com suavização
            const alpha = 0.7;
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
  }

  private getNeighborPixels(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number,
    radius: number
  ): Array<{ r: number; g: number; b: number }> {
    const neighbors: Array<{ r: number; g: number; b: number }> = [];

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
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

  private getValidNeighbors(
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

        // Verificar se está fora da região de exclusão
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
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

  private estimateOriginalColor(
    data: Uint8ClampedArray,
    idx: number,
    neighbors: Array<{ r: number; g: number; b: number }>
  ): { r: number; g: number; b: number } {
    const current = {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
    };

    const avg = this.averageColors(neighbors);

    // Estimar cor original removendo o watermark (assumindo watermark semi-transparente)
    const alpha = 0.3; // Estimativa de opacidade do watermark

    return {
      r: Math.min(255, Math.max(0, (current.r - alpha * 255) / (1 - alpha))),
      g: Math.min(255, Math.max(0, (current.g - alpha * 255) / (1 - alpha))),
      b: Math.min(255, Math.max(0, (current.b - alpha * 255) / (1 - alpha))),
    };
  }

  private bilinearInterpolate(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number,
    radius: number
  ): { r: number; g: number; b: number } | null {
    // Coletar pontos de controle ao redor
    const points: Array<{
      x: number;
      y: number;
      r: number;
      g: number;
      b: number;
    }> = [];

    // Pontos cardinais
    const directions = [
      { dx: -radius, dy: 0 }, // esquerda
      { dx: radius, dy: 0 }, // direita
      { dx: 0, dy: -radius }, // cima
      { dx: 0, dy: radius }, // baixo
    ];

    for (const dir of directions) {
      const px = x + dir.dx;
      const py = y + dir.dy;

      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 4;
        points.push({
          x: px,
          y: py,
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2],
        });
      }
    }

    if (points.length < 2) return null;

    // Interpolação simples
    return this.averageColors(points.map(p => ({ r: p.r, g: p.g, b: p.b })));
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

  private async applyPostProcessing(): Promise<void> {
    if (!this.canvas || !this.ctx) return;

    // 1. Aplicar suavização seletiva
    await this.applySelectiveSmoothing();

    // 2. Ajustar contraste e brilho
    await this.adjustContrastBrightness();

    // 3. Reduzir ruído
    await this.reduceNoise();
  }

  private async applySelectiveSmoothing(): Promise<void> {
    if (!this.canvas || !this.ctx) return;

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const { data, width, height } = imageData;
    const output = new Uint8ClampedArray(data);

    // Aplicar filtro gaussiano suave apenas em áreas processadas
    const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
    const kernelSum = 16;

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
        output[idx + 3] = data[idx + 3];
      }
    }

    // Aplicar resultado com blend suave
    for (let i = 0; i < data.length; i += 4) {
      const alpha = 0.3; // Força do smoothing
      data[i] = Math.round(data[i] * (1 - alpha) + output[i] * alpha);
      data[i + 1] = Math.round(
        data[i + 1] * (1 - alpha) + output[i + 1] * alpha
      );
      data[i + 2] = Math.round(
        data[i + 2] * (1 - alpha) + output[i + 2] * alpha
      );
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private async adjustContrastBrightness(): Promise<void> {
    if (!this.canvas || !this.ctx) return;

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const { data } = imageData;

    // Ajuste sutil de contraste e brilho
    const contrast = 1.05; // Aumentar contraste em 5%
    const brightness = 0; // Sem mudança de brilho

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

  private async reduceNoise(): Promise<void> {
    if (!this.canvas || !this.ctx) return;

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const { data, width, height } = imageData;

    // Filtro de mediana simplificado para reduzir ruído
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const neighbors = [];

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            neighbors.push({
              r: data[idx],
              g: data[idx + 1],
              b: data[idx + 2],
            });
          }
        }

        // Ordenar e pegar valor mediano
        const idx = (y * width + x) * 4;
        const rValues = neighbors.map(n => n.r).sort((a, b) => a - b);
        const gValues = neighbors.map(n => n.g).sort((a, b) => a - b);
        const bValues = neighbors.map(n => n.b).sort((a, b) => a - b);

        const medianIdx = Math.floor(neighbors.length / 2);

        // Aplicar apenas se a diferença for significativa (reduz ruído mantendo detalhes)
        const threshold = 30;
        if (Math.abs(data[idx] - rValues[medianIdx]) > threshold) {
          data[idx] = rValues[medianIdx];
        }
        if (Math.abs(data[idx + 1] - gValues[medianIdx]) > threshold) {
          data[idx + 1] = gValues[medianIdx];
        }
        if (Math.abs(data[idx + 2] - bValues[medianIdx]) > threshold) {
          data[idx + 2] = bValues[medianIdx];
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }
}

// Exportar instância única
export const advancedWatermarkProcessor = new AdvancedWatermarkProcessor();
