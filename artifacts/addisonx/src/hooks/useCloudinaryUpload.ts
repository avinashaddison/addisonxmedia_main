/**
 * Browser-direct unsigned upload to Cloudinary.
 *
 * Why direct from browser:
 *   - Server doesn't proxy multi-MB image bytes (saves bandwidth + Render
 *     compute time)
 *   - User sees real-time upload progress via XHR's progress event
 *   - One less round trip
 *
 * Security model: we use an *unsigned* upload preset. The preset is
 * configured on Cloudinary's side with:
 *   - Folder whitelist (e.g. addisonx/ads)
 *   - Allowed formats (jpg/png/webp + mp4/mov)
 *   - Max file size
 *   - Eager transformations for thumbnails
 * Anyone with the preset name CAN upload but the preset limits what they
 * can upload, so the blast radius is bounded.
 *
 * The cloudName + uploadPreset come from GET /api/system/uploads/config
 * which reads the server env. When that endpoint reports `enabled: false`,
 * the UI falls back to URL-paste only.
 */

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";

type CloudinaryConfig = {
  enabled: boolean;
  cloudName: string | null;
  uploadPreset: string | null;
  maxImageMb: number;
  maxVideoMb: number;
};

type CloudinaryResource = "image" | "video";

export const useCloudinaryConfig = () =>
  useQuery<CloudinaryConfig>({
    queryKey: ["cloudinary-config"],
    queryFn: async () => {
      const r = await fetch("/api/system/uploads/config", { credentials: "include" });
      if (!r.ok) {
        return { enabled: false, cloudName: null, uploadPreset: null, maxImageMb: 25, maxVideoMb: 100 };
      }
      return r.json();
    },
    staleTime: 60 * 60_000, // 1 hour — env vars don't change at runtime
  });

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  resource_type: "image" | "video";
  format: string;
  width?: number;
  height?: number;
  duration?: number; // for video
  bytes: number;
};

export const useCloudinaryUpload = () => {
  const [progress, setProgress] = useState(0); // 0–100
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (
      file: File,
      config: Pick<CloudinaryConfig, "cloudName" | "uploadPreset">,
      resource: CloudinaryResource = "image"
    ): Promise<CloudinaryUploadResult> => {
      if (!config.cloudName || !config.uploadPreset) {
        throw new Error("Cloudinary not configured (CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET env vars not set on the server)");
      }

      setUploading(true);
      setError(null);
      setProgress(0);

      const url = `https://api.cloudinary.com/v1_1/${config.cloudName}/${resource}/upload`;
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", config.uploadPreset);

      // Use XMLHttpRequest so we can track upload progress (fetch doesn't expose it).
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          setUploading(false);
          try {
            const body = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
              setProgress(100);
              resolve(body as CloudinaryUploadResult);
            } else {
              const msg = body?.error?.message ?? `Upload failed (${xhr.status})`;
              setError(msg);
              reject(new Error(msg));
            }
          } catch (e) {
            setError("Invalid response from Cloudinary");
            reject(e);
          }
        };
        xhr.onerror = () => {
          setUploading(false);
          setError("Network error during upload");
          reject(new Error("Network error"));
        };
        xhr.send(form);
      });
    },
    []
  );

  return { upload, progress, uploading, error };
};
