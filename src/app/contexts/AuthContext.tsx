import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { QueryKeys } from "../config/QueryKeys";
import { PageLoader } from "@/view/components/PageLoader";
import type { User } from "../entities/User";
import type { Entity } from "../entities/Entity";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { treatAxiosError } from "../utils/treatAxiosError";
import { AxiosError } from "axios";
import { usersService } from "../services/usersService";
import { authStorage, type AuthSession } from "../services/authStorage";
import type {
  OrganizationPermission,
  OrganizationRole,
} from "../entities/OrganizationAccess";

interface AuthContextValue {
  signedIn: boolean;
  user: User | null;
  activeEntity: Entity | null;
  activeRole: OrganizationRole | null;
  activePermissions: OrganizationPermission[];
  can(permission: OrganizationPermission): boolean;
  signin(session: AuthSession): void;
  signout(): void;
  selectedEntityId: string | null;
  handleChangeSelectedEntityId: (entityId: string) => void;
}

export const AuthContext = createContext({} as AuthContextValue);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [signedIn, setSignedIn] = useState<boolean>(() =>
    authStorage.hasAccessToken()
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(() =>
    authStorage.getSelectedEntityId()
  );
  const handleChangeSelectedEntityId = useCallback(
    (entityId: string) => {
      const isOrganizationQuery = (query: { queryKey: readonly unknown[] }) =>
        query.queryKey[0] !== QueryKeys.ME;

      void queryClient.cancelQueries({ predicate: isOrganizationQuery });
      queryClient.removeQueries({ predicate: isOrganizationQuery });
      authStorage.setSelectedEntityId(entityId);
      setSelectedEntityId(entityId);
    },
    [queryClient]
  );

  const signin = useCallback((session: AuthSession) => {
    authStorage.setSession(session);
    setSignedIn(true);
  }, []);

  const signout = useCallback(() => {
    authStorage.clearSession();
    authStorage.clearSelectedEntityId();
    setSignedIn(false);
    setSelectedEntityId(null);
    queryClient.clear();
  }, [queryClient]);

  const { data, isError, error, isFetching } = useQuery({
    queryKey: [QueryKeys.ME],
    queryFn: () => usersService.me(),
    enabled: signedIn,
    // Refresh before the 12-hour organization logo URL expires.
    staleTime: 10 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (isError) {
      treatAxiosError((error as Error) || AxiosError);
      signout();
    }
  }, [error, isError, signout]);

  useEffect(() => {
    if (!data?.entities.length) {
      authStorage.clearSelectedEntityId();
      setSelectedEntityId(null);
      return;
    }

    setSelectedEntityId((currentEntityId) => {
      if (
        currentEntityId &&
        data.entities.some((entity) => entity.id === currentEntityId)
      ) {
        return currentEntityId;
      }

      const storedEntityId = authStorage.getSelectedEntityId();
      const preferredEntityId = data.entities.find(
        (entity) => entity.id === storedEntityId
      )?.id;

      const nextEntityId = preferredEntityId ?? data.entities[0].id;
      authStorage.setSelectedEntityId(nextEntityId);

      return nextEntityId;
    });

  }, [data]);

  const activeEntity = useMemo(
    () =>
      data?.entities.find((entity) => entity.id === selectedEntityId) ??
      data?.entities[0] ??
      null,
    [data?.entities, selectedEntityId]
  );

  const activePermissions = activeEntity?.permissions ?? [];
  const can = useCallback(
    (permission: OrganizationPermission) =>
      activePermissions.includes(permission),
    [activePermissions]
  );

  return (
    <AuthContext.Provider
      value={{
        signedIn,
        signin,
        signout,
        user: data ?? null,
        activeEntity,
        activeRole: activeEntity?.role ?? null,
        activePermissions,
        can,
        selectedEntityId,
        handleChangeSelectedEntityId,
      }}
    >
      {isFetching && <PageLoader isLoading={isFetching} />}

      {!isFetching && children}
    </AuthContext.Provider>
  );
};
