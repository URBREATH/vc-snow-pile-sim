import { VcsUiApp } from '@vcmap/ui';
import { CesiumMap, VectorLayer } from '@vcmap/core';
import { Cartesian3, HeadingPitchRange, Matrix4 } from '@vcmap-cesium/engine';
import { ComponentInternalInstance } from 'vue';
import { jsPDF } from 'jspdf';
import { v4 as uuidv4 } from 'uuid';

async function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = (): void => resolve(img);
  });
}

export function normalizeHexCode(hex: string): string {
  // Erstelle eine lokale Variable und entferne das optionale '#' am Anfang
  const sanitizedHex = hex.startsWith('#') ? hex.slice(1) : hex;

  if (sanitizedHex.length === 3) {
    // Dreistelliger Hex-Code -> Sechsstellig erweitern
    return `#${sanitizedHex[0]}${sanitizedHex[0]}${sanitizedHex[1]}${sanitizedHex[1]}${sanitizedHex[2]}${sanitizedHex[2]}`;
  } else if (sanitizedHex.length === 6) {
    // Bereits sechsstellig, einfach mit '#' zurückgeben
    return `#${sanitizedHex}`;
  } else {
    return '#000000';
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export async function recolorTransparentImageAsync(
  base64: string,
  color: string,
): Promise<string> {
  const img = await loadImage(base64);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Problems to create canvas für pdf export image');
  }

  canvas.width = img.width;
  canvas.height = img.height;

  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  const targetColor = hexToRgb(normalizeHexCode(color)) ?? {
    r: 255,
    g: 255,
    b: 255,
  };

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];

    if (r === 255 && g === 255 && b === 255 && a > 0) {
      data[i] = targetColor.r;
      data[i + 1] = targetColor.g;
      data[i + 2] = targetColor.b;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL('image/png');
}

const style = document.createElement('style');
style.textContent = `
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}`;
document.head.appendChild(style);
export type PDFScreenshotInfo = {
  position: Cartesian3;
  heading: number;
  pitch: number;
  distance: number;
};

async function getImageFromCesium(map: CesiumMap): Promise<HTMLCanvasElement> {
  const { scene } = map.getCesiumWidget()!;

  return new Promise((resolve) => {
    const removePreListener = scene.preUpdate.addEventListener(() => {
      const { canvas } = scene;
      const removePostListener = scene.postRender.addEventListener(() => {
        resolve(canvas);
        removePostListener();
      });
      removePreListener();
    });
  });
}

function captureCroppedCanvasScreenshot(
  canvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
): string {
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = targetWidth;
  offscreenCanvas.height = targetHeight;

  const offscreenContext = offscreenCanvas.getContext('2d');
  if (!offscreenContext) {
    throw new Error('Unable to get canvas 2D context.');
  }

  const originalWidth = canvas.width;
  const originalHeight = canvas.height;

  const originalAspect = originalWidth / originalHeight;
  const targetAspect = targetWidth / targetHeight;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = originalWidth;
  let sourceHeight = originalHeight;

  if (originalAspect > targetAspect) {
    sourceWidth = originalHeight * targetAspect;
    sourceX = (originalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = originalWidth / targetAspect;
    sourceY = (originalHeight - sourceHeight) / 2;
  }

  offscreenContext.drawImage(
    canvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return offscreenCanvas.toDataURL('image/png');
}

export const formatterZeroDigits = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatterTwoDigits = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatterThreeDigits = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export function transText(
  vm: ComponentInternalInstance | null,
  i18n: string,
  variables?: Record<string, unknown>,
): string {
  if (variables) {
    return vm?.proxy?.$st(i18n, variables) ?? '';
  }
  return vm?.proxy?.$st(i18n) ?? '';
}

export function dynamicTextSize(
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  doc: jsPDF,
): void {
  doc.setFontSize(12);
  const actualWidth = doc.getTextWidth(text);
  const actualHeight = 12;

  const widthScale = maxWidth / actualWidth;
  const heightScale = maxHeight / actualHeight;

  const scaleFactor = Math.min(widthScale, heightScale);

  const newFontSize = 12 * scaleFactor;
  doc.setFontSize(newFontSize);
  doc.text(text, x, y);
}

export function getBooleanString(
  vm: ComponentInternalInstance | null,
  isValue: boolean,
): string | undefined {
  return isValue
    ? vm?.proxy?.$st('solarRevenue.pdf.general.yes')
    : vm?.proxy?.$st('solarRevenue.pdf.general.no');
}

export function getLivingSpaceString(
  vm: ComponentInternalInstance | null,
  isHeat: boolean,
  livingSpace: number,
): string | undefined {
  return isHeat
    ? `${formatterZeroDigits.format(livingSpace)} m²`
    : vm?.proxy?.$st('solarRevenue.pdf.user.demandAreaNo');
}

export function getCarString(
  vm: ComponentInternalInstance | null,
  isCar: boolean,
  carDemand: number,
): string | undefined {
  return isCar
    ? `${formatterZeroDigits.format(carDemand)} km`
    : vm?.proxy?.$st('solarRevenue.pdf.user.demandCarNo');
}

export function getStorageString(
  vm: ComponentInternalInstance | null,
  isStorage: boolean,
  storagePortion: number,
): string | undefined {
  return isStorage
    ? `${formatterZeroDigits.format(storagePortion)} %`
    : vm?.proxy?.$st('solarRevenue.pdf.user.consStorageNo');
}

export function getCapaString(
  vm: ComponentInternalInstance | null,
  isStorage: boolean,
  capa: number,
): string | undefined {
  return isStorage
    ? `${formatterZeroDigits.format(capa)} kWh`
    : vm?.proxy?.$st('solarRevenue.pdf.user.consStorageNo');
}

export function getEquityString(
  vm: ComponentInternalInstance | null,
  isFinance: boolean,
  equity: number,
): string | undefined {
  return isFinance
    ? `${formatterTwoDigits.format(equity)} €`
    : vm?.proxy?.$st('solarRevenue.pdf.user.financeNo');
}

export function getCreditString(
  vm: ComponentInternalInstance | null,
  isFinance: boolean,
  credit: number,
): string | undefined {
  return isFinance
    ? `${formatterTwoDigits.format(credit)} €`
    : vm?.proxy?.$st('solarRevenue.pdf.user.financeNo');
}

export function getDurationString(
  vm: ComponentInternalInstance | null,
  isFinance: boolean,
  duration: number,
): string | undefined {
  return isFinance
    ? `${formatterZeroDigits.format(duration)} ${vm?.proxy?.$st(
        'solarRevenue.pdf.general.years',
      )}`
    : vm?.proxy?.$st('solarRevenue.pdf.user.financeNo');
}

export function getInterestString(
  vm: ComponentInternalInstance | null,
  isFinance: boolean,
  interest: number,
): string | undefined {
  return isFinance
    ? `${formatterZeroDigits.format(interest)} %`
    : vm?.proxy?.$st('solarRevenue.pdf.user.financeNo');
}
