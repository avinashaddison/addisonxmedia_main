/**
 * Products catalog — list + create / edit / delete + image upload.
 *
 * Products published as 'active' show on the public site /biz/:slug as a grid
 * with a per-product "Order on WhatsApp" button that pre-fills the chat with
 * the product name + price.
 */

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package, Loader2, Plus, X, Trash2, Upload, ImageIcon, Edit2,
  ExternalLink, EyeOff, Eye, IndianRupee, AlertCircle,
} from "lucide-react";
import { api, type ProductDto } from "@/lib/api";
import { useCloudinaryConfig, useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ProductDraft = {
  name: string;
  description: string;
  price_inr: string;     // string for input control
  photo_url: string;
  stock: string;         // string; empty = not tracked
  category: string;
  status: "active" | "draft" | "archived";
};

const blankDraft = (): ProductDraft => ({
  name: "", description: "", price_inr: "", photo_url: "",
  stock: "", category: "", status: "active",
});

export const ProductsPage = () => {
  const qc = useQueryClient();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.getProducts(),
    staleTime: 30_000,
  });
  const { data: site } = useQuery({
    queryKey: ["site-me"],
    queryFn: () => api.getSite(),
    staleTime: 30_000,
  });

  const [editingId, setEditingId] = useState<string | null>(null);  // null = no modal, "new" = create, otherwise edit
  const isNew = editingId === "new";
  const editing = editingId && editingId !== "new" ? products.find((p) => p.id === editingId) : null;

  const publicUrl = site ? `${window.location.origin}/biz/${site.slug}` : "";

  return (
    <div className="flex-1 overflow-y-auto bg-[#FFF6E8]">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 bg-[#0E8A4B]">
            <Package className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-black leading-tight">Products</h1>
            <p className="text-[14px] text-foreground/70 font-medium mt-1">
              Your catalog — shows on your public site, customers tap "Order on WhatsApp" per product.
            </p>
          </div>
          {site && (
            <a href={`${publicUrl}#products`} target="_blank" rel="noopener noreferrer"
               className="hidden sm:inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-white border-2 border-[#E8B968] text-[12.5px] font-extrabold text-foreground shadow-[0_3px_0_0_#E8B968] hover:bg-[#FFE8C7] transition">
              <ExternalLink className="w-3.5 h-3.5" /> View on site
            </a>
          )}
          <SyncCatalogButton />
          <button
            onClick={() => setEditingId("new")}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_2px_0_0_#073D22] transition flex-shrink-0"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Add product
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total" value={String(products.length)} accent="#0E8A4B" />
          <Stat label="Active" value={String(products.filter((p) => p.status === "active").length)} accent="#0E8A4B" />
          <Stat label="Drafts" value={String(products.filter((p) => p.status === "draft").length)} accent="#FF6A1F" />
          <Stat label="Archived" value={String(products.filter((p) => p.status === "archived").length)} accent="#D4308E" />
        </div>

        {/* Grid */}
        <div className="bg-white rounded-2xl border-2 border-[#E8B968] shadow-[0_3px_0_0_#E8B968] overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center px-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#E6F7EE] flex items-center justify-center mb-3">
                <Package className="w-7 h-7 text-[#0E8A4B]" />
              </div>
              <h3 className="text-[15px] font-extrabold mb-1">No products yet</h3>
              <p className="text-[12.5px] text-foreground/60 max-w-sm mx-auto leading-relaxed mb-4">
                Add your first product — name, photo, price. We'll show it on your site with a WhatsApp order button.
              </p>
              <button
                onClick={() => setEditingId("new")}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0E8A4B] text-white font-extrabold text-[13px] shadow-[0_4px_0_0_#073D22] hover:bg-[#0A6E3C] transition"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} /> Add first product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 sm:p-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} onEdit={() => setEditingId(p.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {(isNew || editing) && (
        <ProductDialog
          initial={editing
            ? {
                name: editing.name,
                description: editing.description || "",
                price_inr: editing.price_inr || "0",
                photo_url: editing.photo_url || "",
                stock: editing.stock != null ? String(editing.stock) : "",
                category: editing.category || "",
                status: editing.status,
              }
            : blankDraft()
          }
          editingId={editing?.id ?? null}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["products"] });
            setEditingId(null);
          }}
          onDelete={editing ? async () => {
            if (!confirm(`Delete "${editing.name}"? This can't be undone.`)) return;
            try {
              await api.deleteProduct(editing.id);
              qc.invalidateQueries({ queryKey: ["products"] });
              toast.success("Product deleted");
              setEditingId(null);
            } catch (e) {
              toast.error((e as Error).message);
            }
          } : undefined}
        />
      )}
    </div>
  );
};

// ─── Product card ──────────────────────────────────────────────────────────

const ProductCard = ({ product, onEdit }: { product: ProductDto; onEdit: () => void }) => {
  const priceNum = Number(product.price_inr);
  return (
    <button
      onClick={onEdit}
      className="text-left bg-white rounded-xl border-2 border-[#E8B968]/60 hover:border-[#0E8A4B] hover:shadow-[0_3px_0_0_#0A6E3C] transition overflow-hidden group"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.photo_url ? (
          <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition"
               onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/20">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}
        {product.status !== "active" && (
          <span className={cn(
            "absolute top-2 left-2 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded text-white",
            product.status === "draft" ? "bg-[#FF6A1F]" : "bg-foreground/60"
          )}>
            {product.status}
          </span>
        )}
        {product.stock != null && Number(product.stock) === 0 && (
          <span className="absolute top-2 right-2 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-600 text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-extrabold text-[13px] leading-tight line-clamp-2">{product.name}</h4>
        <div className="flex items-center justify-between mt-1.5">
          {priceNum > 0 ? (
            <span className="text-[14px] font-black tabular-nums text-[#0E8A4B]">₹{priceNum.toLocaleString("en-IN")}</span>
          ) : (
            <span className="text-[11px] font-bold text-foreground/50">No price set</span>
          )}
          <Edit2 className="w-3.5 h-3.5 text-foreground/30 group-hover:text-[#0E8A4B] transition" />
        </div>
        {product.category && (
          <span className="inline-block mt-1.5 text-[10px] font-bold text-foreground/55 bg-[#FFF1D6] px-1.5 py-0.5 rounded">
            {product.category}
          </span>
        )}
      </div>
    </button>
  );
};

// ─── Create / Edit modal ───────────────────────────────────────────────────

const ProductDialog = ({ initial, editingId, onClose, onSaved, onDelete }: {
  initial: ProductDraft;
  editingId: string | null;     // null = create, otherwise the product id being edited
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => void;
}) => {
  const isEdit = !!editingId;
  const [draft, setDraft] = useState<ProductDraft>(initial);
  const [saving, setSaving] = useState(false);
  const { data: cloudConfig } = useCloudinaryConfig();
  const { upload, progress, uploading, error: uploadError } = useCloudinaryUpload();
  const fileRef = useRef<HTMLInputElement>(null);

  // Trap Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      price_inr: Number(draft.price_inr) || 0,
      photo_url: draft.photo_url.trim() || null,
      stock: draft.stock.trim() === "" ? null : Number(draft.stock),
      category: draft.category.trim() || null,
      status: draft.status,
    };
    if (!payload.name) {
      toast.error("Product name is required");
      return;
    }
    if (payload.price_inr < 0) {
      toast.error("Price can't be negative");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.updateProduct(editingId, payload);
        toast.success("Product saved");
      } else {
        await api.createProduct(payload);
        toast.success("Product added");
      }
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onPickFile = async (file: File) => {
    if (!cloudConfig?.enabled || !cloudConfig.cloudName || !cloudConfig.uploadPreset) {
      toast.error("Image upload not configured on the server");
      return;
    }
    if (file.size > (cloudConfig.maxImageMb || 25) * 1024 * 1024) {
      toast.error(`Image too large (max ${cloudConfig.maxImageMb}MB)`);
      return;
    }
    try {
      const res = await upload(file, { cloudName: cloudConfig.cloudName, uploadPreset: cloudConfig.uploadPreset }, "image");
      setDraft({ ...draft, photo_url: res.secure_url });
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b-2 border-[#E8B968] px-5 py-3 flex items-center justify-between">
          <h2 className="text-[15px] font-black">{isEdit ? "Edit product" : "Add product"}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-foreground/5 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Photo */}
          <div>
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/65 mb-1.5 block">Photo</label>
            <div className="flex items-start gap-3">
              <div className="w-28 h-28 rounded-xl bg-gray-100 border-2 border-[#E8B968] overflow-hidden flex-shrink-0 relative">
                {draft.photo_url ? (
                  <img src={draft.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-foreground/30">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-5 h-5 animate-spin mb-1" />
                    <span className="text-[10px] font-extrabold">{progress}%</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickFile(f); if (fileRef.current) fileRef.current.value = ""; }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#FFF1D6] hover:bg-[#FFE8C7] border border-[#E8B968] text-[12px] font-extrabold text-[#B8651A] disabled:opacity-50 transition"
                >
                  <Upload className="w-3.5 h-3.5" /> {draft.photo_url ? "Replace photo" : "Upload photo"}
                </button>
                {draft.photo_url && (
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, photo_url: "" })}
                    className="ml-2 text-[11px] font-extrabold text-[#D4308E] hover:text-[#A11A6A]"
                  >
                    Remove
                  </button>
                )}
                <p className="text-[10.5px] text-foreground/55">Square photos look best. Max {cloudConfig?.maxImageMb || 25}MB.</p>
                {uploadError && (
                  <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {uploadError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <Field label="Name *">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Basmati Rice (5 kg)"
              className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-bold"
              autoFocus
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="e.g. Premium long-grain basmati from Punjab. Aged 12 months."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-medium resize-none"
            />
          </Field>

          {/* Price + Stock + Category */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Price (INR)">
              <div className="relative">
                <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/45" strokeWidth={2.5} />
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={draft.price_inr}
                  onChange={(e) => setDraft({ ...draft, price_inr: e.target.value })}
                  placeholder="0"
                  className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-extrabold tabular-nums"
                />
              </div>
            </Field>
            <Field label="Stock">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={draft.stock}
                onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                placeholder="—"
                className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[14px] font-extrabold tabular-nums"
              />
            </Field>
            <Field label="Category">
              <input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#E8B968] focus:border-[#0E8A4B] focus:outline-none text-[13px] font-bold"
              />
            </Field>
          </div>
          <p className="text-[10.5px] text-foreground/45 -mt-2">Leave stock empty if you don't want to track inventory.</p>

          {/* Status */}
          <div>
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/65 mb-1.5 block">Visibility</label>
            <div className="grid grid-cols-3 gap-2">
              {(["active", "draft", "archived"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft({ ...draft, status: s })}
                  className={cn(
                    "h-10 rounded-lg border-2 transition text-[12px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5",
                    draft.status === s
                      ? s === "active"   ? "border-[#0E8A4B] bg-[#E6F7EE] text-[#0E8A4B]"
                      : s === "draft"    ? "border-[#FF6A1F] bg-[#FFEFE0] text-[#FF6A1F]"
                                         : "border-foreground/40 bg-foreground/5 text-foreground/70"
                      : "border-[#E8B968]/60 text-foreground/55 hover:border-[#E8B968]"
                  )}
                >
                  {s === "active" && <Eye className="w-3 h-3" />}
                  {s === "draft" && <Edit2 className="w-3 h-3" />}
                  {s === "archived" && <EyeOff className="w-3 h-3" />}
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[10.5px] text-foreground/45 mt-1.5">
              Active = visible on your site · Draft = hidden, you can edit · Archived = removed from site
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t-2 border-[#E8B968] px-5 py-3 flex items-center justify-between gap-2">
          {onDelete ? (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-white border-2 border-[#D4308E]/40 text-[#D4308E] text-[12px] font-extrabold hover:bg-[#FCE5F0] transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-10 px-3 rounded-lg text-foreground/65 text-[12px] font-extrabold hover:bg-foreground/5">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving || uploading}
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-[#0E8A4B] text-white text-[13px] font-extrabold shadow-[0_3px_0_0_#073D22] hover:bg-[#0A6E3C] active:translate-y-0.5 active:shadow-[0_1px_0_0_#073D22] transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Add product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-[11px] font-extrabold uppercase tracking-wider text-foreground/65 mb-1.5 block">{label}</label>
    {children}
  </div>
);

const Stat = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <div className="p-4 rounded-xl bg-white border-2 border-[#E8B968] shadow-[0_2px_0_0_#E8B968]">
    <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: accent }}>{label}</p>
    <p className="text-[24px] font-black mt-1 leading-none tabular-nums">{value}</p>
  </div>
);

// ─── WhatsApp Catalog sync ─────────────────────────────────────────────
// One-click push of all active products to Meta's Commerce Manager catalog
// so they appear in the user's WhatsApp Business profile / catalog shortcut.
// Requires a catalog_id to be wired on the meta_config row (Admin → Meta API).

const SyncCatalogButton = () => {
  const [syncing, setSyncing] = useState(false);
  const onClick = async () => {
    if (!confirm("Sync all active products to your WhatsApp Catalog (Meta Commerce Manager)?\n\nProducts will appear in your WhatsApp Business profile.")) return;
    setSyncing(true);
    try {
      const res = await api.syncCatalogToMeta();
      if (res.failed > 0) {
        toast.warning(`Synced ${res.synced} · ${res.failed} failed — check console for details`);
        console.warn("[sync-catalog] failures:", res.results.filter((r) => !r.ok));
      } else {
        toast.success(`Synced ${res.synced} products to WhatsApp Catalog`);
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setSyncing(false); }
  };
  return (
    <button
      onClick={onClick}
      disabled={syncing}
      className="hidden md:inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-white border-2 border-[#25D366] text-[12.5px] font-extrabold text-[#075E54] shadow-[0_3px_0_0_#25D366]/40 hover:bg-[#E6FFE9] disabled:opacity-50 transition"
      title="Sync products to WhatsApp Catalog (Meta Commerce Manager)"
    >
      {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "💬"} Sync to WhatsApp
    </button>
  );
};
