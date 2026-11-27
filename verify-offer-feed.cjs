const fs = require("fs");

const files = ["offers.json", "llms.txt", "implementation-packages.html", "sitemap.xml"];
for (const file of files) {
  const bytes = fs.readFileSync(file);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error(`BOM in ${file}`);
  }
}

const feed = JSON.parse(fs.readFileSync("offers.json", "utf8"));
if (feed.itemListElement.length !== 5) throw new Error("offer count is not 5");
const urls = feed.itemListElement.map(item => item.offers.url);
for (const url of urls) {
  if (!url.startsWith("https://contra.com/")) throw new Error(`bad URL: ${url}`);
}

const llms = fs.readFileSync("llms.txt", "utf8");
for (const url of urls) {
  if (!llms.includes(url)) throw new Error(`llms.txt missing: ${url}`);
}

const html = fs.readFileSync("implementation-packages.html", "utf8");
if (!html.includes("offers.json") || !html.includes("llms.txt")) {
  throw new Error("storefront does not link the feed");
}

const sitemap = fs.readFileSync("sitemap.xml", "utf8");
if (!sitemap.includes("offers.json") || !sitemap.includes("llms.txt")) {
  throw new Error("sitemap does not include the new URLs");
}

const allText = files.map(file => fs.readFileSync(file, "utf8")).join("\n");
for (const bad of ["203 passing", "227 passing", "$203", "$227"]) {
  if (allText.includes(bad)) throw new Error(`superseded figure present: ${bad}`);
}

console.log("PASS: 5 offers, 5 Contra URLs, no BOM, no superseded figures, feed wired");
