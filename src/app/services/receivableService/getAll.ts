import type {
  ReceivableFilterStatus,
  ReceivablesPage,
  ReceivableSort,
} from "@/app/entities/Receivable";
import { httpClient } from "../httpClient";

export type GetReceivablesParams = {
  entityId: string;
  search?: string;
  status?: ReceivableFilterStatus;
  dueFrom?: string;
  dueTo?: string;
  sort?: ReceivableSort;
  page?: number;
  pageSize?: number;
};

export async function getAll({ entityId, ...params }: GetReceivablesParams) {
  const { data } = await httpClient.get<ReceivablesPage>(
    `/entities/${entityId}/receivables`,
    { params }
  );

  return data;
}
