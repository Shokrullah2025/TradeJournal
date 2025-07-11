import React, { useState, useRef } from "react";
import { Camera, Upload, X, User } from "lucide-react";
import toast from "react-hot-toast";

const ProfilePictureUpload = ({ user, onUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(user?.avatar_url || null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    // Upload file
    setIsUploading(true);
    const formData = new FormData();
    formData.append("profilePicture", file);

    try {
      // In a real app, this would be an API call to your backend
      // Example API call:
      /*
      const response = await fetch('/api/user/profile/picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      const avatarUrl = result.avatarUrl;
      */

      // For now, we'll simulate the upload
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate successful upload
      const avatarUrl = preview; // In real app, this would be the server URL

      // Update user context
      if (onUpdate) {
        await onUpdate({ avatar_url: avatarUrl });
      }

      toast.success("Profile picture updated successfully!");
    } catch (error) {
      toast.error("Failed to upload profile picture");
      console.error("Upload error:", error);
      setPreviewUrl(user?.avatar_url || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    try {
      // In a real app, this would be an API call to delete the picture
      // Example API call:
      /*
      const response = await fetch('/api/user/profile/picture', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      */

      // For now, we'll simulate the deletion
      await new Promise((resolve) => setTimeout(resolve, 500));

      setPreviewUrl(null);

      // Update user context
      if (onUpdate) {
        await onUpdate({ avatar_url: null });
      }

      toast.success("Profile picture removed successfully!");
    } catch (error) {
      toast.error("Failed to remove profile picture");
      console.error("Remove error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center space-x-6">
      {/* Profile Picture Display */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-12 h-12 text-gray-400" />
          )}
        </div>

        {/* Upload button overlay */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
        >
          {isUploading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Upload Controls */}
      <div className="flex flex-col space-y-2">
        <div className="flex space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Photo</span>
          </button>

          {previewUrl && (
            <button
              onClick={handleRemove}
              disabled={isUploading}
              className="btn btn-danger flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Remove</span>
            </button>
          )}
        </div>

        <p className="text-sm text-gray-500">JPG, PNG or GIF. Max size 5MB.</p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ProfilePictureUpload;
