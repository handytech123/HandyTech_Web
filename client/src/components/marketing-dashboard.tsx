import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, DollarSign, ExternalLink, Eye, FileText, MapPin, MessageSquareQuote, Search, Star, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type RankedItem = { name: string; leads: number; accepted: number; revenue: number };
type MonthItem = { month: string; leads: number; accepted: number; revenue: number };
type MarketingSummary = {
  periodDays: number;
  totals: { leads: number; quoteRequests: number; consultations: number; proposalsSent: number; proposalsViewed: number; proposalsAccepted: number; invoicesPaid: number; revenue: number; reviews: number; averageRating: number };
  services: RankedItem[]; cities: RankedItem[]; months: MonthItem[];
};
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const percent = (part: number, total: number) => total ? Math.round((part / total) * 100) : 0;
const monthLabel = (value: string) => new Date(value + "-02T12:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" });

export default function MarketingDashboard() {
  const { data, isLoading, isError } = useQuery<MarketingSummary>({ queryKey: ["/api/admin/marketing/summary?days=90"] });
  if (isLoading) return <Card><CardContent className="py-12 text-center text-muted-foreground">Building your marketing report...</CardContent></Card>;
  if (isError || !data) return <Card><CardContent className="py-12 text-center text-red-600">Marketing report could not be loaded.</CardContent></Card>;
  const t = data.totals, viewedRate = percent(t.proposalsViewed, t.proposalsSent), closeRate = percent(t.proposalsAccepted, t.proposalsSent), paidRate = percent(t.invoicesPaid, t.proposalsAccepted);
  const maxMonthLeads = Math.max(1, ...data.months.map((item) => item.leads));
  const cards: Array<[string, string | number, typeof Users, string]> = [
    ["Leads", t.leads, Users, t.quoteRequests + " quotes / " + t.consultations + " consultations"],
    ["Quotes viewed", t.proposalsViewed, Eye, viewedRate + "% of sent quotes"],
    ["Quotes won", t.proposalsAccepted, CheckCircle2, closeRate + "% close rate"],
    ["Revenue collected", money(t.revenue), DollarSign, t.invoicesPaid + " paid invoices"],
  ];
  const funnel: Array<[string, number, string, typeof Users]> = [
    ["New leads", t.leads, "100%", MessageSquareQuote],
    ["Quotes sent", t.proposalsSent, percent(t.proposalsSent, t.leads) + "% of leads", FileText],
    ["Viewed", t.proposalsViewed, viewedRate + "% of sent", Eye],
    ["Accepted", t.proposalsAccepted, closeRate + "% of sent", CheckCircle2],
    ["Paid", t.invoicesPaid, paidRate + "% of accepted", DollarSign],
  ];
  return <div className="space-y-6">
    <Card className="overflow-hidden border-0 bg-gradient-to-r from-slate-950 to-brand-primary text-white"><CardHeader><CardTitle className="flex items-center gap-2 text-2xl"><TrendingUp className="h-6 w-6" />Marketing & Growth</CardTitle><CardDescription className="max-w-3xl text-slate-200">Your last {data.periodDays} days, from new inquiry through paid work. Use this to decide which services and cities deserve more photos, project pages, reviews, and promotion.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button asChild variant="secondary"><a href="https://analytics.google.com/" target="_blank" rel="noreferrer">Google Analytics <ExternalLink className="ml-2 h-4 w-4" /></a></Button><Button asChild variant="secondary"><a href="https://search.google.com/search-console?resource_id=https%3A%2F%2Fhandytech-solutions.com%2F" target="_blank" rel="noreferrer">Search Console <ExternalLink className="ml-2 h-4 w-4" /></a></Button><Button asChild variant="secondary"><a href="https://business.google.com/" target="_blank" rel="noreferrer">Business Profile <ExternalLink className="ml-2 h-4 w-4" /></a></Button></CardContent></Card>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label, value, Icon, note]) => <Card key={label}><CardHeader className="p-4 pb-1"><CardTitle className="flex items-center justify-between text-sm">{label}<Icon className="h-4 w-4 text-brand-primary" /></CardTitle></CardHeader><CardContent className="p-4 pt-1"><div className="text-2xl font-bold">{value}</div><p className="mt-1 text-xs text-muted-foreground">{note}</p></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Sales funnel</CardTitle><CardDescription>Where customers are advancing and where follow-up may be needed.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{funnel.map(([label, value, note, Icon]) => <div key={label} className="rounded-xl border bg-slate-50 p-4"><Icon className="mb-3 h-5 w-5 text-brand-primary" /><div className="text-2xl font-bold">{value}</div><div className="font-medium">{label}</div><div className="text-xs text-muted-foreground">{note}</div></div>)}</CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Lead trend</CardTitle><CardDescription>Monthly inquiries received.</CardDescription></CardHeader><CardContent className="space-y-3">{data.months.map((item) => <div key={item.month} className="grid grid-cols-[64px_1fr_36px] items-center gap-3 text-sm"><span>{monthLabel(item.month)}</span><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-primary" style={{ width: Math.max(4, item.leads / maxMonthLeads * 100) + "%" }} /></div><strong className="text-right">{item.leads}</strong></div>)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" />Trust signals</CardTitle><CardDescription>Reviews submitted through your website during this period.</CardDescription></CardHeader><CardContent><div className="flex items-end gap-3"><span className="text-4xl font-bold">{t.averageRating ? t.averageRating.toFixed(1) : "-"}</span><span className="pb-1 text-muted-foreground">average from {t.reviews} reviews</span></div><p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Send the review request after every completed and paid job. Reviews and project photos are your strongest local trust assets.</p></CardContent></Card></div>
    <div className="grid gap-6 lg:grid-cols-2"><Ranked title="Top services" description="Ranked by quote demand." icon={Search} items={data.services} empty="Service demand will appear after quote requests arrive." /><Ranked title="Top cities" description="Where demand and collected revenue come from." icon={MapPin} items={data.cities} empty="City performance appears when addresses are captured." /></div>
    <Card><CardHeader><CardTitle>What to do next</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Action title="More leads" text="Publish one useful project page each week for a high-demand service and city." /><Action title="More quote wins" text={viewedRate < 70 ? "Follow up on quotes not opened within 24-48 hours." : "Improve scope clarity, photos, and proof to lift approvals."} /><Action title="More local trust" text="Request a review after payment, then reuse approved reviews and before/after photos." /></CardContent></Card>
  </div>;
}
function Ranked({ title, description, icon: Icon, items, empty }: { title: string; description: string; icon: typeof Search; items: RankedItem[]; empty: string }) { const max = Math.max(1, ...items.map((item) => item.leads)); return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" />{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="space-y-4">{!items.length && <p className="text-sm text-muted-foreground">{empty}</p>}{items.map((item) => <div key={item.name}><div className="mb-1 flex items-start justify-between gap-3 text-sm"><strong>{item.name}</strong><span>{item.leads} leads</span></div><div className="h-2 overflow-hidden rounded bg-slate-100"><div className="h-full bg-brand-primary" style={{ width: item.leads / max * 100 + "%" }} /></div><p className="mt-1 text-xs text-muted-foreground">{item.accepted} accepted / {money(item.revenue)} collected</p></div>)}</CardContent></Card>; }
function Action({ title, text }: { title: string; text: string }) { return <div className="rounded-xl border p-4"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>; }