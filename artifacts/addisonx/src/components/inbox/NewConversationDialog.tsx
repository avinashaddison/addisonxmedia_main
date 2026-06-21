import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { useCreateConversation } from "@/hooks/useInboxData";

type FormValues = {
  name: string;
  phone: string;
  email?: string;
  source?: string;
};

type Props = {
  onCreated: (conversationId: string) => void;
};

export const NewConversationDialog = ({ onCreated }: Props) => {
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();
  const createMut = useCreateConversation();

  const onSubmit = (values: FormValues) => {
    createMut.mutate(values, {
      onSuccess: (conv) => {
        onCreated(conv.id);
        setOpen(false);
        reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          title="New chat"
          className="w-7 h-7 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Start new conversation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name", { required: true })} placeholder="Priya Sharma" />
            {errors.name && <p className="text-[11px] text-destructive">Required</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" {...register("phone", { required: true })} placeholder="+91 98765 43210" />
            {errors.phone && <p className="text-[11px] text-destructive">Required</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} placeholder="optional" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source">Source</Label>
            <Input id="source" {...register("source")} placeholder="Facebook Ads, Website…" />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
