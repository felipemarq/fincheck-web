import { purchaseOrderService } from "@/app/services/purchaseOrderService";
import { buildPurchaseOrderPdf } from "./exportPurchaseOrderPdf";

export const DEFAULT_BATCH_PAGE_LIMIT = 50;
export const MAX_BATCH_PAGE_LIMIT = 200;
export const MAX_BATCH_COPIES = 10;

const DETAIL_REQUEST_CONCURRENCY = 3;

export type PurchaseOrderBatchExportProgress = {
  currentOrder: number;
  totalOrders: number;
  pageCount: number;
};

export type PurchaseOrderBatchExportResult = {
  filename: string;
  matchedOrderCount: number;
  exportedOrderCount: number;
  skippedOrderCount: number;
  pageCount: number;
  limitReached: boolean;
};

type ExportPurchaseOrdersBatchPdfParams = {
  entityId: string;
  entityName?: string;
  orderIds: string[];
  copies: number;
  maxPages: number;
  onProgress?: (progress: PurchaseOrderBatchExportProgress) => void;
};

function assertIntegerInRange(
  value: number,
  label: string,
  minimum: number,
  maximum: number
) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} deve estar entre ${minimum} e ${maximum}.`);
  }
}

function downloadPdf(bytes: Uint8Array, filename: string) {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/pdf" })
  );
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function makeFilename() {
  const date = new Date().toISOString().slice(0, 10);
  return `ordens-de-compra-lote-${date}.pdf`;
}

export async function exportPurchaseOrdersBatchPdf({
  entityId,
  entityName,
  orderIds,
  copies,
  maxPages,
  onProgress,
}: ExportPurchaseOrdersBatchPdfParams): Promise<PurchaseOrderBatchExportResult> {
  assertIntegerInRange(copies, "A quantidade de copias", 1, MAX_BATCH_COPIES);
  assertIntegerInRange(
    maxPages,
    "O limite de paginas",
    1,
    MAX_BATCH_PAGE_LIMIT
  );

  if (!orderIds.length) {
    throw new Error("Nenhuma ordem corresponde aos filtros selecionados.");
  }

  const { PDFDocument } = await import("pdf-lib");
  const batchDocument = await PDFDocument.create();
  let exportedOrderCount = 0;
  let limitReached = false;

  batchDocument.setTitle("Ordens de compra");
  batchDocument.setAuthor(entityName || "JC Materiais Hospitalares");
  batchDocument.setCreator("JC Materiais Hospitalares");
  batchDocument.setCreationDate(new Date());

  onProgress?.({
    currentOrder: 0,
    totalOrders: orderIds.length,
    pageCount: 0,
  });

  for (
    let startIndex = 0;
    startIndex < orderIds.length;
    startIndex += DETAIL_REQUEST_CONCURRENCY
  ) {
    onProgress?.({
      currentOrder: startIndex + 1,
      totalOrders: orderIds.length,
      pageCount: batchDocument.getPageCount(),
    });

    const detailIds = orderIds.slice(
      startIndex,
      startIndex + DETAIL_REQUEST_CONCURRENCY
    );
    const detailedOrders = await Promise.all(
      detailIds.map((purchaseOrderId) =>
        purchaseOrderService.getOne({ entityId, purchaseOrderId })
      )
    );

    for (let offset = 0; offset < detailedOrders.length; offset += 1) {
      const currentIndex = startIndex + offset;

      onProgress?.({
        currentOrder: currentIndex + 1,
        totalOrders: orderIds.length,
        pageCount: batchDocument.getPageCount(),
      });

      const orderDocument = await buildPurchaseOrderPdf(
        detailedOrders[offset],
        entityName
      );
      const sourceDocument = await PDFDocument.load(
        new Uint8Array(orderDocument.output("arraybuffer"))
      );
      const sourcePageCount = sourceDocument.getPageCount();
      const requiredPages = sourcePageCount * copies;

      if (batchDocument.getPageCount() + requiredPages > maxPages) {
        limitReached = true;

        if (!batchDocument.getPageCount()) {
          throw new Error(
            `A primeira ordem precisa de ${requiredPages} paginas com ${copies} ` +
              `${copies === 1 ? "copia" : "copias"}. Aumente o limite de paginas.`
          );
        }

        break;
      }

      for (let copy = 0; copy < copies; copy += 1) {
        const pages = await batchDocument.copyPages(
          sourceDocument,
          sourceDocument.getPageIndices()
        );

        pages.forEach((page) => batchDocument.addPage(page));
      }

      exportedOrderCount += 1;
    }

    if (limitReached) {
      break;
    }
  }

  const filename = makeFilename();
  const bytes = await batchDocument.save({ useObjectStreams: true });
  downloadPdf(bytes, filename);

  return {
    filename,
    matchedOrderCount: orderIds.length,
    exportedOrderCount,
    skippedOrderCount: orderIds.length - exportedOrderCount,
    pageCount: batchDocument.getPageCount(),
    limitReached,
  };
}
