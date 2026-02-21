import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { OnHighlightKeyword } from "@react-pdf-viewer/search";

const createDefaultLayoutPluginInstance = () => {
  return defaultLayoutPlugin({
    toolbarPlugin: {
      searchPlugin: {},
    },
  });
};

export default createDefaultLayoutPluginInstance;
