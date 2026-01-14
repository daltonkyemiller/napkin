import { useState, useEffect, useRef, useCallback, type RefObject } from "react";
import type Konva from "konva";

interface UsePanZoomParams {
  stageRef: RefObject<Konva.Stage | null>;
  panOffset: { x: number; y: number };
  setPanOffset: (offset: { x: number; y: number }) => void;
}

export function usePanZoom({ stageRef, panOffset, setPanOffset }: UsePanZoomParams) {
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        setIsSpaceHeld(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpaceHeld(false);
        setIsPanning(false);
        panStartRef.current = null;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handlePanMouseDown = useCallback(() => {
    if (!isSpaceHeld) return false;
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return false;
    setIsPanning(true);
    panStartRef.current = { x: pos.x, y: pos.y, panX: panOffset.x, panY: panOffset.y };
    return true;
  }, [isSpaceHeld, stageRef, panOffset]);

  const handlePanMouseMove = useCallback(() => {
    if (!isPanning || !panStartRef.current) return false;
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return false;
    const dx = pos.x - panStartRef.current.x;
    const dy = pos.y - panStartRef.current.y;
    setPanOffset({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
    return true;
  }, [isPanning, stageRef, setPanOffset]);

  const handlePanMouseUp = useCallback(() => {
    if (!isPanning) return false;
    setIsPanning(false);
    panStartRef.current = null;
    return true;
  }, [isPanning]);

  return {
    isSpaceHeld,
    isPanning,
    handlePanMouseDown,
    handlePanMouseMove,
    handlePanMouseUp,
  };
}
