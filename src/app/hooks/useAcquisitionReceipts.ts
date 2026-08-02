import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  receiptService,
  type GetReceiptsParams,
} from "../services/receiptService";

export function useAcquisitionReceipts(
  params: GetReceiptsParams,
  enabled = true
) {
  const query = useQuery({
    queryKey: [
      QueryKeys.ACQUISITION_RECEIPTS,
      params.entityId,
      params.purchaseOrderId,
      params.acquisitionId,
    ],
    queryFn: () => receiptService.getAll(params),
    enabled:
      enabled &&
      Boolean(params.entityId) &&
      Boolean(params.purchaseOrderId) &&
      Boolean(params.acquisitionId),
  });

  return {
    ...query,
    receipts: query.data,
    isFetchingReceipts: query.isFetching,
  };
}
