import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ErrorContainer } from "./ErrorContainer";

interface InputCurrencyProps {
  error?: string;
  value: number; // valor em reais (ex: 1.23)
  onChange?(value: number): void; // devolve number em reais
  allowNegative?: boolean;
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
    <div>
      <input
        ref={inputRef}
        inputMode="numeric"
        value={displayValue}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onFocus={moveCaretToEnd}
        onClick={moveCaretToEnd}
        className={cn(
          "w-full text-[32px] text-white font-bold tracking-[-1px] outline-none bg-transparent",
          error && "text-red-500",
        )}
        aria-invalid={!!error}
      />
      {error && <ErrorContainer error={error} />}
    </div>
  );
};
