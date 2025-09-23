import { useState } from "react";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { ErrorContainer } from "./ErrorContainer";
import { Calendar } from "lucide-react";
import { Popover } from "./Popover";
import { formatDate } from "@/app/utils/formatDate";
import { DatePicker } from "./DatePicker";

interface DatePickerInputProps {
  error?: string;
  className?: string;
  placeholder?: string;
  value?: Date;
  onChange?(date: Date): void;
}
export const DatePickerInput = ({
  error,
  className,
  value,
  placeholder,
  onChange,
}: DatePickerInputProps) => {
  const [selectedDate, setSelectedDate] = useState(value ?? new Date());

  const handleChangeDate = (date: Date) => {
    setSelectedDate(date);
    onChange?.(date);
  };

  return (
    <div>
      <Popover.Root>
        <Popover.Trigger>
          <button
            type="button"
            className={cn(
              "bg-white rounded-lg w-full flex gap-4 items-center border border-gray-500 px-3 h-9 text-gray-700 focus:border-gray-800 transition-all outline-none text-left relative",
              error && "!border-red-900",
              className
            )}
          >
            <span>{formatDate(selectedDate)}</span>
            <span className=" text-gray-700 text-xs ">
              {!placeholder && <Calendar size={16} />}
              {placeholder && placeholder}
            </span>
          </button>
        </Popover.Trigger>

        <Popover.Content className="">
          <DatePicker value={selectedDate} onChange={handleChangeDate} />
          <div className="w-full flex justify-end">
            <Popover.Close>
              <Button size="sm">Ok</Button>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Root>
      {error && <ErrorContainer error={error} />}
    </div>
  );
};
