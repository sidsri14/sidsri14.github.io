#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = __dirname;
const feed = JSON.parse(fs.readFileSync(path.join(root, "offers.json"), "utf8"));

const BASE = "https://sidsri14.github.io";
const PERSON_ID = `${BASE}/#person`;
const WEBSITE_ID = `${BASE}/#website`;
const CATALOG_ID = `${BASE}/#offer-catalog`;

const person = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: feed.seller.name,
  identifier: feed.seller.identifier,
  description: feed.seller.description,
};

const website = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: BASE,
  name: "Siddharth Srivastava — API Debugging & Backend Maintenance",
  description:
    "Scoped API debugging from $150 and monthly backend maintenance from $300. Independent AI-assisted projects and open-source work from Lucknow, India. Scope and payment agreed before work.",
  inLanguage: "en",
  publisher: { "@id": PERSON_ID },
};

const services = feed.itemListElement.map((item) => {
  const service = {
    "@type": "Service",
    name: item.name,
    description: item.description,
    url: item.url,
    provider: { "@id": PERSON_ID },
    offers: {
      "@type": "Offer",
      price: item.offers.price,
      priceCurrency: item.offers.priceCurrency,
      availability: item.offers.availability,
      url: item.offers.url || item.url,
      seller: { "@id": PERSON_ID },
    },
  };
  if (item.alternateUrl) service.sameAs = item.alternateUrl;
  return service;
});

const catalog = {
  "@type": "OfferCatalog",
  "@id": CATALOG_ID,
  name: feed.name,
  description: feed.description,
  url: feed.url,
  provider: { "@id": PERSON_ID },
  itemListElement: services,
};

const products = (feed.digitalProducts || []).map((item) => ({
  "@type": "Product",
  name: item.name,
  description: item.description,
  url: item.url,
  brand: { "@type": "Brand", name: feed.seller.name },
  offers: {
    "@type": "Offer",
    price: item.offers.price,
    priceCurrency: item.offers.priceCurrency,
    availability: item.offers.availability,
    url: item.offers.url,
    seller: { "@id": PERSON_ID },
  },
  sameAs: item.source,
}));

const pages = [
  {
    file: "index.html",
    url: `${BASE}/`,
    name: "Siddharth Srivastava — API Debugging & Backend Maintenance",
    includeProducts: false,
  },
  {
    file: "implementation-packages.html",
    url: `${BASE}/implementation-packages.html`,
    name: "Shipped Implementation Fixes — Fixed-Scope Offers",
    includeProducts: true,
  },
];

const START = "<!-- STRUCTURED_DATA_START -->";
const END = "<!-- STRUCTURED_DATA_END -->";

for (const page of pages) {
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${page.url}#webpage`,
      url: page.url,
      name: page.name,
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: { "@id": CATALOG_ID },
    },
    website,
    person,
    catalog,
    ...(page.includeProducts ? products : []),
  ];
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2)
    .replace(/</g, "\\u003c");
  const block = `${START}\n<script type="application/ld+json">\n${json}\n</script>\n${END}`;
  const file = path.join(root, page.file);
  let html = fs.readFileSync(file, "utf8");
  const start = html.indexOf(START);
  const end = html.indexOf(END);
  if (start !== -1 && end !== -1 && end > start) {
    html = html.slice(0, start) + block + html.slice(end + END.length);
  } else if (html.includes("</head>")) {
    html = html.replace("</head>", `  ${block}\n  </head>`);
  } else {
    throw new Error(`${page.file} has no head element`);
  }
  fs.writeFileSync(file, html);
  console.log(`Updated structured data in ${page.file}`);
}
