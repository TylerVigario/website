import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: 36,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width={120}
          height={120}
        >
          <path
            d="M16 1 L5 12 L16 23 L27 12 Z"
            fill="none"
            stroke="#3b82c4"
            strokeWidth="3"
          />
          <path
            d="M10 8 L16 14 L22 8"
            fill="none"
            stroke="#3b82c4"
            strokeWidth="3"
          />
          <path
            d="M10 24 L16 18 L22 24"
            fill="none"
            stroke="#2e3d5f"
            strokeWidth="3"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
