const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const archiver = require("archiver");

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

// Serve the images.zip file from the public directory
app.use("/download", express.static(path.join(__dirname, "public")));

function extractPathSegment(url) {
  // Find the starting index of the path segment you want to extract
  const startIndex = url.indexOf(".com/") + 5;

  // Find the ending index of the path segment you want to extract
  const endIndex = url.indexOf("/", startIndex);

  // Extract the substring using the start and end indices
  const result = url.substring(startIndex, endIndex);

  return result;
}

async function download(url, filePath) {
  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      },
    });

    if (response.status === 200) {
      response.data.pipe(fs.createWriteStream(filePath));
      console.log(`Image downloaded successfully to ${filePath}`);
    } else {
      console.error(
        `Failed to download image. Status code: ${response.status}`
      );
    }
  } catch (error) {
    console.error(`Error downloading file: ${error.message}`);
  }
}

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}

app.post("/scrape", async (req, res) => {
  const { url } = req.body;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--disable-http2"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
    );

    await page.goto(url);
    await page.click(".aspectRatioImage");
    await page.waitForSelector(".photoItems", { timeout: 60000 });

    const imageSources = await page.$$eval(
      ".photoItem .backgroundImageWrapper",
      (divs) => divs.map((div) => div.getAttribute("data-img-src"))
    );

    const imagesDir = "./public/images";
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir);
    }

    for (let i = 0; i < imageSources.length; i++) {
      const imgUrl = imageSources[i];
      const filePath = path.join(imagesDir, `image${i}.jpg`);
      await download(imgUrl, filePath);
    }

    await browser.close();

    // Create a zip file of the images
    const zipFilePath = path.join(__dirname, `public/${extractPathSegment(url)}.zip`);
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      res.json({ success: true, downloadUrl: `/download/${extractPathSegment(url)}.zip` });
      // res.json({ success: true, downloadUrl: `/download/images.zip` });


      // Delete the images and directory after zip is created
      deleteFolderRecursive(imagesDir);
      console.log("Images and directory deleted successfully.");
    });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(imagesDir, false);
    await archive.finalize();
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
