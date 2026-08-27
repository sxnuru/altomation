"use client";

import { useState, useCallback } from "react";
import { UploadCloud, FileType2, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function FileUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const processFile = async (file: File) => {
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let data: any[] = [];

      if (ext === "csv") {
        data = await new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error),
          });
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      } else {
        toast.error("Unsupported file format");
        return;
      }

      if (data.length === 0) {
        toast.error("The uploaded file is empty");
        return;
      }

      // Call API route to process and save contacts
      const response = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contacts: data }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to import contacts");
        return;
      }

      toast.success(
        `Imported: ${result.summary.imported}, Duplicates: ${result.summary.duplicates}, Invalid: ${result.summary.invalid}`
      );
      
      // refresh the contacts table
      window.dispatchEvent(new Event("refresh-contacts"));

    } catch (error) {
      console.error(error);
      toast.error("Failed to parse file");
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed p-4 flex flex-row items-center justify-between cursor-pointer transition-colors h-20 ${
        isDragActive ? "border-primary bg-muted/50" : "border-border hover:bg-muted/20"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex items-center gap-4">
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <UploadCloud className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <h3 className="text-sm font-semibold">
            {isDragActive ? "Drop the file here..." : "Upload Contacts (CSV / Excel)"}
          </h3>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Supported formats: .csv, .xlsx, .xls
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" disabled={isUploading} className="pointer-events-none">
        Select File
      </Button>
    </div>
  );
}
