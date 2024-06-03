const { app, BrowserWindow } = require("electron");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");

// Express server setup
const serverApp = express();
const port = 3000;

serverApp.use(bodyParser.json());
serverApp.use(express.static(path.join(__dirname, "public")));

serverApp.post("/scrape", async (req, res) => {
  const { url } = req.body;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
    );

    console.log(`Navigating to ${url}`);
    await page.goto(url);
    console.log("Page loaded successfully");
    await page.click(".aspectRatioImage");
    await page.waitForSelector(".photoItems", { timeout: 60000 });

    const imageSources = await page.$$eval(
      ".photoItem .backgroundImageWrapper",
      (divs) => divs.map((div) => div.getAttribute("data-img-src"))
    );

    await browser.close();

    res.json({ success: true, images: imageSources });
  } catch (error) {
    console.error(`Error during scraping: ${error.message}`);
    res.json({ success: false, message: error.message });
  }
});

serverApp.post("/open-images", async (req, res) => {
  const { images } = req.body;
  try {
    const open = (await import("open")).default;
    for (const imageUrl of images) {
      await open(imageUrl);
    }
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

serverApp.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Electron setup
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL(`http://localhost:${port}`);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
