import { Spinner } from "./Spinner";
import { PlatformBrand } from "@/components/PlatformBrand";

interface PageLoaderProps {
  isLoading: boolean;
  logoPath?: string;
}

export const PageLoader = ({ logoPath }: PageLoaderProps) => {
  return (
    <div className="bg-background fixed top-0 left-0 z-50 grid h-full w-full place-items-center">
      <div className="flex justify-center items-center gap-4 flex-col">
        <div className="flex h-24 w-64 items-center justify-center">
          {logoPath ? (
            <img
              src={logoPath}
              alt="MoneyStack"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <PlatformBrand />
          )}
        </div>
        <Spinner className="h-10 w-10 fill-primary text-muted" />
      </div>
    </div>
  );
};
