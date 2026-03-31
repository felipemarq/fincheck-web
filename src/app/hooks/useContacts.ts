import { useQuery } from "@tanstack/react-query";

import { QueryKeys } from "../config/QueryKeys";
import {
  contactService,
  type GetAllContactsParams,
} from "../services/contactService";

export const useContacts = (params: GetAllContactsParams, enabled = true) => {
  const { data, isFetching, refetch, ...rest } = useQuery({
    queryKey: [QueryKeys.CONTACTS, params.entityId],
    queryFn: () => contactService.getAll(params),
    enabled: enabled && Boolean(params.entityId),
    staleTime: 60_000,
  });

  return {
    contacts: data,
    isFetchingContacts: isFetching,
    refetchContacts: refetch,
    ...rest,
  };
};
