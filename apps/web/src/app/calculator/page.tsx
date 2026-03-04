"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Operator = "+" | "-" | "*" | "/";

function compute(left: number, right: number, operator: Operator) {
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? Number.NaN : left / right;
    default:
      return Number.NaN;
  }
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "Error";
  }
  const rounded = Number(value.toFixed(10));
  return String(rounded);
}

export default function CalculatorPage() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingForNext, setWaitingForNext] = useState(false);

  const expression = useMemo(() => {
    if (previousValue === null || operator === null) {
      return "";
    }
    return `${formatNumber(previousValue)} ${operator}`;
  }, [previousValue, operator]);

  const clearAll = useCallback(() => {
    setDisplay("0");
    setPreviousValue(null);
    setOperator(null);
    setWaitingForNext(false);
  }, []);

  const inputDigit = useCallback(
    (digit: string) => {
      if (display === "Error") {
        setDisplay(digit);
        setWaitingForNext(false);
        return;
      }
      if (waitingForNext) {
        setDisplay(digit);
        setWaitingForNext(false);
        return;
      }
      setDisplay((prev) => (prev === "0" ? digit : `${prev}${digit}`));
    },
    [display, waitingForNext]
  );

  const inputDecimal = useCallback(() => {
    if (display === "Error") {
      setDisplay("0.");
      setWaitingForNext(false);
      return;
    }
    if (waitingForNext) {
      setDisplay("0.");
      setWaitingForNext(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay((prev) => `${prev}.`);
    }
  }, [display, waitingForNext]);

  const performCalculation = useCallback(() => {
    if (!operator || previousValue === null) {
      return;
    }
    const current = Number(display);
    const result = compute(previousValue, current, operator);
    setDisplay(formatNumber(result));
    setPreviousValue(null);
    setOperator(null);
    setWaitingForNext(true);
  }, [display, operator, previousValue]);

  const chooseOperator = useCallback(
    (nextOperator: Operator) => {
      const current = Number(display);
      if (Number.isNaN(current)) {
        clearAll();
        return;
      }

      if (previousValue === null) {
        setPreviousValue(current);
      } else if (operator && !waitingForNext) {
        const result = compute(previousValue, current, operator);
        setDisplay(formatNumber(result));
        setPreviousValue(result);
      }

      setOperator(nextOperator);
      setWaitingForNext(true);
    },
    [clearAll, display, operator, previousValue, waitingForNext]
  );

  const deleteLast = useCallback(() => {
    if (waitingForNext || display === "Error") {
      return;
    }
    setDisplay((prev) => {
      if (prev.length <= 1 || (prev.startsWith("-") && prev.length === 2)) {
        return "0";
      }
      return prev.slice(0, -1);
    });
  }, [display, waitingForNext]);

  const toggleSign = useCallback(() => {
    if (display === "Error") {
      return;
    }
    const value = Number(display);
    setDisplay(formatNumber(value * -1));
  }, [display]);

  const toPercent = useCallback(() => {
    if (display === "Error") {
      return;
    }
    const value = Number(display);
    setDisplay(formatNumber(value / 100));
  }, [display]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key >= "0" && event.key <= "9") || event.key === ".") {
        event.preventDefault();
      }

      if (event.key >= "0" && event.key <= "9") {
        inputDigit(event.key);
        return;
      }
      if (event.key === ".") {
        inputDecimal();
        return;
      }
      if (event.key === "+" || event.key === "-" || event.key === "*" || event.key === "/") {
        chooseOperator(event.key as Operator);
        return;
      }
      if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        performCalculation();
        return;
      }
      if (event.key === "Escape") {
        clearAll();
        return;
      }
      if (event.key === "Backspace") {
        deleteLast();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chooseOperator, clearAll, deleteLast, inputDecimal, inputDigit, performCalculation]);

  return (
    <div className="container py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Calculator</h1>
          <p className="text-sm text-muted-foreground">
            Functional calculator with keyboard support (0-9, +, -, *, /, Enter, Backspace, Esc).
          </p>
        </div>
        <Card>
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-sm text-muted-foreground">{expression || " "}</CardTitle>
            <Input value={display} readOnly className="h-14 text-right text-2xl font-semibold" />
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-2">
            <Button variant="secondary" onClick={clearAll}>
              AC
            </Button>
            <Button variant="secondary" onClick={toggleSign}>
              +/-
            </Button>
            <Button variant="secondary" onClick={toPercent}>
              %
            </Button>
            <Button variant="outline" onClick={() => chooseOperator("/")}>
              /
            </Button>

            <Button onClick={() => inputDigit("7")}>7</Button>
            <Button onClick={() => inputDigit("8")}>8</Button>
            <Button onClick={() => inputDigit("9")}>9</Button>
            <Button variant="outline" onClick={() => chooseOperator("*")}>
              *
            </Button>

            <Button onClick={() => inputDigit("4")}>4</Button>
            <Button onClick={() => inputDigit("5")}>5</Button>
            <Button onClick={() => inputDigit("6")}>6</Button>
            <Button variant="outline" onClick={() => chooseOperator("-")}>
              -
            </Button>

            <Button onClick={() => inputDigit("1")}>1</Button>
            <Button onClick={() => inputDigit("2")}>2</Button>
            <Button onClick={() => inputDigit("3")}>3</Button>
            <Button variant="outline" onClick={() => chooseOperator("+")}>
              +
            </Button>

            <Button variant="secondary" onClick={deleteLast}>
              DEL
            </Button>
            <Button onClick={() => inputDigit("0")}>0</Button>
            <Button onClick={inputDecimal}>.</Button>
            <Button variant="default" onClick={performCalculation}>
              =
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
