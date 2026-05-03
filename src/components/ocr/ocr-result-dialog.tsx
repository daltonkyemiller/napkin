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
import { Icon } from "@/components/ui/icon";
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

function getDialogDescription(isLoading: boolean, error: string | null): string {
  if (isLoading) return "Extracting text from image...";
  if (error) return "Failed to extract text";
  return "Edit the extracted text below";
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
          <AlertDialogDescription>{getDialogDescription(isLoading, error)}</AlertDialogDescription>
        </AlertDialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="loader" size={32} className="animate-spin text-muted-foreground" />
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
                <Icon name="clipboard" />
                Copy
              </Button>
              <Button onClick={handleCreateTextAnnotation} disabled={!editedText.trim()}>
                <Icon name="typography" />
                Create Text
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
