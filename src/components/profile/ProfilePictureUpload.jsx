import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, User } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { compressImageToWebP } from "../../utils/image";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const AVATAR_BUCKET = "avatars";
const AVATAR_MAX_DIMENSION = 512;
const AVATAR_QUALITY = 0.85;

const ProfilePictureUpload = ({ user, onUpdate, variant = "full" }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(user?.avatarUrl || null);
  const fileInputRef = useRef(null);
  // Track the most recent local object URL so we can revoke it and avoid leaks.
  const objectUrlRef = useRef(null);

  // Keep the preview in sync when the stored avatar changes (e.g. after save).
  useEffect(() => {
    setPreviewUrl(user?.avatarUrl || null);
  }, [user?.avatarUrl]);

  // Revoke any outstanding object URL on unmount.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const setLocalPreview = (blob) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    setPreviewUrl(url);
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    // Reset the input so selecting the same file again re-triggers onChange.
    event.target.value = "";
    if (!file) return;

    if (!user?.id) {
      toast.error("You must be signed in to upload a photo.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("Image size must be 2MB or less.");
      return;
    }

    setIsUploading(true);
    try {
      // Compress + convert to WebP in the browser before uploading.
      const webpBlob = await compressImageToWebP(file, {
        maxDimension: AVATAR_MAX_DIMENSION,
        quality: AVATAR_QUALITY,
      });

      setLocalPreview(webpBlob);

      // Stored at a stable path per user so re-uploads overwrite the old file.
      const path = `${user.id}/avatar.webp`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, webpBlob, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

      // Append a version param to bust the CDN cache after an overwrite.
      const versionedUrl = `${publicUrl}?v=${Date.now()}`;

      if (onUpdate) await onUpdate({ avatarUrl: versionedUrl }, { silent: true });

      setPreviewUrl(versionedUrl);
      toast.success("Profile picture updated.");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload profile picture. Please try again.");
      setPreviewUrl(user?.avatarUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user?.id) return;
    setIsUploading(true);
    try {
      const { error: removeError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .remove([`${user.id}/avatar.webp`]);
      // A missing object is not a real failure — still clear the reference.
      if (removeError) console.warn("Avatar remove warning:", removeError.message);

      if (onUpdate) await onUpdate({ avatarUrl: "" }, { silent: true });

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPreviewUrl(null);
      toast.success("Profile picture removed.");
    } catch (error) {
      console.error("Avatar remove error:", error);
      toast.error("Failed to remove profile picture. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Compact, avatar-only variant — the avatar itself is the upload control.
  if (variant === "avatar") {
    return (
      <div className="relative flex-shrink-0" data-testid="avatar-upload">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 ring-4 ring-white dark:ring-gray-800 shadow flex items-center justify-center">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile"
              className="w-full h-full object-cover"
              data-testid="avatar-preview-img"
            />
          ) : (
            <User className="w-12 h-12 text-gray-400" />
          )}
        </div>

        {/* Click the avatar to upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
          data-testid="avatar-overlay-btn"
          aria-label="Change profile picture"
        >
          {isUploading ? (
            <div
              className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"
              data-testid="avatar-loading-spinner"
            />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Small remove badge */}
        {previewUrl && !isUploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow ring-2 ring-white dark:ring-gray-800"
            data-testid="avatar-remove-btn"
            aria-label="Remove profile picture"
            title="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="avatar-file-input"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-6" data-testid="avatar-upload">
      {/* Profile Picture Display */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center ring-2 ring-white dark:ring-gray-800 shadow">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile"
              className="w-full h-full object-cover"
              data-testid="avatar-preview-img"
            />
          ) : (
            <User className="w-12 h-12 text-gray-400" />
          )}
        </div>

        {/* Upload button overlay */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
          data-testid="avatar-overlay-btn"
          aria-label="Change profile picture"
        >
          {isUploading ? (
            <div
              className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"
              data-testid="avatar-loading-spinner"
            />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Upload Controls */}
      <div className="flex flex-col space-y-2">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="btn btn-secondary flex items-center space-x-2"
            data-testid="avatar-upload-btn"
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? "Uploading..." : "Upload Photo"}</span>
          </button>

          {previewUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isUploading}
              className="btn btn-danger flex items-center space-x-2"
              data-testid="avatar-remove-btn"
            >
              <X className="w-4 h-4" />
              <span>Remove</span>
            </button>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          JPG, PNG, GIF or WebP. Max 2MB.
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="avatar-file-input"
      />
    </div>
  );
};

export default ProfilePictureUpload;
