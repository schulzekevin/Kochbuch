const XML_FILE_NAME = "kochbuch-export.xml";
let writableDirectoryHandle = null;

export async function createCookbookPdf(recipes) {
  const JsPdf = globalThis.jspdf?.jsPDF;
  if (!JsPdf) throw new Error("Die PDF-Bibliothek konnte nicht geladen werden.");

  const [coverIcon, ...recipeImages] = await Promise.all([
    loadImageData(new URL("../icon-512x512.png", import.meta.url).href, "circle"),
    ...recipes.map((recipe) => loadImageData(recipe.imageUrl, "landscape")),
  ]);

  const pdf = new JsPdf({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 17;
  const contentBottom = 270;

  pdf.setProperties({
    title: "Unser Kochbuch",
    subject: "Gesamtexport der Rezepte",
    creator: "Kochbuch-App",
  });

  drawCover(pdf, pageWidth, pageHeight, recipes.length, coverIcon);
  const tocPages = Math.max(1, Math.ceil(recipes.length / 34));
  for (let page = 0; page < tocPages; page += 1) {
    pdf.addPage();
    drawContentsPage(pdf, recipes, page, tocPages, margin, pageWidth);
  }

  if (!recipes.length) {
    pdf.addPage();
    pdf.setTextColor(36, 59, 54);
    pdf.setFont("times", "bold");
    pdf.setFontSize(22);
    pdf.text("Noch keine Rezepte", margin, 40);
  }

  const recipeDestinations = [];
  recipes.forEach((recipe, index) => {
    recipeDestinations.push(pdf.getNumberOfPages() + 1);
    let y = drawRecipePage(pdf, recipe, index, false, margin, pageWidth, recipeImages[index]);
    const addSection = (title) => {
      if (y + 13 > contentBottom) {
        y = drawRecipePage(pdf, recipe, index, true, margin, pageWidth);
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(36, 59, 54);
      pdf.text(title, margin, y);
      pdf.setDrawColor(217, 139, 63);
      pdf.setLineWidth(0.6);
      pdf.line(margin, y + 2, pageWidth - margin, y + 2);
      y += 9;
    };

    addSection("ZUTATEN");
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    if (!ingredients.length) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(91, 103, 98);
      pdf.text("Keine Zutaten erfasst.", margin, y);
      y += 7;
    } else {
      ingredients.forEach((ingredient) => {
        const amount = formatAmount(ingredient.amount);
        const quantity = [amount, ingredient.unit].filter(Boolean).join(" ");
        const line = [quantity, ingredient.name].filter(Boolean).join("   ");
        const lines = pdf.splitTextToSize(line || "-", pageWidth - margin * 2 - 4);
        if (y + lines.length * 5.5 > contentBottom) {
          y = drawRecipePage(pdf, recipe, index, true, margin, pageWidth);
          addSection("ZUTATEN - FORTSETZUNG");
        }
        pdf.setFillColor(217, 139, 63);
        pdf.circle(margin + 1, y - 1, 0.8, "F");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(48, 58, 53);
        pdf.text(lines, margin + 5, y);
        y += lines.length * 5.5 + 1.5;
      });
    }

    y += 3;
    addSection("ZUBEREITUNG");
    const paragraphs = String(recipe.instructions || "Keine Zubereitung erfasst.").split(/\r?\n/);
    paragraphs.forEach((paragraph) => {
      if (!paragraph.trim()) {
        y += 3;
        return;
      }
      const lines = pdf.splitTextToSize(paragraph, pageWidth - margin * 2);
      lines.forEach((line) => {
        if (y + 6 > contentBottom) {
          y = drawRecipePage(pdf, recipe, index, true, margin, pageWidth);
          addSection("ZUBEREITUNG - FORTSETZUNG");
        }
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(48, 58, 53);
        pdf.text(line, margin, y);
        y += 5.5;
      });
      y += 2;
    });
  });

  const pageCount = pdf.getNumberOfPages();
  recipeDestinations.forEach((pageNumber, index) => {
    const contentsPage = 2 + Math.floor(index / 34);
    const row = index % 34;
    const y = 57 + row * 6.35;
    pdf.setPage(contentsPage);
    pdf.link(margin, y - 4.6, pageWidth - margin * 2, 5.8, { pageNumber });
  });

  for (let page = 2; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(223, 226, 219);
    pdf.setLineWidth(0.3);
    pdf.line(margin, 281, pageWidth - margin, 281);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(112, 121, 115);
    pdf.text("UNSER KOCHBUCH", margin, 287);
    pdf.text(`${page} / ${pageCount}`, pageWidth - margin, 287, { align: "right" });
  }

  return pdf.output("blob");
}

function drawContentsPage(pdf, recipes, contentsIndex, contentsCount, margin, pageWidth) {
  const pageHeight = 297;
  const firstRecipe = contentsIndex * 34;
  const listedRecipes = recipes.slice(firstRecipe, firstRecipe + 34);

  pdf.setFillColor(253, 252, 248);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(174, 112, 54);
  pdf.text("UNSER KOCHBUCH", margin, 20);

  pdf.setFont("times", "bold");
  pdf.setFontSize(27);
  pdf.setTextColor(36, 59, 54);
  pdf.text(contentsIndex ? "Inhalt - Fortsetzung" : "Inhaltsverzeichnis", margin, 39);

  if (!recipes.length) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(105, 116, 108);
    pdf.text("Noch keine Rezepte vorhanden.", margin, 58);
  }

  listedRecipes.forEach((recipe, index) => {
    const absoluteIndex = firstRecipe + index;
    const y = 57 + index * 6.35;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(174, 112, 54);
    pdf.text(String(absoluteIndex + 1).padStart(2, "0"), margin, y);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(36, 59, 54);
    const title = pdf.splitTextToSize(recipe.title || "Ohne Titel", pageWidth - margin * 2 - 22)[0];
    pdf.text(title, margin + 12, y);

    pdf.setDrawColor(223, 226, 219);
    pdf.setLineWidth(0.25);
    pdf.setLineDashPattern([0.8, 1.2], 0);
    pdf.line(margin + 12, y + 1.7, pageWidth - margin - 13, y + 1.7);
    pdf.setLineDashPattern([], 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(105, 116, 108);
    pdf.text(String(absoluteIndex + 1), pageWidth - margin, y, { align: "right" });
  });

  if (contentsCount > 1) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(105, 116, 108);
    pdf.text(`Inhalt ${contentsIndex + 1} von ${contentsCount}`, pageWidth - margin, 276, { align: "right" });
  }
}

function drawCover(pdf, pageWidth, pageHeight, recipeCount, coverIcon) {
  pdf.setFillColor(36, 59, 54);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setFillColor(217, 139, 63);
  pdf.circle(166, 57, 36, "F");
  if (coverIcon) pdf.addImage(coverIcon.data, coverIcon.format, 144, 35, 44, 44);
  pdf.setDrawColor(248, 240, 222);
  pdf.setLineWidth(1.4);
  pdf.circle(166, 57, 27, "S");

  pdf.setTextColor(248, 240, 222);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("KOCHBUCH  /  PRIVATSAMMLUNG", 19, 23);
  pdf.setDrawColor(217, 139, 63);
  pdf.setLineWidth(1);
  pdf.line(19, 31, 71, 31);

  pdf.setFont("times", "bold");
  pdf.setFontSize(36);
  pdf.text("Unser", 19, 133);
  pdf.text("Kochbuch", 19, 151);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(219, 225, 216);
  pdf.text("Eine Sammlung guter Dinge.", 20, 163);

  pdf.setDrawColor(248, 240, 222);
  pdf.setLineWidth(0.4);
  pdf.line(19, 221, pageWidth - 19, 221);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(248, 240, 222);
  pdf.text(String(recipeCount), 20, 238);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(219, 225, 216);
  pdf.text(recipeCount === 1 ? "REZEPT" : "REZEPTE", 20, 245);
  pdf.text(
    new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(new Date()),
    pageWidth - 19,
    245,
    { align: "right" }
  );
  pdf.setFontSize(8);
  pdf.text("KOCHBUCH-APP", 20, pageHeight - 17);
}

function drawRecipePage(pdf, recipe, index, continuation, margin, pageWidth, imageData = null) {
  pdf.addPage();
  pdf.setFillColor(253, 252, 248);
  pdf.rect(0, 0, pageWidth, 297, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(174, 112, 54);
  const label = continuation ? "FORTSETZUNG" : `REZEPT ${String(index + 1).padStart(2, "0")}`;
  pdf.text(label, margin, 19);

  if (continuation) {
    pdf.setFont("times", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(36, 59, 54);
    const title = pdf.splitTextToSize(recipe.title || "Ohne Titel", pageWidth - margin * 2);
    pdf.text(title, margin, 31);
    return 39 + (title.length - 1) * 6;
  }

  pdf.setFont("times", "bold");
  pdf.setFontSize(25);
  pdf.setTextColor(36, 59, 54);
  const titleWidth = imageData ? pageWidth - margin * 2 - 39 : pageWidth - margin * 2;
  const title = pdf.splitTextToSize(recipe.title || "Ohne Titel", titleWidth);
  pdf.text(title, margin, 39);
  let y = 39 + title.length * 10;

  if (imageData) {
    pdf.setFillColor(239, 241, 233);
    pdf.roundedRect(pageWidth - margin - 34, 20, 34, 27, 2, 2, "F");
    pdf.addImage(imageData.data, imageData.format, pageWidth - margin - 34, 20, 34, 27);
  }

  pdf.setFillColor(239, 241, 233);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 15, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(36, 59, 54);
  const details = [`${recipe.servings || 1} PORTIONEN`, formatDuration(recipe).toUpperCase()].join("     /     ");
  pdf.text(details, margin + 5, y + 9.5);
  y += 24;

  const tags = Array.isArray(recipe.tags) ? recipe.tags.filter(Boolean) : [];
  if (tags.length) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(105, 116, 108);
    const tagText = pdf.splitTextToSize(tags.join("  /  "), pageWidth - margin * 2);
    pdf.text(tagText, margin, y);
    y += tagText.length * 4 + 3;
  }

  return y;
}

function formatDuration(recipe) {
  const duration = recipe.totalTimeMinutes ?? recipe.prepTimeMinutes;
  return duration === null || duration === undefined || duration === "" ? "KEINE ZEITANGABE" : `${duration} MIN`;
}

function formatAmount(amount) {
  if (amount === null || amount === undefined || amount === "") return "";
  const number = Number(amount);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(number)
    : String(amount);
}

async function loadImageData(imageUrl, shape) {
  if (!imageUrl) return null;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const imageBlob = await response.blob();
    const imageUrlObject = URL.createObjectURL(imageBlob);
    try {
      const image = new Image();
      image.src = imageUrlObject;
      await image.decode();

      const canvas = document.createElement("canvas");
      const size = shape === "circle" ? 256 : 320;
      const width = shape === "circle" ? size : 320;
      const height = shape === "circle" ? size : 240;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return null;

      if (shape === "circle") {
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        context.clip();
      }

      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const cropWidth = width / scale;
      const cropHeight = height / scale;
      const sourceX = (image.naturalWidth - cropWidth) / 2;
      const sourceY = (image.naturalHeight - cropHeight) / 2;
      context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, width, height);
      const format = shape === "circle" ? "PNG" : "JPEG";
      const mimeType = shape === "circle" ? "image/png" : "image/jpeg";
      return { data: canvas.toDataURL(mimeType, 0.78), format };
    } finally {
      URL.revokeObjectURL(imageUrlObject);
    }
  } catch (error) {
    console.warn("PDF image could not be loaded:", imageUrl, error);
    return null;
  }
}

export async function saveRecipesXml(recipes) {
  const xml = createRecipesXml(recipes);
  if (typeof window.showDirectoryPicker !== "function") {
    downloadXml(xml);
    return { savedToDirectory: false };
  }

  try {
    if (!writableDirectoryHandle) {
      const directoryPicker = window.showDirectoryPicker({
        id: "kochbuch-xml-export",
        mode: "readwrite",
        startIn: "documents",
      });
      writableDirectoryHandle = await directoryPicker;
    }

    const fileHandle = await writableDirectoryHandle.getFileHandle(XML_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(xml);
    await writable.close();
    return { savedToDirectory: true };
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    writableDirectoryHandle = null;
    downloadXml(xml);
    return { savedToDirectory: false };
  }
}

export function createRecipesXml(recipes) {
  const xmlDocument = document.implementation.createDocument(null, "kochbuch", null);
  const root = xmlDocument.documentElement;
  root.setAttribute("version", "1.0");
  root.setAttribute("exportiertAm", new Date().toISOString());

  recipes.forEach((recipe) => {
    const recipeNode = xmlDocument.createElement("rezept");
    recipeNode.setAttribute("id", String(recipe.id || ""));
    root.appendChild(recipeNode);

    const knownFields = new Set([
      "id", "title", "servings", "prepTimeMinutes", "totalTimeMinutes", "ingredients", "instructions", "imageUrl", "tags", "createdAt",
    ]);
    appendTextElement(xmlDocument, recipeNode, "titel", recipe.title);
    appendTextElement(xmlDocument, recipeNode, "portionen", recipe.servings);
    appendTextElement(xmlDocument, recipeNode, "vorbereitungszeitMinuten", recipe.prepTimeMinutes);
    appendTextElement(xmlDocument, recipeNode, "gesamtzeitMinuten", recipe.totalTimeMinutes);
    appendTextElement(xmlDocument, recipeNode, "zubereitung", recipe.instructions);
    appendTextElement(xmlDocument, recipeNode, "bildUrl", recipe.imageUrl);
    appendTextElement(xmlDocument, recipeNode, "erstelltAm", normalizeValue(recipe.createdAt));

    const ingredientsNode = xmlDocument.createElement("zutaten");
    (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).forEach((ingredient) => {
      const ingredientNode = xmlDocument.createElement("zutat");
      appendTextElement(xmlDocument, ingredientNode, "name", ingredient.name);
      appendTextElement(xmlDocument, ingredientNode, "menge", ingredient.amount);
      appendTextElement(xmlDocument, ingredientNode, "einheit", ingredient.unit);
      ingredientsNode.appendChild(ingredientNode);
    });
    recipeNode.appendChild(ingredientsNode);

    const tagsNode = xmlDocument.createElement("tags");
    (Array.isArray(recipe.tags) ? recipe.tags : []).forEach((tag) => {
      appendTextElement(xmlDocument, tagsNode, "tag", tag);
    });
    recipeNode.appendChild(tagsNode);

    const extraFields = Object.entries(recipe).filter(([key]) => !knownFields.has(key));
    if (extraFields.length) {
      const extraNode = xmlDocument.createElement("weitereFelder");
      extraFields.forEach(([key, value]) => {
        const fieldNode = xmlDocument.createElement("feld");
        fieldNode.setAttribute("name", key);
        fieldNode.textContent = normalizeValue(value);
        extraNode.appendChild(fieldNode);
      });
      recipeNode.appendChild(extraNode);
    }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(xmlDocument)}`;
}

function appendTextElement(xmlDocument, parent, name, value) {
  const element = xmlDocument.createElement(name);
  element.textContent = normalizeValue(value);
  parent.appendChild(element);
}

function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function downloadXml(xml) {
  const blobUrl = URL.createObjectURL(new Blob([xml], { type: "application/xml;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = XML_FILE_NAME;
  link.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}