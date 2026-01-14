import { useCallback } from "react";
import type Konva from "konva";
import { DEFAULT_FONT_FAMILY } from "@/constants";
import { useAnnotationStore } from "@/stores/annotation-store";
import { useCanvasStore } from "@/stores/canvas-store";
import type { TextAnnotation } from "@/types";

export function useInlineTextEditing(
  stageRef: React.RefObject<Konva.Stage | null>,
  imageScale: number = 1,
) {
  const { updateAnnotation, deleteAnnotations } = useAnnotationStore();
  const { selectedIds, clearSelection, setActiveTool } = useCanvasStore();

  const startInlineEdit = useCallback(
    (textAnnotation: TextAnnotation) => {
      if (!stageRef.current) return;

      const stage = stageRef.current;
      const textNode = stage.findOne(`#${textAnnotation.id}`) as Konva.Text;
      if (!textNode) return;

      textNode.hide();

      const transformer = stage.findOne("Transformer");
      if (transformer) {
        transformer.hide();
      }

      const textPosition = textNode.absolutePosition();
      const stageBox = stage.container().getBoundingClientRect();

      const areaPosition = {
        x: stageBox.left + textPosition.x,
        y: stageBox.top + textPosition.y,
      };

      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);

      textarea.value = textNode.text();
      textarea.style.position = "absolute";
      textarea.style.top = areaPosition.y + "px";
      textarea.style.left = areaPosition.x + "px";
      textarea.style.width = Math.max(textNode.width() * imageScale, 100) + "px";
      textarea.style.height = textNode.height() * imageScale + 5 + "px";
      textarea.style.fontSize = textNode.fontSize() * imageScale + "px";
      textarea.style.border = "none";
      textarea.style.padding = "0px";
      textarea.style.margin = "0px";
      textarea.style.overflow = "hidden";
      textarea.style.background = "none";
      textarea.style.outline = "none";
      textarea.style.resize = "none";
      textarea.style.lineHeight = String(textNode.lineHeight() || 1);
      textarea.style.fontFamily = textNode.fontFamily() || DEFAULT_FONT_FAMILY;
      textarea.style.transformOrigin = "left top";
      textarea.style.textAlign = textNode.align() || "left";
      textarea.style.color = textNode.fill()?.toString() || "#000000";
      textarea.style.zIndex = "9999";

      const rotation = textNode.rotation();
      let transform = "";
      if (rotation) {
        transform += "rotateZ(" + rotation + "deg)";
      }
      transform += "translateY(-2px)";
      textarea.style.transform = transform;

      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + 3 + "px";

      textarea.focus();
      textarea.select();

      function removeTextarea() {
        if (textarea.parentNode) {
          textarea.parentNode.removeChild(textarea);
        }
        window.removeEventListener("click", handleOutsideClick);
        window.removeEventListener("touchstart", handleOutsideClick);

        textNode.show();

        if (transformer && selectedIds.includes(textAnnotation.id)) {
          transformer.show();
        }

        textNode.getLayer()?.batchDraw();
      }

      function saveAndClose() {
        const newText = textarea.value.trim();
        if (newText === "") {
          deleteAnnotations([textAnnotation.id]);
          clearSelection();
        } else {
          updateAnnotation(textAnnotation.id, { text: newText });
        }
        removeTextarea();
        setActiveTool("select");
      }

      function setTextareaWidth(newWidth = 0) {
        if (!newWidth) {
          newWidth = Math.max(100, textAnnotation.text.length * textNode.fontSize());
        }
        textarea.style.width = newWidth + "px";
      }

      textarea.addEventListener("keydown", function (e) {
        e.stopPropagation();

        if (e.key === "Enter" && !e.shiftKey) {
          saveAndClose();
        }
        if (e.key === "Escape") {
          saveAndClose();
        }
      });

      textarea.addEventListener("input", function () {
        const scale = textNode.getAbsoluteScale().x;
        setTextareaWidth(textNode.width() * scale);
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + textNode.fontSize() + "px";
      });

      function handleOutsideClick(e: Event) {
        if (e.target !== textarea) {
          saveAndClose();
        }
      }

      setTimeout(() => {
        window.addEventListener("click", handleOutsideClick);
        window.addEventListener("touchstart", handleOutsideClick);
      }, 100);
    },
    [
      stageRef,
      imageScale,
      updateAnnotation,
      deleteAnnotations,
      clearSelection,
      selectedIds,
      setActiveTool,
    ],
  );

  return { startInlineEdit };
}
