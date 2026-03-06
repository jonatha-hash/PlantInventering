import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useHygge, useCreateProvyta } from "@/hooks/use-api";
import { Card, Button, Input, Label } from "@/components/ui-elements";
import { Copy, Plus, BarChart3, TreePine, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProvytaSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = z.object({
  radieM: z.coerce.number().min(0.5, "Radie krävs").max(20, "Orimlig radie"),
  anteckning: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function HyggeDetail() {
  const [, params] = useRoute("/hygge/:id");
  const id = Number(params?.id);
  const [, setLocation] = useLocation();
  
  const { data: hygge, isLoading } = useHygge(id);
  const createMutation = useCreateProvyta(id);
  
  const [isAdding, setIsAdding] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { radieM: 1.78 } // Default 10m2 roughly
  });

  if (isLoading) {
    return <Layout backTo="/"><div className="animate-pulse h-40 bg-secondary/50 rounded-2xl m-4" /></Layout>;
  }

  if (!hygge) {
    return <Layout backTo="/"><div className="p-8 text-center text-muted-foreground">Hittades inte</div></Layout>;
  }

  const provytorCount = hygge.provytor.length;
  const progress = Math.min(100, Math.round((provytorCount / hygge.rekommenderadeProvytor) * 100));

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data, {
      onSuccess: (newProvyta) => {
        setIsAdding(false);
        // Automatically go to the new plot to start adding trees
        setLocation(`/hygge/${id}/provyta/${newProvyta.id}`);
      }
    });
  };

  const handleDuplicateLast = () => {
    if (hygge.provytor.length === 0) return;
    const lastProvyta = hygge.provytor[hygge.provytor.length - 1];
    createMutation.mutate({ radieM: lastProvyta.radieM, anteckning: "Kopia" }, {
      onSuccess: (newProvyta) => {
        setLocation(`/hygge/${id}/provyta/${newProvyta.id}`);
      }
    });
  };

  return (
    <Layout title={hygge.namn} backTo="/">
      
      {/* Header Stats */}
      <div className="bg-primary text-primary-foreground rounded-3xl p-6 mb-6 shadow-elevated relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
          <TreePine className="w-48 h-48" />
        </div>
        
        <div className="relative z-10 flex justify-between items-end mb-4">
          <div>
            <p className="text-primary-foreground/80 font-medium mb-1">Areal</p>
            <p className="text-3xl font-display font-bold">{hygge.hektar} ha</p>
          </div>
          <div className="text-right">
            <p className="text-primary-foreground/80 font-medium mb-1">Provytor</p>
            <p className="text-3xl font-display font-bold">{provytorCount} <span className="text-lg font-normal opacity-70">/ {hygge.rekommenderadeProvytor}</span></p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden mt-4">
          <div 
            className="h-full bg-white transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <Button 
          variant="secondary" 
          className="flex-col h-auto py-4 rounded-2xl gap-2 text-primary"
          onClick={() => setLocation(`/hygge/${id}/stats`)}
        >
          <BarChart3 className="w-7 h-7" />
          <span>Statistik</span>
        </Button>
        <Button 
          variant="secondary"
          className="flex-col h-auto py-4 rounded-2xl gap-2 text-primary"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="w-7 h-7" />
          <span>Ny Yta</span>
        </Button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <Card className="border-primary/20 bg-primary/5">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-display font-bold text-lg text-primary">Lägg till Provyta</h3>
                  {provytorCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const last = hygge.provytor[hygge.provytor.length - 1];
                        setValue("radieM", last.radieM);
                      }}
                      className="text-xs font-semibold text-primary/80 flex items-center bg-primary/10 px-3 py-1.5 rounded-full"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Kopiera radie ({hygge.provytor[hygge.provytor.length - 1].radieM}m)
                    </button>
                  )}
                </div>

                <div>
                  <Label htmlFor="radieM">Cirkelradie (meter)</Label>
                  <Input 
                    id="radieM" 
                    type="number" 
                    step="0.01" 
                    inputMode="decimal"
                    {...register("radieM")} 
                  />
                  {errors.radieM && <p className="text-destructive text-sm mt-1">{errors.radieM.message}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsAdding(false)}>
                    Avbryt
                  </Button>
                  <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Skapa & Starta"}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display font-bold text-foreground">Inlagda Ytor</h2>
        {provytorCount > 0 && !isAdding && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary hover:bg-primary/10 h-9"
            onClick={handleDuplicateLast}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
            Snabbkopiera senaste
          </Button>
        )}
      </div>

      {provytorCount === 0 ? (
        <div className="text-center py-10 bg-secondary/30 rounded-3xl border border-dashed border-border">
          <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-muted-foreground font-medium">Inga provytor inlagda ännu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Display in reverse chronological order so newest is at top */}
          {[...hygge.provytor].reverse().map((yta, idx) => {
            const actualIndex = provytorCount - idx;
            const treeCount = yta.tradposter.reduce((sum, t) => sum + t.antal, 0);
            const damageCount = yta.tradposter.reduce((sum, t) => sum + t.skadade, 0);
            
            return (
              <Link key={yta.id} href={`/hygge/${id}/provyta/${yta.id}`} className="block">
                <Card className="p-4 flex items-center group">
                  <div className="w-12 h-12 rounded-full bg-secondary flex flex-col items-center justify-center mr-4 text-primary font-display font-bold leading-none">
                    <span className="text-xs opacity-70">Nr</span>
                    <span>{actualIndex}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">r={yta.radieM}m</span>
                      {treeCount > 0 ? (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold">
                          {treeCount} träd
                        </span>
                      ) : (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-md font-bold">
                          Tom yta
                        </span>
                      )}
                    </div>
                    {damageCount > 0 && (
                      <div className="flex items-center text-xs text-accent font-medium">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {damageCount} skadade
                      </div>
                    )}
                  </div>
                  
                  <div className="text-muted-foreground">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

    </Layout>
  );
}
