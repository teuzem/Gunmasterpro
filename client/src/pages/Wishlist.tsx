import { ProductCard } from "@/components/storefront";
import { startLogin } from "@/const";
import { useCommerce } from "@/contexts/CommerceContext";
import { translations } from "@/lib/storefront";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Bookmark, FolderHeart, Heart, Pencil, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

type CollectionLabels = (typeof translations)[keyof typeof translations];
const advancedCopy = {
  fr: { active: "Actives", archived: "Archives", showArchived: "Voir les archives", hideArchived: "Masquer les archives", archive: "Archiver", restore: "Restaurer", move: "Déplacer vers", order: "Réordonner", emptyArchive: "Aucune collection archivée.", itemActions: "Actions sur la référence" },
  en: { active: "Active", archived: "Archived", showArchived: "View archive", hideArchived: "Hide archive", archive: "Archive", restore: "Restore", move: "Move to", order: "Reorder", emptyArchive: "No archived collection.", itemActions: "Reference actions" },
  de: { active: "Aktiv", archived: "Archiviert", showArchived: "Archiv öffnen", hideArchived: "Archiv ausblenden", archive: "Archivieren", restore: "Wiederherstellen", move: "Verschieben nach", order: "Neu ordnen", emptyArchive: "Keine archivierte Kollektion.", itemActions: "Referenzaktionen" },
} as const;

export default function Wishlist() {
  const { locale } = useCommerce();
  const { isAuthenticated } = useAuth();
  const t = translations[locale];
  const copy = advancedCopy[locale];
  const utils = trpc.useUtils();
  const collectionsQuery = trpc.collections.list.useQuery(undefined, { enabled: isAuthenticated });
  const collections = collectionsQuery.data ?? [];
  const [activeCollectionId, setActiveCollectionId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [deleteCollectionId, setDeleteCollectionId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "" });

  const visibleCollections = collections.filter((collection) => showArchived ? collection.isArchived : !collection.isArchived);
  useEffect(() => {
    if (!visibleCollections.length) return;
    if (!visibleCollections.some((collection) => collection.id === activeCollectionId)) setActiveCollectionId(visibleCollections[0]?.id ?? null);
  }, [visibleCollections, activeCollectionId]);

  const activeCollection = visibleCollections.find((collection) => collection.id === activeCollectionId) ?? visibleCollections[0];
  const refresh = () => utils.collections.list.invalidate();
  const create = trpc.collections.create.useMutation({
    onSuccess: (collection) => {
      setCreateOpen(false);
      setDraft({ name: "", description: "" });
      setActiveCollectionId(collection?.id ?? null);
      toast.success(t.wishlist.created);
      refresh();
    },
    onError: () => toast.error(t.wishlist.empty),
  });
  const update = trpc.collections.update.useMutation({
    onSuccess: () => {
      setManageOpen(false);
      toast.success(t.wishlist.updated);
      refresh();
    },
    onError: () => toast.error(t.wishlist.empty),
  });
  const removeItem = trpc.collections.removeItem.useMutation({ onSuccess: refresh, onError: () => toast.error(t.wishlist.empty) });
  const removeCollection = trpc.collections.delete.useMutation({
    onSuccess: () => {
      setDeleteCollectionId(null);
      setActiveCollectionId(null);
      refresh();
    },
    onError: () => toast.error(t.wishlist.empty),
  });
  const archiveCollection = trpc.collections.archive.useMutation({ onSuccess: () => { setActiveCollectionId(null); refresh(); }, onError: () => toast.error(t.wishlist.empty) });
  const moveItem = trpc.collections.moveItem.useMutation({ onSuccess: refresh, onError: () => toast.error(t.wishlist.empty) });
  const reorderItems = trpc.collections.reorderItems.useMutation({ onSuccess: refresh, onError: () => toast.error(t.wishlist.empty) });

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    create.mutate({ name: draft.name, description: draft.description || undefined });
  };
  const startManaging = () => {
    if (!activeCollection || activeCollection.isSystemSaved) return;
    setDraft({ name: activeCollection.name, description: activeCollection.description ?? "" });
    setManageOpen(true);
  };
  const submitUpdate = (event: FormEvent) => {
    event.preventDefault();
    if (!activeCollection) return;
    update.mutate({ collectionId: activeCollection.id, name: draft.name, description: draft.description || undefined });
  };
  const reorderItem = (productId: number, direction: -1 | 1) => {
    if (!activeCollection) return;
    const ids = activeCollection.items.map((item) => item.product.id);
    const from = ids.indexOf(productId);
    const target = from + direction;
    if (from < 0 || target < 0 || target >= ids.length) return;
    [ids[from], ids[target]] = [ids[target]!, ids[from]!];
    reorderItems.mutate({ collectionId: activeCollection.id, productIds: ids });
  };

  if (!isAuthenticated) return <main className="gmp-page min-h-screen bg-[#071015]"><section className="container py-16"><p className="eyebrow">GunsMasterPro</p><h1 className="font-display text-5xl text-white">{t.wishlist.title}</h1><p className="mt-4 max-w-2xl leading-7 text-slate-400">{t.wishlist.lead}</p><div className="gmp-card mt-10 rounded-2xl border border-white/8 bg-[#101a22] p-8"><Heart className="h-7 w-7 text-[#d7b46a]"/><p className="mt-4 max-w-lg text-sm leading-6 text-slate-300">{t.wishlist.login}</p><button onClick={startLogin} className="mt-6 rounded-xl bg-[#d7b46a] px-5 py-3 text-sm font-bold text-[#081015]">{t.actions.login}</button></div></section></main>;

  return <main className="gmp-page min-h-screen bg-[#071015]"><section className="container py-10 lg:py-14"><div className="max-w-3xl"><p className="eyebrow">GunsMasterPro</p><h1 className="font-display mt-2 text-5xl text-white">{t.wishlist.title}</h1><p className="mt-4 leading-7 text-slate-400">{t.wishlist.lead}</p></div>{collectionsQuery.isLoading ? <div className="mt-10 grid gap-5 lg:grid-cols-[18rem_1fr]"><div className="h-72 animate-pulse rounded-2xl bg-white/5"/><div className="h-96 animate-pulse rounded-2xl bg-white/5"/></div> : <div className="mt-10 grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]"><aside className="gmp-card h-fit rounded-2xl border border-white/8 bg-[#101a22] p-4"><div className="mb-4 flex items-center justify-between px-1"><div className="flex items-center gap-2"><FolderHeart className="h-4 w-4 text-[#d7b46a]"/><span className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">{showArchived ? copy.archived : copy.active}</span></div><span className="text-xs text-slate-500">{visibleCollections.length}</span></div><div className="space-y-2">{visibleCollections.map((collection) => { const cover = collection.items.slice(0, 4); const title = collection.isSystemSaved ? t.wishlist.saved : collection.name; return <button key={collection.id} onClick={() => { setActiveCollectionId(collection.id); setManageOpen(false); }} className={`group flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${activeCollection?.id === collection.id ? "border-[#d7b46a]/55 bg-[#d7b46a]/10" : "border-white/7 hover:border-white/20 hover:bg-white/[.025]"}`}><span className="grid h-12 w-12 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-lg bg-[#0b151d]">{cover.length ? cover.map(({ product }) => <img key={product.id} src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover"/>) : <Bookmark className="col-span-2 row-span-2 m-auto h-4 w-4 text-slate-500"/>}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{title}</strong><small className="mt-1 block text-xs text-slate-500">{collection.items.length} {t.wishlist.itemCount}</small></span></button>; })}{!visibleCollections.length && <p className="rounded-xl border border-dashed border-white/12 p-4 text-xs leading-5 text-slate-500">{copy.emptyArchive}</p>}</div><button onClick={() => { setCreateOpen((open) => !open); setManageOpen(false); setDraft({ name: "", description: "" }); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#d7b46a]/45 px-3 py-3 text-xs font-bold text-[#e5c97f] hover:bg-[#d7b46a]/10"><Plus className="h-4 w-4"/>{t.wishlist.create}</button><button onClick={() => { setShowArchived((value) => !value); setActiveCollectionId(null); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold text-slate-300"><Archive className="h-3.5 w-3.5"/>{showArchived ? copy.hideArchived : copy.showArchived}</button></aside><div className="min-w-0">{createOpen && <CollectionForm title={t.wishlist.createTitle} t={t} draft={draft} setDraft={setDraft} pending={create.isPending} onCancel={() => setCreateOpen(false)} onSubmit={submitCreate}/>} {activeCollection && <section className="gmp-card rounded-2xl border border-white/8 bg-[#101a22] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Bookmark className="h-4 w-4 text-[#d7b46a]"/><p className="eyebrow">{activeCollection.isSystemSaved ? t.wishlist.saved : activeCollection.isArchived ? copy.archived : t.nav.collections}</p></div><h2 className="font-display mt-2 text-4xl text-white">{activeCollection.isSystemSaved ? t.wishlist.saved : activeCollection.name}</h2>{activeCollection.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{activeCollection.description}</p>}</div>{!activeCollection.isSystemSaved && <div className="flex flex-wrap gap-2"><button onClick={startManaging} className="inline-flex items-center gap-2 rounded-lg border border-white/12 px-3 py-2 text-xs font-bold text-slate-200 hover:border-[#d7b46a]/55"><Pencil className="h-3.5 w-3.5"/>{t.actions.rename}</button><button onClick={() => archiveCollection.mutate({ collectionId: activeCollection.id, isArchived: !activeCollection.isArchived })} className="inline-flex items-center gap-2 rounded-lg border border-white/12 px-3 py-2 text-xs font-bold text-slate-200"><ArchiveRestore className="h-3.5 w-3.5"/>{activeCollection.isArchived ? copy.restore : copy.archive}</button><button onClick={() => setDeleteCollectionId(activeCollection.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/12 text-slate-400 hover:border-[#c75b5b]/55 hover:text-[#e37c7c]" aria-label={t.actions.delete}><Trash2 className="h-4 w-4"/></button></div>}</div>{manageOpen && !activeCollection.isSystemSaved && <CollectionForm title={t.wishlist.rename} t={t} draft={draft} setDraft={setDraft} pending={update.isPending} onCancel={() => setManageOpen(false)} onSubmit={submitUpdate}/>}<div className="mt-6 flex items-center justify-between border-y border-white/8 py-3"><span className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{activeCollection.items.length} {t.wishlist.itemCount}</span><span className="text-xs text-slate-500">{copy.order}</span></div>{activeCollection.items.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{activeCollection.items.map(({ product }, index) => <div key={product.id} className="relative"><ProductCard product={product}/><div className="collection-item-toolbar" aria-label={copy.itemActions}><button onClick={() => reorderItem(product.id, -1)} disabled={index === 0 || reorderItems.isPending} aria-label={copy.order}><ArrowUp/></button><button onClick={() => reorderItem(product.id, 1)} disabled={index === activeCollection.items.length - 1 || reorderItems.isPending} aria-label={copy.order}><ArrowDown/></button>{collections.filter((collection) => collection.id !== activeCollection.id && !collection.isArchived).length > 0 && <select aria-label={copy.move} defaultValue="" onChange={(event) => { if (event.target.value) moveItem.mutate({ sourceCollectionId: activeCollection.id, destinationCollectionId: Number(event.target.value), productId: product.id }); event.currentTarget.value = ""; }}><option value="" disabled>{copy.move}</option>{collections.filter((collection) => collection.id !== activeCollection.id && !collection.isArchived).map((collection) => <option key={collection.id} value={collection.id}>{collection.isSystemSaved ? t.wishlist.saved : collection.name}</option>)}</select>}<button onClick={() => removeItem.mutate({ collectionId: activeCollection.id, productId: product.id })} disabled={removeItem.isPending} className="collection-item-remove" aria-label={t.actions.remove}><X/></button></div></div>)}</div> : <div className="mt-6 grid min-h-56 place-items-center rounded-xl border border-dashed border-white/12 bg-white/[.018] p-6 text-center"><div><Bookmark className="mx-auto h-6 w-6 text-slate-600"/><p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">{t.wishlist.collectionEmpty}</p></div></div>}</section>}</div></div>}</section>{deleteCollectionId && <div className="fixed inset-0 z-[70] grid place-items-center bg-[#02070a]/75 p-4"><section role="dialog" aria-modal="true" className="gmp-card w-full max-w-md rounded-2xl border border-white/10 bg-[#101a22] p-6 shadow-2xl"><Trash2 className="h-6 w-6 text-[#dd7777]"/><h2 className="font-display mt-4 text-3xl text-white">{t.wishlist.deleteTitle}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{t.wishlist.collectionEmpty}</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setDeleteCollectionId(null)} className="rounded-lg border border-white/12 px-4 py-2.5 text-sm font-semibold text-slate-200">{t.actions.cancel}</button><button onClick={() => removeCollection.mutate({ collectionId: deleteCollectionId })} disabled={removeCollection.isPending} className="rounded-lg bg-[#ba4d4d] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{t.actions.delete}</button></div></section></div>}</main>;
}

function CollectionForm({ title, t, draft, setDraft, pending, onCancel, onSubmit }: { title: string; t: CollectionLabels; draft: { name: string; description: string }; setDraft: (draft: { name: string; description: string }) => void; pending: boolean; onCancel: () => void; onSubmit: (event: FormEvent) => void }) {
  return <form onSubmit={onSubmit} className="gmp-card mb-5 rounded-2xl border border-[#d7b46a]/25 bg-[#0d1820] p-5"><h2 className="font-display text-2xl text-white">{title}</h2><div className="mt-4 grid gap-3"><input required minLength={2} maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={t.wishlist.name} className="store-input"/><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder={t.wishlist.description} maxLength={500} className="store-input min-h-24 resize-y"/></div><div className="mt-4 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-lg border border-white/12 px-4 py-2.5 text-sm font-semibold text-slate-200">{t.actions.cancel}</button><button disabled={pending} className="rounded-lg bg-[#d7b46a] px-4 py-2.5 text-sm font-bold text-[#0a1217] disabled:opacity-50">{pending ? "…" : t.actions.create}</button></div></form>;
}
