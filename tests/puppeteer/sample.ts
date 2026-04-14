import puppeteer from "puppeteer";

async function run() {
    console.log("Puppeteer initialized.");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("http://localhost:3000");
    console.log("Successfully navigated to local environment.");
    await browser.close();
}

run().catch(console.error);
