import React, { useMemo, useRef, useState } from "react";
import {
  Users,
  User,
  Phone,
  Mail,
  Briefcase,
  MapPin,
  AlertCircle,
  CheckCircle,
  Search,
  X,
  PenTool,
  Upload,
  Type,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUploadLoanSignatureMutation } from "@/hooks/loans/useUploadLoanSignatureMutation";

interface Guarantor {
  id: string;
  type: "member" | "external";
  profileId?: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  occupation: string;
  address: string;
  memberSince?: string;
  savingsBalance?: number;
  signature?: {
    method?: "text" | "draw" | "upload" | null;
    text?: string | null;
    font?: string | null;
    imageUrl?: string | null;
    imagePublicId?: string | null;
    signedAt?: string | null;
  } | null;
}

interface GroupMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  savingsBalance: number;
  avatar?: string;
}

interface LoanGuarantorInfoProps {
  guarantors: Guarantor[];
  onGuarantorsChange: (guarantors: Guarantor[]) => void;
  onContinue: () => void;
  onBack: () => void;
  loanAmount: number;
  groupMembers: GroupMember[];
  currentUserId?: string | null;
}

const relationships = [
  "Family Member",
  "Friend",
  "Colleague",
  "Business Partner",
  "Neighbor",
  "Other",
];

const signatureFonts = [
  {
    label: "Classic Script",
    value: "'Brush Script MT', 'Segoe Script', cursive",
  },
  { label: "Modern Script", value: "'Segoe Print', 'Bradley Hand', cursive" },
  { label: "Elegant Serif", value: "'Georgia', 'Times New Roman', serif" },
  {
    label: "Handwritten",
    value: "'Comic Sans MS', 'Lucida Handwriting', cursive",
  },
];

export default function LoanGuarantorInfo({
  guarantors,
  onGuarantorsChange,
  onContinue,
  onBack,
  loanAmount,
  groupMembers,
  currentUserId,
}: LoanGuarantorInfoProps) {
  const { toast } = useToast();
  const uploadSignatureMutation = useUploadLoanSignatureMutation();
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGuarantorIndex, setActiveGuarantorIndex] = useState<
    number | null
  >(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureTargetIndex, setSignatureTargetIndex] = useState<
    number | null
  >(null);
  const [signatureMode, setSignatureMode] = useState<
    "text" | "draw" | "upload"
  >("text");
  const [signatureText, setSignatureText] = useState("");
  const [signatureFont, setSignatureFont] = useState(signatureFonts[0].value);
  const [signatureDate, setSignatureDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const requiredGuarantors = loanAmount >= 500000 ? 2 : 1;
  const normalizedCurrentUserId = currentUserId ? String(currentUserId) : null;

  const addGuarantor = (type: "member" | "external") => {
    const newGuarantor: Guarantor = {
      id: `guarantor_${Date.now()}`,
      type,
      name: "",
      email: "",
      phone: "",
      relationship: "",
      occupation: "",
      address: "",
    };
    onGuarantorsChange([...guarantors, newGuarantor]);
  };

  const updateGuarantor = <K extends keyof Guarantor>(
    index: number,
    field: K,
    value: Guarantor[K],
  ) => {
    const updated = [...guarantors];
    updated[index] = { ...updated[index], [field]: value };
    onGuarantorsChange(updated);
  };

  const removeGuarantor = (index: number) => {
    onGuarantorsChange(guarantors.filter((_, i) => i !== index));
  };

  const selectMemberAsGuarantor = (member: GroupMember) => {
    if (activeGuarantorIndex !== null) {
      if (normalizedCurrentUserId && member.id === normalizedCurrentUserId) {
        setSelectionError("You cannot select yourself as a guarantor.");
        return;
      }
      const selectedIds = guarantors
        .filter(
          (g, idx) =>
            g.type === "member" && g.profileId && idx !== activeGuarantorIndex,
        )
        .map((g) => String(g.profileId));
      if (selectedIds.includes(member.id)) {
        setSelectionError("This member is already selected as a guarantor.");
        return;
      }
      const updated = [...guarantors];
      updated[activeGuarantorIndex] = {
        ...updated[activeGuarantorIndex],
        profileId: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        memberSince: member.memberSince,
        savingsBalance: member.savingsBalance,
      };
      onGuarantorsChange(updated);
    }
    setShowMemberSearch(false);
    setSearchQuery("");
    setActiveGuarantorIndex(null);
    setSelectionError(null);
  };

  const openMemberSearch = (index: number) => {
    setActiveGuarantorIndex(index);
    setShowMemberSearch(true);
    setSelectionError(null);
  };

  const openSignatureModal = (index: number) => {
    const guarantor = guarantors[index];
    const signature = guarantor?.signature ?? null;
    setSignatureTargetIndex(index);
    setSignatureMode(
      (signature?.method as "text" | "draw" | "upload") || "text",
    );
    setSignatureText(signature?.text || guarantor?.name || "");
    setSignatureFont(signature?.font || signatureFonts[0].value);
    setSignatureDate(
      signature?.signedAt
        ? new Date(signature.signedAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    );
    setSignaturePreview(signature?.imageUrl || null);
    setSignatureFile(null);
    setShowSignatureModal(true);
  };

  const closeSignatureModal = () => {
    setShowSignatureModal(false);
    setSignatureTargetIndex(null);
    setSignaturePreview(null);
    setSignatureFile(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const dataUrlToFile = (dataUrl: string, filename: string) => {
    const [meta, data] = dataUrl.split(",");
    const mimeMatch = meta.match(/data:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      array[i] = binary.charCodeAt(i);
    }
    return new File([array], filename, { type: mime });
  };

  const saveSignature = async () => {
    if (signatureTargetIndex === null) return;
    const guarantor = guarantors[signatureTargetIndex];
    if (!guarantor) return;

    if (signatureMode === "text" && !signatureText.trim()) {
      toast({
        title: "Signature required",
        description: "Enter the guarantor signature text.",
        variant: "destructive",
      });
      return;
    }

    if (signatureMode === "upload" && !signatureFile) {
      toast({
        title: "Signature required",
        description: "Upload an image signature to continue.",
        variant: "destructive",
      });
      return;
    }

    setSignatureUploading(true);
    try {
      let signaturePayload: Guarantor["signature"] = {
        method: signatureMode,
        text: signatureMode === "text" ? signatureText.trim() : null,
        font: signatureMode === "text" ? signatureFont : null,
        signedAt: new Date(signatureDate).toISOString(),
      };

      if (signatureMode === "draw") {
        const canvas = canvasRef.current;
        if (!canvas) {
          throw new Error("Signature canvas is missing");
        }
        const dataUrl = canvas.toDataURL("image/png");
        const file = dataUrlToFile(dataUrl, `signature-${Date.now()}.png`);
        const upload = await uploadSignatureMutation.mutateAsync({ file });
        signaturePayload = {
          ...signaturePayload,
          imageUrl: upload.url,
          imagePublicId: upload.publicId ?? null,
        };
      }

      if (signatureMode === "upload" && signatureFile) {
        const upload = await uploadSignatureMutation.mutateAsync({
          file: signatureFile,
        });
        signaturePayload = {
          ...signaturePayload,
          imageUrl: upload.url,
          imagePublicId: upload.publicId ?? null,
        };
      }

      updateGuarantor(signatureTargetIndex, "signature", signaturePayload);
      toast({
        title: "Signature captured",
        description: "Guarantor consent has been recorded.",
      });
      closeSignatureModal();
    } catch (err) {
      toast({
        title: "Signature failed",
        description: "Unable to save the signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSignatureUploading(false);
    }
  };

  const activeSelectedId =
    activeGuarantorIndex !== null
      ? guarantors[activeGuarantorIndex]?.profileId
      : null;
  const selectedMemberIds = guarantors
    .filter(
      (g, idx) =>
        g.type === "member" && g.profileId && idx !== activeGuarantorIndex,
    )
    .map((g) => String(g.profileId));
  const selectedMemberIdSet = new Set(selectedMemberIds);

  const filteredMembers = groupMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const signatureGuarantor =
    signatureTargetIndex !== null ? guarantors[signatureTargetIndex] : null;
  const signatureStatement = useMemo(() => {
    if (!signatureGuarantor) return "";
    const name = signatureGuarantor.name || "________________________";
    const relationship = signatureGuarantor.relationship || "guarantor";
    return `I, ${name}, a ${relationship.toLowerCase()} of the above applicant hereby undertake to serve as guarantor and to indemnify Champions Revolving Contribution in the event of the applicant defaulting in the repayment of the loan amount and interest.`;
  }, [signatureGuarantor]);

  const isGuarantorComplete = (g: Guarantor) => {
    const baseComplete =
      g.name &&
      g.email &&
      g.phone &&
      g.relationship &&
      g.occupation &&
      g.address;
    if (g.type !== "external") return baseComplete;
    const signature = g.signature;
    const hasSignature =
      signature &&
      ((signature.method === "text" && Boolean(signature.text)) ||
        ((signature.method === "draw" || signature.method === "upload") &&
          Boolean(signature.imageUrl)));
    return baseComplete && Boolean(hasSignature);
  };

  const memberGuarantorIds = guarantors
    .filter((g) => g.type === "member" && g.profileId)
    .map((g) => String(g.profileId));
  const hasDuplicateMembers =
    new Set(memberGuarantorIds).size !== memberGuarantorIds.length;
  const hasSelfAsGuarantor = normalizedCurrentUserId
    ? memberGuarantorIds.includes(normalizedCurrentUserId)
    : false;

  const externalKeys = guarantors
    .filter((g) => g.type === "external")
    .map(
      (g) => `${g.email.trim().toLowerCase()}|${g.phone.replace(/\s+/g, "")}`,
    )
    .filter((key) => key !== "|");
  const hasDuplicateExternal =
    new Set(externalKeys).size !== externalKeys.length;
  const hasSelectionIssues =
    hasDuplicateMembers || hasSelfAsGuarantor || hasDuplicateExternal;

  const canContinue =
    guarantors.length >= requiredGuarantors &&
    guarantors.every(isGuarantorComplete) &&
    !hasSelectionIssues;

  React.useEffect(() => {
    if (selectionError && !hasSelectionIssues) {
      setSelectionError(null);
    }
  }, [selectionError, hasSelectionIssues]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-100 p-3 rounded-xl">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">
              Guarantor Information
            </h3>
            <p className="text-gray-500 text-sm">
              You need {requiredGuarantors} guarantor
              {requiredGuarantors > 1 ? "s" : ""} for a loan of ₦
              {loanAmount.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-indigo-600 text-2xl">
              {guarantors.filter(isGuarantorComplete).length}/
              {requiredGuarantors}
            </p>
            <p className="text-gray-500 text-xs">Complete</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-100 rounded-full w-full h-2">
          <div
            className="bg-indigo-500 rounded-full h-2 transition-all"
            style={{
              width: `${(guarantors.filter(isGuarantorComplete).length / requiredGuarantors) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Guarantor Requirements */}
      <div className="bg-blue-50 p-4 border border-blue-100 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="flex-shrink-0 mt-0.5 w-5 h-5 text-blue-600" />
          <div>
            <h4 className="mb-1 font-medium text-blue-900">
              Guarantor Requirements
            </h4>
            <ul className="space-y-1 text-blue-700 text-sm">
              <li className="flex items-start gap-2">
                <Check /> Guarantors must be active members of your cooperative
                group (preferred)
              </li>
              <li className="flex items-start gap-2">
                <Check /> External guarantors must provide valid identification
              </li>
              <li className="flex items-start gap-2">
                <Check /> Guarantors agree to repay the loan if you default
              </li>
              <li className="flex items-start gap-2">
                <Check /> Each guarantor will be contacted for verification
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Guarantor Cards */}
      <div className="space-y-4">
        {guarantors.map((guarantor, index) => (
          <div
            key={guarantor.id}
            className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden"
          >
            <div className="flex justify-between items-center bg-gray-50 p-4 border-gray-100 border-b">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${guarantor.type === "member" ? "bg-emerald-100" : "bg-amber-100"}`}
                >
                  <User
                    className={`w-5 h-5 ${guarantor.type === "member" ? "text-emerald-600" : "text-amber-600"}`}
                  />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    Guarantor {index + 1}
                  </h4>
                  <p className="text-gray-500 text-xs">
                    {guarantor.type === "member"
                      ? "Group Member"
                      : "External Guarantor"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isGuarantorComplete(guarantor) && (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                )}
                <button
                  onClick={() => removeGuarantor(index)}
                  className="hover:bg-red-100 p-2 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {guarantor.type === "member" && (
                <button
                  onClick={() => openMemberSearch(index)}
                  className="flex justify-center items-center gap-2 hover:bg-emerald-50 mb-4 p-3 border-2 border-emerald-300 border-dashed rounded-xl w-full text-emerald-600 transition-colors"
                >
                  <Search className="w-5 h-5" />
                  {guarantor.name ? "Change Member" : "Search Group Members"}
                </button>
              )}

              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div>
                  <label className="block mb-1 font-medium text-gray-700 text-sm">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="top-1/2 left-3 absolute w-5 h-5 text-gray-400 -translate-y-1/2" />
                    <input
                      type="text"
                      value={guarantor.name}
                      onChange={(e) =>
                        updateGuarantor(index, "name", e.target.value)
                      }
                      placeholder="Enter full name"
                      className="py-2.5 pr-4 pl-10 border border-gray-300 focus:border-indigo-500 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                      readOnly={
                        guarantor.type === "member" && !!guarantor.memberSince
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1 font-medium text-gray-700 text-sm">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="top-1/2 left-3 absolute w-5 h-5 text-gray-400 -translate-y-1/2" />
                    <input
                      type="email"
                      value={guarantor.email}
                      onChange={(e) =>
                        updateGuarantor(index, "email", e.target.value)
                      }
                      placeholder="Enter email address"
                      className="py-2.5 pr-4 pl-10 border border-gray-300 focus:border-indigo-500 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                      readOnly={
                        guarantor.type === "member" && !!guarantor.memberSince
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1 font-medium text-gray-700 text-sm">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="top-1/2 left-3 absolute w-5 h-5 text-gray-400 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={guarantor.phone}
                      onChange={(e) =>
                        updateGuarantor(index, "phone", e.target.value)
                      }
                      placeholder="Enter phone number"
                      className="py-2.5 pr-4 pl-10 border border-gray-300 focus:border-indigo-500 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                      readOnly={
                        guarantor.type === "member" && !!guarantor.memberSince
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1 font-medium text-gray-700 text-sm">
                    Relationship <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={guarantor.relationship}
                    onChange={(e) =>
                      updateGuarantor(index, "relationship", e.target.value)
                    }
                    className="px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                  >
                    <option value="">Select relationship</option>
                    {relationships.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium text-gray-700 text-sm">
                    Occupation <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="top-1/2 left-3 absolute w-5 h-5 text-gray-400 -translate-y-1/2" />
                    <input
                      type="text"
                      value={guarantor.occupation}
                      onChange={(e) =>
                        updateGuarantor(index, "occupation", e.target.value)
                      }
                      placeholder="Enter occupation"
                      className="py-2.5 pr-4 pl-10 border border-gray-300 focus:border-indigo-500 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-1 font-medium text-gray-700 text-sm">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="top-3 left-3 absolute w-5 h-5 text-gray-400" />
                    <textarea
                      value={guarantor.address}
                      onChange={(e) =>
                        updateGuarantor(index, "address", e.target.value)
                      }
                      placeholder="Enter full address"
                      rows={2}
                      className="py-2.5 pr-4 pl-10 border border-gray-300 focus:border-indigo-500 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-full resize-none"
                    />
                  </div>
                </div>
              </div>

              {guarantor.type === "member" && guarantor.memberSince && (
                <div className="bg-emerald-50 mt-4 p-3 border border-emerald-100 rounded-xl">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-emerald-700">
                      Member since: {guarantor.memberSince}
                    </span>
                    <span className="font-medium text-emerald-700">
                      Savings: ₦{guarantor.savingsBalance?.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {guarantor.type === "external" && (
                <div className="mt-4 pt-4 border-gray-100 border-t">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        Guarantor Signature
                      </p>
                      <p className="text-gray-500 text-xs">
                        Consent is required before submission.
                      </p>
                    </div>
                    <button
                      onClick={() => openSignatureModal(index)}
                      className="flex items-center gap-2 hover:bg-indigo-50 px-3 py-2 border border-indigo-200 rounded-lg font-semibold text-indigo-600 text-xs"
                    >
                      <PenTool className="w-4 h-4" />
                      Guarantor Signature
                    </button>
                  </div>

                  {guarantor.signature ? (
                    <div className="bg-gray-50 mt-3 p-3 border border-gray-200 rounded-xl">
                      {guarantor.signature.method === "text" ? (
                        <p
                          className="text-gray-800 text-xl"
                          style={{
                            fontFamily:
                              guarantor.signature.font ||
                              signatureFonts[0].value,
                          }}
                        >
                          {guarantor.signature.text}
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {guarantor.signature.imageUrl ? (
                            <img
                              src={guarantor.signature.imageUrl}
                              alt="Guarantor signature"
                              className="w-auto h-16 object-contain"
                            />
                          ) : null}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-2 text-gray-500 text-xs">
                        <span>
                          Signed{" "}
                          {guarantor.signature.signedAt
                            ? new Date(
                                guarantor.signature.signedAt,
                              ).toLocaleDateString("en-NG")
                            : "—"}
                        </span>
                        <span className="uppercase">
                          {guarantor.signature.method || "signature"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-amber-600 text-xs">
                      Signature required for external guarantors.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Guarantor Buttons */}
      {guarantors.length < 3 && (
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <button
            onClick={() => addGuarantor("member")}
            className="flex justify-center items-center gap-2 hover:bg-emerald-50 p-4 border-2 border-emerald-300 border-dashed rounded-xl text-emerald-600 transition-colors"
          >
            <Users className="w-5 h-5" />
            Add Group Member as Guarantor
          </button>
          <button
            onClick={() => addGuarantor("external")}
            className="flex justify-center items-center gap-2 hover:bg-amber-50 p-4 border-2 border-amber-300 border-dashed rounded-xl text-amber-600 transition-colors"
          >
            <User className="w-5 h-5" />
            Add External Guarantor
          </button>
        </div>
      )}

      {(selectionError || hasSelectionIssues) && (
        <div className="bg-amber-50 p-4 border border-amber-200 rounded-xl text-amber-700 text-sm">
          {selectionError ||
            "Guarantors must be unique and cannot include you as the borrower."}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="bg-gray-100 hover:bg-gray-200 px-6 py-3 rounded-xl font-semibold text-gray-700 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={`px-8 py-3 rounded-xl font-semibold transition-all ${
            canContinue
              ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          Continue to Bank Details
        </button>
      </div>

      {/* Member Search Modal */}
      {showMemberSearch && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-gray-100 border-b">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Select Group Member
                </h3>
                <button
                  onClick={() => {
                    setShowMemberSearch(false);
                    setSearchQuery("");
                    setActiveGuarantorIndex(null);
                    setSelectionError(null);
                  }}
                  className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="relative">
                <Search className="top-1/2 left-3 absolute w-5 h-5 text-gray-400 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="py-2.5 pr-4 pl-10 border border-gray-300 focus:border-emerald-500 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <div className="p-8 text-gray-500 text-center">
                  No members found
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredMembers.map((member) => {
                    const isSelf =
                      normalizedCurrentUserId &&
                      member.id === normalizedCurrentUserId;
                    const isAlreadySelected = selectedMemberIdSet.has(
                      member.id,
                    );
                    const isBlocked =
                      (isSelf || isAlreadySelected) &&
                      member.id !== String(activeSelectedId || "");
                    const blockLabel = isSelf
                      ? "You"
                      : isAlreadySelected
                        ? "Already selected"
                        : null;

                    return (
                      <button
                        key={member.id}
                        onClick={() => selectMemberAsGuarantor(member)}
                        disabled={isBlocked}
                        className={`w-full p-4 flex items-center gap-4 transition-colors text-left ${
                          isBlocked
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex justify-center items-center bg-emerald-100 rounded-full w-12 h-12">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt=""
                              className="rounded-full w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-semibold text-emerald-600 text-lg">
                              {member.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {member.name}
                          </h4>
                          <p className="text-gray-500 text-sm">
                            {member.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-emerald-600 text-sm">
                            ₦{member.savingsBalance.toLocaleString()}
                          </p>
                          <p className="text-gray-500 text-xs">
                            Since {member.memberSince}
                          </p>
                          {blockLabel && (
                            <p className="font-medium text-amber-600 text-xs">
                              {blockLabel}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSignatureModal && signatureGuarantor && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-5 border-gray-100 border-b">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  Guarantor Consent Signature
                </h3>
                <p className="text-gray-500 text-sm">
                  Capture consent for {signatureGuarantor.name || "guarantor"}
                </p>
              </div>
              <button
                onClick={closeSignatureModal}
                className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-5 p-6 max-h-[70vh] overflow-y-auto">
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl text-slate-700 text-sm leading-relaxed">
                {signatureStatement}
              </div>

              <div className="gap-3 grid md:grid-cols-3">
                <div className="bg-white p-3 border border-gray-100 rounded-xl">
                  <p className="text-gray-500 text-xs">Telephone No</p>
                  <p className="mt-1 font-semibold text-gray-900 text-sm">
                    {signatureGuarantor.phone || "—"}
                  </p>
                </div>
                <div className="bg-white p-3 border border-gray-100 rounded-xl">
                  <label className="text-gray-500 text-xs">Date</label>
                  <input
                    type="date"
                    value={signatureDate}
                    onChange={(event) => setSignatureDate(event.target.value)}
                    className="mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm"
                  />
                </div>
                <div className="bg-white p-3 border border-gray-100 rounded-xl">
                  <p className="text-gray-500 text-xs">Signature Mode</p>
                  <p className="mt-1 font-semibold text-gray-900 text-sm capitalize">
                    {signatureMode}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSignatureMode("text")}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    signatureMode === "text"
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Type className="w-4 h-4" />
                  Type Signature
                </button>
                <button
                  onClick={() => setSignatureMode("draw")}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    signatureMode === "draw"
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  Draw Signature
                </button>
                <button
                  onClick={() => setSignatureMode("upload")}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    signatureMode === "upload"
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload Image
                </button>
              </div>

              {signatureMode === "text" && (
                <div className="space-y-3">
                  <div>
                    <label className="block mb-1 font-medium text-gray-700 text-sm">
                      Signature Text
                    </label>
                    <input
                      type="text"
                      value={signatureText}
                      onChange={(event) => setSignatureText(event.target.value)}
                      placeholder="Enter signature name"
                      className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700 text-sm">
                      Font Style
                    </label>
                    <select
                      value={signatureFont}
                      onChange={(event) => setSignatureFont(event.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm"
                    >
                      {signatureFonts.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-gray-50 p-4 border border-gray-200 border-dashed rounded-xl">
                    <p className="mb-2 text-gray-500 text-xs">Preview</p>
                    <p
                      className="text-gray-800 text-2xl"
                      style={{ fontFamily: signatureFont }}
                    >
                      {signatureText || signatureGuarantor.name || "Signature"}
                    </p>
                  </div>
                </div>
              )}

              {signatureMode === "draw" && (
                <div className="space-y-3">
                  <div className="bg-white p-3 border border-gray-200 rounded-xl">
                    <canvas
                      ref={canvasRef}
                      width={700}
                      height={200}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      className="bg-gray-50 rounded-lg w-full h-40 cursor-crosshair"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={clearCanvas}
                      className="font-semibold text-gray-600 hover:text-gray-900 text-xs"
                    >
                      Clear signature
                    </button>
                  </div>
                </div>
              )}

              {signatureMode === "upload" && (
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        setSignatureFile(file);
                        setSignaturePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="block w-full text-gray-600 text-sm"
                  />
                  {signaturePreview && (
                    <div className="bg-gray-50 p-3 border border-gray-200 rounded-xl">
                      <img
                        src={signaturePreview}
                        alt="Signature preview"
                        className="w-auto h-28 object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end items-center gap-2 bg-white p-4 border-gray-100 border-t">
              <button
                onClick={closeSignatureModal}
                className="hover:bg-gray-50 px-4 py-2 border border-gray-200 rounded-lg font-semibold text-gray-600 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveSignature}
                disabled={signatureUploading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2 rounded-lg font-semibold text-white text-sm"
              >
                {signatureUploading ? "Saving..." : "Save Signature"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
