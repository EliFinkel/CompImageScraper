const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");

const app = express();
const port = 80;

app.use(bodyParser.json());
app.use(express.static("public"));

let isScraping = false;

app.post("/scrape", async (req, res) => {
  const { url } = req.body;

  if (isScraping) {
    return res.json({ success: false, message: "Server is busy. Please try again later." });
  }

  isScraping = true;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: 60000  // Set a timeout for the browser launch
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
    );

    console.log(`Navigating to ${url}`);
    await page.goto(url, { timeout: 60000 }); // Set a timeout for page navigation
    console.log("Page loaded successfully");
    await page.click(".aspectRatioImage");
    await page.waitForSelector(".photoItems", { timeout: 60000 }); // Set a timeout for selector waiting

    const imageSources = await page.$$eval(
      ".photoItem .backgroundImageWrapper",
      (divs) => divs.map((div) => div.getAttribute("data-img-src"))
    );

    await browser.close();

    res.json({ success: true, images: imageSources });
  } catch (error) {
    console.error(`Error during scraping: ${error.message}`);
    res.status(500).json({ success: false, message: error.message }); // Return a 500 status on error
  } finally {
    isScraping = false;
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing http server.');
  server.close(() => {
    console.log('Http server closed.');
    process.exit(0);
  });
});