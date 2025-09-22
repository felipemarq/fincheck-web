import { CircleX } from "lucide-react";

interface ErrorContainerProps {
  error: string;
}

export const ErrorContainer = ({ error }: ErrorContainerProps) => {
  return (
    <div className="flex gap-2 items-center mt-2 p-[2px] rounded-md text-red-500 font-semibold bg-redAccent-500 w-full ">
      <CircleX className="w-4" />
      <span className="text-xs">{error}</span>
    </div>
  );
};
