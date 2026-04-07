import React, { useState, useRef } from 'react';
import { Upload, FileText, Image, X, CheckCircle, AlertCircle, Eye, RotateCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useUploadLoanDocumentsMutation } from "@/hooks/loans/useUploadLoanDocumentsMutation";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'uploaded' | 'error';
  url?: string;
  progress?: number;
  file?: File;
}

interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  required: boolean;
  acceptedTypes: string[];
  maxSize: number; // in MB
}

interface LoanDocumentUploadProps {
  documents: Document[];
  onDocumentsChange: React.Dispatch<React.SetStateAction<Document[]>>;
  onContinue: () => void;
  onBack: () => void;
  loanAmount: number;
}

const requiredDocuments: RequiredDocument[] = [
  {
    id: 'id_card',
    name: 'Valid ID Card',
    description: 'National ID, Voter\'s Card, Driver\'s License, or International Passport',
    required: true,
    acceptedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 5
  },
  {
    id: 'proof_of_address',
    name: 'Proof of Address',
    description: 'Utility bill, bank statement, or tenancy agreement (not older than 3 months)',
    required: true,
    acceptedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 5
  },
  {
    id: 'income_proof',
    name: 'Proof of Income',
    description: 'Salary slip, bank statement, or business registration certificate',
    required: true,
    acceptedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 5
  },
  {
    id: 'passport_photo',
    name: 'Passport Photograph',
    description: 'Recent passport-sized photograph with white background',
    required: true,
    acceptedTypes: ['image/jpeg', 'image/png'],
    maxSize: 2
  },
  {
    id: 'business_docs',
    name: 'Business Documents (if applicable)',
    description: 'CAC registration, business permit, or trade license',
    required: false,
    acceptedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 5
  },
  {
    id: 'collateral_docs',
    name: 'Collateral Documents (for loans above ₦500,000)',
    description: 'Property documents, vehicle papers, or asset ownership proof',
    required: false,
    acceptedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 10
  }
];

export default function LoanDocumentUpload({
  documents,
  onDocumentsChange,
  onContinue,
  onBack,
  loanAmount
}: LoanDocumentUploadProps) {
  const { toast } = useToast();
  const uploadMutation = useUploadLoanDocumentsMutation();
  const [dragActive, setDragActive] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const getDocumentForType = (docTypeId: string) => {
    return documents.find(d => d.id.startsWith(docTypeId));
  };

  const handleDrag = (e: React.DragEvent, docTypeId: string, isEnter: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(isEnter ? docTypeId : null);
  };

  const handleDrop = (e: React.DragEvent, docType: RequiredDocument) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0], docType);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, docType: RequiredDocument) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0], docType);
    }
  };

  const updateDocument = (docId: string, updater: (doc: Document) => Document) => {
    onDocumentsChange(prev => prev.map(d => d.id === docId ? updater(d) : d));
  };

  const uploadDocument = async (docId: string, file: File) => {
    updateDocument(docId, (doc) => ({ ...doc, status: 'uploading', progress: 0 }));

    try {
      const uploadedDocs = await uploadMutation.mutateAsync({
        file,
        onProgress: (percent) => {
          updateDocument(docId, (doc) => ({ ...doc, progress: percent }));
        },
      });
      const uploaded = uploadedDocs[0];

      updateDocument(docId, (doc) => {
        if (doc.url && doc.url.startsWith('blob:') && uploaded?.url && uploaded.url !== doc.url) {
          URL.revokeObjectURL(doc.url);
        }
        return {
          ...doc,
          status: 'uploaded',
          progress: 100,
          url: uploaded?.url ?? doc.url,
          type: uploaded?.type ?? doc.type,
          size: uploaded?.size ?? doc.size,
        };
      });
    } catch (err) {
      updateDocument(docId, (doc) => ({ ...doc, status: 'error' as const }));
      toast({
        title: "Upload failed",
        description: "Could not upload the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFile = async (file: File, docType: RequiredDocument) => {
    // Validate file type
    if (!docType.acceptedTypes.includes(file.type)) {
      alert(`Invalid file type. Please upload: ${docType.acceptedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > docType.maxSize * 1024 * 1024) {
      alert(`File too large. Maximum size is ${docType.maxSize}MB`);
      return;
    }

    // Create document object
    const previewUrl = URL.createObjectURL(file);
    const newDoc: Document = {
      id: `${docType.id}_${Date.now()}`,
      name: `${docType.name} - ${file.name}`,
      type: file.type,
      size: file.size,
      status: 'uploading',
      url: previewUrl,
      progress: 0,
      file
    };

    // Remove existing document of same type
    const filteredDocs = documents.filter(d => !d.id.startsWith(docType.id));
    
    // Add new document
    onDocumentsChange([...filteredDocs, newDoc]);

    await uploadDocument(newDoc.id, file);
  };

  const removeDocument = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (doc?.url && doc.url.startsWith('blob:')) {
      URL.revokeObjectURL(doc.url);
    }
    onDocumentsChange(documents.filter(d => d.id !== docId));
  };

  const retryDocument = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc?.file) {
      toast({
        title: "Cannot retry",
        description: "Original file is missing. Please re-upload the document.",
        variant: "destructive",
      });
      return;
    }
    uploadDocument(docId, doc.file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getRequiredDocs = () => {
    return requiredDocuments.filter(doc => {
      if (doc.id === 'collateral_docs') return loanAmount >= 500000;
      return doc.required;
    });
  };

  const requiredDocs = getRequiredDocs();
  const uploadedRequiredDocs = requiredDocs.filter(doc => getDocumentForType(doc.id)?.status === 'uploaded');
  const canContinue = uploadedRequiredDocs.length === requiredDocs.length;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-100 rounded-xl">
            <FileText className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Required Documents</h3>
            <p className="text-sm text-gray-500">Upload the required documents to proceed with your application</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-600">{uploadedRequiredDocs.length}/{requiredDocs.length}</p>
            <p className="text-xs text-gray-500">Uploaded</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div 
            className="bg-emerald-500 h-2 rounded-full transition-all"
            style={{ width: `${(uploadedRequiredDocs.length / requiredDocs.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Document Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requiredDocuments.map((docType) => {
          const uploadedDoc = getDocumentForType(docType.id);
          const isRequired = docType.required || (docType.id === 'collateral_docs' && loanAmount >= 500000);
          
          // Hide collateral docs for small loans
          if (docType.id === 'collateral_docs' && loanAmount < 500000) return null;

          return (
            <div
              key={docType.id}
              className={`bg-white rounded-xl border-2 transition-all ${
                dragActive === docType.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : uploadedDoc?.status === 'uploaded'
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onDragEnter={(e) => handleDrag(e, docType.id, true)}
              onDragLeave={(e) => handleDrag(e, docType.id, false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, docType)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      {docType.name}
                      {isRequired && <span className="text-red-500 text-sm">*</span>}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">{docType.description}</p>
                  </div>
                  {uploadedDoc?.status === 'uploaded' && (
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  )}
                </div>

                {uploadedDoc ? (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      {uploadedDoc.type.startsWith('image/') ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          <img src={uploadedDoc.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{uploadedDoc.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(uploadedDoc.size)}</p>
                        {uploadedDoc.status === 'uploading' && (
                          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-1 bg-emerald-500 transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, uploadedDoc.progress ?? 0))}%` }}
                            />
                          </div>
                        )}
                        {uploadedDoc.status === 'error' && (
                          <p className="mt-1 text-xs text-red-500">Upload failed. Tap retry.</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadedDoc.status === 'uploading' && (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-emerald-600">{Math.min(100, Math.max(0, uploadedDoc.progress ?? 0))}%</span>
                          </div>
                        )}
                        {uploadedDoc.status === 'error' && (
                          <button
                            onClick={() => retryDocument(uploadedDoc.id)}
                            className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors"
                            title="Retry upload"
                          >
                            <RotateCw className="w-4 h-4 text-amber-600" />
                          </button>
                        )}
                        {uploadedDoc.type.startsWith('image/') && (
                          <button
                            onClick={() => setPreviewUrl(uploadedDoc.url || null)}
                            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                        <button
                          onClick={() => removeDocument(uploadedDoc.id)}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                    <input
                      ref={(el) => fileInputRefs.current[docType.id] = el}
                      type="file"
                      accept={docType.acceptedTypes.join(',')}
                      onChange={(e) => handleFileInput(e, docType)}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Drag & drop or{' '}
                      <button
                        onClick={() => fileInputRefs.current[docType.id]?.click()}
                        className="text-emerald-600 font-medium hover:underline"
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-xs text-gray-400">
                      Max {docType.maxSize}MB • {docType.acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Important Notes */}
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 mb-1">Important Notes</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• All documents must be clear and legible</li>
              <li>• Documents should not be older than 3 months (except ID cards)</li>
              <li>• Ensure all information on documents matches your profile</li>
              <li>• Uploaded documents will be verified within 24-48 hours</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={`px-8 py-3 rounded-xl font-semibold transition-all ${
            canContinue
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          Continue to Guarantor Info
        </button>
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[85vh] rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
