import { useRef } from "react";
import { type ChangeEvent, type ChangeEventHandler, type KeyboardEventHandler } from "react";
import { Fuel } from "lucide-react";

type FuelLevel = "kosong" | "1/8" | "1/4" | "3/8" | "1/2" | "5/8" | "3/4" | "7/8" | "full";

interface FuelIndicatorBarProps {
  value: FuelLevel;
  onChange: ChangeEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
}

const FUEL_LEVELS: { value: FuelLevel; label: string; stroke: string; text: string }[] = [
  { value: "kosong", label: "Kosong", stroke: "stroke-error-600", text: "text-error-600" },
  { value: "1/8", label: "1/8", stroke: "stroke-error-500", text: "text-error-500" },
  { value: "1/4", label: "1/4", stroke: "stroke-error-500", text: "text-error-500" },
  { value: "3/8", label: "3/8", stroke: "stroke-accent-500", text: "text-accent-600" },
  { value: "1/2", label: "1/2", stroke: "stroke-accent-500", text: "text-accent-600" },
  { value: "5/8", label: "5/8", stroke: "stroke-success-500", text: "text-success-500" },
  { value: "3/4", label: "3/4", stroke: "stroke-success-500", text: "text-success-500" },
  { value: "7/8", label: "7/8", stroke: "stroke-success-500", text: "text-success-500" },
  { value: "full", label: "Full", stroke: "stroke-success-600", text: "text-success-600" },
];

const CX = 100;
const CY = 100;
const R = 62;
const START_ANGLE = 150;
const SEGMENT_SPAN = 30;
const TICK_ANGLES = [150, 180, 210, 240, 270, 300, 330, 360, 390];

const polar = (angleDeg: number, radius: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
};

const segmentPath = (index: number) => {
  const from = polar(START_ANGLE + index * SEGMENT_SPAN, R);
  const to = polar(START_ANGLE + (index + 1) * SEGMENT_SPAN, R);
  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} A ${R} ${R} 0 0 0 ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
};

const trackPath = (() => {
  const from = polar(START_ANGLE, R);
  const to = polar(START_ANGLE + 240, R);
  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} A ${R} ${R} 0 1 0 ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
})();

export default function FuelIndicatorBar({
  value,
  onChange,
  disabled = false,
  required = false,
  "aria-label": ariaLabel = "Level BBM",
}: FuelIndicatorBarProps) {
  const activeIndex = FUEL_LEVELS.findIndex((l) => l.value === value);
  const segmentRefs = useRef<(SVGPathElement | null)[]>([]);

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (disabled) return;

    let newIndex = activeIndex;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        newIndex = Math.min(activeIndex + 1, FUEL_LEVELS.length - 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        newIndex = Math.max(activeIndex - 1, 0);
        break;
      case "Home":
        e.preventDefault();
        newIndex = 0;
        break;
      case "End":
        e.preventDefault();
        newIndex = FUEL_LEVELS.length - 1;
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        return;
      default:
        return;
    }

    if (newIndex !== activeIndex) {
      const newValue = FUEL_LEVELS[newIndex].value;
      const syntheticEvent = {
        target: { name: "fuel_level", value: newValue, type: "button" },
        preventDefault: () => {},
        stopPropagation: () => {},
        nativeEvent: e.nativeEvent,
        currentTarget: e.currentTarget as unknown as EventTarget & HTMLButtonElement,
      } as unknown as ChangeEvent<HTMLButtonElement>;
      onChange(syntheticEvent);
      segmentRefs.current[newIndex]?.focus();
    }
  };

  const handleClick = (level: FuelLevel) => {
    if (disabled || level === value) return;
    const syntheticEvent = {
      target: { name: "fuel_level", value: level, type: "button" },
      preventDefault: () => {},
      stopPropagation: () => {},
      nativeEvent: new MouseEvent("click"),
      currentTarget: null as unknown as EventTarget & HTMLButtonElement,
    } as unknown as ChangeEvent<HTMLButtonElement>;
    onChange(syntheticEvent);
  };

  const activeLevel = FUEL_LEVELS[activeIndex];
  const needleDeg = activeIndex * 30 - 105;

  return (
    <div className={`w-full select-none ${disabled ? "opacity-50" : ""}`}>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        aria-required={required}
        onKeyDown={handleKeyDown}
        className="relative mx-auto w-40 sm:w-48"
      >
        <svg viewBox="0 0 200 148" className={`w-full h-auto ${disabled ? "pointer-events-none" : ""}`}>
          <path d={trackPath} fill="none" strokeWidth={16} strokeLinecap="round" className="stroke-black-200" pointerEvents="none" />

          {FUEL_LEVELS.map((level, index) =>
            index <= activeIndex ? (
              <path
                key={level.value}
                d={segmentPath(index)}
                fill="none"
                strokeWidth={16}
                strokeLinecap="round"
                className={`${level.stroke} transition-opacity duration-200`}
                pointerEvents="none"
              />
            ) : null
          )}

          {TICK_ANGLES.map((angle) => {
            const inner = polar(angle, R + 9);
            const outer = polar(angle, R + 15);
            return (
              <line
                key={angle}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                strokeWidth={2}
                strokeLinecap="round"
                className="stroke-black-300"
                pointerEvents="none"
              />
            );
          })}

          <g
            style={{
              transform: `rotate(${needleDeg}deg)`,
              transformOrigin: "100px 100px",
              transition: "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            pointerEvents="none"
          >
            <path d="M 100 46 L 103 84 L 100 90 L 97 84 Z" className="fill-black-900" />
          </g>
          <circle cx={CX} cy={CY} r={5.5} fill="#ffffff" strokeWidth={2.5} className="stroke-black-900" pointerEvents="none" />

          {FUEL_LEVELS.map((level, index) => {
            const isActive = value === level.value;
            return (
              <path
                key={`hit-${level.value}`}
                ref={(el) => {
                  segmentRefs.current[index] = el;
                }}
                d={segmentPath(index)}
                fill="none"
                stroke="transparent"
                strokeWidth={52}
                pointerEvents="all"
                role="radio"
                aria-checked={isActive}
                aria-label={`${level.label} ${isActive ? "(dipilih)" : ""}`}
                tabIndex={isActive || index === 0 ? 0 : -1}
                onClick={() => handleClick(level.value)}
                className={`cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500 ${isActive ? "" : "hover:opacity-60"}`}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center justify-center pt-8" aria-hidden="true">
          <Fuel className="h-4 w-4 text-black-400" />
          <span className={`mt-0.5 text-xl font-bold leading-none ${activeLevel.text}`}>{activeLevel.label}</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-black-400">BBM</span>
        </div>
      </div>

      <div className="mx-auto mt-1 flex w-40 justify-between px-1 sm:w-48">
        <span className={`text-xs leading-tight ${value === "kosong" ? "font-semibold text-error-600" : "font-medium text-black-500"}`}>
          Kosong
        </span>
        <span className={`text-xs leading-tight ${value === "full" ? "font-semibold text-success-600" : "font-medium text-black-500"}`}>
          Full
        </span>
      </div>
    </div>
  );
}