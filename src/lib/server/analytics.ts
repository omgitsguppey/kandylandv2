import "server-only";

export async function trackServerEvent(
    eventName: string,
    params: Record<string, any>,
    userId?: string
) {
    const measurementId = process.env.GA_MEASUREMENT_ID;
    const apiSecret = process.env.GA_API_SECRET;

    if (!measurementId || !apiSecret) {
        // Silently return in development if secrets aren't provided
        return;
    }

    try {
        const payload = {
            client_id: userId || "anonymous-server-client",
            // Use the user_id field for logged-in users to stitch sessions together
            ...(userId && { user_id: userId }),
            events: [
                {
                    name: eventName,
                    params: {
                        ...params,
                        // Override timestamp strictly with server Time
                        timestamp_micros: Date.now() * 1000,
                    },
                },
            ],
        };

        const response = await fetch(
            `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            }
        );

        if (!response.ok) {
            console.error("Failed to send GA server event", await response.text());
        }
    } catch (error) {
        console.error("GA server tracking error:", error);
    }
}
