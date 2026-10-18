import { trpc } from "@/lib/trpc";
import { ImagePlus, LoaderCircle, Pencil, Star, Trash2, UploadCloud, X } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type PendingImage = { id: string; file: File; previewUrl: string };

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export function AdminMediaManager() {
  const utils = trpc.useUtils();
  const products = trpc.admin.products.list.useQuery(undefined, { refetchInterval: 15_000 });
  const media = trpc.admin.media.list.useQuery(undefined, { refetchInterval: 15_000 });
  const [productId, setProductId] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [kind, setKind] = useState<"primary" | "gallery">("gallery");
  const selectedProduct = useMemo(() => (products.data ?? []).find((product) => product.id === productId), [products.data, productId]);

  useEffect(() => () => pending.forEach((image) => URL.revokeObjectURL(image.previewUrl)), [pending]);

  const refresh = () => {
    void utils.admin.media.list.invalidate();
    void utils.admin.products.list.invalidate();
    void utils.catalogue.list.invalidate();
    void utils.catalogue.bySlug.invalidate();
  };
  const upload = trpc.admin.media.upload.useMutation({
    onSuccess: refresh,
    onError: (error) => toast.error(`Upload impossible : ${error.message}`),
  });
  const update = trpc.admin.media.update.useMutation({
    onSuccess: () => { refresh(); toast.success("Média mis à jour."); },
    onError: (error) => toast.error(`Modification impossible : ${error.message}`),
  });
  const remove = trpc.admin.media.delete.useMutation({
    onSuccess: () => { refresh(); toast.success("Média retiré de la galerie."); },
    onError: (error) => toast.error(`Suppression impossible : ${error.message}`),
  });

  const chooseFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    const usable = incoming.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 7_000_000);
    if (usable.length !== incoming.length) toast.warning("Seules les images JPEG, PNG ou WebP jusqu’à 7 Mo ont été retenues.");
    setPending((current) => [...current, ...usable.map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }))].slice(0, 12));
    event.target.value = "";
  };
  const discard = (id: string) => setPending((current) => {
    const target = current.find((image) => image.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    return current.filter((image) => image.id !== id);
  });
  const submit = async () => {
    if (!productId) return toast.error("Sélectionnez d’abord un produit.");
    if (!pending.length) return toast.error("Ajoutez au moins une image.");
    try {
      for (let index = 0; index < pending.length; index += 1) {
        const image = pending[index]!;
        const dataUrl = await readAsDataUrl(image.file);
        await upload.mutateAsync({ productId, kind: index === 0 ? kind : "gallery", image: dataUrl });
      }
      pending.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      setPending([]);
      toast.success("Les images sont enregistrées dans la galerie du produit.");
    } catch {
      // L’erreur détaillée est affichée par la mutation ; les fichiers restants sont conservés pour réessai.
    }
  };

  return <section className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">Médias catalogue</p>
        <h2 className="mt-1 text-2xl font-semibold">Bibliothèque et galeries</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Chargez des images dans le stockage sécurisé, contrôlez leur rendu avant envoi puis organisez les galeries par produit. Retirer un média le dissocie du catalogue sans exposer sa provenance.</p>
      </div>
      <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground">{media.data?.length ?? 0} média(s) suivis</span>
    </header>

    <section className="rounded-3xl border border-primary/20 bg-card p-5 shadow-sm sm:p-7">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="grid gap-1.5 text-sm font-semibold"><span>Produit associé</span><select className={inputClass} value={productId ?? ""} onChange={(event) => setProductId(event.target.value ? Number(event.target.value) : null)}><option value="">Choisir une référence…</option>{(products.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.brand} · {product.name}</option>)}</select></label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold"><input type="checkbox" checked={kind === "primary"} onChange={(event) => setKind(event.target.checked ? "primary" : "gallery")} className="h-4 w-4 accent-primary" />La première image devient principale</label>
      </div>
      {selectedProduct && <div className="mt-4 flex items-center gap-3 rounded-2xl bg-muted/60 p-3"><img src={selectedProduct.imageUrl} alt={selectedProduct.name} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/media-fallback.svg"; }} className="h-12 w-12 rounded-xl object-cover"/><div><p className="text-sm font-bold">{selectedProduct.name}</p><p className="text-xs text-muted-foreground">{selectedProduct.gallery?.length ?? 0} image(s) actuellement liées</p></div></div>}
      <label className="mt-5 grid min-h-36 cursor-pointer place-items-center rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-6 text-center transition hover:bg-primary/10"><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={chooseFiles}/><UploadCloud className="h-7 w-7 text-primary"/><span className="mt-3 text-sm font-bold">Choisir des images ou les déposer ici</span><span className="mt-1 text-xs text-muted-foreground">JPEG, PNG ou WebP · 7 Mo maximum par image · 12 images par envoi</span></label>
      {pending.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{pending.map((image, index) => <article key={image.id} className="group overflow-hidden rounded-2xl border border-border bg-background"><img src={image.previewUrl} alt={`Prévisualisation ${index + 1}`} className="h-36 w-full object-cover"/><div className="flex items-center justify-between gap-2 p-3"><div className="min-w-0"><p className="truncate text-xs font-bold">{image.file.name}</p><p className="text-[11px] text-muted-foreground">{Math.round(image.file.size / 1024)} Ko {index === 0 && kind === "primary" ? "· image principale" : "· galerie"}</p></div><button type="button" onClick={() => discard(image.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-rose-600" aria-label="Retirer la prévisualisation"><X className="h-4 w-4"/></button></div></article>)}</div>}
      <div className="mt-5 flex justify-end"><button type="button" disabled={upload.isPending || !pending.length} onClick={() => void submit()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"><ImagePlus className="h-4 w-4"/>{upload.isPending ? "Import en cours…" : "Enregistrer les images"}</button></div>
    </section>

    {media.isLoading ? <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-border bg-card"><LoaderCircle className="h-7 w-7 animate-spin text-primary"/></div> : <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{(media.data ?? []).map((asset) => <article key={asset.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="relative"><img src={asset.storageUrl || asset.sourceUrl} alt={asset.productName ? `${asset.productName} — visuel catalogue` : "Visuel catalogue GunsMasterPro"} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/media-fallback.svg"; }} className="h-48 w-full bg-muted object-cover"/>{asset.kind === "primary" && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"><Star className="h-3 w-3 fill-current"/>Principale</span>}</div><div className="p-4"><p className="truncate text-sm font-bold">{asset.productName ?? "Média non associé"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{asset.productSlug ?? "—"} · position {asset.position}</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => update.mutate({ assetId: asset.id, kind: "primary", position: asset.position })} disabled={update.isPending} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted"><Star className="h-3.5 w-3.5"/>Principale</button><button onClick={() => update.mutate({ assetId: asset.id, kind: "gallery", position: Math.max(0, asset.position - 1) })} disabled={update.isPending} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted"><Pencil className="h-3.5 w-3.5"/>Monter</button><button onClick={() => { if (confirm("Retirer ce média de la galerie ?")) remove.mutate({ assetId: asset.id }); }} disabled={remove.isPending} className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5"/>Retirer</button></div></div></article>)}</section>}
  </section>;
}
