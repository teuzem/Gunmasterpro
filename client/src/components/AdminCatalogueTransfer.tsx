import { Download, FileArchive, FileCheck2, FileSpreadsheet, FileUp, LoaderCircle, ShieldCheck, UploadCloud } from "lucide-react";
import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type ExportFormat = "csv" | "xlsx" | "json";
type ImportMode = "create" | "upsert";
type ImportScalar = string | number | boolean | null;
type ImportRow = Record<string, ImportScalar>;
type ImportFile = { file: File; format: ExportFormat; rows: ImportRow[]; base64: string };

const formats: Array<{ id: ExportFormat; label: string; description: string; icon: typeof FileSpreadsheet }> = [
  { id: "xlsx", label: "Excel professionnel", description: "Feuilles, filtres, largeurs et mise en forme.", icon: FileSpreadsheet },
  { id: "csv", label: "CSV universel", description: "Compatible ERP et outils de traitement de données.", icon: FileArchive },
  { id: "json", label: "JSON structuré", description: "Sauvegarde complète exploitable par API et scripts.", icon: FileCheck2 },
];

function downloadBase64(payload: { fileName: string; contentType: string; base64: string }) {
  const bytes = Uint8Array.from(atob(payload.base64), character => character.charCodeAt(0));
  const href = URL.createObjectURL(new Blob([bytes], { type: payload.contentType }));
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = payload.fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
}

function detectFormat(file: File): ExportFormat | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "xlsx" ? "xlsx" : extension === "csv" ? "csv" : extension === "json" ? "json" : null;
}

function normaliseRows(rows: Array<Record<string, unknown>>): ImportRow[] {
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === null || value === undefined ? null : typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : String(value)])) as ImportRow);
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => resolve(String(reader.result).split(",").at(-1) ?? "");
    reader.readAsDataURL(file);
  });
}

async function parseImportFile(file: File): Promise<ImportFile> {
  const format = detectFormat(file);
  if (!format) throw new Error("Utilisez uniquement un fichier Excel (.xlsx), CSV ou JSON.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Le fichier dépasse la limite sécurisée de 8 Mo.");
  const base64 = await readFileAsBase64(file);
  if (format === "json") {
    const parsed = JSON.parse(await file.text());
    const rows = Array.isArray(parsed) ? parsed : parsed?.rows;
    if (!Array.isArray(rows)) throw new Error("Le JSON doit contenir un tableau « rows » ou être un tableau de produits.");
    return { file, format, rows: normaliseRows(rows), base64 };
  }
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
  const sheet = workbook.Sheets["Catalogue"] ?? workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) throw new Error("Aucune feuille exploitable n’a été trouvée.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
  if (!rows.length) throw new Error("La feuille Catalogue ne contient aucune ligne de produit.");
  return { file, format, rows: normaliseRows(rows), base64 };
}

export function AdminCatalogueTransfer() {
  const utils = trpc.useUtils();
  const validate = trpc.admin.transfers.validate.useMutation();
  const commit = trpc.admin.transfers.commit.useMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [candidate, setCandidate] = useState<ImportFile | null>(null);
  const [mode, setMode] = useState<ImportMode>("create");
  const [validation, setValidation] = useState<Awaited<ReturnType<typeof validate.mutateAsync>> | null>(null);

  const exportFile = async (format: ExportFormat, template = false) => {
    try {
      const payload = await utils.admin.transfers.export.fetch({ format, template });
      downloadBase64(payload);
      toast.success(template ? "Le modèle catalogue est prêt." : `Sauvegarde ${format.toUpperCase()} téléchargée.`);
    } catch (error) {
      toast.error(`Export impossible : ${error instanceof Error ? error.message : "erreur inconnue"}`);
    }
  };

  const inspect = async (file?: File) => {
    if (!file) return;
    try {
      setCandidate(null);
      setValidation(null);
      const parsed = await parseImportFile(file);
      const result = await validate.mutateAsync({ rows: parsed.rows, mode });
      setCandidate(parsed);
      setValidation(result);
      if (result.valid) toast.success(`${result.totalRows} ligne(s) validée(s) sans écriture en base.`);
      else toast.error(`${result.errors.length} erreur(s) de validation à corriger avant l’import.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Prévalidation impossible.");
    }
  };

  const refreshValidation = async (nextMode: ImportMode) => {
    setMode(nextMode);
    if (!candidate) return;
    try { setValidation(await validate.mutateAsync({ rows: candidate.rows, mode: nextMode })); } catch (error) { toast.error(error instanceof Error ? error.message : "Prévalidation impossible."); }
  };

  const submit = async () => {
    if (!candidate || !validation?.valid) return;
    if (!confirm(`Confirmer l’import ${mode === "create" ? "en création uniquement" : "avec mise à jour des slugs existants"} de ${validation.totalRows} produit(s) ? Cette écriture sera enregistrée et visible immédiatement sur le catalogue.`)) return;
    try {
      const result = await commit.mutateAsync({ rows: candidate.rows, mode, fileName: candidate.file.name, format: candidate.format, contentBase64: candidate.base64 });
      if (!result.applied) { setValidation(result.validation); toast.error("Le catalogue n’a pas été modifié : des erreurs restent à corriger."); return; }
      toast.success(`Import terminé : ${result.createdRows} créé(s), ${result.updatedRows} mis à jour.`);
      setCandidate(null); setValidation(null);
      void Promise.all([utils.admin.products.list.invalidate(), utils.admin.overview.invalidate(), utils.catalogue.list.invalidate(), utils.catalogue.bySlug.invalidate()]);
    } catch (error) {
      toast.error(`Import impossible : ${error instanceof Error ? error.message : "erreur inconnue"}`);
    }
  };

  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); void inspect(event.dataTransfer.files[0]); };
  const choose = (event: ChangeEvent<HTMLInputElement>) => { void inspect(event.target.files?.[0]); event.target.value = ""; };

  return <section className="space-y-6"><header className="rounded-3xl border border-primary/20 bg-card p-6 text-card-foreground shadow-sm sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="eyebrow">Continuité & intégrité catalogue</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Sauvegarde et import sécurisé</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Exports professionnels du catalogue complet et import contrôlé en masse. Chaque écriture est prévalidée, journalisée et réservée au super-administrateur.</p></div><div className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-bold text-primary"><ShieldCheck className="h-5 w-5" />Super-administrateur</div></div></header>

    <section className="grid gap-4 lg:grid-cols-3">{formats.map(format => <article key={format.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm"><format.icon className="h-7 w-7 text-primary" /><h2 className="mt-5 text-lg font-semibold">{format.label}</h2><p className="mt-2 min-h-10 text-sm leading-6 text-muted-foreground">{format.description}</p><button onClick={() => void exportFile(format.id)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><Download className="h-4 w-4" />Télécharger l’export</button></article>)}</section>

    <section className="grid gap-6 xl:grid-cols-[1.45fr_.8fr]"><div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Import en masse</p><h2 className="mt-1 text-2xl font-semibold">Déposer un fichier catalogue</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Excel, CSV ou JSON, jusqu’à 500 lignes et 8 Mo. Aucune donnée n’est écrite avant prévalidation et confirmation explicite.</p></div><button onClick={() => void exportFile("xlsx", true)} className="inline-flex items-center gap-2 rounded-xl border border-primary/25 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5"><FileSpreadsheet className="h-4 w-4" />Modèle Excel</button></div>
      <div onDragEnter={event => { event.preventDefault(); setDragging(true); }} onDragOver={event => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={drop} onClick={() => inputRef.current?.click()} className={`mt-6 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${dragging ? "border-primary bg-primary/10" : "border-border bg-muted/35 hover:border-primary/60 hover:bg-primary/5"}`}><UploadCloud className="mx-auto h-10 w-10 text-primary" /><p className="mt-4 font-semibold">Glissez votre fichier ici</p><p className="mt-2 text-sm text-muted-foreground">ou choisissez un fichier .xlsx, .csv ou .json</p><input ref={inputRef} onChange={choose} accept=".xlsx,.csv,.json" type="file" className="sr-only" /></div>
      {candidate && <div className="mt-5 rounded-2xl border border-border bg-background p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><FileUp className="h-5 w-5 shrink-0 text-primary" /><div><p className="truncate font-semibold">{candidate.file.name}</p><p className="text-xs text-muted-foreground">{candidate.rows.length} ligne(s) lues · {(candidate.file.size / 1024).toFixed(1)} Ko · {candidate.format.toUpperCase()}</p></div></div><select value={mode} onChange={event => void refreshValidation(event.target.value as ImportMode)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold"><option value="create">Créer uniquement</option><option value="upsert">Créer et mettre à jour</option></select></div>{validation && <div className={`mt-4 rounded-xl p-4 ${validation.valid ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-100" : "bg-rose-500/10 text-rose-900 dark:text-rose-100"}`}><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold">{validation.valid ? "Prévalidation réussie" : "Corrections requises"}</p><p className="text-sm">{validation.createCount} création(s) · {validation.updateCount} mise(s) à jour</p></div>{validation.errors.length > 0 && <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-sm">{validation.errors.map((error, index) => <li key={`${error.row}-${index}`}>Ligne {error.row} : {error.message}</li>)}</ul>}</div>}<button disabled={!validation?.valid || commit.isPending} onClick={() => void submit()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{commit.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}{commit.isPending ? "Import en cours…" : "Confirmer l’import en base"}</button></div>}</div>
      <aside className="rounded-3xl border border-border bg-card p-6 shadow-sm"><p className="eyebrow">Procédure sûre</p><h2 className="mt-1 text-xl font-semibold">Avant toute écriture</h2><ol className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground"><li><strong className="text-foreground">01. Sauvegarder.</strong> Téléchargez d’abord une copie Excel, CSV ou JSON du catalogue actuel.</li><li><strong className="text-foreground">02. Prévalider.</strong> Chaque champ, prix, URL, galerie, JSON et slug est contrôlé avant l’écriture.</li><li><strong className="text-foreground">03. Confirmer.</strong> Le mode « Créer » protège les références existantes ; « Mettre à jour » ne change que les slugs présents.</li><li><strong className="text-foreground">04. Auditer.</strong> Le fichier source et le résultat de l’import sont journalisés dans l’activité de la plateforme.</li></ol></aside></section>
  </section>;
}
