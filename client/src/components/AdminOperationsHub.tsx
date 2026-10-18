import { trpc } from "@/lib/trpc";
import { Activity, MailCheck, MapPinned, RefreshCw, ShoppingCart, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";

type Section = "workflows" | "newsletter" | "connections";
const tabs: Array<{ id: Section; label: string; icon: typeof Activity }> = [
  { id: "workflows", label: "Activité", icon: Activity },
  { id: "newsletter", label: "Newsletter", icon: MailCheck },
  { id: "connections", label: "Connexions consenties", icon: MapPinned },
];

function formatDate(value: Date | string | null | undefined) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}
function label(eventType: string) {
  return eventType.replaceAll("_", " ");
}
function statusClass(value: string) {
  if (["subscribed", "consent_granted", "visit_recorded"].includes(value)) return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (["consent_withdrawn", "newsletter_unsubscribed"].includes(value)) return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200";
}

export function AdminOperationsHub() {
  const [section, setSection] = useState<Section>("workflows");
  const [search, setSearch] = useState("");
  const workflows = trpc.admin.workflows.list.useQuery(undefined, { refetchInterval: 12_000 });
  const newsletter = trpc.admin.newsletter.list.useQuery(search ? { search } : undefined, { refetchInterval: 12_000 });
  const connections = trpc.admin.locations.history.useQuery(undefined, { refetchInterval: 12_000 });
  const utils = trpc.useUtils();
  const metrics = useMemo(() => {
    const events = workflows.data ?? [];
    return {
      carts: events.filter((event) => event.eventType === "cart_added").length,
      requests: events.filter((event) => event.eventType === "request_created").length,
      logins: events.filter((event) => event.eventType === "user_signed_in").length,
    };
  }, [workflows.data]);
  const refresh = () => { void utils.admin.workflows.list.invalidate(); void utils.admin.newsletter.list.invalidate(); void utils.admin.locations.history.invalidate(); };

  return <section className="mx-auto max-w-[1500px] space-y-6">
    <header className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Pilotage opérationnel</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Flux, newsletter et connexions</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Les éléments ci-dessous sont lus depuis les journaux persistants et se mettent à jour automatiquement. Les positions de géolocalisation restent approximatives et seulement présentes après consentement.</p></div><button onClick={refresh} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold hover:bg-muted"><RefreshCw className="h-4 w-4"/>Actualiser</button></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric icon={ShoppingCart} label="Ajouts panier" value={metrics.carts}/><Metric icon={UserRoundCheck} label="Connexions" value={metrics.logins}/><Metric icon={Activity} label="Demandes créées" value={metrics.requests}/></div>
      <nav className="mt-6 flex gap-2 overflow-x-auto" aria-label="Sous-sections d’activité">{tabs.map((tab) => <button key={tab.id} onClick={() => setSection(tab.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${section === tab.id ? "bg-primary text-primary-foreground" : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"}`}><tab.icon className="h-4 w-4"/>{tab.label}</button>)}</nav>
    </header>

    {section === "workflows" && <section className="overflow-hidden rounded-2xl border border-border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted/70 text-xs uppercase tracking-[.1em] text-muted-foreground"><tr><th className="px-4 py-3">Événement</th><th className="px-4 py-3">Compte / visiteur</th><th className="px-4 py-3">Entité</th><th className="px-4 py-3">Détails</th><th className="px-4 py-3">Horodatage</th></tr></thead><tbody>{(workflows.data ?? []).map((event) => <tr key={event.id} className="border-t border-border"><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${statusClass(event.eventType)}`}>{label(event.eventType)}</span></td><td className="px-4 py-3"><strong>{event.userName ?? "Visiteur pseudonyme"}</strong><p className="text-xs text-muted-foreground">{event.userEmail ?? event.visitorId ?? "—"}</p></td><td className="px-4 py-3 text-xs"><strong>{event.entityType}</strong><p className="text-muted-foreground">{event.entityId ?? "—"}</p></td><td className="max-w-sm px-4 py-3 text-xs text-muted-foreground">{event.details ? Object.entries(event.details).map(([key, value]) => `${key}: ${String(value)}`).join(" · ") : "—"}</td><td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(event.createdAt)}</td></tr>)}</tbody></table></div>{!workflows.data?.length && <p className="p-8 text-center text-sm text-muted-foreground">Aucun workflow enregistré pour l’instant.</p>}</section>}

    {section === "newsletter" && <section className="rounded-2xl border border-border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div><h3 className="font-semibold">Inscriptions newsletter</h3><p className="mt-1 text-xs text-muted-foreground">Consentement, langue et état de désinscription sont conservés.</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une adresse…" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:w-72"/></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-muted/70 text-xs uppercase tracking-[.1em] text-muted-foreground"><tr><th className="px-4 py-3">Adresse</th><th className="px-4 py-3">Langue</th><th className="px-4 py-3">État</th><th className="px-4 py-3">Consentement</th><th className="px-4 py-3">Dernière mise à jour</th></tr></thead><tbody>{(newsletter.data ?? []).map((entry) => <tr key={entry.id} className="border-t border-border"><td className="px-4 py-3 font-semibold">{entry.email}</td><td className="px-4 py-3 uppercase">{entry.locale}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${statusClass(entry.status)}`}>{entry.status === "subscribed" ? "inscrit" : "désinscrit"}</span></td><td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(entry.consentAt)}</td><td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(entry.updatedAt)}</td></tr>)}</tbody></table></div>{!newsletter.data?.length && <p className="p-8 text-center text-sm text-muted-foreground">Aucune inscription correspondant à ce filtre.</p>}</section>}

    {section === "connections" && <section className="overflow-hidden rounded-2xl border border-border bg-card"><div className="border-b border-border p-4"><h3 className="font-semibold">Historique des choix de localisation</h3><p className="mt-1 text-xs text-muted-foreground">Ni adresse IP ni précision GPS ne sont enregistrées. Un retrait de consentement efface les positions actives associées.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-muted/70 text-xs uppercase tracking-[.1em] text-muted-foreground"><tr><th className="px-4 py-3">Événement</th><th className="px-4 py-3">Compte / visiteur</th><th className="px-4 py-3">Pays</th><th className="px-4 py-3">Région & ville</th><th className="px-4 py-3">Coordonnées approx.</th><th className="px-4 py-3">Horodatage</th></tr></thead><tbody>{(connections.data ?? []).map((entry) => <tr key={entry.id} className="border-t border-border"><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${statusClass(entry.eventType)}`}>{label(entry.eventType)}</span></td><td className="px-4 py-3"><strong>{entry.userName ?? "Visiteur consenti"}</strong><p className="text-xs text-muted-foreground">{entry.userEmail ?? entry.visitorId}</p></td><td className="px-4 py-3">{entry.country ?? "—"} <span className="text-xs text-muted-foreground">{entry.countryCode ?? ""}</span></td><td className="px-4 py-3">{[entry.region, entry.city].filter(Boolean).join(" · ") || "—"}</td><td className="px-4 py-3 font-mono text-xs">{entry.latitude == null || entry.longitude == null ? "—" : `${entry.latitude.toFixed(3)}, ${entry.longitude.toFixed(3)}`}</td><td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(entry.createdAt)}</td></tr>)}</tbody></table></div>{!connections.data?.length && <p className="p-8 text-center text-sm text-muted-foreground">Aucune connexion avec consentement n’a encore été enregistrée.</p>}</section>}
  </section>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: number }) {
  return <article className="rounded-2xl border border-border bg-background p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-primary"/></div><strong className="mt-3 block text-3xl tracking-tight">{value}</strong></article>;
}
