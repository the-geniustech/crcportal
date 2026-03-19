import React, { useEffect, useState, useRef } from "react";
import { Camera, Upload, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateAvatarMutation } from "@/hooks/profile/useUpdateAvatarMutation";

interface ProfilePhotoUploadProps {
  currentPhotoUrl: string | null;
  userId: string;
  onPhotoUpdate: (url: string) => void;
}

const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  currentPhotoUrl,
  userId: _userId,
  onPhotoUpdate,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const updateAvatarMutation = useUpdateAvatarMutation();

  useEffect(() => {
    setPreviewUrl(currentPhotoUrl);
  }, [currentPhotoUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (JPG, PNG, GIF)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      const updatedProfile = await updateAvatarMutation.mutateAsync(file);
      const url = updatedProfile?.avatar_url || "";
      if (url) setPreviewUrl(url);
      onPhotoUpdate(url);
      toast({
        title: "Photo Updated",
        description: "Your profile photo has been updated successfully.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      setPreviewUrl(currentPhotoUrl);
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploading(true);
    try {
      await updateAvatarMutation.mutateAsync(null);

      setPreviewUrl(null);
      onPhotoUpdate("");
      toast({
        title: "Photo Removed",
        description: "Your profile photo has been removed.",
      });
    } catch (error) {
      console.error("Remove error:", error);
      toast({
        title: "Remove Failed",
        description: "Failed to remove photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = () => {
    return "U";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="group relative">
        {/* Profile Photo */}
        <div className="flex justify-center items-center bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg rounded-full w-32 h-32 overflow-hidden">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-bold text-white text-4xl">
              {getInitials()}
            </span>
          )}

          {/* Overlay */}
          {isUploading && (
            <div className="absolute inset-0 flex justify-center items-center bg-black/50 rounded-full">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Camera Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="right-0 bottom-0 absolute flex justify-center items-center bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 shadow-lg rounded-full w-10 h-10 text-white transition-colors"
        >
          <Camera className="w-5 h-5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 hover:bg-emerald-50 disabled:opacity-50 px-4 py-2 rounded-lg font-medium text-emerald-600 text-sm transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Photo
        </button>
        {previewUrl && (
          <button
            onClick={handleRemovePhoto}
            disabled={isUploading}
            className="flex items-center gap-2 hover:bg-red-50 disabled:opacity-50 px-4 py-2 rounded-lg font-medium text-red-600 text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        )}
      </div>

      <p className="mt-2 text-gray-500 text-xs">
        JPG, PNG or GIF. Max size 5MB
      </p>
    </div>
  );
};

export default ProfilePhotoUpload;
