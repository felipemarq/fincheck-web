import { createContext, useCallback, useEffect, useState } from "react";
import { localStorageKeys } from "../config/localStorageKeys";
import { QueryKeys } from "../config/QueryKeys";
import { PageLoader } from "@/view/components/PageLoader";
import type { User } from "../entities/User";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { treatAxiosError } from "../utils/treatAxiosError";
import { AxiosError } from "axios";
import logo from "@/assets/moneystack_wordmark.png";
import { usersService } from "../services/usersService";

interface AuthContextValue {
  signedIn: boolean;
  user: User | null;
  signin(accessToken: string): void;
  signout(): void;
  selectedEntityId: string | null;
  handleChangeSelectedEntityId: (entityId: string) => void;
}

export const AuthContext = createContext({} as AuthContextValue);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [signedIn, setSignedIn] = useState<boolean>(() => {
    const storedAccessToken = localStorage.getItem(
      localStorageKeys.ACCESS_TOKEN
    );

    return !!storedAccessToken;
  });

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const handleChangeSelectedEntityId = useCallback((entityId: string) => {
    setSelectedEntityId(entityId);
  }, []);

  const queryClient = useQueryClient();

  const signin = useCallback((accessToken: string) => {
    localStorage.setItem(localStorageKeys.ACCESS_TOKEN, accessToken);

    setSignedIn(true);
  }, []);

  const signout = useCallback(() => {
    console.log("deu erro");
    localStorage.removeItem(localStorageKeys.ACCESS_TOKEN);
    setSignedIn(false);
    queryClient.invalidateQueries({ queryKey: [QueryKeys.ME] });
    window.location.reload();
  }, []);

  const { data, isError, error, isFetching, isSuccess } = useQuery({
    queryKey: [QueryKeys.ME],
    queryFn: () => usersService.me(),
    enabled: signedIn,
    staleTime: Infinity,
  });

  console.log("Entidade Selecionada", selectedEntityId);

  useEffect(() => {
    if (isError) {
      treatAxiosError((error as Error) || AxiosError);
      signout();
    }

    if (isSuccess) {
      setSelectedEntityId(data?.entities[0].id);
    }
  }, [isError, signout]);

  useEffect(() => {
    if (data) {
      setSelectedEntityId(data?.entities[0].id);
    }
  }, [data]);

  return (
    <AuthContext.Provider
      value={{
        signedIn: isSuccess,
        signin,
        signout,
        user: data ?? null,
        selectedEntityId,
        handleChangeSelectedEntityId,
      }}
    >
      {isFetching && <PageLoader isLoading={isFetching} logoPath={logo} />}

      {!isFetching && children}
    </AuthContext.Provider>
  );
};
