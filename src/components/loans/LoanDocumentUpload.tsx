import React, { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  FileText,
  RotateCw,
  Upload,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUploadLoanDocumentsMutation } from "@/hooks/loans/useUploadLoanDocumentsMutation";
import {
  getLoanDocumentDefinition,
  inferLoanDocumentType,
  REQUIRED_LOAN_DOCUMENTS,
  type LoanDocumentType,
  type RequiredDocument,
} from "@/lib/loanDocuments";

interface Document {
  id: string;
  documentType?: LoanDocumentType | null;
  name: string;
  type: string;
  size: number;
  status: "uploading" | "uploaded" | "error";
  url?: string;
  progress?: number;
  file?: File;
}

interface LoanDocumentUploadProps {
  documents: Document[];
  onDocumentsChange: React.Dispatch<React.SetStateAction<Document[]>>;
  onContinue?: () => void;
  onBack?: () => void;
  showNavigation?: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function LoanDocumentUpload({
  documents,
  onDocumentsChange,
  onContinue,
  onBack,
  showNavigation = true,
}: LoanDocumentUploadProps) {
  const { toast } = useToast();
  const uploadMutation = useUploadLoanDocumentsMutation();
  const [dragActive, setDragActive] = useState<LoanDocumentType | null>(null);
  const [previewDocument, setPreviewDocument] = useState<{
    url: string;
    type: string;
    name: string;
  } | null>(null);
  const fileInputRefs = useRef<
    Partial<Record<LoanDocumentType, HTMLInputElement | null>>
  >({});

  const getDocumentForType = (docTypeId: LoanDocumentType) =>
    documents.find(
      (doc) =>
        inferLoanDocumentType({
          documentType: doc.documentType ?? null,
          id: doc.id,
          name: doc.name,
        }) === docTypeId,
    );

  const requiredDocs = REQUIRED_LOAN_DOCUMENTS;
  const uploadedRequiredDocs = requiredDocs.filter(
    (doc) => getDocumentForType(doc.id)?.status === "uploaded",
  );
  const canContinue = uploadedRequiredDocs.length === requiredDocs.length;

  const handleDrag = (
    e: React.DragEvent,
    docTypeId: LoanDocumentType,
    isEnter: boolean,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(isEnter ? docTypeId : null);
  };

  const updateDocument = (
    docId: string,
    updater: (doc: Document) => Document,
  ) => {
    onDocumentsChange((prev) =>
      prev.map((doc) => (doc.id === docId ? updater(doc) : doc)),
    );
  };

  const uploadDocument = async (
    docId: string,
    docType: RequiredDocument,
    file: File,
  ) => {
    updateDocument(docId, (doc) => ({
      ...doc,
      status: "uploading",
      progress: 0,
    }));

    try {
      const uploadedDocs = await uploadMutation.mutateAsync({
        file,
        documentType: docType.id,
        onProgress: (percent) => {
          updateDocument(docId, (doc) => ({ ...doc, progress: percent }));
        },
      });
      const uploaded = uploadedDocs[0];

      updateDocument(docId, (doc) => ({
        ...doc,
        documentType: uploaded?.documentType ?? doc.documentType ?? docType.id,
        name: uploaded?.name ?? docType.name,
        status: "uploaded",
        progress: 100,
        url: uploaded?.url ?? doc.url,
        type: uploaded?.type ?? doc.type,
        size: uploaded?.size ?? doc.size,
      }));
    } catch {
      updateDocument(docId, (doc) => ({ ...doc, status: "error" }));
      toast({
        title: "Upload failed",
        description: "Could not upload the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFile = async (file: File, docType: RequiredDocument) => {
    if (!docType.acceptedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `Upload ${docType.name} as ${docType.acceptedTypes
          .map((type) => type.split("/")[1].toUpperCase())
          .join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    if (file.size > docType.maxSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `${docType.name} must be ${docType.maxSize}MB or smaller.`,
        variant: "destructive",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const newDoc: Document = {
      id: `${docType.id}_${Date.now()}`,
      documentType: docType.id,
      name: docType.name,
      type: file.type,
      size: file.size,
      status: "uploading",
      url: previewUrl,
      progress: 0,
      file,
    };

    const filteredDocs = documents.filter(
      (doc) =>
        inferLoanDocumentType({
          documentType: doc.documentType ?? null,
          id: doc.id,
          name: doc.name,
        }) !== docType.id,
    );

    onDocumentsChange([...filteredDocs, newDoc]);
    await uploadDocument(newDoc.id, docType, file);
  };

  const handleDrop = (e: React.DragEvent, docType: RequiredDocument) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);

    if (e.dataTransfer.files?.[0]) {
      void handleFile(e.dataTransfer.files[0], docType);
    }
  };

  const handleFileInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: RequiredDocument,
  ) => {
    if (e.target.files?.[0]) {
      void handleFile(e.target.files[0], docType);
    }
  };

  const removeDocument = (docId: string) => {
    const doc = documents.find((item) => item.id === docId);
    if (doc?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(doc.url);
    }
    onDocumentsChange(documents.filter((doc) => doc.id !== docId));
  };

  const retryDocument = (docId: string) => {
    const doc = documents.find((item) => item.id === docId);
    if (!doc?.file) {
      toast({
        title: "Cannot retry",
        description: "Original file is missing. Please re-upload the document.",
        variant: "destructive",
      });
      return;
    }

    const docType = getLoanDocumentDefinition(doc.documentType ?? null);
    if (!docType) {
      toast({
        title: "Document type missing",
        description: "Please remove this document and upload it again.",
        variant: "destructive",
      });
      return;
    }

    void uploadDocument(docId, docType, doc.file);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-3">
            <FileText className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Required Documents
            </h3>
            <p className="text-sm text-gray-500">
              Upload the three required documents for your loan application.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-600">
              {uploadedRequiredDocs.length}/{requiredDocs.length}
            </p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
        </div>

        <div className="h-2 w-full rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-emerald-500 transition-all"
            style={{
              width: `${(uploadedRequiredDocs.length / requiredDocs.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {requiredDocs.map((docType) => {
          const uploadedDoc = getDocumentForType(docType.id);

          return (
            <div
              key={docType.id}
              className={`rounded-xl border-2 bg-white transition-all ${
                dragActive === docType.id
                  ? "border-emerald-500 bg-emerald-50"
                  : uploadedDoc?.status === "uploaded"
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-gray-200 hover:border-gray-300"
              }`}
              onDragEnter={(e) => handleDrag(e, docType.id, true)}
              onDragLeave={(e) => handleDrag(e, docType.id, false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, docType)}
            >
              <div className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="flex items-center gap-2 font-medium text-gray-900">
                      {docType.name}
                      <span className="text-sm text-red-500">*</span>
                    </h4>
                    <p className="mt-1 text-xs text-gray-500">
                      {docType.description}
                    </p>
                  </div>
                  {uploadedDoc?.status === "uploaded" && (
                    <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                  )}
                </div>

                {uploadedDoc ? (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-3">
                      {uploadedDoc.type.startsWith("image/") ? (
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-200">
                          <img
                            src={uploadedDoc.url}
                            alt={docType.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {docType.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(uploadedDoc.size)}
                        </p>
                        {uploadedDoc.status === "uploading" && (
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-1 bg-emerald-500 transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, uploadedDoc.progress ?? 0),
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                        {uploadedDoc.status === "error" && (
                          <p className="mt-1 text-xs text-red-500">
                            Upload failed. Please retry.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadedDoc.status === "uploading" && (
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                            <span className="text-xs text-emerald-600">
                              {Math.min(
                                100,
                                Math.max(0, uploadedDoc.progress ?? 0),
                              )}
                              %
                            </span>
                          </div>
                        )}
                        {uploadedDoc.status === "error" && (
                          <button
                            type="button"
                            onClick={() => retryDocument(uploadedDoc.id)}
                            className="rounded-lg p-1.5 transition-colors hover:bg-amber-100"
                            title="Retry upload"
                          >
                            <RotateCw className="h-4 w-4 text-amber-600" />
                          </button>
                        )}
                        {uploadedDoc.url && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDocument({
                                url: uploadedDoc.url || "",
                                type: uploadedDoc.type,
                                name: docType.name,
                              })
                            }
                            className="rounded-lg p-1.5 transition-colors hover:bg-gray-200"
                            title={`Preview ${docType.name}`}
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeDocument(uploadedDoc.id)}
                          className="rounded-lg p-1.5 transition-colors hover:bg-red-100"
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center">
                    <input
                      ref={(el) => {
                        fileInputRefs.current[docType.id] = el;
                      }}
                      type="file"
                      accept={docType.acceptedTypes.join(",")}
                      onChange={(e) => handleFileInput(e, docType)}
                      className="hidden"
                    />
                    <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                    <p className="mb-1 text-sm text-gray-600">
                      Drag and drop or{" "}
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[docType.id]?.click()}
                        className="font-medium text-emerald-600 hover:underline"
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-xs text-gray-400">
                      Max {docType.maxSize}MB •{" "}
                      {docType.acceptedTypes
                        .map((type) => type.split("/")[1].toUpperCase())
                        .join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h4 className="mb-1 font-medium text-amber-900">Important Notes</h4>
            <ul className="space-y-1 text-sm text-amber-700">
              <li>• Only the three required loan documents are accepted.</li>
              <li>• Proof of Address must not be older than 3 months.</li>
              <li>• Passport Photograph must be recent and on a white background.</li>
              <li>• All uploads must be clear, legible, and match your profile details.</li>
            </ul>
          </div>
        </div>
      </div>

      {showNavigation && (
        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl bg-gray-100 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-200"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className={`rounded-xl px-8 py-3 font-semibold transition-all ${
              canContinue
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600"
                : "cursor-not-allowed bg-gray-200 text-gray-500"
            }`}
          >
            Continue to Guarantor Info
          </button>
        </div>
      )}

      {previewDocument && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewDocument(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="font-semibold text-slate-900">
                  {previewDocument.name}
                </p>
                <p className="text-sm text-slate-500">
                  {previewDocument.type === "application/pdf"
                    ? "PDF preview"
                    : "Image preview"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDocument.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-slate-100 p-4">
              {previewDocument.type === "application/pdf" ? (
                <iframe
                  src={previewDocument.url}
                  title={`${previewDocument.name} preview`}
                  className="h-[75vh] w-full rounded-xl border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={previewDocument.url}
                  alt={previewDocument.name}
                  className="max-h-[75vh] w-full rounded-xl object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
