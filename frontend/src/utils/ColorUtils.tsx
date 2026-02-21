// FUNCTION: getBackgroundColor
const getBackgroundColor = (label: string | null) => {
  switch (label) {
    case "Objective":
      return "rgba(255, 0, 0, 0.4)"; // Red
    case "Novelty":
      return "rgba(0, 0, 255, 0.4)"; // Blue
    case "Result":
      return "rgba(128, 0, 128, 0.4)"; // Purple
    case "Method":
      return "rgba(34, 139, 34, 0.4)"; // Greens
    default:
      return "rgba(255, 200, 0, 0.6)"; // Default
  }
};

export default getBackgroundColor;
