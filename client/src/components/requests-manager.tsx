import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CircleAlert, MapPin, Plus, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import RequestActions from "@/components/request-actions";

type RequestRow = {
  id: number;
  request_number: string;
  title?: string;
  customer_description: string;
  status: string;
  source: string;
  next_action?: string;
  received_at: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  activity_count: number;
};
type Workspace = {
  request: any;
  activity: any[];
  estimates: any[];
  appointments: any[];
  media: any[];
  proposals: any[];
  jobs: any[];
};
type Preflight = {
  enabled: boolean;
  sourceCounts: Record<string, number>;
  requirement: string;
};
const statuses = [
  "new",
  "reviewing",
  "needs_information",
  "needs_site_visit",
  "visit_scheduled",
  "visit_complete",
  "ready_to_estimate",
  "proposal_ready",
  "proposal_sent",
  "awaiting_customer",
  "approved",
  "declined",
  "closed",
];
const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase());

export default function RequestsManager({
  customers,
  onLegacyNavigate,
}: {
  customers: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  onLegacyNavigate?: (tab: string) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { data: preflight } = useQuery<Preflight>({
    queryKey: ["/api/admin/os/preflight"],
  });
  const { data: requests = [] } = useQuery<RequestRow[]>({
    queryKey: ["/api/admin/os/requests"],
    enabled: preflight?.enabled === true,
  });
  const { data: workspace } = useQuery<Workspace>({
    queryKey: ["request-workspace", selected],
    enabled: !!selected && preflight?.enabled === true,
    queryFn: async () => {
      const r = await fetch(`/api/admin/os/requests/${selected}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Request could not be loaded");
      return r.json();
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["/api/admin/os/requests"] });
    qc.invalidateQueries({ queryKey: ["/api/admin/os/today"] });
    if (selected)
      qc.invalidateQueries({ queryKey: ["request-workspace", selected] });
  };
  const update = useMutation({
    mutationFn: ({
      id,
      status,
      nextAction,
    }: {
      id: number;
      status: string;
      nextAction?: string;
    }) =>
      apiRequest(`/api/admin/os/requests/${id}`, "PATCH", {
        status,
        nextAction,
      }),
    onSuccess: refresh,
  });
  const create = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/os/requests", "POST", {
        contactId: Number(contactId),
        title,
        description,
        source: "manual",
      }),
    onSuccess: () => {
      refresh();
      setNewOpen(false);
      setContactId("");
      setTitle("");
      setDescription("");
      toast({ title: "Request created" });
    },
  });

  if (preflight && !preflight.enabled)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Requests are staged safely</CardTitle>
          <CardDescription>
            The lifecycle workspace is installed but activation is blocked until
            the production inventory, dry run, backup, and reconciliation gates
            pass.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-amber-50 p-4 text-sm text-amber-900">
            <CircleAlert className="mb-2 h-5 w-5" />
            {preflight.requirement}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => onLegacyNavigate?.("quotes")}
            >
              Open legacy quotes
            </Button>
            <Button
              variant="outline"
              onClick={() => onLegacyNavigate?.("consultations")}
            >
              Open consultations
            </Button>
            <Button
              variant="outline"
              onClick={() => onLegacyNavigate?.("home-depot")}
            >
              Open referrals
            </Button>
          </div>
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Requests</CardTitle>
            <CardDescription>
              Every potential piece of work, regardless of intake channel.
            </CardDescription>
          </div>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </CardHeader>
      </Card>
      <div className="grid gap-3">
        {requests.map((request) => (
          <Card
            key={request.id}
            className="cursor-pointer transition hover:border-blue-400"
            onClick={() => setSelected(request.id)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{request.request_number}</strong>
                    <Badge variant="secondary">{label(request.status)}</Badge>
                    <Badge variant="outline">{request.source}</Badge>
                  </div>
                  <h3 className="mt-1 font-semibold">
                    {request.title || "Service request"}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {request.customer_description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5" />
                      {[request.first_name, request.last_name]
                        .filter(Boolean)
                        .join(" ") ||
                        request.company ||
                        "Unresolved contact"}
                    </span>
                    {request.street && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {request.street}, {request.city}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-sm">
                  <p className="font-medium">
                    Next: {request.next_action || "Review request"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.received_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!requests.length && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No Requests have been created yet.
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Request</DialogTitle>
            <DialogDescription>
              Start repeat or manually received work without recreating the
              Contact.
            </DialogDescription>
          </DialogHeader>
          <Select value={contactId} onValueChange={setContactId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Contact" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.firstName} {c.lastName} · {c.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What does the customer need?"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder="Customer's description in their own words"
          />
          <Button
            disabled={
              !contactId ||
              title.length < 2 ||
              description.length < 2 ||
              create.isPending
            }
            onClick={() => create.mutate()}
          >
            Create Request
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {workspace?.request?.request_number || "Request"} ·{" "}
              {workspace?.request?.title}
            </DialogTitle>
            <DialogDescription>
              {workspace?.request?.customer_description}
            </DialogDescription>
          </DialogHeader>
          {workspace && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <strong>
                    {workspace.request.contact?.first_name}{" "}
                    {workspace.request.contact?.last_name}
                  </strong>
                  <p className="text-sm">{workspace.request.contact?.email}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Property</p>
                  <strong>
                    {workspace.request.property?.street || "Not resolved"}
                  </strong>
                  <p className="text-sm">
                    {workspace.request.property?.city}{" "}
                    {workspace.request.property?.state}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Next action</p>
                  <strong>
                    {workspace.request.next_action || "Review request"}
                  </strong>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={workspace.request.status}
                  onValueChange={(status) =>
                    update.mutate({ id: workspace.request.id, status })
                  }
                >
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {label(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <RequestActions
                requestId={workspace.request.id}
                refresh={refresh}
              />
              <section>
                <h3 className="mb-2 font-semibold">Request records</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Site visits", workspace.appointments.length],
                    ["Estimates", workspace.estimates.length],
                    ["Files & photos", workspace.media.length],
                  ].map(([name, count]) => (
                    <div
                      key={String(name)}
                      className="rounded-lg bg-slate-50 p-3"
                    >
                      <span className="text-xs text-muted-foreground">
                        {name}
                      </span>
                      <strong className="block text-xl">{count}</strong>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-2 font-semibold">History</h3>
                <div className="space-y-2">
                  {workspace.activity.map((event) => (
                    <div
                      key={event.id}
                      className="flex justify-between rounded-lg border p-3 text-sm"
                    >
                      <span>{event.summary}</span>
                      <span className="text-muted-foreground">
                        {new Date(event.occurred_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {!workspace.activity.length && (
                    <p className="text-sm text-muted-foreground">
                      No activity recorded yet.
                    </p>
                  )}
                </div>
              </section>
              {workspace.jobs.length > 0 && (
                <Button onClick={() => onLegacyNavigate?.("jobs")}>
                  Open Job <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
