import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, Clock, CheckCircle2, AlertCircle, Sparkles, MessageCircle, Phone, Send,
  Play, Calendar, ArrowUpRight, TrendingUp, IndianRupee, Loader2, RefreshCw, Trash2
} from "lucide-react";
import { useTasks, useUpdateTask, useDeleteTask } from "@/hooks/useCrmData";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TaskPriority = "urgent" | "high" | "medium" | "low";

export const SiteOperationsTab = () => {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["site-bookings"],
    queryFn: () => api.getBookings(),
  });

  const [activeSegment, setActiveSegment] = useState<"tasks" | "bookings">("tasks");

  const pendingTasks = useMemo(() => tasks.filter((t) => t.status === "pending"), [tasks]);
  const overdueTasks = useMemo(() => {
    return pendingTasks.filter((t) => {
      if (!t.due_at) return false;
      return new Date(t.due_at).getTime() < Date.now();
    });
  }, [pendingTasks]);

  const activeBookings = useMemo(() => bookings.filter((b) => b.status === "new" || b.status === "confirmed"), [bookings]);

  const handleToggleTaskStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    updateTask.mutate({
      id,
      status: nextStatus,
      completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
    }, {
      onSuccess: () => {
        toast.success(nextStatus === "completed" ? "Follow-up marked complete!" : "Follow-up reopened");
      }
    });
  };

  const handleReschedule = (id: string) => {
    const nextDue = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    updateTask.mutate({ id, due_at: nextDue }, {
      onSuccess: () => {
        toast.success("Rescheduled +2 hours");
      }
    });
  };

  if (tasksLoading || bookingsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Overdue Follow-ups", value: overdueTasks.length, icon: <AlertCircle className="w-4 h-4 text-hot" />, style: "bg-hot-soft border-hot/20" },
          { label: "Pending Tasks", value: pendingTasks.length, icon: <Bell className="w-4 h-4 text-primary" />, style: "bg-primary-soft border-primary/20" },
          { label: "Pending Bookings", value: activeBookings.length, icon: <Calendar className="w-4 h-4 text-warning" />, style: "bg-warning-soft border-warning/20" },
          { label: "Completed Action Items", value: tasks.filter((t) => t.status === "completed").length, icon: <CheckCircle2 className="w-4 h-4 text-success" />, style: "bg-success-soft border-success/20" },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white border-2 border-[#E8B968] rounded-2xl shadow-[0_3px_0_0_#E8B968] p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold mt-1 tabular-nums">{stat.value}</p>
            </div>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stat.style.split(" ")[0])}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* AI recommendation bar */}
      {overdueTasks.length > 0 && (
        <div className="relative bg-gradient-to-br from-[#FFEFE0] to-white border-2 border-[#FF6A1F] rounded-2xl p-4 shadow-[0_3px_0_0_#FF6A1F] overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6A1F] text-white flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[13px] font-black text-[#7A4A00]">Action Required: Overdue Deals are Going Cold</h4>
              <p className="text-[11px] text-foreground/75 mt-0.5 leading-relaxed">
                You have {overdueTasks.length} follow-up tasks currently overdue. Reach out immediately via WhatsApp to boost closing conversion rate by up to 3×.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Segment Switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveSegment("tasks")}
          className={cn(
            "px-4 py-2 text-[13px] font-bold border-b-2 transition-all flex items-center gap-1.5",
            activeSegment === "tasks"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Bell className="w-4 h-4" /> CRM Follow-ups ({pendingTasks.length})
        </button>
        <button
          onClick={() => setActiveSegment("bookings")}
          className={cn(
            "px-4 py-2 text-[13px] font-bold border-b-2 transition-all flex items-center gap-1.5",
            activeSegment === "bookings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar className="w-4 h-4" /> Booking Requests ({activeBookings.length})
        </button>
      </div>

      {/* List Render */}
      <div className="space-y-3">
        {activeSegment === "tasks" ? (
          pendingTasks.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-[#E8B968] rounded-2xl p-8 text-center">
              <p className="text-[13px] font-bold">All caught up!</p>
              <p className="text-[11px] text-muted-foreground mt-1">No pending follow-ups for this website.</p>
            </div>
          ) : (
            pendingTasks.map((t) => {
              const overdue = t.due_at && new Date(t.due_at).getTime() < Date.now();
              return (
                <div
                  key={t.id}
                  className={cn(
                    "bg-white border-2 border-[#E8B968] rounded-xl shadow-[0_2px_0_0_#E8B968] p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all",
                    overdue && "border-l-4 border-l-hot"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleTaskStatus(t.id, t.status)}
                      className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center hover:border-primary transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 opacity-0 hover:opacity-100 text-success" />
                    </button>
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{t.title}</p>
                      {t.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{t.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {t.due_at && (
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1",
                        overdue ? "bg-hot-soft text-hot" : "bg-muted text-muted-foreground"
                      )}>
                        <Clock className="w-3 h-3" />
                        {overdue ? "Overdue" : new Date(t.due_at).toLocaleDateString()}
                      </span>
                    )}

                    <button
                      onClick={() => handleReschedule(t.id)}
                      className="p-1.5 rounded-lg border hover:bg-muted text-muted-foreground transition"
                      title="Reschedule +2h"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => deleteTask.mutate(t.id)}
                      className="p-1.5 rounded-lg border hover:bg-hot-soft text-hot transition"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : (
          activeBookings.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-[#E8B968] rounded-2xl p-8 text-center">
              <p className="text-[13px] font-bold">No active bookings</p>
              <p className="text-[11px] text-muted-foreground mt-1">Customers haven't requested any services yet.</p>
            </div>
          ) : (
            activeBookings.map((b) => (
              <div
                key={b.id}
                className="bg-white border-2 border-[#E8B968] rounded-xl shadow-[0_2px_0_0_#E8B968] p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                <div>
                  <p className="text-[13px] font-bold text-foreground capitalize">{b.service_name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Customer: <span className="font-semibold text-foreground">{b.customer_name}</span> · Phone:{" "}
                    <span className="font-semibold text-foreground font-mono">{b.customer_phone}</span>
                  </p>
                  <p className="text-[10px] font-bold text-[#0E8A4B] mt-1">₹{Number(b.service_price_inr).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-bold px-2 py-1 rounded bg-[#E6F7EE] text-[#0E8A4B]">
                    {b.booking_date} · {b.booking_time}
                  </span>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
