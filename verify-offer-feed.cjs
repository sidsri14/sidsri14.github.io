const fs = require("fs");

const files = [
  "offers.json",
  "llms.txt",
  "implementation-packages.html",
  "request-work.html",
  "sitemap.xml",
];
for (const file of files) {
  const bytes = fs.readFileSync(file);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error(`BOM in ${file}`);
  }
}

const feed = JSON.parse(fs.readFileSync("offers.json", "utf8"));
if (feed.itemListElement.length !== 5) throw new Error("offer count is not 5");
if (feed.requestUrl !== "https://sidsri14.github.io/request-work.html") {
  throw new Error("offer feed does not declare the request URL");
}
if (!feed.contact || feed.contact.email !== "sidsri1502@gmail.com") {
  throw new Error("offer feed does not declare the contact email");
}
const urls = feed.itemListElement.map(item => item.offers.url);
for (const url of urls) {
  if (!url.startsWith("https://contra.com/")) throw new Error(`bad URL: ${url}`);
}
const alternateUrls = feed.itemListElement
  .map(item => item.alternateUrl)
  .filter(Boolean);
for (const url of alternateUrls) {
  if (!url.startsWith("https://contra.com/")) throw new Error(`bad alternate URL: ${url}`);
}

const llms = fs.readFileSync("llms.txt", "utf8");
for (const url of [...urls, ...alternateUrls, feed.requestUrl]) {
  if (!llms.includes(url)) throw new Error(`llms.txt missing: ${url}`);
}

const html = fs.readFileSync("implementation-packages.html", "utf8");
if (!html.includes("offers.json") || !html.includes("llms.txt") || !html.includes("request-work.html")) {
  throw new Error("storefront does not link the feed and request page");
}

const request = fs.readFileSync("request-work.html", "utf8");
if (!request.includes("mailto:sidsri1502@gmail.com")) {
  throw new Error("request page does not open an email");
}
if (/<script[^>]+src=/.test(request) || /<form[^>]+action=/.test(request)) {
  throw new Error("request page uses an external script or form endpoint");
}

const sitemap = fs.readFileSync("sitemap.xml", "utf8");
for (const url of ["offers.json", "llms.txt", "request-work.html"]) {
  if (!sitemap.includes(url)) throw new Error(`sitemap does not include: ${url}`);
}

const allText = files.map(file => fs.readFileSync(file, "utf8")).join("\n");
for (const bad of ["203 passing", "227 passing", "$203", "$227"]) {
  if (allText.includes(bad)) throw new Error(`superseded figure present: ${bad}`);
}
if (/\b(159|203|227)\b/.test(allText)) {
  throw new Error("public discovery files cite an attestation-pending or uncited figure");
}

console.log("PASS: 5 offers, 5 Contra URLs, no-signup email request page, no external form/script, no BOM, no superseded figures");
