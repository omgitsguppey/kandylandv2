import { parseArgs } from "node:util";

const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
        url: {
            type: "string",
            default: "http://localhost:3000",
        },
    },
});

const targetUrl = values.url;

async function checkDeployment() {
    console.log(`Verifying deployment health at: ${targetUrl}/api/health`);
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${targetUrl}/api/health`, {
            // Use no-store to ensure we bypass any CDN caching
            cache: 'no-store',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.error(`❌ Deployment verification failed. Received status: ${response.status}`);
            try {
                const text = await response.text();
                console.error(`Response details: ${text}`);
            } catch {
                console.error(`Could not read response body.`);
            }
            process.exit(1);
        }

        const data = await response.json();
        if (data.status === "healthy") {
            console.log(`✅ Deployment is healthy!`);
            console.log(JSON.stringify(data, null, 2));
            return;
        } else {
            console.error(`❌ Deployment is running but reported unhealthy status: ${data.status}`);
            console.error(JSON.stringify(data, null, 2));
            process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Failed to connect to health endpoint at ${targetUrl}`);
        console.error(`This likely indicates the server is down or the URL is incorrect.`);
        console.error(error);
        process.exit(1);
    }
}

checkDeployment();
