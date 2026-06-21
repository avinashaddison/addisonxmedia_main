import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronDown, Plus, Trash2, Check, Folder, Loader2, BadgeCheck } from "lucide-react";

type ProjectSwitcherProps = {
  collapsed?: boolean;
  showLabel?: boolean;
};

export const ProjectSwitcher = ({ collapsed = false, showLabel = true }: ProjectSwitcherProps) => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [openCreate, setOpenCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.listWorkspaces(),
  });

  const workspaces = data?.workspaces ?? [];
  const activeWorkspaceId = data?.active_workspace_id;
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  // Sync active workspace to localStorage
  useEffect(() => {
    if (activeWorkspaceId) {
      localStorage.setItem("addisonx_active_workspace", activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const handleSelect = async (id: string) => {
    localStorage.setItem("addisonx_active_workspace", id);
    // Invalidate everything to refresh all tables to the new project context
    await qc.invalidateQueries();
    toast.success("Switched project context");
    navigate("/app/dashboard");
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const newWs = await api.createWorkspace(name);
      localStorage.setItem("addisonx_active_workspace", newWs.id);
      await qc.invalidateQueries();
      toast.success(`Project "${name}" created successfully`);
      setNewProjectName("");
      setOpenCreate(false);
      navigate("/app/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await api.deleteWorkspace(deletingId);
      toast.success("Project deleted successfully");
      
      // If we deleted the active project, select another one or fallback
      if (deletingId === activeWorkspaceId) {
        const remaining = workspaces.filter((w) => w.id !== deletingId);
        if (remaining.length > 0) {
          localStorage.setItem("addisonx_active_workspace", remaining[0].id);
        } else {
          localStorage.removeItem("addisonx_active_workspace");
        }
      }
      
      setDeletingId(null);
      await qc.invalidateQueries();
      navigate("/app/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-center text-muted-foreground",
        collapsed ? "w-10 h-10 mx-auto" : "h-9 w-44 px-3 border rounded-xl"
      )}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  const activeName = activeWorkspace?.name ?? "Select Project";
  const initials = activeName.charAt(0).toUpperCase();

  return (
    <>
      {collapsed ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "mx-auto w-10 h-10 rounded-xl flex items-center justify-center font-bold transition shadow-sm relative group",
                activeWorkspace?.metaConnected
                  ? "bg-gradient-to-br from-[#E6F7EE] to-[#C2F0D5] hover:from-[#C2F0D5] hover:to-[#A3E7BF] border-2 border-[#0E8A4B] text-[#0A6E3C]"
                  : "bg-gradient-to-br from-[#FFF1D6] to-[#FFE3B3] hover:from-[#FFE3B3] hover:to-[#FFD28C] border-2 border-[#E8B968] text-[#B8651A]"
              )}
              title={activeName}
            >
              {initials}
              {activeWorkspace?.metaConnected && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center text-white shadow-sm">
                  <BadgeCheck className="w-2.5 h-2.5 fill-white stroke-none" />
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 p-1.5 font-sans border-border bg-popover/95 backdrop-blur-md rounded-xl shadow-xl">
            <DropdownMenuLabel className="text-[10px] font-extrabold text-[#B8651A] uppercase tracking-wider px-2.5 py-1.5 flex items-center justify-between">
              <span>Switch Project</span>
              <span className="text-[8px] font-normal text-muted-foreground normal-case bg-muted px-1.5 py-0.5 rounded">
                {workspaces.length} active
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 bg-border/60" />
            
            {workspaces.map((w) => {
              const isSelected = w.id === activeWorkspaceId;
              const isDefault = workspaces[0]?.id === w.id;

              return (
                <DropdownMenuItem
                  key={w.id}
                  onClick={() => handleSelect(w.id)}
                  className={cn(
                    "flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-lg text-[13px] group transition-colors",
                    isSelected ? "bg-muted/40 font-medium" : "hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className={cn("w-4 h-4 text-[#B8651A] flex-shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                    <span className={cn("truncate", isSelected ? "font-bold text-foreground" : "text-muted-foreground")}>{w.name}</span>
                    {w.metaConnected && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#E6F7EE] text-[#0A6E3C] border border-[#0E8A4B]/20 flex-shrink-0">
                        <BadgeCheck className="w-3 h-3 text-[#0E8A4B] fill-current opacity-85" /> Verified Project
                      </span>
                    )}
                  </div>
                  {!isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(w.id);
                      }}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator className="my-1 bg-border/60" />
            <DropdownMenuItem
              onClick={() => setOpenCreate(true)}
              className="flex items-center gap-2 cursor-pointer py-2 px-2.5 rounded-lg text-[13px] text-[#B8651A] hover:text-[#9c5212] hover:bg-[#FFF1D6]/40 font-bold transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create New Project</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex flex-col gap-1 w-full max-w-[200px]">
          {showLabel && (
            <div className="flex items-center gap-1.5 pl-1 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B8651A] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#B8651A] font-sans">
                Project Management
              </span>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full h-10 px-3 rounded-xl bg-card border flex items-center justify-between gap-2 transition text-[13px] font-bold text-foreground shadow-sm group",
                  activeWorkspace?.metaConnected 
                    ? "border-emerald-500/20 hover:border-emerald-500/35 hover:bg-emerald-500/[0.02]" 
                    : "border-border hover:border-foreground/20 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Folder className={cn("w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-200", activeWorkspace?.metaConnected ? "text-[#0E8A4B]" : "text-[#B8651A]")} />
                  <span className="truncate">{activeName}</span>
                  {activeWorkspace?.metaConnected && (
                    <BadgeCheck className="w-4 h-4 text-[#0E8A4B] fill-[#E6F7EE]/80 flex-shrink-0" aria-label="Verified Project" />
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 group-hover:translate-y-0.5 transition-transform duration-200" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64 p-1.5 font-sans border-border bg-popover/95 backdrop-blur-md rounded-xl shadow-xl">
              <DropdownMenuLabel className="text-[10px] font-extrabold text-[#B8651A] uppercase tracking-wider px-2.5 py-1.5 flex items-center justify-between">
                <span>Switch Project</span>
                <span className="text-[8px] font-normal text-muted-foreground normal-case bg-muted px-1.5 py-0.5 rounded">
                  {workspaces.length} active
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-border/60" />
              
              {workspaces.map((w) => {
                const isSelected = w.id === activeWorkspaceId;
                const isDefault = workspaces[0]?.id === w.id;

                return (
                  <DropdownMenuItem
                    key={w.id}
                    onClick={() => handleSelect(w.id)}
                    className={cn(
                      "flex items-center justify-between cursor-pointer py-2 px-2.5 rounded-lg text-[13px] group transition-colors",
                      isSelected ? "bg-muted/40 font-medium" : "hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className={cn("w-4 h-4 text-[#B8651A] flex-shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                      <span className={cn("truncate", isSelected ? "font-bold text-foreground" : "text-muted-foreground")}>{w.name}</span>
                      {w.metaConnected && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#E6F7EE] text-[#0A6E3C] border border-[#0E8A4B]/20 flex-shrink-0">
                          <BadgeCheck className="w-3 h-3 text-[#0E8A4B] fill-current opacity-85" /> Verified Project
                        </span>
                      )}
                    </div>
                    {!isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(w.id);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </DropdownMenuItem>
                );
              })}

              <DropdownMenuSeparator className="my-1 bg-border/60" />
              <DropdownMenuItem
                onClick={() => setOpenCreate(true)}
                className="flex items-center gap-2 cursor-pointer py-2 px-2.5 rounded-lg text-[13px] text-[#B8651A] hover:text-[#9c5212] hover:bg-[#FFF1D6]/40 font-bold transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create New Project</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-sm font-sans">
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle className="text-[16px] font-black">Create New Project</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="projectName" className="text-[12px] font-bold text-muted-foreground">
                Project Name
              </Label>
              <Input
                id="projectName"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. Acme Marketing"
                className="h-10 rounded-xl"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenCreate(false)}
                className="h-10 rounded-xl font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !newProjectName.trim()}
                className="h-10 rounded-xl font-bold bg-[#B8651A] text-white hover:bg-[#9c5212] transition-colors"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-sm font-sans">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-black text-destructive">Delete Project</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-[13px] text-muted-foreground">
              Are you sure you want to delete this project? This will permanently delete all associated chats, contacts, campaigns, deals, and configurations. <strong>This action cannot be undone.</strong>
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingId(null)}
              className="h-10 rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteProject}
              disabled={deleting}
              className="h-10 rounded-xl font-bold bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
