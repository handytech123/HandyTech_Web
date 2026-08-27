import { useMemo } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CalendarClock, CheckCircle2, CircleDot, ExternalLink, Mail, MapPin, Phone, RotateCcw, Wrench } from "lucide-react";
import type { Appointment } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface AppointmentDetailsDialogProps {
  appointment: Appointment | null;
  open: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onReschedule: (appointment: Appointment) => void;
  onStatusChange: (id: number, status: string) => Promise<void>;
}

const statusStyles: Record<string, string> = {
  scheduled: "bg-amber-100 text-amber-900 border-amber-200",
  confirmed: "bg-green-100 text-green-900 border-green-200",
  "in-progress": "bg-blue-100 text-blue-900 border-blue-200",
  completed: "bg-slate-100 text-slate-800 border-slate-200",
  cancelled: "bg-red-100 text-red-900 border-red-200",
  "no-show": "bg-orange-100 text-orange-900 border-orange-200",
};

export default function AppointmentDetailsDialog({ appointment, open, busy, onOpenChange, onReschedule, onStatusChange }: AppointmentDetailsDialogProps) {
  const address = useMemo(() => {
    if (!appointment) return "";
    return [appointment.street || appointment.address, appointment.city, appointment.state, appointment.zip].filter(Boolean).join(", ");
  }, [appointment]);

  if (!appointment) return null;

  const start = appointment.startTimestamptz ? toZonedTime(new Date(appointment.startTimestamptz), "America/Chicago") : new Date(appointment.appointmentDate);
  const end = appointment.endTimestamptz ? toZonedTime(new Date(appointment.endTimestamptz), "America/Chicago") : null;
  const directionsUrl = address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : "";
  const updateStatus = async (status: string) => onStatusChange(appointment.id, status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-3 pr-8">
            <DialogTitle className="text-2xl">{appointment.firstName} {appointment.lastName}</DialogTitle>
            <Badge className={statusStyles[appointment.status] || statusStyles.scheduled}>{appointment.status.replace("-", " ")}</Badge>
          </div>
          <DialogDescription>Appointment #{appointment.id} · All times shown in Central Time</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4 sm:col-span-2">
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 h-5 w-5 text-brand-primary" />
              <div>
                <p className="font-semibold">{format(start, "EEEE, MMMM d, yyyy")}</p>
                <p className="text-lg">{format(start, "h:mm a")}{end ? `–${format(end, "h:mm a")}` : ""} CT</p>
              </div>
            </div>
          </div>

          <a href={`tel:${appointment.phone || ""}`} className={`rounded-lg border p-4 transition-colors ${appointment.phone ? "hover:bg-muted" : "pointer-events-none opacity-60"}`}>
            <div className="flex items-center gap-3"><Phone className="h-5 w-5 text-brand-primary" /><div><p className="text-xs text-muted-foreground">Call customer</p><p className="font-medium">{appointment.phone || "No phone provided"}</p></div></div>
          </a>
          <a href={`mailto:${appointment.email}`} className="rounded-lg border p-4 transition-colors hover:bg-muted">
            <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-brand-primary" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Email customer</p><p className="truncate font-medium">{appointment.email}</p></div></div>
          </a>

          <div className="rounded-lg border p-4 sm:col-span-2">
            <div className="flex items-start gap-3"><Wrench className="mt-0.5 h-5 w-5 text-brand-primary" /><div><p className="text-xs text-muted-foreground">Service</p><p className="font-semibold">{appointment.serviceType}</p></div></div>
          </div>

          <div className="rounded-lg border p-4 sm:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" /><div><p className="text-xs text-muted-foreground">Service address</p><p className="font-medium">{address || "No address provided"}</p></div></div>
              {directionsUrl && <Button asChild size="sm" variant="outline"><a href={directionsUrl} target="_blank" rel="noreferrer">Directions <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
            </div>
          </div>

          {appointment.notes && <div className="rounded-lg bg-muted p-4 sm:col-span-2"><p className="mb-1 text-xs font-medium text-muted-foreground">JOB NOTES</p><p className="whitespace-pre-wrap">{appointment.notes}</p></div>}
        </div>

        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-semibold">Update job</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onReschedule(appointment)} disabled={busy}><RotateCcw className="mr-2 h-4 w-4" />Reschedule</Button>
            {appointment.status === "scheduled" && <Button onClick={() => updateStatus("confirmed")} disabled={busy}><CheckCircle2 className="mr-2 h-4 w-4" />Confirm</Button>}
            {["scheduled", "confirmed"].includes(appointment.status) && <Button onClick={() => updateStatus("in-progress")} disabled={busy}><CircleDot className="mr-2 h-4 w-4" />Start job</Button>}
            {appointment.status === "in-progress" && <Button onClick={() => updateStatus("completed")} disabled={busy}><CheckCircle2 className="mr-2 h-4 w-4" />Mark complete</Button>}
            {!['completed', 'cancelled'].includes(appointment.status) && (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="destructive" disabled={busy}>Cancel appointment</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Cancel this appointment?</AlertDialogTitle><AlertDialogDescription>The customer will receive a cancellation email and this time will become available again.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Keep appointment</AlertDialogCancel><AlertDialogAction onClick={() => updateStatus("cancelled")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, cancel it</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
