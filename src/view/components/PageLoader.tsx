import { Spinner } from "./Spinner";

interface PageLoaderProps {
  isLoading: boolean;
  logoPath?: string;
}

export const PageLoader = ({ logoPath, isLoading }: PageLoaderProps) => {
  if (!isLoading) {
    return null;
  }
  return (
    <div className="bg-primary fixed top-0 left-0 h-full w-full grid place-items-center z-50">
      <div className="flex justify-center items-center gap-4 flex-col">
        <div className="h-52 w-52">
          {logoPath && <img src={logoPath} alt="logo" />}
        </div>
        <Spinner className="text-primary fill-white h-10 w-10" />
      </div>
    </div>
  );
};
