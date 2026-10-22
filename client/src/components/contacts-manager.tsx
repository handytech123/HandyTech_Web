import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
import AddressAutocomplete from "@/components/address-autocomplete";
import QuoteFollowUpDialog from "@/components/quote-follow-up-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BriefcaseBusiness,
  Building2,
  FileText,
  Home,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  UserRound,
} from "lucide-react";
import type { Customer } from "@shared/schema";

type ContactWorkspace = {
  contact: any;
  properties: any[];
  requests: any[];
  proposals: any[];
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
  onNewRequest: (contactId?: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newContact, setNewContact] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", street: "", city: "", state: "MO", zip: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [editContact, setEditContact] = useState({ id: 0, firstName: "", lastName: "", email: "", phone: "", company: "", street: "", city: "", state: "MO", zip: "" });
  const [contactId, setContactId] = useState<number | null>(null);
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const filtered = customers.filter((c) => (relationshipFilter === "all" || c.relationshipState === relationshipFilter) &&
    `${c.firstName} ${c.lastName} ${c.company || ""} ${c.email} ${c.phone || ""} ${c.street || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createContact = useMutation({
    mutationFn: async () => (await apiRequest("/api/customers", "POST", newContact)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setAddOpen(false);
      setNewContact({ firstName: "", lastName: "", email: "", phone: "", company: "", street: "", city: "", state: "MO", zip: "" });
      toast({ title: "Customer added", description: "The customer is now available in Contacts, Requests, quotes, and scheduling." });
    },
    onError: (error: Error) => toast({ title: "Customer not added", description: error.message, variant: "destructive" }),
  });
  const updateContact = useMutation({
    mutationFn: async () => (await apiRequest(`/api/customers/${editContact.id}`, "PUT", {
      firstName: editContact.firstName,
      lastName: editContact.lastName,
      email: editContact.email,
      phone: editContact.phone,
      company: editContact.company,
      street: editContact.street,
      city: editContact.city,
      state: editContact.state,
      zip: editContact.zip,
    })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["contact-workspace", editContact.id] });
      setEditOpen(false);
      toast({ title: "Customer updated", description: "The customer profile and service address are now up to date." });
    },
    onError: (error: Error) => toast({ title: "Customer not updated", description: error.message, variant: "destructive" }),
  });
  const openCustomerEditor = (c: any, primary?: any) => {
    setEditContact({
      id: Number(c.id),
      firstName: c.first_name || c.firstName || "",
      lastName: c.last_name || c.lastName || "",
      email: c.email || "",
      phone: c.phone || "",
      company: c.company || "",
      street: primary?.street || c.street || "",
      city: primary?.city || c.city || "",
      state: primary?.state || c.state || "MO",
      zip: primary?.zip || c.zip || "",
    });
    setEditOpen(true);
  };
  const beginEdit = () => {
    if (!workspace?.contact) return;
    openCustomerEditor(workspace.contact, workspace.properties.find((p) => p.is_primary) || workspace.properties[0]);
  };
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
              Prospects become customers without creating a second profile. View contact details, Properties, and complete HandyTech history.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Contact</Button>
            <Button onClick={()=>onNewRequest()} disabled={preflight?.enabled === false}><Plus className="mr-2 h-4 w-4" />New Request</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, email, phone, or property"
          />
          <div className="mt-3 flex flex-wrap gap-2">{[["all","All"],["prospective","Prospects"],["customer","Customers"],["inactive","Inactive"]].map(([value,text])=><Button key={value} type="button" size="sm" variant={relationshipFilter===value?"default":"outline"} onClick={()=>setRelationshipFilter(value)}>{text}</Button>)}</div>
          {preflight?.enabled === false && (
            <p className="mt-2 text-xs text-amber-700">
              Contact history and Properties activate after migration
              reconciliation. Existing customer records remain available below.
            </p>
          )}
        </CardContent>
      </Card>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle><DialogDescription>Create the customer once, then use the same record for requests, quotes, appointments, jobs, and invoices.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>First name</Label><Input value={newContact.firstName} onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })} /></div>
            <div><Label>Last name</Label><Input value={newContact.lastName} onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input type="tel" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Company (optional)</Label><Input value={newContact.company} onChange={(e) => setNewContact({ ...newContact, company: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Service address</Label><AddressAutocomplete value={newContact.street} onChange={(street) => setNewContact({ ...newContact, street })} onAddressSelect={(address) => setNewContact({ ...newContact, street: address.street, city: address.city, state: address.state, zip: address.zip })} /></div>
            <div><Label>City</Label><Input value={newContact.city} onChange={(e) => setNewContact({ ...newContact, city: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2"><div><Label>State</Label><Input value={newContact.state} onChange={(e) => setNewContact({ ...newContact, state: e.target.value })} /></div><div><Label>ZIP</Label><Input value={newContact.zip} onChange={(e) => setNewContact({ ...newContact, zip: e.target.value })} /></div></div>
          </div>
          <Button className="w-full" disabled={createContact.isPending || !newContact.firstName.trim() || !newContact.lastName.trim() || !newContact.email.trim() || !newContact.phone.trim() || !newContact.street.trim() || !newContact.city.trim() || !newContact.state.trim() || !newContact.zip.trim()} onClick={() => createContact.mutate()}>{createContact.isPending ? "Adding Customer..." : "Add Customer"}</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Edit Customer</DialogTitle><DialogDescription>Update the customer profile and primary service address.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>First name</Label><Input value={editContact.firstName} onChange={(e) => setEditContact({ ...editContact, firstName: e.target.value })} /></div>
            <div><Label>Last name</Label><Input value={editContact.lastName} onChange={(e) => setEditContact({ ...editContact, lastName: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={editContact.email} onChange={(e) => setEditContact({ ...editContact, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input type="tel" value={editContact.phone} onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Company (optional)</Label><Input value={editContact.company} onChange={(e) => setEditContact({ ...editContact, company: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Service address</Label><AddressAutocomplete value={editContact.street} onChange={(street) => setEditContact({ ...editContact, street })} onAddressSelect={(address) => setEditContact({ ...editContact, street: address.street, city: address.city, state: address.state, zip: address.zip })} /></div>
            <div><Label>City</Label><Input value={editContact.city} onChange={(e) => setEditContact({ ...editContact, city: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2"><div><Label>State</Label><Input value={editContact.state} onChange={(e) => setEditContact({ ...editContact, state: e.target.value })} /></div><div><Label>ZIP</Label><Input value={editContact.zip} onChange={(e) => setEditContact({ ...editContact, zip: e.target.value })} /></div></div>
          </div>
          <Button className="w-full" disabled={updateContact.isPending || !editContact.firstName.trim() || !editContact.lastName.trim() || !editContact.email.trim() || !editContact.phone.trim() || !editContact.street.trim() || !editContact.city.trim() || !editContact.state.trim() || !editContact.zip.trim()} onClick={() => updateContact.mutate()}>{updateContact.isPending ? "Saving Customer..." : "Save Customer"}</Button>
        </DialogContent>
      </Dialog>
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
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">
                    {contact.firstName} {contact.lastName}
                  </h3>
                  <Badge variant={contact.relationshipState === "customer" ? "default" : "outline"} className="mt-1 capitalize">{contact.relationshipState || "prospective"}</Badge>
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
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    openCustomerEditor(contact, contact);
                  }}
                  aria-label={`Edit ${contact.firstName} ${contact.lastName}`}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
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
                <Button variant="outline" onClick={beginEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Customer
                </Button>
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
                <Button onClick={()=>onNewRequest(Number(workspace.contact.id))}>
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
              <section className="rounded-lg border p-4">
                <h3 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" />Quotes sent to this contact</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {workspace.proposals.map((proposal) => <div key={proposal.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2"><strong>{proposal.quote_number}</strong><Badge variant="outline" className="capitalize">{String(proposal.status).replaceAll("_", " ")}</Badge></div>
                    <p className="mt-1 font-medium">{proposal.service_needed}</p><p className="text-lg font-semibold">{money(proposal.total)}</p>
                    <p className="text-xs text-muted-foreground">{proposal.request_number ? `Request ${proposal.request_number}` : "Historical quote"}{proposal.sent_at ? ` · Sent ${new Date(proposal.sent_at).toLocaleDateString()}` : " · Draft"}</p>
                    {proposal.viewed_at && <p className="text-xs text-muted-foreground">Viewed {new Date(proposal.viewed_at).toLocaleString()}</p>}
                    <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" asChild><a href={`/api/admin/quotes/${proposal.quote_id}/proposal/pdf`} target="_blank" rel="noreferrer">View Quote PDF</a></Button><QuoteFollowUpDialog quoteId={proposal.quote_id} quoteNumber={proposal.quote_number} email={workspace.contact.email} phone={workspace.contact.phone}/></div>
                  </div>)}
                  {!workspace.proposals.length && <p className="text-sm text-muted-foreground">No quotes sent yet.</p>}
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
