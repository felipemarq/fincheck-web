import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { QueryKeys } from "../config/QueryKeys";
import { PageLoader } from "@/view/components/PageLoader";
import type { User } from "../entities/User";
import type { Entity } from "../entities/Entity";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { treatAxiosError } from "../utils/treatAxiosError";
import { AxiosError } from "axios";
import logo from "@/assets/moneystack_wordmark.png";
import { usersService } from "../services/usersService";
import {
  authStorage,
  type AuthSession,
  type EntityOnboarding,
} from "../services/authStorage";

interface AuthContextValue {
  signedIn: boolean;
  user: User | null;
  activeEntity: Entity | null;
  signin(session: AuthSession): void;
  signout(): void;
  selectedEntityId: string | null;
  handleChangeSelectedEntityId: (entityId: string) => void;
  entityOnboarding: EntityOnboarding | null;
  startEntityOnboarding: (
    entityId: string,
    step?: EntityOnboarding["step"]
  ) => void;
  advanceEntityOnboarding: (step: EntityOnboarding["step"]) => void;
  clearEntityOnboarding: () => void;
}

export const AuthContext = createContext({} as AuthContextValue);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [signedIn, setSignedIn] = useState<boolean>(() =>
    authStorage.hasAccessToken()
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(() =>
    authStorage.getSelectedEntityId()
  );
  const [entityOnboarding, setEntityOnboarding] =
    useState<EntityOnboarding | null>(() => authStorage.getEntityOnboarding());

  const handleChangeSelectedEntityId = useCallback((entityId: string) => {
    authStorage.setSelectedEntityId(entityId);
    setSelectedEntityId(entityId);
  }, []);

  const startEntityOnboarding = useCallback(
    (entityId: string, step: EntityOnboarding["step"] = "create-account") => {
      const nextState = { entityId, step };
      authStorage.setEntityOnboarding(nextState);
      setEntityOnboarding(nextState);
    },
    []
  );

  const advanceEntityOnboarding = useCallback(
    (step: EntityOnboarding["step"]) => {
      setEntityOnboarding((currentState) => {
        if (!currentState) {
          return currentState;
        }

        const nextState = {
          ...currentState,
          step,
        };

        authStorage.setEntityOnboarding(nextState);

        return nextState;
      });
    },
    []
  );

  const clearEntityOnboarding = useCallback(() => {
    authStorage.clearEntityOnboarding();
    setEntityOnboarding(null);
  }, []);

  const queryClient = useQueryClient();

  const signin = useCallback((session: AuthSession) => {
    authStorage.setSession(session);
    setSignedIn(true);
  }, []);

  const signout = useCallback(() => {
    authStorage.clearSession();
    authStorage.clearSelectedEntityId();
    authStorage.clearEntityOnboarding();
    setSignedIn(false);
    setSelectedEntityId(null);
    setEntityOnboarding(null);
    queryClient.clear();
  }, [queryClient]);

  const { data, isError, error, isFetching } = useQuery({
    queryKey: [QueryKeys.ME],
    queryFn: () => usersService.me(),
    enabled: signedIn,
    staleTime: Infinity,
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
      authStorage.clearEntityOnboarding();
      setSelectedEntityId(null);
      setEntityOnboarding(null);
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

    setEntityOnboarding((currentState) => {
      if (!currentState) {
        return currentState;
      }

      const entityStillExists = data.entities.some(
        (entity) => entity.id === currentState.entityId
      );

      if (entityStillExists) {
        return currentState;
      }

      authStorage.clearEntityOnboarding();
      return null;
    });
  }, [data]);

  const activeEntity = useMemo(
    () =>
      data?.entities.find((entity) => entity.id === selectedEntityId) ??
      data?.entities[0] ??
      null,
    [data?.entities, selectedEntityId]
  );

  return (
    <AuthContext.Provider
      value={{
        signedIn,
        signin,
        signout,
        user: data ?? null,
        activeEntity,
        selectedEntityId,
        handleChangeSelectedEntityId,
        entityOnboarding,
        startEntityOnboarding,
        advanceEntityOnboarding,
        clearEntityOnboarding,
      }}
    >
      {isFetching && <PageLoader isLoading={isFetching} logoPath={logo} />}

      {!isFetching && children}
    </AuthContext.Provider>
  );
};
