import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logoBuffer = await readFile(join(process.cwd(), "src/app/icon.png"));
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1A1C23",
          backgroundImage: "linear-gradient(135deg, #1A1C23 0%, #1E7A1B 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={160} height={160} alt="" />
        <div
          style={{
            marginTop: 32,
            fontSize: 72,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: -1,
          }}
        >
          IngeFact
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 32,
            color: "#EAF5E9",
          }}
        >
          Facturación electrónica DIAN Colombia
        </div>
      </div>
    ),
    { ...size }
  );
}
