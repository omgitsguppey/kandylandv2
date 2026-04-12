import fs from "fs";
import path from "path";
import os from "os";

// Simple env parser to avoid external dependencies
const loadEnv = () => {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return {};
    
    const content = fs.readFileSync(envPath, "utf-8");
    const result: Record<string, string> = {};
    content.split("\n").forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            result[match[1]] = match[2].trim();
        }
    });
    return result;
};

const main = async () => {
    console.log("🔄 Starting PayPal MCP Token Refresh...");

    const env = loadEnv();
    const isProd = env["NEXT_PUBLIC_PAYPAL_ENV"] === "production";
    
    const clientId = isProd ? env["NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE"] : env["NEXT_PUBLIC_PAYPAL_CLIENT_ID_SANDBOX"];
    const secret = isProd ? env["PAYPAL_CLIENT_SECRET_LIVE"] : env["PAYPAL_CLIENT_SECRET_SANDBOX"];

    if (!clientId || !secret) {
        console.error("❌ Critical Error: Could not find PayPal credentials in .env.local");
        process.exit(1);
    }

    const authPayload = Buffer.from(`${clientId}:${secret}`).toString("base64");
    const endpoint = isProd ? "https://api-m.paypal.com/v1/oauth2/token" : "https://api-m.sandbox.paypal.com/v1/oauth2/token";

    console.log(`📡 Fetching token from ${endpoint} ...`);

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Accept-Language": "en_US",
                "Authorization": `Basic ${authPayload}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "grant_type=client_credentials"
        });

        if (!response.ok) {
            throw new Error(`Invalid response: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const accessToken = data.access_token;

        if (!accessToken) {
            throw new Error("Payload did not contain an access_token");
        }

        // Locate Antigravity MCP Config Directory
        const mcpConfigPath = path.join(os.homedir(), ".gemini", "antigravity", "mcp_config.json");
        
        if (!fs.existsSync(mcpConfigPath)) {
            console.error(`❌ Critical Error: Config not found at ${mcpConfigPath}`);
            process.exit(1);
        }

        const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, "utf-8"));
        
        if (!mcpConfig.mcpServers || !mcpConfig.mcpServers.paypal) {
            console.error("❌ Critical Error: PayPal server entry missing from mcp_config.json!");
            process.exit(1);
        }

        // Patch the environment explicitly 
        mcpConfig.mcpServers.paypal.env = {
            ...mcpConfig.mcpServers.paypal.env,
            "PAYPAL_ACCESS_TOKEN": accessToken,
            "PAYPAL_ENVIRONMENT": isProd ? "PRODUCTION" : "SANDBOX"
        };

        fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2), "utf-8");

        console.log("✅ Successfully patched PayPal MCP configuration with fresh token!");
        console.log(`⏰ Token valid for ${data.expires_in} seconds (Environment: ${isProd ? 'LIVE' : 'SANDBOX'}).`);

    } catch (e: any) {
        console.error("❌ Failed to refresh token:", e.message);
        process.exit(1);
    }
};

main();
