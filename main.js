const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");

const app = express();
const port = 80;


app.use(bodyParser.json());
app.use(express.static("public"));



app.post("/scrape", async (req, res) => {
  const { url } = req.body;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
