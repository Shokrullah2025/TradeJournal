import React, { useState, useRef, useCallback, useEffect } from "react";
import { X, Upload, ChevronUp, ChevronDown, Image as ImageIcon, Plus } from "lucide-react";
import toast from "react-hot-toast";

const MAX_IMAGES = 4;
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// Videos are explicitly blocked — only still images permitted

const compressImage = (file, maxWidth = 1200, quality = 0.8) =>
  new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".webp"),
            { type: "image/webp" }
          );
          resolve(compressed);
        },
        "image/webp",
        quality
      );
    };
    img.src = objectUrl;
  });

const TradeImageUploader = ({ images, onSave, onClose }) => {
  const [items, setItems] = useState(images.map((img, i) => ({ ...img, sortOrder: img.sortOrder ?? i })));
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.isNew && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const processFiles = useCallback(async (files) => {
    const remaining = MAX_IMAGES - items.filter((i) => !i.toDelete).length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    const toProcess = Array.from(files).slice(0, remaining);
    const results = [];

    for (const file of toProcess) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast.error(`${file.name}: only JPEG, PNG, WebP, or GIF allowed`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`${file.name}: file must be under 4MB`);
        continue;
      }
      const compressed = await compressImage(file);
      const previewUrl = URL.createObjectURL(compressed);
      results.push({
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: compressed,
        previewUrl,
        storagePath: null,
        sortOrder: items.length + results.length,
        isNew: true,
        toDelete: false,
      });
    }

    if (results.length > 0) {
      setItems((prev) => [...prev, ...results]);
    }
  }, [items]);

  const handleFileChange = (e) => {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  };

  const handleRemove = (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? item.isNew
            ? null
            : { ...item, toDelete: true }
          : item
      ).filter(Boolean)
    );
  };

  const moveItem = (index, direction) => {
    setItems((prev) => {
      const visible = prev.filter((i) => !i.toDelete);
      const newVisible = [...visible];
      const target = index + direction;
      if (target < 0 || target >= newVisible.length) return prev;
      [newVisible[index], newVisible[target]] = [newVisible[target], newVisible[index]];
      return newVisible.map((item, i) => ({ ...item, sortOrder: i }));
    });
  };

  const handleSave = () => {
    const final = items
      .filter((i) => !i.toDelete)
      .map((item, i) => ({ ...item, sortOrder: i }));
    onSave(final);
    onClose();
  };

  const visibleItems = items.filter((i) => !i.toDelete);
  const canAdd = visibleItems.length < MAX_IMAGES;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4"
      data-testid="image-uploader-modal"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Trade Screenshots
            </h3>
            <span className="text-sm text-gray-400 dark:text-gray-500">
              ({visibleItems.length}/{MAX_IMAGES})
            </span>
          </div>
          <button
            onClick={onClose}
            data-testid="image-uploader-close-btn"
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Drop zone — only shown when slots remain */}
          {canAdd && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="image-drop-zone"
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drop images here or <span className="text-blue-600 dark:text-blue-400">browse</span>
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                JPEG, PNG, WebP · Max 4MB each · Up to {MAX_IMAGES - visibleItems.length} more
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleFileChange}
                className="hidden"
                data-testid="image-file-input"
              />
            </div>
          )}

          {/* Image grid */}
          {visibleItems.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {visibleItems.map((item, index) => (
                <div
                  key={item.id}
                  className="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                  data-testid={`image-thumb-${index}`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={item.previewUrl}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Controls overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-start justify-between p-2">
                    {/* Sort buttons */}
                    <div className="flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveItem(index, -1)}
                        disabled={index === 0}
                        data-testid={`image-move-up-${index}`}
                        className="p-1 bg-white dark:bg-gray-700 rounded shadow text-gray-700 dark:text-gray-200 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveItem(index, 1)}
                        disabled={index === visibleItems.length - 1}
                        data-testid={`image-move-down-${index}`}
                        className="p-1 bg-white dark:bg-gray-700 rounded shadow text-gray-700 dark:text-gray-200 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(item.id)}
                      data-testid={`image-remove-${index}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-500 hover:bg-red-600 rounded shadow text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Sort index badge */}
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                    {index + 1}
                  </div>
                </div>
              ))}

              {/* Empty slot(s) when can add */}
              {canAdd && visibleItems.length > 0 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="image-add-slot-btn"
                  className="aspect-video rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500 mb-1" />
                  <span className="text-xs text-gray-400 dark:text-gray-500">Add image</span>
                </button>
              )}
            </div>
          )}

          {visibleItems.length === 0 && !canAdd && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
              No images added yet.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            data-testid="image-uploader-cancel-btn"
            className="btn btn-secondary text-sm px-4 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            data-testid="image-uploader-save-btn"
            className="btn btn-gradient text-sm px-4 py-1.5"
          >
            Save ({visibleItems.length} {visibleItems.length === 1 ? "image" : "images"})
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradeImageUploader;
