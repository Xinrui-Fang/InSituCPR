import fs from "fs";
import path from "path";
import { getDocument, PDFDocumentProxy } from "pdfjs-dist";

async function extractPdfText(
  pdfPath: string,
  outputTxtPath: string
): Promise<void> {
  try {
    // Load the PDF document
    const pdfDocument: PDFDocumentProxy = await getDocument(pdfPath).promise;

    let allText = "";

    for (let pageIndex = 0; pageIndex < pdfDocument.numPages; pageIndex++) {
      // Get each page
      const page = await pdfDocument.getPage(pageIndex + 1);

      // Get text content
      const textContent = await page.getTextContent();

      // Extract and combine text items
      const pageText = textContent.items.map((item) => item.str).join(" ");
      allText += pageText + "\n";
    }

    // Write the extracted text to a .txt file
    fs.writeFileSync(outputTxtPath, allText, "utf8");

  } catch (error) {
    console.error("Error extracting PDF text:", error);
  }
}

// Example usage
const pdfPath = path.resolve(__dirname, "sample.pdf"); // Replace with your PDF file path
const outputTxtPath = path.resolve(__dirname, "output.txt");

extractPdfText(pdfPath, outputTxtPath);
