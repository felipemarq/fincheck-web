import type { jsPDF } from "jspdf";

import type { Quotation, QuotationItem } from "@/app/entities/Quotation";
import {
  fitPdfLogo,
  loadPdfBrandLogo,
  mixPdfColor,
  parsePdfColor,
  PLATFORM_NAME,
  type PdfBrandLogo,
} from "@/view/utils/pdfOrganizationBrand";
import {
  formatQuotationCurrency,
  formatQuotationDate,
  formatQuotationQuantity,
  quotationStatusLabels,
} from "./quotationPresentation";

type RgbColor = [number, number, number];
type HeaderField = {
  label: string;
  value?: string;
  maxLines?: number;
};
type PreparedHeaderField = HeaderField & { lines: string[] };

const PAGE = {
  width: 210,
  margin: 14,
  top: 25,
  bottom: 278,
};

function buildDocumentColors(primaryColor?: string) {
  const primary = parsePdfColor(primaryColor);

  return {
  ink: [20, 31, 27] as RgbColor,
  muted: [94, 105, 100] as RgbColor,
  line: [218, 226, 222] as RgbColor,
  soft: [245, 248, 246] as RgbColor,
  white: [255, 255, 255] as RgbColor,
    emerald: primary as RgbColor,
    emeraldDark: mixPdfColor(primary, [0, 0, 0], 0.2) as RgbColor,
    emeraldSoft: mixPdfColor(primary, [255, 255, 255], 0.86) as RgbColor,
  };
}

let COLORS = buildDocumentColors();

function setFillColor(document: jsPDF, color: RgbColor) {
  document.setFillColor(...color);
}

function setDrawColor(document: jsPDF, color: RgbColor) {
  document.setDrawColor(...color);
}

function setTextColor(document: jsPDF, color: RgbColor) {
  document.setTextColor(...color);
}

function normalizeValue(value?: string) {
  return value?.trim() || "Nao informado";
}

function formatGeneratedAt(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function wrapText(document: jsPDF, value: string, width: number) {
  const result = document.splitTextToSize(value, width);
  return Array.isArray(result) ? result.map(String) : [String(result)];
}

function limitLines(lines: string[], maxLines: number) {
  if (lines.length <= maxLines) return lines;

  const visibleLines = lines.slice(0, maxLines);
  visibleLines[maxLines - 1] = `${visibleLines[maxLines - 1].replace(
    /\s+$/,
    ""
  )}...`;
  return visibleLines;
}

function ensureSpace(document: jsPDF, cursorY: number, requiredHeight: number) {
  if (cursorY + requiredHeight <= PAGE.bottom) return cursorY;
  document.addPage();
  return PAGE.top;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function loadImageElement(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nao foi possivel decodificar a imagem."));
    image.src = dataUrl;
  });
}

async function loadGalleryImage(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "omit",
    mode: "cors",
  });
  if (!response.ok) throw new Error("Imagem indisponivel.");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error("O arquivo retornado nao e uma imagem.");
  }

  // Data URLs avoid browser-specific failures seen when decoding S3 object URLs.
  const image = await loadImageElement(await blobToDataUrl(blob));
  const maxDimension = 1600;
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
  if (!context) throw new Error("Nao foi possivel preparar a imagem.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.88),
    width,
    height,
  };
}

function drawFirstPageHeader(
  document: jsPDF,
  quotation: Quotation,
  brandLogo?: PdfBrandLogo
) {
  const gap = 10;
  const columnWidth = (PAGE.width - PAGE.margin * 2 - gap) / 2;
  const rightColumnX = PAGE.margin + columnWidth + gap;
  const sellerNameX = brandLogo ? PAGE.margin + 19 : PAGE.margin;
  const sellerNameWidth = 104;
  const sellerDisplayName = quotation.sellerTradeName || quotation.sellerName;
  document.setFont("helvetica", "bold");
  document.setFontSize(9.5);
  const sellerNameLines = limitLines(
    wrapText(document, sellerDisplayName.toUpperCase(), sellerNameWidth),
    2
  );
  const topHeight = Math.max(29, 13 + sellerNameLines.length * 4);
  const detailsStartY = topHeight + 7;

  const prepareFields = (fields: HeaderField[]) => {
    document.setFont("helvetica", "normal");
    document.setFontSize(7.4);
    return fields.map((field) => ({
      ...field,
      lines: limitLines(
        wrapText(document, normalizeValue(field.value), columnWidth),
        field.maxLines ?? 2
      ),
    }));
  };
  const companyFields = prepareFields([
    { label: "Telefone", value: quotation.sellerPhone },
    { label: "E-mail", value: quotation.sellerEmail },
    {
      label: "Endereco",
      value: quotation.sellerAddress,
      maxLines: 4,
    },
  ]);
  const customerFields = prepareFields([
    {
      label: "Cliente",
      value: quotation.customerTradeName || quotation.customerLegalName,
    },
    { label: "CNPJ ou CPF", value: quotation.customerDocument },
    {
      label: "Contato",
      value: [quotation.customerEmail, quotation.customerPhone]
        .filter(Boolean)
        .join(" | "),
    },
    {
      label: "Endereco",
      value: quotation.customerAddress,
      maxLines: 4,
    },
  ]);
  const fieldsHeight = (fields: PreparedHeaderField[]) =>
    fields.reduce((height, field) => height + 6 + field.lines.length * 3.3, 0);
  const headerHeight =
    detailsStartY + Math.max(fieldsHeight(companyFields), fieldsHeight(customerFields)) + 4;

  setFillColor(document, COLORS.ink);
  document.rect(0, 0, PAGE.width, headerHeight, "F");
  setFillColor(document, COLORS.emerald);
  document.rect(0, 0, 4, headerHeight, "F");

  if (brandLogo) {
    const size = fitPdfLogo(brandLogo, 15, 15);
    document.addImage(
      brandLogo.dataUrl,
      "PNG",
      PAGE.margin + (15 - size.width) / 2,
      5 + (15 - size.height) / 2,
      size.width,
      size.height,
      "organization-logo",
      "FAST"
    );
  }

  document.setFont("helvetica", "bold");
  document.setFontSize(9.5);
  setTextColor(document, COLORS.emeraldSoft);
  document.text(sellerNameLines, sellerNameX, 10, {
    lineHeightFactor: 1.15,
  });

  document.setFont("helvetica", "normal");
  document.setFontSize(7.2);
  setTextColor(document, COLORS.white);
  const sellerIdentity = [
    sellerDisplayName !== quotation.sellerName ? quotation.sellerName : undefined,
    quotation.sellerDocument
      ? `CNPJ ou CPF: ${quotation.sellerDocument}`
      : "Documento nao informado",
  ]
    .filter(Boolean)
    .join(" | ");
  document.text(sellerIdentity, sellerNameX, 11 + sellerNameLines.length * 4, {
    maxWidth: sellerNameWidth,
  });

  document.setFont("helvetica", "normal");
  document.setFontSize(6.6);
  setTextColor(document, COLORS.emeraldSoft);
  document.text("VALOR TOTAL", PAGE.width - PAGE.margin, 8, {
    align: "right",
  });
  document.setFont("helvetica", "bold");
  document.setFontSize(15.5);
  setTextColor(document, COLORS.white);
  document.text(
    formatQuotationCurrency(quotation.total),
    PAGE.width - PAGE.margin,
    16,
    { align: "right" }
  );
  document.setFont("helvetica", "normal");
  document.setFontSize(7.2);
  setTextColor(document, COLORS.emeraldSoft);
  document.text(
    `${quotationStatusLabels[quotation.status]} | Emitida em ${formatQuotationDate(
      quotation.issuedAt
    )}`,
    PAGE.width - PAGE.margin,
    22,
    { align: "right" }
  );

  setDrawColor(document, [47, 66, 58]);
  document.line(PAGE.margin, topHeight, PAGE.width - PAGE.margin, topHeight);
  document.line(
    PAGE.margin + columnWidth + gap / 2,
    detailsStartY - 2,
    PAGE.margin + columnWidth + gap / 2,
    headerHeight - 5
  );

  const drawFields = (
    x: number,
    fields: PreparedHeaderField[],
    initialY: number
  ) => {
    let cursorY = initialY;
    fields.forEach((field) => {
      document.setFont("helvetica", "bold");
      document.setFontSize(6.1);
      setTextColor(document, COLORS.emeraldSoft);
      document.text(field.label.toUpperCase(), x, cursorY);
      document.setFont("helvetica", "normal");
      document.setFontSize(7.4);
      setTextColor(document, COLORS.white);
      document.text(field.lines, x, cursorY + 4, {
        lineHeightFactor: 1.25,
      });
      cursorY += 6 + field.lines.length * 3.3;
    });
  };

  drawFields(PAGE.margin, companyFields, detailsStartY);
  drawFields(rightColumnX, customerFields, detailsStartY);

  return headerHeight;
}

function drawSectionTitle(document: jsPDF, cursorY: number, title: string) {
  setFillColor(document, COLORS.emerald);
  document.roundedRect(PAGE.margin, cursorY + 0.5, 3, 5.2, 1.5, 1.5, "F");
  document.setFont("helvetica", "bold");
  document.setFontSize(10.5);
  setTextColor(document, COLORS.ink);
  document.text(title, PAGE.margin + 6, cursorY + 5);
  return cursorY + 9;
}

function quotationItemDetails(item: QuotationItem) {
  return [
    item.productCode ? `Codigo: ${item.productCode}` : null,
    item.description,
    item.brand ? `Marca: ${item.brand}` : null,
    item.specification ? `Especificacao: ${item.specification}` : null,
    item.notes ? `Observacao: ${item.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function drawItemsTable(
  document: jsPDF,
  cursorY: number,
  quotation: Quotation,
  autoTable: typeof import("jspdf-autotable").autoTable
) {
  let tableEndY = cursorY;

  autoTable(document, {
    startY: cursorY,
    margin: {
      top: PAGE.top,
      right: PAGE.margin,
      bottom: 19,
      left: PAGE.margin,
    },
    head: [["#", "Produto", "Un.", "Qtd.", "Valor unit.", "Total"]],
    body: quotation.items.map((item) => [
      item.lineNumber,
      quotationItemDetails(item),
      item.unit,
      formatQuotationQuantity(item.quantity),
      formatQuotationCurrency(item.unitPrice),
      formatQuotationCurrency(item.total),
    ]),
    theme: "grid",
    showHead: "everyPage",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 7.4,
      textColor: COLORS.ink,
      lineColor: COLORS.line,
      lineWidth: 0.15,
      cellPadding: 2.4,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: COLORS.emeraldDark,
      textColor: COLORS.white,
      fontStyle: "bold",
      cellPadding: 2.6,
    },
    alternateRowStyles: { fillColor: COLORS.soft },
    columnStyles: {
      0: { cellWidth: 9, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 82 },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 18, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
    didDrawPage: ({ cursor }) => {
      tableEndY = cursor?.y ?? tableEndY;
    },
  });

  return tableEndY + 7;
}

function drawTotals(document: jsPDF, initialY: number, quotation: Quotation) {
  const boxWidth = 78;
  const x = PAGE.width - PAGE.margin - boxWidth;
  const height = 38;
  const cursorY = ensureSpace(document, initialY, height + 3);

  setFillColor(document, COLORS.soft);
  setDrawColor(document, COLORS.line);
  document.roundedRect(x, cursorY, boxWidth, height, 2, 2, "FD");
  const rows = [
    ["Subtotal", quotation.subtotal],
    ["Frete", quotation.freight],
    ["Desconto", -quotation.discount],
  ] as const;

  rows.forEach(([label, value], index) => {
    document.setFont("helvetica", "normal");
    document.setFontSize(7.8);
    setTextColor(document, COLORS.muted);
    document.text(label, x + 5, cursorY + 7 + index * 7);
    setTextColor(document, COLORS.ink);
    document.text(formatQuotationCurrency(value), x + boxWidth - 5, cursorY + 7 + index * 7, {
      align: "right",
    });
  });

  setDrawColor(document, COLORS.line);
  document.line(x + 5, cursorY + 27, x + boxWidth - 5, cursorY + 27);
  document.setFont("helvetica", "bold");
  document.setFontSize(10);
  setTextColor(document, COLORS.emeraldDark);
  document.text("TOTAL", x + 5, cursorY + 34);
  document.text(
    formatQuotationCurrency(quotation.total),
    x + boxWidth - 5,
    cursorY + 34,
    { align: "right" }
  );

  return cursorY + height + 5;
}

function drawTextBlock(
  document: jsPDF,
  initialY: number,
  title: string,
  value?: string
) {
  if (!value?.trim()) return initialY;

  const lines = wrapText(
    document,
    value.trim(),
    PAGE.width - PAGE.margin * 2 - 10
  );
  const height = Math.max(17, 11 + lines.length * 3.7);
  const cursorY = ensureSpace(document, initialY, height + 3);
  setFillColor(document, COLORS.soft);
  setDrawColor(document, COLORS.line);
  document.roundedRect(
    PAGE.margin,
    cursorY,
    PAGE.width - PAGE.margin * 2,
    height,
    2,
    2,
    "FD"
  );
  document.setFont("helvetica", "bold");
  document.setFontSize(6.8);
  setTextColor(document, COLORS.muted);
  document.text(title.toUpperCase(), PAGE.margin + 5, cursorY + 5.5);
  document.setFont("helvetica", "normal");
  document.setFontSize(8.2);
  setTextColor(document, COLORS.ink);
  document.text(lines, PAGE.margin + 5, cursorY + 11, {
    lineHeightFactor: 1.25,
  });
  return cursorY + height + 3;
}

async function drawImageGallery(document: jsPDF, quotation: Quotation) {
  const itemsWithImages = quotation.items.filter((item) => item.images.length > 0);
  if (itemsWithImages.length === 0) return 0;

  document.addPage();
  let failedImages = 0;
  let cursorY = PAGE.top;
  cursorY = drawSectionTitle(document, cursorY, "Referencias visuais dos produtos");
  const gap = 4;
  const cardWidth = (PAGE.width - PAGE.margin * 2 - gap) / 2;
  const cardHeight = 61;

  for (const item of itemsWithImages) {
    cursorY = ensureSpace(document, cursorY, 72);
    document.setFont("helvetica", "bold");
    document.setFontSize(9.5);
    setTextColor(document, COLORS.ink);
    document.text(
      `${item.lineNumber}. ${item.description}`,
      PAGE.margin,
      cursorY + 4,
      { maxWidth: PAGE.width - PAGE.margin * 2 }
    );
    cursorY += 9;

    for (let index = 0; index < item.images.length; index += 1) {
      const column = index % 2;
      if (column === 0 && cursorY + cardHeight > PAGE.bottom) {
        document.addPage();
        cursorY = PAGE.top;
        document.setFont("helvetica", "bold");
        document.setFontSize(8.5);
        setTextColor(document, COLORS.ink);
        document.text(
          `${item.lineNumber}. ${item.description} (continuacao)`,
          PAGE.margin,
          cursorY + 4,
          { maxWidth: PAGE.width - PAGE.margin * 2 }
        );
        cursorY += 9;
      }

      const image = item.images[index];
      const x = PAGE.margin + column * (cardWidth + gap);
      setFillColor(document, COLORS.soft);
      setDrawColor(document, COLORS.line);
      document.roundedRect(x, cursorY, cardWidth, cardHeight, 2, 2, "FD");

      try {
        const loaded = await loadGalleryImage(image.url);
        const maxWidth = cardWidth - 8;
        const maxHeight = cardHeight - 14;
        const scale = Math.min(
          maxWidth / loaded.width,
          maxHeight / loaded.height
        );
        const width = loaded.width * scale;
        const height = loaded.height * scale;
        document.addImage(
          loaded.dataUrl,
          "JPEG",
          x + (cardWidth - width) / 2,
          cursorY + 4 + (maxHeight - height) / 2,
          width,
          height,
          undefined,
          "FAST"
        );
      } catch {
        failedImages += 1;
        document.setFont("helvetica", "normal");
        document.setFontSize(8);
        setTextColor(document, COLORS.muted);
        document.text("Imagem indisponivel", x + cardWidth / 2, cursorY + 28, {
          align: "center",
        });
      }

      document.setFont("helvetica", "normal");
      document.setFontSize(6.5);
      setTextColor(document, COLORS.muted);
      document.text(image.fileName, x + 4, cursorY + cardHeight - 4, {
        maxWidth: cardWidth - 8,
      });

      if (column === 1 || index === item.images.length - 1) {
        cursorY += cardHeight + 5;
      }
    }

    cursorY += 4;
  }

  return failedImages;
}

function drawPageChrome(
  document: jsPDF,
  quotation: Quotation,
  generatedAt: Date,
  brandLogo?: PdfBrandLogo
) {
  const totalPages = document.getNumberOfPages();

  for (let page = 1; page <= totalPages; page += 1) {
    document.setPage(page);
    if (page > 1) {
      if (brandLogo) {
        const size = fitPdfLogo(brandLogo, 7, 7);
        document.addImage(
          brandLogo.dataUrl,
          "PNG",
          PAGE.margin + (7 - size.width) / 2,
          5 + (7 - size.height) / 2,
          size.width,
          size.height,
          "organization-logo-small",
          "FAST"
        );
      }
      document.setFont("helvetica", "bold");
      document.setFontSize(8);
      setTextColor(document, COLORS.ink);
      document.text(
        quotation.sellerTradeName || quotation.sellerName,
        brandLogo ? PAGE.margin + 10 : PAGE.margin,
        9.5,
        { maxWidth: 105 }
      );
      document.setFont("helvetica", "normal");
      document.setFontSize(6.5);
      setTextColor(document, COLORS.muted);
      document.text(
        `CNPJ: ${normalizeValue(quotation.sellerDocument)}`,
        brandLogo ? PAGE.margin + 10 : PAGE.margin,
        14
      );
      document.setFontSize(7.5);
      setTextColor(document, COLORS.muted);
      document.text(
        `${quotationStatusLabels[quotation.status]} | Emitida em ${formatQuotationDate(
          quotation.issuedAt
        )}`,
        PAGE.width - PAGE.margin,
        12,
        { align: "right" }
      );
      setDrawColor(document, COLORS.line);
      document.line(PAGE.margin, 18, PAGE.width - PAGE.margin, 18);
    }

    setDrawColor(document, COLORS.line);
    document.line(PAGE.margin, 284, PAGE.width - PAGE.margin, 284);
    document.setFont("helvetica", "normal");
    document.setFontSize(6.8);
    setTextColor(document, COLORS.muted);
    document.text(
      `Documento gerado pela plataforma ${PLATFORM_NAME} em ${formatGeneratedAt(generatedAt)}`,
      PAGE.margin,
      290
    );
    document.text(`Pagina ${page} de ${totalPages}`, PAGE.width - PAGE.margin, 290, {
      align: "right",
    });
  }
}

function filenamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export async function buildQuotationPdf(quotation: Quotation) {
  COLORS = buildDocumentColors(quotation.sellerPrimaryColor);
  const [{ jsPDF }, { autoTable }, brandLogo] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    loadPdfBrandLogo(quotation.sellerLogoUrl),
  ]);
  const document = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const generatedAt = new Date();

  document.setProperties({
    title: `Cotacao ${quotation.number}`,
    subject: `Proposta comercial para ${quotation.customerLegalName}`,
    author: quotation.sellerName,
    creator: PLATFORM_NAME,
  });
  const headerBottom = drawFirstPageHeader(document, quotation, brandLogo);

  let cursorY = ensureSpace(document, headerBottom + 8, 28);
  cursorY = drawSectionTitle(document, cursorY, "Produtos cotados");
  cursorY = drawItemsTable(document, cursorY, quotation, autoTable);
  cursorY = drawTotals(document, cursorY, quotation);

  if (quotation.paymentTerms || quotation.deliveryTerms || quotation.notes) {
    cursorY = ensureSpace(document, cursorY + 1, 18);
    cursorY = drawSectionTitle(document, cursorY, "Condicoes comerciais");
    cursorY = drawTextBlock(
      document,
      cursorY,
      "Condicao de pagamento",
      quotation.paymentTerms
    );
    cursorY = drawTextBlock(
      document,
      cursorY,
      "Condicao de entrega",
      quotation.deliveryTerms
    );
    drawTextBlock(document, cursorY, "Observacoes", quotation.notes);
  }

  const failedImages = await drawImageGallery(document, quotation);
  if (failedImages > 0) {
    throw new Error(
      `${failedImages} imagem(ns) nao puderam ser carregadas. Atualize a pagina e tente exportar novamente.`
    );
  }
  drawPageChrome(document, quotation, generatedAt, brandLogo);

  return document;
}

export async function exportQuotationPdf(quotation: Quotation) {
  const document = await buildQuotationPdf(quotation);
  const number = filenamePart(quotation.number) || "sem-numero";
  const customer =
    filenamePart(quotation.customerTradeName || quotation.customerLegalName) ||
    "cliente";
  const filename = `cotacao-${number}-${customer}.pdf`;
  document.save(filename);
  return filename;
}
