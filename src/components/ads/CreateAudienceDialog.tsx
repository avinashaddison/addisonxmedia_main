/**
 * Create-audience dialog — shared between the /app/ads Audiences tab and
 * the audience picker inside the campaign-create wizard.
 *
 * Two creation modes:
 *  - "crm"   → uploads CRM contacts (optionally filtered by tag) as a Custom
 *              Audience. Server hashes phones SHA-256 + ships to Meta.
 *  - "empty" → just creates the named audience; user fills it in later via
 *              Meta Business Manager (file upload, pixel, page engagement).
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Users, UploadCloud, Loader2, CheckCircle2, Info, Sparkles, Tag } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const TAG_OPTIONS = [
  { id: "hot",  label: "Hot leads",  color: "#FF6A1F", desc: "Score 70+" },
  { id: "warm", label: "Warm leads", color: "#FFD23F", desc: "Score 35-69" },
  { id: "cold", label: "Cold",       color: "#3C50E0", desc: "Score < 35" },
];

export const CreateAudienceDialog = ({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (audience: { id: string; name: string }) => void;
}) => {
  const [source, setSource] = useState<"crm" | "empty">("crm");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [tosError, setTosError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => api.createAdAudience({
      name: name.trim(),
      description: description.trim() || undefined,
      source,
      filter: source === "crm" && tags.length > 0 ? { tags } : undefined,
    }),
    onSuccess: (r) => {
      if (r.warning) {
        toast.warning(`${r.name} created (${r.warning})`);
      } else {
        toast.success(`${r.name} created · ${r.uploaded.toLocaleString("en-IN")} contacts uploaded${r.note ? "" : ""}`);
      }
      onCreated?.({ id: r.id, name: r.name });
      onOpenChange(false);
      // reset
      setName("");
      setDescription("");
      setTags([]);
      setSource("crm");
      setTosError(null);
    },
    onError: (e) => {
      const msg = String(e);
      // Meta's one-time TOS gate for customer-list audiences. Surface the
      // accept URL as an inline action instead of a fire-and-forget toast.
      const tosUrlMatch = msg.match(/https:\/\/business\.facebook\.com\/ads\/manage\/customaudiences\/tos\/[^\s)]+/);
      if (tosUrlMatch || /Custom Audience Terms/i.test(msg)) {
        setTosError(tosUrlMatch?.[0] ?? "https://business.facebook.com/ads/manage/customaudiences");
      } else {
        toast.error(msg);
      }
    },
  });

  const toggleTag = (id: string) =>
    setTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#3C50E0] to-[#2533A8] text-white flex items-center justify-center shadow-md">
              <Users className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <DialogTitle>Naya custom audience</DialogTitle>
              <DialogDescription className="text-foreground/70 font-medium">
                Meta pe ek audience banao · CRM contacts se ya khali
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Source picker */}
        <div className="grid grid-cols-2 gap-2 my-1">
          <button
            onClick={() => setSource("crm")}
            className={cn(
              "p-3 rounded-xl border-2 text-left transition-all",
              source === "crm" ? "border-[#3C50E0] bg-[#E4E8FF] shadow-[0_2px_0_0_#2533A8]" : "border-[#E8B968] bg-white hover:bg-[#FFF6E8]"
            )}
          >
            <div className="flex items-start gap-2">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", source === "crm" ? "bg-[#3C50E0] text-white" : "bg-[#FFF1D6] text-[#B8651A]")}>
                <UploadCloud className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-extrabold">From your CRM</p>
                <p className="text-[10px] text-foreground/60 font-medium">Upload contact phones (hashed) to Meta. Recommended.</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setSource("empty")}
            className={cn(
              "p-3 rounded-xl border-2 text-left transition-all",
              source === "empty" ? "border-[#3C50E0] bg-[#E4E8FF] shadow-[0_2px_0_0_#2533A8]" : "border-[#E8B968] bg-white hover:bg-[#FFF6E8]"
            )}
          >
            <div className="flex items-start gap-2">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", source === "empty" ? "bg-[#3C50E0] text-white" : "bg-[#FFF1D6] text-[#B8651A]")}>
                <Sparkles className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-extrabold">Empty (fill later)</p>
                <p className="text-[10px] text-foreground/60 font-medium">Create the named audience. Add users via Meta Business Manager.</p>
              </div>
            </div>
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="aud-name">Audience name</Label>
            <Input
              id="aud-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hot leads · Diwali 2026"
              autoFocus
            />
          </div>

          {source === "crm" && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Filter contacts by tag <span className="text-foreground/40 font-normal text-[11px] ml-1">(optional)</span></Label>
              <p className="text-[11px] text-foreground/60 font-medium">Skip = upload all contacts. Pick tags = only those.</p>
              <div className="flex gap-2 flex-wrap mt-1">
                {TAG_OPTIONS.map((t) => {
                  const on = tags.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[11px] font-extrabold border-2 transition flex items-center gap-1.5",
                        on ? "text-white border-transparent" : "bg-white text-foreground/70 border-[#E8B968] hover:bg-[#FFF1D6]"
                      )}
                      style={on ? { background: t.color } : {}}
                    >
                      {on && <CheckCircle2 className="w-3 h-3" strokeWidth={3} />}
                      {t.label}
                      <span className="opacity-60 text-[10px]">· {t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="aud-desc">Description <span className="text-foreground/40 font-normal text-[11px] ml-1">(optional)</span></Label>
            <Textarea
              id="aud-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              placeholder="Internal note about who's in this audience"
              rows={2}
              maxLength={200}
            />
          </div>

          {source === "crm" && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#FFF1D6] border border-[#E8B968]">
              <Info className="w-4 h-4 text-[#B8651A] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-foreground/80">
                Phones are SHA-256 hashed before they leave our server. Meta matches the hash against their user graph — they never see raw numbers. ~10 minutes for the audience size to populate.
              </p>
            </div>
          )}

          {tosError && (
            <div className="px-3 py-3 rounded-xl bg-[#FCE5F0] border-2 border-[#D4308E]/40">
              <p className="text-[12px] font-extrabold text-[#A11A6A] mb-1.5">
                ⚠ Meta Custom Audience Terms not accepted
              </p>
              <p className="text-[11px] font-medium text-foreground/80 mb-2">
                Meta requires you to accept the Custom Audience Terms once per ad account before uploading any customer list. It's a 30-second one-time consent — no fees, no commitment. After accepting, come back and click "Create audience" again.
              </p>
              <a
                href={tosError}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4308E] text-white text-[11px] font-extrabold hover:bg-[#A11A6A] transition"
              >
                Open Meta Terms in new tab →
              </a>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={create.isPending || name.trim().length < 3}
            onClick={() => create.mutate()}
          >
            {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
            Create audience
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
