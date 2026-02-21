import { DocumentLoadEvent } from "@react-pdf-viewer/core";

export interface Section {
  text: string;
  pageIndex: number;
  bbox: [number, number, number, number, number, number]; // Transformation matrix
}

/**
 * Extracts sections (e.g., "1 INTRODUCTION", "2 RELATED WORK") from a PDF document.
 * @param doc PDF document proxy from `onDocumentLoad`
 */
export const extractSections = async (
  doc: DocumentLoadEvent["doc"]
): Promise<Section[]> => {
  const sections: Section[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();

    textContent.items.forEach((item: any) => {
      const text = item.str.trim();
      if (/^\d+ [A-Z]+/.test(text)) {
        sections.push({
          text,
          pageIndex: i - 1,
          bbox: item.transform,
        });
      }
    });
  }
  console.log(sections);
  return sections;
};

/**
 * Identifies the current section based on the mouse position and extracted sections.
 * @param mouseX X-coordinate of the mouse in the PDF viewport
 * @param mouseY Y-coordinate of the mouse in the PDF viewport
 * @param pageIndex Current page index
 * @param sections List of extracted sections
 */
export const identifyCurrentSection = (
  mouseX: number,
  mouseY: number,
  pageIndex: number,
  sections: Section[]
): string | null => {
  for (const section of sections) {
    const { bbox } = section;

    if (
      section.pageIndex === pageIndex &&
      mouseX >= bbox[4] &&
      mouseX <= bbox[4] + bbox[2] &&
      mouseY >= bbox[5] &&
      mouseY <= bbox[5] + bbox[3]
    ) {
      return section.text;
    }
  }
  return null;
};
