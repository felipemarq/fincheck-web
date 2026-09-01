import type { jsPDF } from "jspdf";

import type { Acquisition } from "@/app/entities/Acquisition";
import type { PurchaseOrder } from "@/app/entities/PurchaseOrder";
import {
  fitPdfLogo,
  loadPdfBrandLogo,
  mixPdfColor,
  parsePdfColor,
  PLATFORM_NAME,
  type PdfBrandLogo,
  type PdfOrganizationBrand,
  type PdfRgb,
} from "@/view/utils/pdfOrganizationBrand";

export const LABELS_PER_PAGE = 6;

export type AcquisitionLabel = {
  id: string;
  acquisitionId: string;
  acquisitionReference: string;
  productDescription: string;
  brand?: string;
  packaging?: string;
  quantity: number;
  unit: string;
  lineNumber: number;
  orderNumber: string;
  customerName: string;
  supplierName?: string;
  supplierOrderNumber?: string;
  purchasedAt: string;
};

type LabelDocumentColors = {
  ink: PdfRgb;
  muted: PdfRgb;
  line: PdfRgb;
  soft: PdfRgb;
  white: PdfRgb;
  primary: PdfRgb;
  primaryDark: PdfRgb;
  primarySoft: PdfRgb;
};

const PAGE = {
  width: 210,
  height: 297,
  marginX: 8,
  marginY: 8,
  columnGap: 4,
  rowGap: 4,
  columns: 2,
  rows: 3,
};

const LABEL = {
  width:
    (PAGE.width - PAGE.marginX * 2 - PAGE.columnGap * (PAGE.columns - 1)) /
    PAGE.columns,
  height:
    (PAGE.height - PAGE.marginY * 2 - PAGE.rowGap * (PAGE.rows - 1)) /
    PAGE.rows,
};

function buildColors(primaryColor?: string): LabelDocumentColors {
  const primary = parsePdfColor(primaryColor);

  return {
    ink: [13, 28, 22],
    muted: [85, 101, 94],
    line: [199, 213, 206],
    soft: [244, 248, 246],
    white: [255, 255, 255],
    primary,
    primaryDark: mixPdfColor(primary, [0, 0, 0], 0.38),
    primarySoft: mixPdfColor(primary, [255, 255, 255], 0.87),
  };
}

function setFillColor(document: jsPDF, color: PdfRgb) {
  document.setFillColor(color[0], color[1], color[2]);
}

function setDrawColor(document: jsPDF, color: PdfRgb) {
  document.setDrawColor(color[0], color[1], color[2]);
}

function setTextColor(document: jsPDF, color: PdfRgb) {
  document.setTextColor(color[0], color[1], color[2]);
}

function formatQuantity(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(value));
}

function filenamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function initials(value: string) {
  const parts = value.split(/\s+/).filter(Boolean);
  const first = parts[0]?.toUpperCase() ?? "";

  if (/^[A-Z0-9]{2,3}$/.test(first)) return first;

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function truncateToWidth(document: jsPDF, value: string, maxWidth: number) {
  const normalized = value.trim() || "Não informado";

  if (document.getTextWidth(normalized) <= maxWidth) return normalized;

  let result = normalized;
  while (result.length > 1 && document.getTextWidth(`${result}...`) > maxWidth) {
    result = result.slice(0, -1);
  }

  return `${result.trimEnd()}...`;
}

function fitSingleLineFontSize(
  document: jsPDF,
  value: string,
  maxWidth: number,
  maximum: number,
  minimum: number
) {
  let fontSize = maximum;
  document.setFontSize(fontSize);

  while (fontSize > minimum && document.getTextWidth(value) > maxWidth) {
    fontSize = Math.max(minimum, fontSize - 0.2);
    document.setFontSize(fontSize);
  }

  return fontSize;
}

function limitedLines(
  document: jsPDF,
  value: string,
  maxWidth: number,
  maxLines: number
) {
  const wrapped = document.splitTextToSize(value.trim(), maxWidth);
  const lines = (Array.isArray(wrapped) ? wrapped : [wrapped]).map(String);

  if (lines.length <= maxLines) return lines;

  const visible = lines.slice(0, maxLines);
  visible[maxLines - 1] = truncateToWidth(
    document,
    `${visible[maxLines - 1]}...`,
    maxWidth
  );
  return visible;
}

function drawBrandMark(
  document: jsPDF,
  brand: PdfOrganizationBrand,
  logo: PdfBrandLogo | undefined,
  colors: LabelDocumentColors,
  x: number,
  y: number
) {
  setFillColor(document, colors.white);
  document.roundedRect(x, y, 11, 11, 2, 2, "F");

  if (logo) {
    const size = fitPdfLogo(logo, 8.5, 8.5);
    document.addImage(
      logo.dataUrl,
      "PNG",
      x + (11 - size.width) / 2,
      y + (11 - size.height) / 2,
      size.width,
      size.height,
      "acquisition-label-logo",
      "FAST"
    );
    return;
  }

  document.setFont("helvetica", "bold");
  document.setFontSize(8.5);
  setTextColor(document, colors.primaryDark);
  document.text(initials(brand.name) || "JC", x + 5.5, y + 7.1, {
    align: "center",
  });
}

function drawField(
  document: jsPDF,
  colors: LabelDocumentColors,
  label: string,
  value: string | undefined,
  x: number,
  y: number,
  width: number
) {
  document.setFont("helvetica", "bold");
  document.setFontSize(5.8);
  setTextColor(document, colors.muted);
  document.text(label.toUpperCase(), x, y);

  document.setFont("helvetica", "bold");
  setTextColor(document, colors.ink);
  const normalizedValue = value?.trim() || "Não informado";
  fitSingleLineFontSize(document, normalizedValue, width, 7.3, 5.8);
  document.text(
    truncateToWidth(document, normalizedValue, width),
    x,
    y + 4
  );
}

function drawLabel(
  document: jsPDF,
  label: AcquisitionLabel,
  brand: PdfOrganizationBrand,
  logo: PdfBrandLogo | undefined,
  colors: LabelDocumentColors,
  x: number,
  y: number
) {
  const innerX = x + 4;
  const innerWidth = LABEL.width - 8;

  setDrawColor(document, colors.line);
  document.setLineWidth(0.25);
  document.setLineDashPattern([1.2, 1.2], 0);
  document.roundedRect(x, y, LABEL.width, LABEL.height, 2.5, 2.5, "S");
  document.setLineDashPattern([], 0);

  setFillColor(document, colors.primaryDark);
  document.roundedRect(x + 1, y + 1, LABEL.width - 2, 16, 2, 2, "F");
  document.rect(x + 1, y + 12, LABEL.width - 2, 5, "F");

  drawBrandMark(document, brand, logo, colors, innerX, y + 3.4);

  document.setFont("helvetica", "bold");
  setTextColor(document, colors.white);
  const brandName = brand.name.toUpperCase();
  fitSingleLineFontSize(document, brandName, 39, 8.5, 5.8);
  document.text(
    truncateToWidth(document, brandName, 39),
    innerX + 14,
    y + 8.1
  );
  document.setFont("helvetica", "normal");
  document.setFontSize(5.8);
  document.text("IDENTIFICAÇÃO DE VOLUME", innerX + 14, y + 12.3);

  document.setFont("helvetica", "bold");
  document.setFontSize(6.2);
  setTextColor(document, colors.primarySoft);
  document.text("ORDEM", x + LABEL.width - 4, y + 6.9, { align: "right" });
  const orderNumber = label.orderNumber.trim() || "Não informada";
  fitSingleLineFontSize(document, orderNumber, 31, 9.5, 6.2);
  setTextColor(document, colors.white);
  document.text(
    truncateToWidth(document, orderNumber, 31),
    x + LABEL.width - 4,
    y + 12,
    { align: "right" }
  );

  document.setFont("helvetica", "bold");
  document.setFontSize(6.2);
  setTextColor(document, colors.primary);
  document.text(`ITEM ${label.lineNumber}`, innerX, y + 23);

  const identification = [
    label.brand && label.brand.toLowerCase() !== "outros"
      ? label.brand
      : undefined,
    label.packaging,
  ]
    .filter(Boolean)
    .join(" | ");

  if (identification) {
    document.setFont("helvetica", "normal");
    document.setFontSize(6.2);
    setTextColor(document, colors.muted);
    document.text(
      truncateToWidth(document, identification, 48),
      x + LABEL.width - 4,
      y + 23,
      { align: "right" }
    );
  }

  document.setFont("helvetica", "bold");
  document.setFontSize(10.5);
  setTextColor(document, colors.ink);
  document.text(
    limitedLines(document, label.productDescription, innerWidth, 3),
    innerX,
    y + 28.8,
    { lineHeightFactor: 1.15 }
  );

  setFillColor(document, colors.primarySoft);
  setDrawColor(document, mixPdfColor(colors.primary, [255, 255, 255], 0.58));
  document.roundedRect(innerX, y + 44, innerWidth, 16, 2.5, 2.5, "FD");

  document.setFont("helvetica", "bold");
  document.setFontSize(5.8);
  setTextColor(document, colors.primaryDark);
  document.text("QUANTIDADE DESTE VOLUME", innerX + 4, y + 49.3);

  document.setFont("helvetica", "bold");
  document.setFontSize(17);
  setTextColor(document, colors.ink);
  document.text(
    `${formatQuantity(label.quantity)} ${label.unit}`,
    innerX + 4,
    y + 57.1
  );

  const leftWidth = 50;
  const rightX = innerX + 55;
  const rightWidth = innerWidth - 55;
  drawField(
    document,
    colors,
    "Cliente",
    label.customerName,
    innerX,
    y + 66,
    leftWidth
  );
  drawField(
    document,
    colors,
    "Linha da OC",
    String(label.lineNumber),
    rightX,
    y + 66,
    rightWidth
  );
  drawField(
    document,
    colors,
    "Fornecedor",
    label.supplierName,
    innerX,
    y + 76,
    leftWidth
  );
  drawField(
    document,
    colors,
    "Pedido fornecedor",
    label.supplierOrderNumber,
    rightX,
    y + 76,
    rightWidth
  );

  setDrawColor(document, colors.line);
  document.line(innerX, y + 83.3, x + LABEL.width - 4, y + 83.3);

  document.setFont("helvetica", "normal");
  document.setFontSize(5.6);
  setTextColor(document, colors.muted);
  document.text(`Compra: ${formatDate(label.purchasedAt)}`, innerX, y + 87.3);
  document.text(
    `Ref. ${label.acquisitionReference}`,
    x + LABEL.width - 4,
    y + 87.3,
    { align: "right" }
  );
}

export function buildAcquisitionLabels(
  order: PurchaseOrder,
  acquisitions: Acquisition[]
) {
  return acquisitions
    .filter((acquisition) => acquisition.status !== "CANCELLED")
    .flatMap((acquisition) =>
      acquisition.items.flatMap((item, itemIndex) =>
        item.allocations
          .filter(
            (allocation) =>
              allocation.purchaseOrderId === order.id &&
              allocation.allocatedQuantity > 0
          )
          .map((allocation, allocationIndex): AcquisitionLabel => ({
            id: [
              acquisition.id,
              item.id ?? item.productId ?? itemIndex,
              allocation.id ?? allocation.purchaseOrderItemId ?? allocationIndex,
            ].join(":"),
            acquisitionId: acquisition.id,
            acquisitionReference: acquisition.id.slice(0, 8).toUpperCase(),
            productDescription: item.description || allocation.description,
            brand: item.brand,
            packaging: item.packaging,
            quantity: allocation.allocatedQuantity,
            unit: allocation.originalUnit || item.normalizedUnit,
            lineNumber: allocation.lineNumber,
            orderNumber: allocation.orderNumber || order.orderNumber,
            customerName:
              order.customer.tradeName ||
              allocation.customerName ||
              order.customer.legalName,
            supplierName: acquisition.sellerName || acquisition.channel,
            supplierOrderNumber: acquisition.sellerOrderNumber,
            purchasedAt: acquisition.purchasedAt,
          }))
      )
    );
}

export async function buildAcquisitionLabelsPdf(
  labels: AcquisitionLabel[],
  brand: PdfOrganizationBrand
) {
  if (!labels.length) {
    throw new Error("Selecione pelo menos uma etiqueta.");
  }

  const [{ jsPDF }, logo] = await Promise.all([
    import("jspdf"),
    loadPdfBrandLogo(brand.logoUrl),
  ]);
  const document = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const colors = buildColors(brand.primaryColor);
  const totalPages = Math.ceil(labels.length / LABELS_PER_PAGE);

  document.setProperties({
    title: "Etiquetas de identificação de volumes",
    subject: "Etiquetas de aquisições vinculadas a ordens de compra",
    author: brand.legalName || brand.name,
    creator: PLATFORM_NAME,
  });

  labels.forEach((label, index) => {
    if (index > 0 && index % LABELS_PER_PAGE === 0) {
      document.addPage();
    }

    const slot = index % LABELS_PER_PAGE;
    const column = slot % PAGE.columns;
    const row = Math.floor(slot / PAGE.columns);
    const x = PAGE.marginX + column * (LABEL.width + PAGE.columnGap);
    const y = PAGE.marginY + row * (LABEL.height + PAGE.rowGap);

    drawLabel(document, label, brand, logo, colors, x, y);
  });

  for (let page = 1; page <= totalPages; page += 1) {
    document.setPage(page);
    document.setFont("helvetica", "normal");
    document.setFontSize(5.2);
    setTextColor(document, colors.muted);
    document.text(`Folha ${page} de ${totalPages}`, PAGE.width / 2, 295, {
      align: "center",
    });
  }

  return document;
}

export async function exportAcquisitionLabelsPdf(
  labels: AcquisitionLabel[],
  brand: PdfOrganizationBrand
) {
  const document = await buildAcquisitionLabelsPdf(labels, brand);
  const orderNumbers = [...new Set(labels.map((label) => label.orderNumber))];
  const reference =
    orderNumbers.length === 1
      ? `oc-${filenamePart(orderNumbers[0]) || "sem-numero"}`
      : `${orderNumbers.length}-ordens`;
  const filename = `etiquetas-${reference}.pdf`;

  document.save(filename);
  return filename;
}
