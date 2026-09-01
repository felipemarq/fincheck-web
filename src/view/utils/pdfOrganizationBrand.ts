import type { Entity } from "@/app/entities/Entity";

export const PLATFORM_NAME = "MoneyStack";
export const DEFAULT_PRIMARY_COLOR = "#059669";

export type PdfRgb = [number, number, number];

export type PdfOrganizationBrand = {
  name: string;
  legalName?: string;
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  primaryColor: string;
  logoUrl?: string;
};

export type PdfBrandLogo = {
  dataUrl: string;
  width: number;
  height: number;
};

export function organizationBrandFromEntity(
  entity?: Entity | null
): PdfOrganizationBrand {
  const profile = entity?.profile;

  return {
    name: profile?.tradeName || entity?.name || profile?.legalName || "Organizacao",
    legalName: profile?.legalName,
    document: profile?.document,
    email: profile?.email,
    phone: profile?.phone,
    address: profile?.address,
    primaryColor: profile?.primaryColor || entity?.color || DEFAULT_PRIMARY_COLOR,
    logoUrl: profile?.logo?.url,
  };
}

export function parsePdfColor(
  value?: string,
  fallback: PdfRgb = [5, 150, 105]
): PdfRgb {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return fallback;

  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

export function mixPdfColor(
  color: PdfRgb,
  target: PdfRgb,
  targetWeight: number
): PdfRgb {
  return color.map((channel, index) =>
    Math.round(channel * (1 - targetWeight) + target[index] * targetWeight)
  ) as PdfRgb;
}

export async function loadPdfBrandLogo(
  logoUrl?: string
): Promise<PdfBrandLogo | undefined> {
  if (!logoUrl) return undefined;

  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return undefined;

    const objectUrl = URL.createObjectURL(await response.blob());

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const candidate = new Image();
        candidate.onload = () => resolve(candidate);
        candidate.onerror = reject;
        candidate.src = objectUrl;
      });
      const maxDimension = 1_600;
      const scale = Math.min(
        1,
        maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
      );
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) return undefined;

      context.drawImage(image, 0, 0, width, height);

      return {
        dataUrl: canvas.toDataURL("image/png"),
        width,
        height,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return undefined;
  }
}

export function fitPdfLogo(
  logo: PdfBrandLogo,
  maxWidth: number,
  maxHeight: number
) {
  const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);

  return {
    width: logo.width * scale,
    height: logo.height * scale,
  };
}
