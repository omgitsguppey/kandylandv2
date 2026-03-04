import { ImageResponse } from "next/og";
import { getDropRaw } from "@/lib/server/drops";

export const runtime = "nodejs"; // firebase-admin requires Node.js runtime
export const alt = "KandyDrops exclusive content preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
    try {
        const drop = await getDropRaw(params.id);

        if (!drop) {
            return new ImageResponse(
                (
                    <div style={{
                        display: "flex", background: "#09090b", width: "100%", height: "100%", flexDirection: "column", alignItems: "center", justifyContent: "center"
                    }}>
                        <h1 style={{ color: "#b28cff", fontSize: 64, fontWeight: "bold" }}>Drop Not Found</h1>
                        <p style={{ color: "#a1a1aa", fontSize: 32 }}>KandyDrops</p>
                    </div>
                ),
                { ...size }
            );
        }

        // Return the custom OG Image card
        return new ImageResponse(
            (
                <div style={{
                    display: "flex", flexDirection: "column", position: "relative",
                    width: "100%", height: "100%", background: "#09090b", color: "white",
                    fontFamily: "sans-serif"
                }}>
                    {drop.imageUrl && (
                        <img
                            src={drop.imageUrl}
                            style={{
                                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                                objectFit: "cover", opacity: 0.4, filter: "blur(20px)"
                            }}
                        />
                    )}

                    <div style={{
                        display: "flex", position: "absolute", bottom: 0, left: 0, right: 0,
                        background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
                        padding: 80, flexDirection: "column"
                    }}>
                        <h1 style={{
                            fontSize: 80, fontWeight: "bolder", margin: 0, padding: 0,
                            textShadow: "0 10px 30px rgba(0,0,0,0.5)", lineHeight: 1.1
                        }}>
                            {drop.title}
                        </h1>
                        <div style={{ display: "flex", alignItems: "center", marginTop: 20 }}>
                            <div style={{
                                display: "flex", background: "rgba(236, 72, 153, 0.2)",
                                border: "2px solid rgba(236, 72, 153, 0.5)", borderRadius: 40,
                                padding: "10px 30px", fontSize: 36, fontWeight: "bold", color: "#b28cff"
                            }}>
                                Unlock for {drop.unlockCost} GD
                            </div>
                            <div style={{ marginLeft: 30, fontSize: 32, color: "#a1a1aa" }}>
                                KandyDrops Exclusive
                            </div>
                        </div>
                    </div>
                </div>
            ),
            { ...size }
        );
    } catch (e: any) {
        console.error("Failed to generate OG Image:", e);
        return new Response("Failed to generate image", { status: 500 });
    }
}
