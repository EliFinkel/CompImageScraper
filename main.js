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
     // Ensure the images section is available before extracting data
     await page.waitForSelector(".media-thumbnail-section", { timeout: 60000 });

     // Extract all image sources from the `src` attribute
     const imageSources = await page.$$eval(
       ".media-thumbnail-section img",
       (images) => images.map((img) => {
        let src = img.getAttribute("src").replace("/117/", "/112/")
        console.log(src);

        return src;
       }

     ));

    await browser.close();

    res.json({ success: true, images: imageSources });
  } catch (error) {
    console.error(`Error during scraping: ${error.message}`);
    res.json({ success: false, message: error.message });
  } finally {
    isScraping = false;
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${port}`);
});
