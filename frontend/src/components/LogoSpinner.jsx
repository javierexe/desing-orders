import React from "react";
const logo = "/images/fondotransparente.png";

export default function LogoSpinner({
  size = 96,
  color = "#e10600",
  showText = true,
  text = "Cargando…",
  className = "",
}) {
  const r = 45;
  const stroke = 7;

  return (
    <div
      className={`inline-flex flex-col items-center justify-center gap-3 ${className}`}
      style={{ "--spinner-color": color }}
    >
      <div
        className="relative grid place-items-center"
        style={{ width: size, height: size }}
        role="status"
        aria-live="polite"
        aria-label={text}
      >
        {/* Aro animado */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0"
          focusable="false"
          aria-hidden="true"
        >
          {/* pista sutil */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="currentColor"
            opacity="0.12"
            strokeWidth={stroke}
            style={{ color: "var(--spinner-color)" }}
          />
          {/* trazo animado */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth={stroke}
            className="spinner-arc"
            style={{ color: "var(--spinner-color)" }}
          />
        </svg>

        {/* Logo al centro */}
        <img
          src={logo}
          alt="3DWorld"
          style={{
            width: Math.round(size * 0.72),
            height: Math.round(size * 0.72),
            objectFit: "contain",
          }}
        />
      </div>

      {showText && (
        <span
          className="text-sm font-medium"
          style={{ color }}
        >
          {text}
        </span>
      )}

      {/* Estilos del arco (indeterminate) */}
      <style>{`
        @keyframes spin-rotate {
          100% { transform: rotate(360deg); }
        }
        @keyframes dash {
          0%   { stroke-dasharray: 1, 300; stroke-dashoffset: 0; }
          50%  { stroke-dasharray: 140, 300; stroke-dashoffset: -70; }
          100% { stroke-dasharray: 1, 300; stroke-dashoffset: -280; }
        }
        .spinner-arc {
          transform-origin: 50px 50px;
          animation: spin-rotate 2.4s linear infinite, dash 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
