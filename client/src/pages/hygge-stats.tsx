import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { useHygge, useHyggeStats } from "@/hooks/use-api";
import { Card } from "@/components/ui-elements";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TreePine, AlertTriangle, ShieldCheck, PieChart, Skull } from "lucide-react";

export default function HyggeStats() {
  const [, params] = useRoute("/hygge/:id/stats");
  const id = Number(params?.id);
  
  const { data: hygge } = useHygge(id);
  const { data: stats, isLoading } = useHyggeStats(id);

  if (isLoading || !stats || !hygge) {
    return <Layout backTo={`/hygge/${id}`}><div className="animate-pulse h-64 bg-secondary/50 rounded-2xl m-4" /></Layout>;
  }

  const chartData = stats.arter.map(art => ({
    name: art.art,
    friska: Math.max(0, art.plantorPerHa - art.skadadePerHa),
    skadade: art.skadadePerHa,
    doda: art.dodaPerHa,
    total: art.plantorPerHa
  })).sort((a, b) => b.total - a.total);

  const colorFriska = "hsl(142 40% 32%)";
  const colorSkadade = "hsl(36 60% 50%)";
  const colorDoda = "hsl(220 10% 55%)";

  const healthPercent = stats.plantorPerHa > 0 
    ? Math.round(((stats.plantorPerHa - stats.skadadePerHa) / stats.plantorPerHa) * 100) 
    : 0;

  const hasDoda = stats.totalDoda > 0;

  return (
    <Layout title={`Statistik: ${hygge.namn}`} backTo={`/hygge/${id}`}>
      
      {/* Top Metrics */}
      <div className={`grid gap-3 mb-6 ${hasDoda ? "grid-cols-2" : "grid-cols-2"}`}>
        <Card className="p-4 bg-primary text-primary-foreground border-none">
          <div className="flex items-center gap-2 mb-2 text-primary-foreground/80">
            <TreePine className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Totalt/ha</span>
          </div>
          <div className="font-display font-bold text-3xl">
            {Math.round(stats.plantorPerHa)}
          </div>
          <div className="text-xs mt-1 text-primary-foreground/70 font-medium">
            ± {Math.round(stats.ci95Plantor)} (95% CI)
          </div>
        </Card>

        <Card className="p-4 bg-accent text-accent-foreground border-none">
          <div className="flex items-center gap-2 mb-2 text-accent-foreground/90">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Skadade/ha</span>
          </div>
          <div className="font-display font-bold text-3xl">
            {Math.round(stats.skadadePerHa)}
          </div>
          <div className="text-xs mt-1 text-accent-foreground/80 font-medium">
            {stats.plantorPerHa > 0 ? Math.round((stats.skadadePerHa / stats.plantorPerHa)*100) : 0}% av beståndet
          </div>
        </Card>

        {hasDoda && (
          <Card className="col-span-2 p-4 bg-muted border-none flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Skull className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wide">Döda plantor/ha</span>
            </div>
            <div className="font-display font-bold text-2xl text-foreground">
              {Math.round(stats.dodaPerHa)}
              <span className="text-sm font-normal text-muted-foreground ml-2">({stats.totalDoda} totalt)</span>
            </div>
          </Card>
        )}
      </div>

      {/* Health Bar */}
      <Card className="mb-6 border-l-4 border-l-primary p-5">
        <div className="flex justify-between items-end mb-3">
          <h3 className="font-display font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Beståndshälsa
          </h3>
          <span className="font-bold text-xl text-primary">{healthPercent}% friska</span>
        </div>
        <div className="h-4 w-full bg-accent/20 rounded-full overflow-hidden flex">
          <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${healthPercent}%` }} />
          <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${100 - healthPercent}%` }} />
        </div>
      </Card>

      {/* Chart */}
      <Card className="mb-6 pt-6 pb-2 px-2">
        <h3 className="font-display font-bold text-center mb-6 flex justify-center items-center gap-2">
          <PieChart className="w-5 h-5 text-muted-foreground" />
          Fördelning per Trädart (St/ha)
        </h3>
        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(142 15% 45%)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(142 15% 45%)' }} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="friska" stackId="a" fill={colorFriska} radius={[0, 0, 4, 4]} name="Friska" />
                <Bar dataKey="skadade" stackId="a" fill={colorSkadade} radius={hasDoda ? [0, 0, 0, 0] : [4, 4, 0, 0]} name="Skadade" />
                {hasDoda && (
                  <Bar dataKey="doda" stackId="a" fill={colorDoda} radius={[4, 4, 0, 0]} name="Döda" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-muted-foreground">Ingen data</div>
        )}
        <div className="flex justify-center gap-4 mt-4 text-xs font-semibold text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary" /> Friska</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-accent" /> Skadade</div>
          {hasDoda && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-muted-foreground" /> Döda</div>}
        </div>
      </Card>

      {/* Per-species table */}
      {stats.arter.length > 0 && (
        <Card className="mb-6 p-0 overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Per Art</h3>
          </div>
          <div className="divide-y divide-border/50">
            {stats.arter.map(art => (
              <div key={art.art} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">{art.art}</span>
                  <span className="text-sm text-muted-foreground">{art.totalAntal} st totalt</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-primary/10 text-primary rounded-lg p-2 text-center">
                    <div className="font-bold text-sm">{Math.round(art.plantorPerHa)}</div>
                    <div className="text-primary/70">st/ha</div>
                  </div>
                  <div className="bg-accent/10 text-accent rounded-lg p-2 text-center">
                    <div className="font-bold text-sm">{Math.round(art.skadadePerHa)}</div>
                    <div className="text-accent/70">skad/ha</div>
                  </div>
                  <div className="bg-muted text-muted-foreground rounded-lg p-2 text-center">
                    <div className="font-bold text-sm">{Math.round(art.dodaPerHa)}</div>
                    <div>döda/ha</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Technical Data */}
      <Card className="p-5 bg-secondary/30">
        <h3 className="font-display font-bold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Teknisk Data</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Total areal</span>
            <span className="font-bold">{stats.totalAreaHa} ha</span>
          </div>
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Inlagda provytor</span>
            <span className="font-bold">{stats.antalProvytor} st</span>
          </div>
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Medelantal/provyta</span>
            <span className="font-bold">{stats.medelPlantorPerProvyta.toFixed(1)} st</span>
          </div>
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Standardavvikelse (s)</span>
            <span className="font-bold">{stats.sPlantor.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pb-1">
            <span className="text-muted-foreground">Totalt döda plantor</span>
            <span className="font-bold">{stats.totalDoda} st</span>
          </div>
        </div>
      </Card>

    </Layout>
  );
}
