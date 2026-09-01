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
export const MAX_ITEMS_PER_LABEL = 10;
export const MAX_LABEL_COPIES = 20;
export const MAX_LABELS_PER_EXPORT = 120;

export type AcquisitionLabelSourceItem = {
  id: string;
  purchaseLabel: string;
  productDescription: string;
  brand?: string;
  packaging?: string;
  availableQuantity: number;
  unit: string;
  lineNumber: number;
};

export type AcquisitionLabelVolumeItem = {
  sourceItemId: string;
  productDescription: string;
  quantity: number;
  unit: string;
  lineNumber: number;
};

export type AcquisitionLabelVolume = {
  id: string;
  title: string;
  notes: string;
  copies: number;
  items: AcquisitionLabelVolumeItem[];
};

export type AcquisitionLabelDocument = {
  orderNumber: string;
  recipientName: string;
  recipientAddress?: string;
  volumes: AcquisitionLabelVolume[];
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

function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function volumeItemKey(item: AcquisitionLabelVolumeItem) {
  return [item.lineNumber, item.productDescription, item.unit].join(":");
}

export function consolidateAcquisitionLabelVolumeItems(
  items: AcquisitionLabelVolumeItem[]
) {
  const consolidated = new Map<string, AcquisitionLabelVolumeItem>();

  items.forEach((item) => {
    const key = volumeItemKey(item);
    const current = consolidated.get(key);

    consolidated.set(key, {
      ...(current ?? item),
      quantity: roundQuantity((current?.quantity ?? 0) + item.quantity),
    });
  });

  return [...consolidated.values()].sort(
    (first, second) =>
      first.lineNumber - second.lineNumber ||
      first.productDescription.localeCompare(second.productDescription, "pt-BR")
  );
}

export function countAcquisitionLabelVolumeItems(
  items: AcquisitionLabelVolumeItem[]
) {
  return consolidateAcquisitionLabelVolumeItems(items).length;
}

function formatQuantity(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
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

function drawSingleItem(
  document: jsPDF,
  colors: LabelDocumentColors,
  item: AcquisitionLabelVolumeItem,
  innerX: number,
  innerWidth: number,
  top: number,
  bottom: number
) {
  document.setFont("helvetica", "bold");
  document.setFontSize(6.2);
  setTextColor(document, colors.primary);
  document.text(`ITEM ${item.lineNumber}`, innerX, top + 3.5);

  document.setFontSize(9.5);
  setTextColor(document, colors.ink);
  document.text(
    limitedLines(document, item.productDescription, innerWidth, 3),
    innerX,
    top + 8.5,
    { lineHeightFactor: 1.12 }
  );

  const quantityTop = bottom - 14;
  setFillColor(document, colors.primarySoft);
  setDrawColor(document, mixPdfColor(colors.primary, [255, 255, 255], 0.58));
  document.roundedRect(innerX, quantityTop, innerWidth, 12, 2.2, 2.2, "FD");
  document.setFont("helvetica", "bold");
  document.setFontSize(5.6);
  setTextColor(document, colors.primaryDark);
  document.text("QUANTIDADE NESTE VOLUME", innerX + 3, quantityTop + 4.1);

  const quantity = `${formatQuantity(item.quantity)} ${item.unit}`;
  fitSingleLineFontSize(document, quantity, innerWidth - 6, 14.5, 9);
  setTextColor(document, colors.ink);
  document.text(quantity, innerX + 3, quantityTop + 9.6);
}

function drawMultipleItems(
  document: jsPDF,
  colors: LabelDocumentColors,
  items: AcquisitionLabelVolumeItem[],
  innerX: number,
  innerWidth: number,
  top: number,
  bottom: number
) {
  document.setFont("helvetica", "bold");
  document.setFontSize(6.2);
  setTextColor(document, colors.primary);
  document.text(`CONTEÚDO DESTE VOLUME · ${items.length} ITENS`, innerX, top + 3.5);

  const listTop = top + 5.3;
  const rowHeight = Math.max(3.2, Math.min(6.8, (bottom - listTop) / items.length));
  const fontSize = items.length <= 4 ? 7 : items.length <= 7 ? 6.2 : 5.5;
  const quantityWidth = 22;

  items.forEach((item, index) => {
    const rowTop = listTop + index * rowHeight;
    const baseline = rowTop + rowHeight / 2 + fontSize * 0.13;

    if (index % 2 === 0) {
      setFillColor(document, colors.soft);
      document.roundedRect(innerX, rowTop, innerWidth, rowHeight, 1, 1, "F");
    }

    document.setFont("helvetica", "bold");
    document.setFontSize(fontSize);
    setTextColor(document, colors.muted);
    document.text(String(item.lineNumber), innerX + 2, baseline);

    document.setFont("helvetica", "normal");
    setTextColor(document, colors.ink);
    document.text(
      truncateToWidth(
        document,
        item.productDescription,
        innerWidth - quantityWidth - 10
      ),
      innerX + 7,
      baseline
    );

    const quantity = `${formatQuantity(item.quantity)} ${item.unit}`;
    document.setFont("helvetica", "bold");
    fitSingleLineFontSize(document, quantity, quantityWidth - 2, fontSize, 4.8);
    document.text(quantity, innerX + innerWidth - 2, baseline, {
      align: "right",
    });
  });
}

function drawLabel(
  document: jsPDF,
  labelDocument: AcquisitionLabelDocument,
  volume: AcquisitionLabelVolume,
  volumeIndex: number,
  brand: PdfOrganizationBrand,
  logo: PdfBrandLogo | undefined,
  colors: LabelDocumentColors,
  x: number,
  y: number
) {
  const innerX = x + 4;
  const innerWidth = LABEL.width - 8;
  const recipientAddress = labelDocument.recipientAddress?.trim();

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
  document.text("IDENTIFICAÇÃO DE ENTREGA", innerX + 14, y + 12.3);

  document.setFont("helvetica", "bold");
  document.setFontSize(6.2);
  setTextColor(document, colors.primarySoft);
  document.text("ORDEM", x + LABEL.width - 4, y + 6.9, { align: "right" });
  const orderNumber = labelDocument.orderNumber.trim() || "Não informada";
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
  document.text(
    `VOLUME ${volumeIndex + 1} DE ${labelDocument.volumes.length}`,
    innerX,
    y + 22.2
  );

  if (volume.title.trim()) {
    document.setFontSize(6.5);
    setTextColor(document, colors.muted);
    document.text(
      truncateToWidth(document, volume.title, 46),
      x + LABEL.width - 4,
      y + 22.2,
      { align: "right" }
    );
  }

  document.setFont("helvetica", "bold");
  document.setFontSize(5.5);
  setTextColor(document, colors.muted);
  document.text("DESTINATÁRIO", innerX, y + 27);

  const recipientName = labelDocument.recipientName.trim() || "Não informado";
  document.setFont("helvetica", "bold");
  fitSingleLineFontSize(document, recipientName, innerWidth, 8.5, 6.2);
  setTextColor(document, colors.ink);
  document.text(
    truncateToWidth(document, recipientName, innerWidth),
    innerX,
    y + 31.3
  );

  let separatorY = y + 34.6;
  if (recipientAddress) {
    document.setFont("helvetica", "normal");
    document.setFontSize(5.7);
    setTextColor(document, colors.muted);
    document.text(
      limitedLines(document, recipientAddress, innerWidth, 2),
      innerX,
      y + 35.6,
      { lineHeightFactor: 1.12 }
    );
    separatorY = y + 41;
  }

  setDrawColor(document, colors.line);
  document.line(innerX, separatorY, x + LABEL.width - 4, separatorY);

  const notes = volume.notes.trim();
  const contentTop = separatorY + 1.5;
  const contentBottom = y + LABEL.height - (notes ? 11 : 4.5);
  const printableItems = consolidateAcquisitionLabelVolumeItems(volume.items);

  if (printableItems.length === 1) {
    drawSingleItem(
      document,
      colors,
      printableItems[0],
      innerX,
      innerWidth,
      contentTop,
      contentBottom
    );
  } else {
    drawMultipleItems(
      document,
      colors,
      printableItems,
      innerX,
      innerWidth,
      contentTop,
      contentBottom
    );
  }

  if (notes) {
    const noteY = y + LABEL.height - 8;
    setDrawColor(document, colors.line);
    document.line(innerX, noteY - 2.3, x + LABEL.width - 4, noteY - 2.3);
    document.setFont("helvetica", "bold");
    document.setFontSize(5.5);
    setTextColor(document, colors.muted);
    document.text("OBS.", innerX, noteY + 1.2);
    document.setFont("helvetica", "normal");
    setTextColor(document, colors.ink);
    document.text(
      truncateToWidth(document, notes, innerWidth - 10),
      innerX + 9,
      noteY + 1.2
    );
  }
}

export function buildAcquisitionLabelSourceItems(
  order: PurchaseOrder,
  acquisitions: Acquisition[]
) {
  const orderItems = new Map(
    order.items
      .filter((item) => item.id)
      .map((item) => [item.id as string, item])
  );

  return acquisitions
    .filter((acquisition) => acquisition.status !== "CANCELLED")
    .flatMap((acquisition, acquisitionIndex) =>
      acquisition.items.flatMap((item, itemIndex) =>
        item.allocations
          .filter(
            (allocation) =>
              allocation.purchaseOrderId === order.id &&
              allocation.allocatedQuantity > 0
          )
          .map((allocation, allocationIndex): AcquisitionLabelSourceItem => {
            const orderItem = orderItems.get(allocation.purchaseOrderItemId);

            return {
              id: [
                acquisition.id,
                item.id ?? item.productId ?? itemIndex,
                allocation.id ??
                  allocation.purchaseOrderItemId ??
                  allocationIndex,
              ].join(":"),
              purchaseLabel: acquisition.sellerOrderNumber
                ? `Pedido ${acquisition.sellerOrderNumber}`
                : `Compra ${acquisitionIndex + 1}`,
              productDescription:
                orderItem?.description || item.description || allocation.description,
              brand: orderItem?.brand || item.brand,
              packaging: item.packaging,
              availableQuantity: roundQuantity(allocation.allocatedQuantity),
              unit:
                orderItem?.originalUnit ||
                allocation.originalUnit ||
                item.normalizedUnit,
              lineNumber: orderItem?.lineNumber || allocation.lineNumber,
            };
          })
      )
  );
}

export function toAcquisitionLabelVolumeItem(
  sourceItem: AcquisitionLabelSourceItem,
  quantity = sourceItem.availableQuantity
): AcquisitionLabelVolumeItem {
  return {
    sourceItemId: sourceItem.id,
    productDescription: sourceItem.productDescription,
    quantity: roundQuantity(quantity),
    unit: sourceItem.unit,
    lineNumber: sourceItem.lineNumber,
  };
}

export function buildDefaultAcquisitionLabelVolumes(
  sourceItems: AcquisitionLabelSourceItem[]
): AcquisitionLabelVolume[] {
  return sourceItems.map((sourceItem, index) => ({
    id: `volume-${index + 1}-${sourceItem.id}`,
    title: "",
    notes: "",
    copies: 1,
    items: [toAcquisitionLabelVolumeItem(sourceItem)],
  }));
}

function validateLabelDocument(labelDocument: AcquisitionLabelDocument) {
  if (!labelDocument.recipientName.trim()) {
    throw new Error("Informe o destinatário das etiquetas.");
  }

  if (!labelDocument.volumes.length) {
    throw new Error("Adicione pelo menos um volume.");
  }

  const labelCount = labelDocument.volumes.reduce(
    (total, volume) => total + Math.trunc(volume.copies),
    0
  );

  if (labelCount > MAX_LABELS_PER_EXPORT) {
    throw new Error(
      `O PDF pode conter no máximo ${MAX_LABELS_PER_EXPORT} etiquetas.`
    );
  }

  labelDocument.volumes.forEach((volume, index) => {
    if (!volume.items.length) {
      throw new Error(`O volume ${index + 1} não possui itens.`);
    }

    if (countAcquisitionLabelVolumeItems(volume.items) > MAX_ITEMS_PER_LABEL) {
      throw new Error(
        `O volume ${index + 1} excede o limite de ${MAX_ITEMS_PER_LABEL} itens.`
      );
    }

    if (
      !Number.isInteger(volume.copies) ||
      volume.copies < 1 ||
      volume.copies > MAX_LABEL_COPIES
    ) {
      throw new Error(
        `As cópias do volume ${index + 1} devem ficar entre 1 e ${MAX_LABEL_COPIES}.`
      );
    }

    if (volume.items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      throw new Error(`O volume ${index + 1} possui uma quantidade inválida.`);
    }
  });
}

export async function buildAcquisitionLabelsPdf(
  labelDocument: AcquisitionLabelDocument,
  brand: PdfOrganizationBrand
) {
  validateLabelDocument(labelDocument);

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
  const printableVolumes = labelDocument.volumes.flatMap((volume, volumeIndex) =>
    Array.from({ length: volume.copies }, () => ({ volume, volumeIndex }))
  );
  const totalPages = Math.ceil(printableVolumes.length / LABELS_PER_PAGE);

  document.setProperties({
    title: "Etiquetas de identificação de volumes",
    subject: "Volumes destinados ao cliente da ordem de compra",
    author: brand.legalName || brand.name,
    creator: PLATFORM_NAME,
  });

  printableVolumes.forEach(({ volume, volumeIndex }, index) => {
    if (index > 0 && index % LABELS_PER_PAGE === 0) {
      document.addPage();
    }

    const slot = index % LABELS_PER_PAGE;
    const column = slot % PAGE.columns;
    const row = Math.floor(slot / PAGE.columns);
    const x = PAGE.marginX + column * (LABEL.width + PAGE.columnGap);
    const y = PAGE.marginY + row * (LABEL.height + PAGE.rowGap);

    drawLabel(
      document,
      labelDocument,
      volume,
      volumeIndex,
      brand,
      logo,
      colors,
      x,
      y
    );
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
  labelDocument: AcquisitionLabelDocument,
  brand: PdfOrganizationBrand
) {
  const document = await buildAcquisitionLabelsPdf(labelDocument, brand);
  const reference = filenamePart(labelDocument.orderNumber) || "sem-numero";
  const filename = `etiquetas-oc-${reference}.pdf`;

  document.save(filename);
  return filename;
}
