/**
 * Tabbed media input for the campaign wizard.
 *
 *   [ Upload ]  [ Instagram Videos ]  [ Paste URL ]
 *
 * The Upload tab does browser-direct unsigned upload to Cloudinary (see
 * useCloudinaryUpload). When CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET
 * aren't set on the server, the Upload tab is hidden — only Paste URL
 * remains so the wizard still works.
 *
 * `value` is the final media URL we hand to Meta. It can be either the
 * Cloudinary secure_url, an Instagram video URL, or a manually-pasted URL.
 */

import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Image as ImageIcon, Upload, Loader2, X, Link as LinkIcon, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCloudinaryConfig, useCloudinaryUpload, type CloudinaryUploadResult } from "@/hooks/useCloudinaryUpload";
import { toast } from "sonner";

type Mode = "upload" | "instagram" | "url";

export const AdMediaInput = ({
  value,
  onChange,
  resource = "image",
  pageId,
}: {
  value: string;
  onChange: (url: string) => void;
  resource?: "image" | "video";
  pageId?: string;
}) => {
  const configQ = useCloudinaryConfig();
  const cfg = configQ.data;
  const uploadEnabled = cfg?.enabled ?? false;

  const [mode, setMode] = useState<Mode>(
    resource === "video" && pageId ? "instagram" : (uploadEnabled ? "upload" : "url")
  );
  const [meta, setMeta] = useState<CloudinaryUploadResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { upload, progress, uploading, error } = useCloudinaryUpload();

  const maxMb = resource === "video" ? cfg?.maxVideoMb ?? 100 : cfg?.maxImageMb ?? 25;

  const { data: igData, isLoading: igLoading, error: igError } = useQuery({
    queryKey: ["instagram-videos", pageId],
    queryFn: () => api.listInstagramVideos(pageId!),
    enabled: !!(resource === "video" && pageId),
  });

  const handleFile = useCallback(
    async (file: File) => {
      if (!cfg?.enabled || !cfg.cloudName || !cfg.uploadPreset) {
        toast.error("Cloudinary not configured");
        return;
      }
      const expected = resource === "video" ? "video/" : "image/";
      if (!file.type.startsWith(expected)) {
        toast.error(`Please choose a ${resource} file (got ${file.type || "unknown"})`);
        return;
      }
      const mb = file.size / 1_000_000;
      if (mb > maxMb) {
        toast.error(`File too large: ${mb.toFixed(1)} MB. Max ${maxMb} MB.`);
        return;
      }
      try {
        const result = await upload(file, cfg, resource);
        // Auto-transform Cloudinary URLs to Meta-friendly dimensions:
        //   image: 1200×628 (1.91:1) c_fill, auto quality + format negotiation
        //   video: c_limit so Meta accepts any uploaded video without re-encoding
        // This means even a 4000×4000 source ends up delivered as 1200×628.
        const optimized = resource === "image"
          ? result.secure_url.replace("/image/upload/", "/image/upload/c_fill,g_center,w_1200,h_628,q_auto,f_auto/")
          : result.secure_url.replace("/video/upload/", "/video/upload/c_limit,w_1280,h_720,q_auto/");
        onChange(optimized);
        setMeta(result);
        const metaInfo = resource === "image" ? `${result.width}×${result.height} → 1200×628 for Meta` : `${(result.bytes / 1_000_000).toFixed(1)} MB`;
        toast.success(`Uploaded · ${metaInfo}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    },
    [cfg, resource, maxMb, upload, onChange]
  );

  const onPick = () => fileRef.current?.click();

  const showTabs = uploadEnabled || (resource === "video" && !!pageId);

  return (
    <div>
      {/* Tabs */}
      {showTabs && (
        <div className="flex gap-2 mb-3">
          {uploadEnabled && (
            <TabBtn active={mode === "upload"} onClick={() => setMode("upload")} icon={Upload} label="Upload" />
          )}
          {resource === "video" && pageId && (
            <TabBtn active={mode === "instagram"} onClick={() => setMode("instagram")} icon={ImageIcon} label="Instagram Videos" />
          )}
          <TabBtn active={mode === "url"} onClick={() => setMode("url")} icon={LinkIcon} label="Paste URL" />
        </div>
      )}

      {mode === "upload" && uploadEnabled ? (
        <div
          ref={dropZoneRef}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
            isDragging ? "border-[#FF6A1F] bg-[#FFEFE0]" : "border-[#E8B968] bg-[#FFF6E8]/40 hover:bg-[#FFF1D6]"
          )}
          onClick={onPick}
        >
          <input
            ref={fileRef}
            type="file"
            accept={resource === "video" ? "video/mp4,video/quicktime,video/*" : "image/jpeg,image/png,image/webp,image/*"}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-[#FF6A1F]" />
              <p className="text-[12px] font-extrabold">Uploading to Cloudinary…</p>
              <div className="w-full max-w-xs h-2 bg-[#FFF1D6] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#FF6A1F] to-[#FFD23F] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] text-foreground/60 tabular-nums font-medium">{progress}%</p>
            </div>
          ) : value && !value.includes("instagram") ? (
            <div className="flex flex-col items-center gap-2">
              {resource === "video" ? (
                <video src={value} className="max-h-32 rounded-lg" controls />
              ) : (
                <img src={value} alt="uploaded" className="max-h-32 rounded-lg object-contain" />
              )}
              <p className="text-[11px] text-foreground/60 font-medium truncate max-w-full">
                {meta ? `${(meta.bytes / 1_000_000).toFixed(1)} MB · ${meta.width}×${meta.height}${meta.format ? ` · ${meta.format}` : ""}` : value}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onPick(); }}
                  className="text-[11px] font-extrabold text-[#3C50E0] hover:underline"
                >Replace</button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChange(""); setMeta(null); }}
                  className="text-[11px] font-extrabold text-[#D4308E] hover:underline inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="w-12 h-12 rounded-xl bg-[#FF6A1F] text-white flex items-center justify-center">
                {resource === "video" ? <Upload className="w-5 h-5" strokeWidth={2.5} /> : <ImageIcon className="w-5 h-5" strokeWidth={2.5} />}
              </div>
              <p className="text-[13px] font-extrabold">Drag & drop or click to upload</p>
              <p className="text-[11px] text-foreground/60 font-medium">
                {resource === "video" ? `MP4 / MOV · max ${maxMb} MB` : `JPG / PNG / WebP · max ${maxMb} MB · 1200×628 recommended`}
              </p>
            </div>
          )}
          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#D4308E] font-bold">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}
        </div>
      ) : mode === "instagram" && resource === "video" && pageId ? (
        <div className="border-2 border-dashed border-[#E8B968] bg-[#FFF6E8]/20 rounded-xl p-4 transition-all">
          {igLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF6A1F]" />
              <p className="text-[11px] font-extrabold text-foreground/60">Fetching Instagram videos…</p>
            </div>
          ) : igError ? (
            <div className="flex items-center gap-2 text-[#D4308E] font-bold text-[11px] py-4">
              <AlertCircle className="w-4 h-4" />
              <span>Failed to load Instagram media. Please verify your connection.</span>
            </div>
          ) : !igData?.videos?.length ? (
            <div className="text-center py-6">
              <p className="text-[12px] font-bold text-foreground/60">No Instagram videos found.</p>
              {igData?.demo ? (
                <p className="text-[10px] text-foreground/45 mt-1">Showing demo mode fallback.</p>
              ) : (
                <p className="text-[10px] text-foreground/45 mt-1">Make sure you have uploaded videos or reels to your connected Instagram Business account.</p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[11px] text-foreground/60 font-medium mb-3">
                Select a video from your connected Instagram account {igData?.demo && <span className="text-[#FF6A1F] font-extrabold">(Demo Mode)</span>}:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                {igData.videos.map((vid: any) => {
                  const isSelected = value === vid.media_url;
                  return (
                    <div
                      key={vid.id}
                      onClick={() => onChange(vid.media_url)}
                      className={cn(
                        "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-square bg-black flex flex-col justify-between",
                        isSelected ? "border-[#FF6A1F] ring-2 ring-[#FF6A1F]/30" : "border-transparent hover:border-[#E8B968]/60"
                      )}
                    >
                      <img
                        src={vid.thumbnail_url || vid.media_url}
                        alt={vid.caption || "Instagram Video"}
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                      
                      {/* Play icon overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center group-hover:bg-[#FF6A1F] transition-colors">
                          <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#FF6A1F] text-white flex items-center justify-center shadow-md">
                          <svg className="w-3.5 h-3.5 stroke-current stroke-2" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      {/* Caption text */}
                      {vid.caption && (
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1.5 text-[9px] text-white font-medium truncate group-hover:whitespace-normal group-hover:max-h-16 overflow-hidden transition-all">
                          {vid.caption}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {value && value.includes("mixkit.co") && (
                <div className="mt-4 pt-3 border-t border-[#E8B968]/30 flex flex-col items-center">
                  <p className="text-[11px] text-foreground/60 font-bold mb-2">Selected Video Preview:</p>
                  <video src={value} className="max-h-40 rounded-lg border border-[#E8B968]" controls />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <Label htmlFor="ad-media-url" className="text-[11px] text-foreground/60 font-medium">
            {resource === "video" ? "Public video URL (MP4 recommended)" : "Public image URL"}
          </Label>
          <Input
            id="ad-media-url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={resource === "video"
              ? "https://yoursite.com/promo.mp4"
              : "https://yoursite.com/diwali-poster.jpg"}
            className="mt-1.5"
          />
          {value && (resource === "image" ? (
            <img
              src={value}
              alt="preview"
              className="mt-2 max-w-xs rounded-xl border-2 border-[#E8B968] object-cover aspect-[1.91/1]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <video src={value} className="mt-2 max-w-xs rounded-xl border-2 border-[#E8B968]" controls />
          ))}
          {!uploadEnabled && (
            <p className="text-[10px] text-foreground/50 font-medium mt-2">
              File upload disabled — admin needs to set CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET env vars to enable drag-and-drop upload.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const TabBtn = ({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: typeof Upload; label: string }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-extrabold border-2 transition-all",
      active ? "border-[#FF6A1F] bg-[#FFEFE0] text-[#B8420A]" : "border-[#E8B968] bg-white text-foreground/60"
    )}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);
