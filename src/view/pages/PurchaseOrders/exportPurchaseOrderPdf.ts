import type { jsPDF } from "jspdf";

import type {
  PurchaseOrder,
  PurchaseOrderItem,
} from "@/app/entities/PurchaseOrder";
import brandIconUrl from "@/assets/jc-materiais-icon.png";
import {
  lifecycleLabels,
  progressLabels,
} from "./purchaseOrderPresentation";

type RgbColor = [number, number, number];

type InfoField = {
  label: string;
  value?: string;
};

type Metric = {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning";
};

const PAGE = {
  width: 210,
  height: 297,
  margin: 14,
  continuationTop: 26,
  contentBottom: 278,
};

const COLORS = {
  ink: [20, 31, 27] as RgbColor,
  muted: [94, 105, 100] as RgbColor,
  line: [218, 226, 222] as RgbColor,
  soft: [245, 248, 246] as RgbColor,
  white: [255, 255, 255] as RgbColor,
  emerald: [5, 150, 105] as RgbColor,
  emeraldDark: [4, 120, 87] as RgbColor,
  emeraldSoft: [226, 247, 238] as RgbColor,
  amber: [180, 83, 9] as RgbColor,
  amberSoft: [255, 247, 220] as RgbColor,
};

const BRAND_NAME = "JC Materiais Hospitalares";

async function loadAssetAsDataUrl(assetUrl: string) {
  try {
    const response = await fetch(assetUrl);

    if (!response.ok) {
      return undefined;
    }

    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

function setFillColor(document: jsPDF, color: RgbColor) {
  document.setFillColor(color[0], color[1], color[2]);
}

function setDrawColor(document: jsPDF, color: RgbColor) {
  document.setDrawColor(color[0], color[1], color[2]);
}

function setTextColor(document: jsPDF, color: RgbColor) {
  document.setTextColor(color[0], color[1], color[2]);
}

function normalizeValue(value?: string) {
  return value?.trim() || "Não informado";
}

function formatCurrency(value: number) {
  return value
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
    .replace(/\u00a0/g, " ");
}

function formatQuantity(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}

function formatDate(value?: string) {
  if (!value) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatGeneratedAt(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function wrapText(document: jsPDF, value: string, maxWidth: number) {
  const wrapped = document.splitTextToSize(value, maxWidth);

  return Array.isArray(wrapped) ? wrapped.map(String) : [String(wrapped)];
}

function ensureSpace(document: jsPDF, cursorY: number, requiredHeight: number) {
  if (cursorY + requiredHeight <= PAGE.contentBottom) {
    return cursorY;
  }

  document.addPage();
  return PAGE.continuationTop;
}

function drawFirstPageHeader(
  document: jsPDF,
  order: PurchaseOrder,
  entityName: string,
  brandIcon?: string
) {
  setFillColor(document, COLORS.ink);
  document.rect(0, 0, PAGE.width, 51, "F");
  setFillColor(document, COLORS.emerald);
  document.rect(0, 0, 4, 51, "F");

  const organizationTextX = brandIcon ? PAGE.margin + 16 : PAGE.margin;

  if (brandIcon) {
    document.addImage(
      brandIcon,
      "PNG",
      PAGE.margin,
      4,
      13,
      13,
      "jc-materiais-icon",
      "FAST"
    );
  }

  setTextColor(document, COLORS.emeraldSoft);
  document.setFont("helvetica", "bold");
  document.setFontSize(9);
  document.text(entityName.toUpperCase(), organizationTextX, 13, {
    maxWidth: 106,
  });

  setTextColor(document, COLORS.white);
  document.setFont("helvetica", "normal");
  document.setFontSize(8);
  document.text("ORDEM DE COMPRA", PAGE.margin, 25);

  document.setFont("helvetica", "bold");
  document.setFontSize(20);
  document.text(normalizeValue(order.orderNumber), PAGE.margin, 37, {
    maxWidth: 112,
  });

  document.setFont("helvetica", "normal");
  document.setFontSize(7.5);
  setTextColor(document, COLORS.emeraldSoft);
  document.text(
    `${lifecycleLabels[order.lifecycleStatus]}  |  ${progressLabels[order.progress]}`,
    PAGE.margin,
    46
  );

  document.setFont("helvetica", "normal");
  document.setFontSize(7.5);
  setTextColor(document, COLORS.emeraldSoft);
  document.text("VALOR CONTRATADO", PAGE.width - PAGE.margin, 25, {
    align: "right",
  });

  document.setFont("helvetica", "bold");
  document.setFontSize(17);
  setTextColor(document, COLORS.white);
  document.text(formatCurrency(order.officialTotal), PAGE.width - PAGE.margin, 37, {
    align: "right",
  });

  document.setFont("helvetica", "normal");
  document.setFontSize(7.5);
  setTextColor(document, COLORS.emeraldSoft);
  document.text(
    `${order.itemCount} ${order.itemCount === 1 ? "item" : "itens"}`,
    PAGE.width - PAGE.margin,
    46,
    { align: "right" }
  );
}

function drawSectionTitle(document: jsPDF, cursorY: number, title: string) {
  setFillColor(document, COLORS.emerald);
  document.roundedRect(PAGE.margin, cursorY + 0.6, 3, 5.2, 1.5, 1.5, "F");
  setTextColor(document, COLORS.ink);
  document.setFont("helvetica", "bold");
  document.setFontSize(10.5);
  document.text(title, PAGE.margin + 6, cursorY + 5);

  return cursorY + 9;
}

function drawInfoGrid(
  document: jsPDF,
  initialY: number,
  fields: InfoField[],
  columns: number
) {
  const gap = 3;
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const cellWidth = (contentWidth - gap * (columns - 1)) / columns;
  let cursorY = initialY;

  for (let start = 0; start < fields.length; start += columns) {
    const row = fields.slice(start, start + columns);
    const values = row.map((field) =>
      wrapText(document, normalizeValue(field.value), cellWidth - 8)
    );
    const maxLines = Math.max(...values.map((lines) => lines.length));
    const rowHeight = Math.max(17, 11 + maxLines * 3.6);

    cursorY = ensureSpace(document, cursorY, rowHeight + 3);

    row.forEach((field, columnIndex) => {
      const x = PAGE.margin + columnIndex * (cellWidth + gap);

      setFillColor(document, COLORS.soft);
      setDrawColor(document, COLORS.line);
      document.roundedRect(x, cursorY, cellWidth, rowHeight, 2, 2, "FD");

      document.setFont("helvetica", "bold");
      document.setFontSize(6.7);
      setTextColor(document, COLORS.muted);
      document.text(field.label.toUpperCase(), x + 4, cursorY + 5.5);

      document.setFont("helvetica", "normal");
      document.setFontSize(8.5);
      setTextColor(document, COLORS.ink);
      document.text(values[columnIndex], x + 4, cursorY + 11, {
        lineHeightFactor: 1.25,
      });
    });

    cursorY += rowHeight + 3;
  }

  return cursorY;
}

function itemDetails(item: PurchaseOrderItem) {
  const identification = [
    item.brand ? `Marca: ${item.brand}` : null,
    item.specification ? `Especificação: ${item.specification}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
  const movement = [
    `Comprado: ${formatQuantity(item.acquiredQuantity)}`,
    `Recebido: ${formatQuantity(item.receivedQuantity)}`,
    `Entregue: ${formatQuantity(item.deliveredQuantity)}`,
    `Faturado: ${formatQuantity(item.invoicedQuantity)}`,
  ].join(" | ");
  const pending = [
    item.purchasePendingQuantity > 0
      ? `Falta comprar: ${formatQuantity(item.purchasePendingQuantity)}`
      : null,
    item.excessQuantity > 0
      ? `Excedente: ${formatQuantity(item.excessQuantity)}`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return [
    item.description,
    identification,
    `Situação: ${progressLabels[item.progress]}`,
    movement,
    pending,
    item.notes ? `Observação: ${item.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function drawItemsTable(
  document: jsPDF,
  cursorY: number,
  order: PurchaseOrder,
  autoTable: typeof import("jspdf-autotable").autoTable
) {
  let tableEndY = cursorY;

  autoTable(document, {
    startY: cursorY,
    margin: {
      top: PAGE.continuationTop,
      right: PAGE.margin,
      bottom: 19,
      left: PAGE.margin,
    },
    head: [["#", "Produto", "Un.", "Qtd.", "Valor unit.", "Total"]],
    body: order.items.map((item) => [
      item.lineNumber,
      itemDetails(item),
      item.normalizedUnit && item.normalizedUnit !== item.originalUnit
        ? `${item.originalUnit}\n(${item.normalizedUnit})`
        : item.originalUnit,
      formatQuantity(item.orderedQuantity),
      formatCurrency(item.saleUnitPrice),
      formatCurrency(item.officialTotal),
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
      fontSize: 7.4,
      valign: "middle",
      cellPadding: 2.6,
    },
    alternateRowStyles: {
      fillColor: COLORS.soft,
    },
    columnStyles: {
      0: { cellWidth: 9, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 80 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 17, halign: "right" },
      4: { cellWidth: 29, halign: "right" },
      5: { cellWidth: 31, halign: "right", fontStyle: "bold" },
    },
    willDrawPage: () => {
      document.saveGraphicsState();
    },
    didDrawPage: ({ cursor }) => {
      tableEndY = cursor?.y ?? tableEndY;
      document.restoreGraphicsState();
    },
  });

  return tableEndY + 7;
}

function drawMetricGrid(
  document: jsPDF,
  initialY: number,
  metrics: Metric[]
) {
  const columns = 4;
  const gap = 3;
  const cardHeight = 18;
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
  let cursorY = initialY;

  for (let start = 0; start < metrics.length; start += columns) {
    cursorY = ensureSpace(document, cursorY, cardHeight + 3);
    const row = metrics.slice(start, start + columns);

    row.forEach((metric, columnIndex) => {
      const x = PAGE.margin + columnIndex * (cardWidth + gap);
      const valueColor =
        metric.tone === "positive"
          ? COLORS.emeraldDark
          : metric.tone === "warning"
            ? COLORS.amber
            : COLORS.ink;

      setFillColor(
        document,
        metric.tone === "warning" ? COLORS.amberSoft : COLORS.soft
      );
      setDrawColor(document, COLORS.line);
      document.roundedRect(x, cursorY, cardWidth, cardHeight, 2, 2, "FD");

      document.setFont("helvetica", "bold");
      document.setFontSize(6.2);
      setTextColor(document, COLORS.muted);
      document.text(metric.label.toUpperCase(), x + 3.5, cursorY + 5.4, {
        maxWidth: cardWidth - 7,
      });

      document.setFont("helvetica", "bold");
      document.setFontSize(9.3);
      setTextColor(document, valueColor);
      document.text(metric.value, x + 3.5, cursorY + 13.4, {
        maxWidth: cardWidth - 7,
      });
    });

    cursorY += cardHeight + 3;
  }

  return cursorY;
}

function drawMismatchAlert(
  document: jsPDF,
  initialY: number,
  order: PurchaseOrder
) {
  if (!order.hasTotalMismatch) {
    return initialY;
  }

  const message = `O documento informa ${formatCurrency(order.officialTotal)}, enquanto a soma das linhas resulta em ${formatCurrency(order.calculatedItemsTotal)}.`;
  const lines = wrapText(document, message, PAGE.width - PAGE.margin * 2 - 12);
  const height = Math.max(18, 11 + lines.length * 3.5);
  const cursorY = ensureSpace(document, initialY, height + 3);

  setFillColor(document, COLORS.amberSoft);
  document.roundedRect(
    PAGE.margin,
    cursorY,
    PAGE.width - PAGE.margin * 2,
    height,
    2,
    2,
    "F"
  );
  setFillColor(document, COLORS.amber);
  document.roundedRect(PAGE.margin, cursorY, 3, height, 1.5, 1.5, "F");

  document.setFont("helvetica", "bold");
  document.setFontSize(7);
  setTextColor(document, COLORS.amber);
  document.text("DIVERGÊNCIA DE TOTAL PRESERVADA", PAGE.margin + 7, cursorY + 5.5);

  document.setFont("helvetica", "normal");
  document.setFontSize(8);
  setTextColor(document, COLORS.ink);
  document.text(lines, PAGE.margin + 7, cursorY + 11, {
    lineHeightFactor: 1.25,
  });

  return cursorY + height + 4;
}

function drawTextBlock(
  document: jsPDF,
  initialY: number,
  title: string,
  value?: string
) {
  if (!value?.trim()) {
    return initialY;
  }

  const allLines = wrapText(
    document,
    value.trim(),
    PAGE.width - PAGE.margin * 2 - 10
  );
  const lineHeight = 3.7;
  let remainingLines = allLines;
  let cursorY = initialY;
  let part = 0;

  while (remainingLines.length > 0) {
    cursorY = ensureSpace(document, cursorY, 19);
    const availableHeight = PAGE.contentBottom - cursorY - 12;
    const linesPerPage = Math.max(1, Math.floor(availableHeight / lineHeight));
    const lines = remainingLines.slice(0, linesPerPage);
    remainingLines = remainingLines.slice(lines.length);
    const height = 12 + lines.length * lineHeight;

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
    document.setFontSize(7);
    setTextColor(document, COLORS.muted);
    document.text(
      `${title.toUpperCase()}${part > 0 ? " (CONTINUAÇÃO)" : ""}`,
      PAGE.margin + 5,
      cursorY + 6
    );

    document.setFont("helvetica", "normal");
    document.setFontSize(8.3);
    setTextColor(document, COLORS.ink);
    document.text(lines, PAGE.margin + 5, cursorY + 12, {
      lineHeightFactor: 1.25,
    });

    cursorY += height + 4;
    part += 1;

    if (remainingLines.length > 0) {
      document.addPage();
      cursorY = PAGE.continuationTop;
    }
  }

  return cursorY;
}

function drawPageChrome(
  document: jsPDF,
  order: PurchaseOrder,
  entityName: string,
  generatedAt: Date,
  brandIcon?: string
) {
  const totalPages = document.getNumberOfPages();

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    document.setPage(pageNumber);

    if (pageNumber > 1) {
      const organizationTextX = brandIcon ? PAGE.margin + 10 : PAGE.margin;

      if (brandIcon) {
        document.addImage(
          brandIcon,
          "PNG",
          PAGE.margin,
          5,
          7,
          7,
          "jc-materiais-icon",
          "FAST"
        );
      }

      setTextColor(document, COLORS.ink);
      document.setFont("helvetica", "bold");
      document.setFontSize(8);
      document.text(entityName, organizationTextX, 11.5, { maxWidth: 105 });

      document.setFont("helvetica", "normal");
      setTextColor(document, COLORS.muted);
      document.text(
        `Ordem ${normalizeValue(order.orderNumber)}`,
        PAGE.width - PAGE.margin,
        13,
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
      `Controle interno gerado por ${BRAND_NAME} em ${formatGeneratedAt(generatedAt)}`,
      PAGE.margin,
      290
    );
    document.text(
      `Página ${pageNumber} de ${totalPages}`,
      PAGE.width - PAGE.margin,
      290,
      { align: "right" }
    );
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

export async function buildPurchaseOrderPdf(
  order: PurchaseOrder,
  entityName?: string
) {
  const [{ jsPDF }, { autoTable }, brandIcon] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    loadAssetAsDataUrl(brandIconUrl),
  ]);
  const document = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const organization = normalizeValue(entityName);
  const generatedAt = new Date();

  document.setProperties({
    title: `Ordem de compra ${order.orderNumber}`,
    subject: `Ordem de compra de ${order.customer.legalName}`,
    author: organization,
    creator: BRAND_NAME,
  });

  drawFirstPageHeader(document, order, organization, brandIcon);

  let cursorY = 59;
  cursorY = drawSectionTitle(document, cursorY, "Dados comerciais");
  cursorY = drawInfoGrid(
    document,
    cursorY,
    [
      { label: "Número externo", value: order.externalNumber },
      { label: "Cotação", value: order.quoteNumber },
      { label: "Requisição", value: order.requisitionNumber },
      { label: "Emissão", value: formatDate(order.issuedAt) },
      {
        label: "Entrega solicitada",
        value: formatDate(order.requestedDeliveryAt),
      },
      { label: "Condição de pagamento", value: order.paymentTerms },
    ],
    3
  );

  cursorY = ensureSpace(document, cursorY + 2, 32);
  cursorY = drawSectionTitle(document, cursorY, "Cliente e endereços");
  cursorY = drawInfoGrid(
    document,
    cursorY,
    [
      { label: "Razão social", value: order.customer.legalName },
      { label: "Nome fantasia", value: order.customer.tradeName },
      { label: "Documento", value: order.customer.document },
    ],
    3
  );
  cursorY = drawInfoGrid(
    document,
    cursorY,
    [
      { label: "Endereço de faturamento", value: order.billingAddress },
      { label: "Endereço de entrega", value: order.deliveryAddress },
    ],
    2
  );

  cursorY = ensureSpace(document, cursorY + 2, 34);
  cursorY = drawSectionTitle(document, cursorY, "Itens da ordem");
  cursorY = drawItemsTable(document, cursorY, order, autoTable);

  cursorY = ensureSpace(document, cursorY, 31);
  cursorY = drawSectionTitle(
    document,
    cursorY,
    "Resumo financeiro e operacional"
  );
  cursorY = drawMetricGrid(document, cursorY, [
    {
      label: "Valor contratado",
      value: formatCurrency(order.officialTotal),
      tone: "positive",
    },
    { label: "Soma dos itens", value: formatCurrency(order.calculatedItemsTotal) },
    {
      label: "Custo de compras",
      value: formatCurrency(order.knownAcquisitionCost),
    },
    { label: "Fretes de entrega", value: formatCurrency(order.deliveryCost) },
    { label: "Faturado", value: formatCurrency(order.invoicedRevenue) },
    {
      label: "Receita recebida",
      value: formatCurrency(order.receivedRevenue),
      tone: "positive",
    },
    {
      label: "Saldo a receber",
      value: formatCurrency(order.receivableBalance),
      tone: order.receivableBalance > 0 ? "warning" : "default",
    },
    { label: "Impostos", value: formatCurrency(order.taxCost) },
    { label: "Outras deduções", value: formatCurrency(order.otherDeductions) },
    {
      label: "Margem projetada",
      value: formatCurrency(order.projectedMargin),
      tone: order.projectedMargin >= 0 ? "positive" : "warning",
    },
    {
      label: "Margem faturada",
      value: formatCurrency(order.invoicedMargin),
      tone: order.invoicedMargin >= 0 ? "positive" : "warning",
    },
    {
      label: "Compras / entregas / notas",
      value: `${order.acquisitionCount} / ${order.deliveryCount} / ${order.invoiceCount}`,
    },
  ]);

  cursorY = drawMismatchAlert(document, cursorY + 1, order);

  if (order.instructions || order.notes) {
    cursorY = ensureSpace(document, cursorY + 2, 16);
    cursorY = drawSectionTitle(document, cursorY, "Orientações da ordem");
    cursorY = drawTextBlock(
      document,
      cursorY,
      "Instruções",
      order.instructions
    );
    drawTextBlock(document, cursorY, "Observações", order.notes);
  }

  drawPageChrome(document, order, organization, generatedAt, brandIcon);

  return document;
}

export async function exportPurchaseOrderPdf(
  order: PurchaseOrder,
  entityName?: string
) {
  const document = await buildPurchaseOrderPdf(order, entityName);
  const orderNumber = filenamePart(order.orderNumber) || "sem-numero";
  const customer =
    filenamePart(order.customer.tradeName || order.customer.legalName) ||
    "cliente";
  const filename = `ordem-${orderNumber}-${customer}.pdf`;

  document.save(filename);
  return filename;
}
