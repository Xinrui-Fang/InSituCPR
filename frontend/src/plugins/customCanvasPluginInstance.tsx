// Render text on the PDF
import {
  LayerRenderStatus,
  Plugin,
  PluginOnCanvasLayerRender,
} from "@react-pdf-viewer/core";

const customCanvasPlugin = (): Plugin => {
  const onCanvasLayerRender = (e: PluginOnCanvasLayerRender) => {
    if (e.status !== LayerRenderStatus.DidRender) {
      return;
    }
    const message = "Example Text";
    const canvas = e.ele;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const fonts = ctx.font.split(" ");
    const fontSize = parseInt(fonts[0], 10);

    ctx.textAlign = "center";
    ctx.font = `${fontSize * e.scale * 4}px ${fonts[1]}`;

    ctx.fillStyle = "#CCC";
    ctx.fillText(message, centerX, 100);
  };

  return { onCanvasLayerRender };
};

const customCanvasPluginInstance = customCanvasPlugin();

export default customCanvasPluginInstance;
