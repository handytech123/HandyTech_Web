import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  BriefcaseBusiness,
  Building2,
  FileText,
  Home,
  Mail,
  MapPin,
  Phone,
  Plus,
  UserRound,
} from "lucide-react";
import type { Customer } from "@shared/schema";

type ContactWorkspace = {
  contact: any;
  properties: any[];
  requests: any[];
  jobs: any[];
  invoices: any[];
  activity: any[];
  appointments: any[];
  reviews: any[];
};
type PropertyWorkspace = {
  property: any;
  contacts: any[];
  requests: any[];
  jobs: any[];
  media: any[];
  activity: any[];
  appointments: any[];
};
const money = (value: number) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

export default function ContactsManager({
  customers,
  onNewRequest,
}: {
  customers: Customer[];
  onNewRequest: () => void;
}) {
  const [search, setSearch] = useState("");
  const [contactId, setContactId] = useState<number | null>(null);
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const filtered = customers.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.company || ""} ${c.email} ${c.phone || ""} ${c.street || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const { data: preflight } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/admin/os/preflight"],
  });
  const { data: workspace } = useQuery<ContactWorkspace>({
    queryKey: ["contact-workspace", contactId],
    enabled: !!contactId && preflight?.enabled === true,
    queryFn: async () => {
      const r = await fetch(`/api/admin/os/contacts/${contactId}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Contact history could not be loaded");
      return r.json();
    },
  });
  const { data: property } = useQuery<PropertyWorkspace>({
    queryKey: ["property-workspace", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const r = await fetch(`/api/admin/os/properties/${propertyId}`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error("Property history could not be loaded");
      return r.json();
    },
  });
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>
              Permanent people and organizations with their complete HandyTech
              history.
            </CardDescription>
          </div>
          <Button
            onClick={onNewRequest}
            disabled={preflight?.enabled === false}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </CardHeader>
        <CardContent>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, email, phone, or property"
          />
          {preflight?.enabled === false && (
            <p className="mt-2 text-xs text-amber-700">
              Contact history and Properties activate after migration
              reconciliation. Existing customer records remain available below.
            </p>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((contact) => (
          <Card
            key={contact.id}
            className={`transition ${preflight?.enabled ? "cursor-pointer hover:border-blue-400" : ""}`}
            onClick={() => preflight?.enabled && setContactId(contact.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-slate-100 p-2">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold">
                    {contact.firstName} {contact.lastName}
                  </h3>
                  {contact.company && (
                    <p className="text-sm">{contact.company}</p>
                  )}
                  <p className="truncate text-sm text-muted-foreground">
                    {contact.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {contact.phone || "No phone"}
                  </p>
                  {contact.street && (
                    <p className="mt-2 flex gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {contact.street}, {contact.city}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog
        open={!!contactId}
        onOpenChange={(open) => !open && setContactId(null)}
      >
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {workspace?.contact?.first_name} {workspace?.contact?.last_name}
            </DialogTitle>
            <DialogDescription>
              {workspace?.contact?.company || "Contact relationship history"}
            </DialogDescription>
          </DialogHeader>
          {workspace && (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                <div><p className="text-xs uppercase text-muted-foreground">Email</p><a className="break-all font-medium text-blue-700 hover:underline" href={`mailto:${workspace.contact.email}`}>{workspace.contact.email}</a></div>
                <div><p className="text-xs uppercase text-muted-foreground">Phone</p><a className="font-medium text-blue-700 hover:underline" href={`tel:${workspace.contact.phone}`}>{workspace.contact.phone || "No phone recorded"}</a></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <a href={`tel:${workspace.contact.phone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={`mailto:${workspace.contact.email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </a>
                </Button>
                <Button onClick={onNewRequest}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Request
                </Button>
              </div>
              <section>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <Home className="h-4 w-4" />
                  Properties
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {workspace.properties.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPropertyId(p.id)}
                      className="rounded-lg border p-3 text-left hover:border-blue-400"
                    >
                      <strong>{p.label || p.street}</strong>
                      <p className="text-sm text-muted-foreground">
                        {p.street}, {p.city} {p.state} {p.zip}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        {p.relationship}
                      </Badge>
                    </button>
                  ))}
                  {!workspace.properties.length && (
                    <p className="text-sm text-muted-foreground">
                      No Property has been resolved yet.
                    </p>
                  )}
                </div>
              </section>
              <div className="grid gap-4 lg:grid-cols-3">
                <HistoryList
                  title="Requests"
                  icon={<FileText className="h-4 w-4" />}
                  items={workspace.requests.map((x) => ({
                    id: x.id,
                    title: x.request_number + " · " + (x.title || "Request"),
                    status: x.status,
                  }))}
                />
                <HistoryList
                  title="Jobs"
                  icon={<BriefcaseBusiness className="h-4 w-4" />}
                  items={workspace.jobs.map((x) => ({
                    id: x.id,
                    title: x.job_number + " · " + x.title,
                    status: x.status,
                  }))}
                />
                <HistoryList
                  title="Invoices"
                  icon={<Building2 className="h-4 w-4" />}
                  items={workspace.invoices.map((x) => ({
                    id: x.id,
                    title: x.invoice_number + " · " + money(x.total),
                    status: x.status,
                  }))}
                />
                <HistoryList
                  title="Visits"
                  icon={<Home className="h-4 w-4" />}
                  items={workspace.appointments.map((x) => ({ id: x.id, title: `${x.service_type} Â· ${new Date(x.start_timestamptz || x.appointment_date).toLocaleDateString()}`, status: x.status }))}
                />
                <HistoryList
                  title="Reviews"
                  icon={<FileText className="h-4 w-4" />}
                  items={workspace.reviews.map((x) => ({ id: x.id, title: `${x.rating}/5 Â· ${x.title}`, status: x.is_approved ? "approved" : "pending" }))}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!propertyId}
        onOpenChange={(open) => !open && setPropertyId(null)}
      >
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {property?.property?.label ||
                property?.property?.street ||
                "Property"}
            </DialogTitle>
            <DialogDescription>
              {property &&
                [
                  property.property.street,
                  property.property.city,
                  property.property.state,
                  property.property.zip,
                ]
                  .filter(Boolean)
                  .join(", ")}
            </DialogDescription>
          </DialogHeader>
          {property && (
            <div className="grid gap-4 sm:grid-cols-2">
              <HistoryList
                title="Requests"
                icon={<FileText className="h-4 w-4" />}
                items={property.requests.map((x) => ({
                  id: x.id,
                  title: x.request_number + " · " + (x.title || "Request"),
                  status: x.status,
                }))}
              />
              <HistoryList
                title="Jobs & Service History"
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                items={property.jobs.map((x) => ({
                  id: x.id,
                  title: x.job_number + " · " + x.title,
                  status: x.status,
                }))}
              />
              <HistoryList
                title="Visits"
                icon={<Home className="h-4 w-4" />}
                items={property.appointments.map((x) => ({ id: x.id, title: `${x.service_type} Â· ${new Date(x.start_timestamptz || x.appointment_date).toLocaleDateString()}`, status: x.status }))}
              />
              <div className="rounded-lg border p-4"><h3 className="font-semibold">Files & photos</h3><div className="mt-3 grid grid-cols-3 gap-2">{property.media.map((asset) => <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer"><img src={asset.url} alt={asset.caption || asset.stage} className="aspect-square w-full rounded object-cover"/></a>)}{!property.media.length && <p className="col-span-3 text-sm text-muted-foreground">No contextual media.</p>}</div></div>
              <div className="sm:col-span-2 rounded-lg border p-4">
                <h3 className="font-semibold">Associated Contacts</h3>
                {property.contacts.map((c) => (
                  <p key={c.id} className="mt-2 text-sm">
                    {c.first_name} {c.last_name} · {c.relationship}
                  </p>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ id: number; title: string; status: string }>;
}) {
  return (
    <section className="rounded-lg border p-4">
      <h3 className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded bg-slate-50 p-2 text-sm">
            <strong>{item.title}</strong>
            <Badge variant="outline" className="ml-2">
              {item.status.replaceAll("_", " ")}
            </Badge>
          </div>
        ))}
        {!items.length && (
          <p className="text-sm text-muted-foreground">None yet.</p>
        )}
      </div>
    </section>
  );
}
