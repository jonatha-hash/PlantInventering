import { useState } from "react";
import { Link, useLocation } from "wouter";
import { TreePine, Plus, MapPin, Loader2, Trash2, AlertCircle } from "lucide-react";
import { useHyggen, useCreateHygge, useDeleteHygge } from "@/hooks/use-api";
import { Layout } from "@/components/layout";
import { Card, Button, Input, Label } from "@/components/ui-elements";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHyggeSchema } from "@shared/schema";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";

// Extend schema for form to ensure proper number coercion
const formSchema = insertHyggeSchema.extend({
  hektar: z.coerce.number().min(0.1, "Måste vara minst 0.1 ha"),
  rekommenderadeProvytor: z.coerce.number().min(1, "Minst 1 provyta"),
  initialRadieM: z.coerce.number().min(0.5, "Radie krävs").max(20, "Orimlig radie").optional().default(3.99),
  anteckning: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: hyggen, isLoading } = useHyggen();
  const createMutation = useCreateHygge();
  const deleteMutation = useDeleteHygge();
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { namn: "", hektar: 0, rekommenderadeProvytor: 0, initialRadieM: 3.99, anteckning: "" }
  });

  const hektar = watch("hektar");
  const radieM = watch("initialRadieM") || 3.99;

  // Automatically suggest plots based on hectares and radius
  const calculateRecommended = (ha: number, radie: number) => {
    if (!ha || !radie) return 5;
    // Standard formula for forestry: target is often a certain percentage or fixed count per ha
    // We'll use a slightly more dynamic formula here
    const plotsPerHa = Math.max(5, Math.ceil(ha * (10 / radie)));
    return plotsPerHa;
  };

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data, {
      onSuccess: (newHygge) => {
        setIsCreating(false);
        reset({ namn: "", hektar: 0, rekommenderadeProvytor: 0, initialRadieM: 3.99, anteckning: "" });
        setLocation(`/hygge/${newHygge.id}`);
      },
      onError: (error) => {
        console.error("Failed to create hygge:", error);
      }
    });
  };

  return (
    <Layout showLogo>
      <div className="flex flex-col gap-6">
        
        <div className="flex items-center justify-between mt-2">
          <h2 className="text-2xl font-display font-bold text-foreground">Dina Hyggen</h2>
          <Button 
            onClick={() => setIsCreating(true)} 
            size="sm" 
            className="rounded-full pl-3 pr-4 h-11"
          >
            <Plus className="w-5 h-5 mr-1" />
            Nytt
          </Button>
        </div>

        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="overflow-hidden"
            >
              <Card className="border-primary/30 bg-primary/5 mb-4">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <h3 className="font-display font-bold text-lg mb-2 text-primary">Skapa nytt hygge</h3>
                  
                  <div>
                    <Label htmlFor="namn">Namn / Traktdirektiv</Label>
                    <Input id="namn" placeholder="T.ex. Kallebo 1:4" {...register("namn")} />
                    {errors.namn && <p className="text-destructive text-sm mt-1 ml-1">{errors.namn.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hektar">Areal (ha)</Label>
                      <Input 
                        id="hektar" 
                        type="number" 
                        step="0.1" 
                        inputMode="decimal"
                        placeholder="0.0" 
                        {...register("hektar")}
                        onChange={(e) => {
                          register("hektar").onChange(e);
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            reset(v => ({...v, rekommenderadeProvytor: calculateRecommended(val)}));
                          }
                        }}
                      />
                      {errors.hektar && <p className="text-destructive text-sm mt-1 ml-1">{errors.hektar.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="rekommenderadeProvytor">Mål provytor</Label>
                      <Input 
                        id="rekommenderadeProvytor" 
                        type="number" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        {...register("rekommenderadeProvytor")} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="initialRadieM">Standardradie (m)</Label>
                      <Input 
                        id="initialRadieM" 
                        type="number" 
                        step="0.01" 
                        inputMode="decimal"
                        {...register("initialRadieM")}
                        onChange={(e) => {
                          register("initialRadieM").onChange(e);
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            setValue("rekommenderadeProvytor", calculateRecommended(hektar, val));
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="anteckning">Anteckning objekt</Label>
                      <Input id="anteckning" placeholder="T.ex. svår terräng" {...register("anteckning")} />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="flex-1"
                      onClick={() => setIsCreating(false)}
                    >
                      Avbryt
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Skapa"}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-secondary/50 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : !hyggen?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
              <TreePine className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">Inga hyggen ännu</h3>
            <p className="text-muted-foreground mb-8 max-w-[250px]">
              Börja med att skapa ett nytt hygge för att starta din inventering.
            </p>
            <Button onClick={() => setIsCreating(true)} size="lg">
              Skapa ditt första hygge
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {hyggen.map((hygge) => (
              <div key={hygge.id}>
                {deleteConfirm === hygge.id ? (
                  <Card className="p-4 bg-destructive/10 border-destructive/30">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <span className="font-semibold text-destructive">Radera "{hygge.namn}"?</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setDeleteConfirm(null)}
                        disabled={deleteMutation.isPending}
                      >
                        Avbryt
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => {
                          deleteMutation.mutate(hygge.id, {
                            onSuccess: () => setDeleteConfirm(null),
                          });
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Radera"}
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Link href={`/hygge/${hygge.id}`} className="block">
                    <Card className="flex items-center p-5 group relative">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mr-4 group-hover:bg-primary group-hover:text-white transition-colors">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-bold text-lg leading-tight mb-1">{hygge.namn}</h3>
                        <p className="text-muted-foreground text-sm flex gap-3">
                          <span>{hygge.hektar} ha</span>
                          <span>•</span>
                          <span>Mål: {hygge.rekommenderadeProvytor} ytor</span>
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 ml-2"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteConfirm(hygge.id);
                        }}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                      <div className="text-muted-foreground ml-2">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      </div>
                    </Card>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
