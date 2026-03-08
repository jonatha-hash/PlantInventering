import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useHygge, useCreateProvyta } from "@/hooks/use-api";
import { Card, Button, Input, Label } from "@/components/ui-elements";
import { Copy, Plus, BarChart3, TreePine, AlertTriangle, ChevronRight, Loader2, MapPin, FileText, Download, Trash2, Edit2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProvytaSchema } from "@shared/schema";
import { z } from "zod";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useDeleteProvyta, useUpdateProvyta, useHyggeStats, useDeleteHygge } from "@/hooks/use-api";

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
  const { data: stats } = useHyggeStats(id);
  const createMutation = useCreateProvyta(id);
  const deleteMutation = useDeleteProvyta(id);
  const deleteHyggeMutation = useDeleteHygge();
  const updateHyggeMutation = useUpdateProvyta(id);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingHyggeId, setEditingHyggeId] = useState<number | null>(null);
  const [deleteConfirmProvyta, setDeleteConfirmProvyta] = useState<number | null>(null);
  const [editingProvytaId, setEditingProvytaId] = useState<number | null>(null);

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

  const handleExportPDF = () => {
    if (!hygge || !stats) return;
    
    const doc = new jsPDF();
    const title = `Fältinventering: ${hygge.namn}`;
    
    doc.setFontSize(20);
    doc.text(title, 14, 22);
    
    doc.setFontSize(11);
    let yPos = 32;
    doc.text(`Datum: ${new Date().toLocaleDateString('sv-SE')}`, 14, yPos);
    yPos += 6;
    doc.text(`Areal: ${hygge.hektar} ha`, 14, yPos);
    yPos += 6;
    doc.text(`Antal provytor: ${hygge.provytor.length} / ${hygge.rekommenderadeProvytor}`, 14, yPos);
    yPos += 6;
    if (hygge.anteckning) {
      doc.text(`Anteckning objekt: ${hygge.anteckning}`, 14, yPos);
      yPos += 6;
    }
    
    // Add Plot Table
    const tableData = hygge.provytor.map((p, i) => {
      const treeCount = p.tradposter.reduce((sum, t) => sum + t.antal, 0);
      const damageCount = p.tradposter.reduce((sum, t) => sum + t.skadade, 0);
      const species = p.tradposter.map(t => `${t.art}: ${t.antal}st`).join(', ');
      return [i + 1, `${p.radieM}m`, treeCount, damageCount, species, p.anteckning || '-'];
    });
    
    autoTable(doc, {
      startY: yPos + 2,
      head: [['Nr', 'Radie', 'Antal träd', 'Skadade', 'Arter', 'Anteckning']],
      body: tableData,
    });
    
    // Statistics section
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(14);
    doc.text('Statistik', 14, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    const statsData = [
      ['Plantor/ha', Math.round(stats.plantorPerHa).toString()],
      ['Skadade/ha', Math.round(stats.skadadePerHa).toString()],
      ['Medel plantor/provyta', stats.medelPlantorPerProvyta.toFixed(1)],
      ['Standardavvikelse', stats.sPlantor.toFixed(2)],
      ['95% Konfidensintervall', `±${Math.round(stats.ci95Plantor)}`],
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Mått', 'Värde']],
      body: statsData,
    });
    
    if (stats.arter.length > 0) {
      yPos = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setFontSize(14);
      doc.text('Arter', 14, yPos);
      yPos += 8;
      
      const speciesData = stats.arter.map(art => [
        art.art,
        art.totalAntal.toString(),
        Math.round(art.plantorPerHa).toString(),
        art.medelPerProvyta.toFixed(1)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Art', 'Totalt', 'St/ha', 'Medel/yta']],
        body: speciesData,
      });
    }
    
    doc.save(`${hygge.namn}_inventering.pdf`);
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

        {hygge.anteckning && (
          <div className="relative z-10 flex items-start gap-2 text-primary-foreground/90 bg-black/10 p-3 rounded-xl mb-4 text-sm italic">
            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>{hygge.anteckning}</p>
          </div>
        )}

        {/* Progress bar */}
        <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden mt-4">
          <div 
            className="h-full bg-white transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button 
          variant="secondary"
          className="flex-col h-auto py-4 rounded-2xl gap-2 text-primary"
          onClick={handleDuplicateLast}
          disabled={createMutation.isPending || provytorCount === 0}
        >
          {createMutation.isPending ? <Loader2 className="w-7 h-7 animate-spin" /> : <Copy className="w-7 h-7" />}
          <span>Kopiera senaste</span>
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

      <div className="mb-8">
        <Button 
          variant="outline" 
          className="w-full rounded-2xl h-12 border-primary/20 text-primary hover:bg-primary/5"
          onClick={handleExportPDF}
        >
          <Download className="w-5 h-5 mr-2" />
          Exportera till PDF
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
                  <h3 className="font-display font-bold text-lg text-primary">Skapa ny Provyta</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="radieM">Cirkelradie (m)</Label>
                    <Input 
                      id="radieM" 
                      type="number" 
                      step="0.01" 
                      inputMode="decimal"
                      {...register("radieM")} 
                    />
                    {errors.radieM && <p className="text-destructive text-sm mt-1">{errors.radieM.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="anteckning">Anteckning yta</Label>
                    <Input id="anteckning" placeholder="Valfritt" {...register("anteckning")} />
                  </div>
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
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:bg-primary/10 h-9"
          onClick={() => setLocation(`/hygge/${id}/stats`)}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Se Statistik
        </Button>
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
              <div key={yta.id}>
                {deleteConfirmProvyta === yta.id ? (
                  <Card className="p-4 bg-destructive/10 border-destructive/30">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <span className="font-semibold text-destructive">Radera provyta nr {actualIndex}?</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setDeleteConfirmProvyta(null)}
                        disabled={deleteMutation.isPending}
                      >
                        Avbryt
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => {
                          deleteMutation.mutate(yta.id, {
                            onSuccess: () => setDeleteConfirmProvyta(null),
                          });
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Radera"}
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Link href={`/hygge/${id}/provyta/${yta.id}`} className="block">
                    <Card className="p-4 flex items-center group relative">
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
                        {yta.anteckning && (
                          <p className="text-xs text-muted-foreground italic mt-1">{yta.anteckning}</p>
                        )}
                        {damageCount > 0 && (
                          <div className="flex items-center text-xs text-accent font-medium mt-1">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {damageCount} skadade
                          </div>
                        )}
                      </div>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 ml-2"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteConfirmProvyta(yta.id);
                        }}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                      <div className="text-muted-foreground ml-2">
                        <ChevronRight className="w-6 h-6" />
                      </div>
                    </Card>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}

    </Layout>
  );
}
