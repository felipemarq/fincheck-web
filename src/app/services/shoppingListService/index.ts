import type { Acquisition, AcquisitionInput } from "@/app/entities/Acquisition";
import type { ShoppingList, ShoppingListItem, ShoppingListItemInput } from "@/app/entities/ShoppingList";
import { httpClient } from "../httpClient";

const root = (entityId: string) => `/entities/${entityId}/shopping-lists`;
const listPath = (entityId: string, listId: string) => `${root(entityId)}/${listId}`;
const itemPath = (entityId: string, item: ShoppingListItem) => `${listPath(entityId, item.shoppingListId)}/items/${item.id}`;

export const shoppingListService = {
  async list(entityId: string) { return (await httpClient.get<{ lists: ShoppingList[] }>(root(entityId))).data.lists; },
  async detail(entityId: string, listId: string) { return (await httpClient.get<{ list: ShoppingList; items: ShoppingListItem[] }>(listPath(entityId, listId))).data; },
  async create(entityId: string, input: { name: string; notes?: string | null }) { return (await httpClient.post<{ list: ShoppingList }>(root(entityId), input)).data.list; },
  async updateList(entityId: string, listId: string, input: { name?: string; notes?: string | null; archived?: boolean }) { await httpClient.patch(listPath(entityId, listId), input); },
  async add(entityId: string, listId: string, items: ShoppingListItemInput[]) { await httpClient.post(`${listPath(entityId, listId)}/items`, { items }); },
  async updateItem(entityId: string, item: ShoppingListItem, input: ShoppingListItemInput) { await httpClient.put(itemPath(entityId, item), { ...input, version: item.version }); },
  async check(entityId: string, item: ShoppingListItem, purchased: boolean) { await httpClient.patch(`${itemPath(entityId, item)}/check`, { purchased, version: item.version }); },
  async remove(entityId: string, item: ShoppingListItem) { await httpClient.delete(itemPath(entityId, item), { data: { version: item.version } }); },
  async purchase(entityId: string, item: ShoppingListItem, purchase: AcquisitionInput) {
    return (await httpClient.post<{ acquisition: Acquisition }>(`${itemPath(entityId, item)}/purchase`, { version: item.version, purchase })).data.acquisition;
  },
};
