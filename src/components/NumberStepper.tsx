"use client";

/**
 * A number input with +/- buttons, for mobile browsers that hide the native
 * spinner arrows desktop gets for free on <input type="number">.
 */
export default function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  className = "",
  widthClassName = "w-12",
}: {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  widthClassName?: string;
}) {
  function clamp(n: number) {
    let result = n;
    if (min !== undefined && result < min) result = min;
    if (max !== undefined && result > max) result = max;
    return result;
  }

  function bump(delta: number) {
    const current = Number(value);
    const base = Number.isFinite(current) ? current : (min ?? 0);
    onChange(String(clamp(base + delta)));
  }

  return (
    <div
      className={`inline-flex items-stretch rounded-md border border-zinc-300 dark:border-zinc-700 ${className}`}
    >
      <button
        type="button"
        onClick={() => bump(-step)}
        disabled={disabled}
        aria-label="Decrease"
        className="touch-manipulation px-3 py-1.5 text-base leading-none font-medium text-zinc-600 dark:text-zinc-300 active:bg-black/10 hover:bg-black/5 dark:active:bg-zinc-800 dark:hover:bg-zinc-900 disabled:opacity-50"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${widthClassName} border-x border-zinc-300 dark:border-zinc-700 bg-transparent px-1 py-1.5 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
      <button
        type="button"
        onClick={() => bump(step)}
        disabled={disabled}
        aria-label="Increase"
        className="touch-manipulation px-3 py-1.5 text-base leading-none font-medium text-zinc-600 dark:text-zinc-300 active:bg-black/10 hover:bg-black/5 dark:active:bg-zinc-800 dark:hover:bg-zinc-900 disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
