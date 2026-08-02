import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ErrorContainer } from "./ErrorContainer";

interface InputCurrencyProps {
  error?: string;
  value: number; // valor em reais (ex: 1.23)
  onChange?(value: number): void; // devolve number em reais
  allowNegative?: boolean;
  disabled?: boolean;
  variant?: "prominent" | "field";
}

function onlyDigits(s: string) {
  return (s.match(/\d+/g) ?? []).join("");
}

function clampDigits(raw: string, maxDigits = 15) {
  // evita números gigantes (ajuste se quiser)
  return raw.slice(0, maxDigits).replace(/^0+(?=\d)/, "") || "0";
}

function digitsToNumberBR(
  rawDigits: string,
  allowNegative: boolean,
  sign: 1 | -1,
) {
  const cents = Number(rawDigits || "0");
  const val = cents / 100;
  return allowNegative ? val * sign : val;
}

function numberToDigits(value: number) {
  // converte 1234.56 -> "123456"
  const cents = Math.round(Math.abs(value) * 100);
  return String(cents);
}

function formatBR(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export const InputCurrency = ({
  error,
  value,
  onChange,
  allowNegative = false,
  disabled = false,
  variant = "prominent",
}: InputCurrencyProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Mantém o "raw digits" (centavos) como estado interno
  const [raw, setRaw] = useState(() => numberToDigits(value ?? 0));
  const [sign, setSign] = useState<1 | -1>(value < 0 ? -1 : 1);

  // Se o value vier de fora (reset/edição), sincroniza o raw
  useEffect(() => {
    setRaw(numberToDigits(value ?? 0));
    setSign(value < 0 ? -1 : 1);
  }, [value]);

  const displayValue = useMemo(() => {
    const n = digitsToNumberBR(raw, allowNegative, sign);
    return formatBR(n);
  }, [raw, allowNegative, sign]);

  const moveCaretToEnd = () => {
    const el = inputRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
  };

  const commit = (nextRaw: string, nextSign: 1 | -1 = sign) => {
    const clamped = clampDigits(nextRaw);
    setRaw(clamped);
    setSign(nextSign);
    const n = digitsToNumberBR(clamped, allowNegative, nextSign);

    // evita "0.30000000004" etc.
    const normalized = Number(n.toFixed(2));
    onChange?.(normalized);

    moveCaretToEnd();
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    const k = e.key;

    // permite navegação básica
    if (
      k === "Tab" ||
      k === "Shift" ||
      k === "ArrowLeft" ||
      k === "ArrowRight" ||
      k === "ArrowUp" ||
      k === "ArrowDown" ||
      k === "Home" ||
      k === "End"
    ) {
      return;
    }

    // Backspace / Delete: remove último dígito
    if (k === "Backspace" || k === "Delete") {
      e.preventDefault();
      const next = raw.length > 1 ? raw.slice(0, -1) : "0";
      commit(next);
      return;
    }

    // Negativo (opcional)
    if (allowNegative && (k === "-" || k === "+")) {
      e.preventDefault();
      const nextSign: 1 | -1 = k === "-" ? -1 : 1;
      commit(raw, nextSign);
      return;
    }

    // Digito: adiciona no final
    if (/^\d$/.test(k)) {
      e.preventDefault();
      commit(raw === "0" ? k : raw + k);
      return;
    }

    // bloqueia qualquer outra coisa
    e.preventDefault();
  };

  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const digits = onlyDigits(pasted);
    if (!digits) return;
    commit(digits);
  };

  return (
    <div className="relative">
      {variant === "field" && (
        <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-sm text-muted-foreground">
          R$
        </span>
      )}
      <input
        ref={inputRef}
        inputMode="numeric"
        value={displayValue}
        disabled={disabled}
        onChange={() => undefined}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onFocus={moveCaretToEnd}
        onClick={moveCaretToEnd}
        className={cn(
          variant === "prominent" &&
            "w-full bg-transparent text-[32px] font-bold tracking-[-1px] text-white outline-none",
          variant === "field" &&
            "border-input dark:bg-input/30 flex h-9 w-full min-w-0 rounded-md border bg-transparent py-1 pl-10 pr-3 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          error && "text-red-500",
        )}
        aria-invalid={!!error}
      />
      {error && <ErrorContainer error={error} />}
    </div>
  );
};
