import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { useHygge, useCreateTradpost, useUpdateProvyta } from "@/hooks/use-api";
import { Card, Button, Input, Label } from "@/components/ui-elements";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Leaf, AlertCircle, Loader2, Edit2, Skull } from "lucide-react";
import { clsx } from "clsx";

const TRAD_ARTER = ["Tall", "Gran", "Björk", "Ek", "Fågelbär", "Asp", "Al", "Lärk", "Bok"];

const formSchema = z.object({
  art: z.string().min(1, "Välj eller skriv art"),
  antal: z.coerce.number().min(1, "Minst 1"),
  skadade: z.coerce.number().min(0, "Kan ej vara negativt"),
  doda: z.coerce.number().min(0, "Kan ej vara negativt"),
}).refine(data => data.skadade <= data.antal, {
  message: "Fler skadade än totala antalet",
  path: ["skadade"]
});

type FormValues = z.infer<typeof formSchema>;

export default function ProvytaDetail() {
  const [, params] = useRoute("/hygge/:hyggeId/provyta/:provytaId");
  const hyggeId = Number(params?.hyggeId);
  const provytaId = Number(params?.provytaId);

  const { data: hygge, isLoading } = useHygge(hyggeId);
  const createMutation = useCreateTradpost(provytaId, hyggeId);
  const updateProvytaMutation = useUpdateProvyta(hyggeId);

  const provyta = hygge?.provytor.find(p => p.id === provytaId);
  const provytaIndex = hygge ? hygge.provytor.findIndex(p => p.id === provytaId) + 1 : 0;
  
  const [editingComment, setEditingComment] = useState(false);
  const [commentValue, setCommentValue] = useState<string>("");

  useEffect(() => {
    if (provyta && !editingComment) {
      setCommentValue(provyta.anteckning || "");
    }
  }, [provyta?.id, editingComment]);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { art: "", antal: 1, skadade: 0, doda: 0 }
  });

  const selectedArt = watch("art");
  const antal = watch("antal");

  if (isLoading) return <Layout backTo={`/hygge/${hyggeId}`}><div className="animate-pulse h-64 bg-secondary/50 rounded-2xl m-4" /></Layout>;
  if (!provyta) return <Layout backTo={`/hygge/${hyggeId}`}><div className="p-8 text-center text-muted-foreground">Provyta hittades inte</div></Layout>;

  const areaM2 = Math.PI * Math.pow(provyta.radieM, 2);

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        reset({ art: data.art, antal: 1, skadade: 0, doda: 0 });
      }
    });
  };

  return (
    <Layout title={`Provyta ${provytaIndex}`} backTo={`/hygge/${hyggeId}`}>
      
      {/* Plot Info Banner */}
      <div className="bg-secondary/40 rounded-2xl p-4 flex justify-between items-center mb-6 border border-border/50">
        <div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Cirkelradie</span>
          <span className="font-display font-bold text-xl">{provyta.radieM} m</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Yta</span>
          <span className="font-display font-bold text-xl">{areaM2.toFixed(1)} m²</span>
        </div>
      </div>

      {/* Comment Section */}
      {editingComment ? (
        <div className="bg-secondary/30 rounded-2xl p-4 mb-6 border border-border/50 flex items-start gap-3">
          <input
            type="text"
            value={commentValue}
            onChange={(e) => setCommentValue(e.target.value)}
            placeholder="Lägg till anteckning..."
            className="flex-1 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button
            size="sm"
            className="h-10"
            onClick={() => {
              updateProvytaMutation.mutate({ id: provytaId, anteckning: commentValue || null }, {
                onSuccess: () => setEditingComment(false),
              });
            }}
            disabled={updateProvytaMutation.isPending}
          >
            {updateProvytaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Spara"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-10"
            onClick={() => {
              setEditingComment(false);
              setCommentValue(provyta?.anteckning || "");
            }}
          >
            Avbryt
          </Button>
        </div>
      ) : (
        <div className="bg-secondary/30 rounded-2xl p-4 mb-6 border border-border/50 group cursor-pointer hover:bg-secondary/40 transition-colors" onClick={() => setEditingComment(true)}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground italic">
              {commentValue || "Klicka för att lägga till anteckning..."}
            </p>
            <Edit2 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Quick Entry Form */}
      <Card className="mb-8 border-2 border-primary/20 shadow-elevated">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Label htmlFor="art-input">Trädart</Label>
            <Input 
              id="art-input"
              placeholder="Välj nedan eller skriv här..."
              className="mb-3"
              {...register("art")}
            />
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {TRAD_ARTER.map(art => (
                <button
                  key={art}
                  type="button"
                  onClick={() => setValue("art", art, { shouldValidate: true })}
                  className={clsx(
                    "h-12 rounded-xl text-sm font-semibold transition-all",
                    selectedArt === art 
                      ? "bg-primary text-white shadow-md shadow-primary/30" 
                      : "bg-secondary text-secondary-foreground hover:bg-primary/10"
                  )}
                >
                  {art}
                </button>
              ))}
            </div>
            {errors.art && <p className="text-destructive text-sm mt-2 font-medium">{errors.art.message}</p>}
          </div>

          {/* Antal — full width with large +/- buttons */}
          <div>
            <Label htmlFor="antal">Antal</Label>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setValue("antal", Math.max(1, antal - 1))}
                className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center text-3xl font-bold hover:bg-secondary/80 active:scale-95 transition-all flex-shrink-0 select-none"
              >
                −
              </button>
              <Input
                id="antal"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                className="text-3xl font-bold text-center h-16 flex-1 min-w-0"
                {...register("antal")}
              />
              <button
                type="button"
                onClick={() => setValue("antal", antal + 1)}
                className="w-16 h-16 bg-primary text-primary-foreground rounded-xl flex items-center justify-center text-3xl font-bold hover:bg-primary/90 active:scale-95 transition-all flex-shrink-0 select-none"
              >
                +
              </button>
            </div>
            {errors.antal && <p className="text-destructive text-sm mt-1">{errors.antal.message}</p>}
          </div>

          {/* Skadade + Döda — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="skadade" className="text-accent">Skadade</Label>
              <div className="flex items-center gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setValue("skadade", Math.max(0, Number(watch("skadade")) - 1))}
                  className="w-12 h-14 bg-secondary rounded-xl flex items-center justify-center text-2xl font-bold hover:bg-secondary/80 active:scale-95 transition-all flex-shrink-0 select-none"
                >
                  −
                </button>
                <Input
                  id="skadade"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="text-2xl font-bold text-center h-14 flex-1 min-w-0 border-accent/30 focus-visible:border-accent focus-visible:ring-accent/20"
                  {...register("skadade")}
                />
                <button
                  type="button"
                  onClick={() => setValue("skadade", Math.min(Number(watch("skadade")) + 1, antal))}
                  className="w-12 h-14 bg-accent text-accent-foreground rounded-xl flex items-center justify-center text-2xl font-bold hover:bg-accent/90 active:scale-95 transition-all flex-shrink-0 select-none"
                >
                  +
                </button>
              </div>
              {errors.skadade && <p className="text-destructive text-xs mt-1">{errors.skadade.message}</p>}
            </div>

            <div>
              <Label htmlFor="doda" className="text-muted-foreground flex items-center gap-1">
                <Skull className="w-3.5 h-3.5" />
                Döda
              </Label>
              <div className="flex items-center gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setValue("doda", Math.max(0, Number(watch("doda")) - 1))}
                  className="w-12 h-14 bg-secondary rounded-xl flex items-center justify-center text-2xl font-bold hover:bg-secondary/80 active:scale-95 transition-all flex-shrink-0 select-none"
                >
                  −
                </button>
                <Input
                  id="doda"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="text-2xl font-bold text-center h-14 flex-1 min-w-0 border-muted-foreground/30 focus-visible:border-muted-foreground focus-visible:ring-muted-foreground/20"
                  {...register("doda")}
                />
                <button
                  type="button"
                  onClick={() => setValue("doda", Number(watch("doda")) + 1)}
                  className="w-12 h-14 bg-muted-foreground text-background rounded-xl flex items-center justify-center text-2xl font-bold hover:opacity-80 active:scale-95 transition-all flex-shrink-0 select-none"
                >
                  +
                </button>
              </div>
              {errors.doda && <p className="text-destructive text-xs mt-1">{errors.doda.message}</p>}
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-16 text-lg rounded-2xl mt-2"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Spara träd"}
          </Button>
        </form>
      </Card>

      {/* Logged Trees */}
      <h3 className="font-display font-bold text-lg mb-3">Registrerade Träd</h3>
      
      {provyta.tradposter.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Inga träd registrerade på denna yta ännu.
        </div>
      ) : (
        <div className="space-y-3">
          {provyta.tradposter.map((trad) => (
            <div key={trad.id} className="bg-card border border-border/60 rounded-xl p-4 flex justify-between items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-lg leading-none mb-1">{trad.art}</p>
                  <p className="text-sm text-muted-foreground font-medium">{trad.antal} st</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {trad.skadade > 0 && (
                  <div className="bg-accent/10 text-accent px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {trad.skadade} skad.
                  </div>
                )}
                {(trad.doda ?? 0) > 0 && (
                  <div className="bg-muted text-muted-foreground px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold text-sm">
                    <Skull className="w-4 h-4" />
                    {trad.doda} döda
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </Layout>
  );
}
