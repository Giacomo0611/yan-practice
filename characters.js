/*
 * Fixed character IDs are permanent. Do not renumber existing entries.
 * Demo crops use a public-domain Wikimedia Commons image of part of the Yan Qinli Stele.
 * Source image dimensions: 384 × 654.
 */
window.CHARACTER_LIBRARY = {
  version: "0.1.0",
  title: "顏勤禮碑測試字庫",
  sourceImages: {
    commons_yan_qinli_2005: {
      url: "https://upload.wikimedia.org/wikipedia/commons/6/64/Yan_Qinli_Stele.jpg",
      width: 384,
      height: 654,
      sourcePage: "https://commons.wikimedia.org/wiki/File:Yan_Qinli_Stele.jpg",
      license: "Public Domain",
      note: "Part of Yan Qinli Stele; Wikimedia Commons public-domain file."
    }
  },
  characters: [
    {
      id: "YQL-0001",
      char: "學",
      source: "commons_yan_qinli_2005",
      crop: { x: 252, y: 0, w: 132, h: 111 },
      status: "verified-source"
    },
    {
      id: "YQL-0002",
      char: "家",
      source: "commons_yan_qinli_2005",
      crop: { x: 248, y: 102, w: 136, h: 119 },
      status: "verified-source"
    },
    {
      id: "YQL-0003",
      char: "夫",
      source: "commons_yan_qinli_2005",
      crop: { x: 249, y: 426, w: 135, h: 119 },
      status: "verified-source"
    },
    {
      id: "YQL-0004",
      char: "君",
      source: "commons_yan_qinli_2005",
      crop: { x: 250, y: 535, w: 134, h: 119 },
      status: "verified-source"
    }
  ]
};
