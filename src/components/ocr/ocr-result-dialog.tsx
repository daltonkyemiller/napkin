import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  IconClipboardContentOutlineDuo18,
  IconLoaderOutlineDuo18,
  IconTypographyOutlineDuo18,
} from "nucleo-ui-outline-duo-18";
import { toast } from "sonner";

interface OcrResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string | null;
  isLoading: boolean;
  error: string | null;
  onCreateTextAnnotation: (text: string) => void;
  selectionPosition: { x: number; y: number } | null;
}

export function OcrResultDialog({
  open,
  onOpenChange,
  text,
  isLoading,
  error,
  onCreateTextAnnotation,
  selectionPosition,
}: OcrResultDialogProps) {
  const [editedText, setEditedText] = useState(text ?? "");

  useEffect(() => {
    if (text) {
      setEditedText(text);
    }
  }, [text]);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editedText);
      toast.success("Text copied to clipboard");
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleCreateTextAnnotation = () => {
    if (editedText.trim() && selectionPosition) {
      onCreateTextAnnotation(editedText.trim());
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>OCR Result</AlertDialogTitle>
          <AlertDialogDescription>
            {isLoading
              ? "Extracting text from image..."
              : error
                ? "Failed to extract text"
                : "Edit the extracted text below"}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <IconLoaderOutlineDuo18 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        ) : (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="min-h-[120px] w-full resize-none rounded-md border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="No text detected"
          />
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {!isLoading && !error && (
            <>
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={!editedText.trim()}
              >
                <IconClipboardContentOutlineDuo18 />
                Copy
              </Button>
              <Button onClick={handleCreateTextAnnotation} disabled={!editedText.trim()}>
                <IconTypographyOutlineDuo18 />
                Create Text
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
