"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Building2, Plus, Trash2,
  Home, Car, MapPin, Gem, Paintbrush, Monitor,
  Sofa, TreeDeciduous, Briefcase, Package,
} from "lucide-react"
import { MobileFAB } from "@/components/layout/MobileFAB"

import {
  AssetDetailDialog,
  TYPE_OPTIONS,
  TYPE_LABELS,
  TYPE_ICONS,
  getKeyDetail,
} from "@/components/assets/AssetDetailDialog"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  assetsApi,
  type Asset,
  type AssetType,
  type AssetTypeSummary,
} from "@/lib/api/assets"
import { debtsApi, type Debt } from "@/lib/api/debts"
import { formatKz } from "@/lib/format"

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  // Derive from list so the modal sees fresh data after refetches.
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null)
  const detailAsset = useMemo(
    () => assets.find((a) => a.id === detailAssetId) ?? null,
    [assets, detailAssetId],
  )
  const [detailOpen, setDetailOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // Summary
  const [totalValue, setTotalValue] = useState(0)
  const [totalPurchasePrice, setTotalPurchasePrice] = useState(0)
  const [totalAppreciation, setTotalAppreciation] = useState(0)
  const [byType, setByType] = useState<AssetTypeSummary[]>([])

  // Debts for linking
  const [debts, setDebts] = useState<Debt[]>([])

  // Create form
  const [name, setName] = useState("")
  const [type, setType] = useState<AssetType>("real_estate")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [currentValue, setCurrentValue] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [annualChangeRate, setAnnualChangeRate] = useState("")
  const [description, setDescription] = useState("")
  const [notes, setNotes] = useState("")
  const [linkedDebtId, setLinkedDebtId] = useState("")
  const [isInsured, setIsInsured] = useState(false)
  const [insuranceValue, setInsuranceValue] = useState("")
  const [insuranceExpiry, setInsuranceExpiry] = useState("")

  // Type-specific details
  const [morada, setMorada] = useState("")
  const [area, setArea] = useState("")
  const [quartos, setQuartos] = useState("")
  const [estacionamento, setEstacionamento] = useState("")
  const [marca, setMarca] = useState("")
  const [modelo, setModelo] = useState("")
  const [ano, setAno] = useState("")
  const [matricula, setMatricula] = useState("")
  const [quilometros, setQuilometros] = useState("")
  const [nomeNegocio, setNomeNegocio] = useState("")
  const [percentagem, setPercentagem] = useState("")

  const fetchAssets = (loadMore = false) => {
    const params = loadMore && cursor ? `cursor=${cursor}` : ""
    assetsApi.listPage(params)
      .then((res) => {
        if (loadMore) {
          setAssets(prev => [...prev, ...res.items])
        } else {
          setAssets(res.items)
        }
        setCursor(res.cursor)
        setHasMore(res.has_more)
      })
      .catch(() => {})
  }

  const fetchSummary = () => {
    assetsApi.summary()
      .then((s) => {
        setTotalValue(s.total_value)
        setTotalPurchasePrice(s.total_purchase_price)
        setTotalAppreciation(s.total_appreciation)
        setByType(s.by_type)
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchAssets()
    fetchSummary()
    debtsApi.list().then(setDebts).catch(() => {})
  }, [])

  const resetForm = () => {
    setName("")
    setType("real_estate")
    setPurchasePrice("")
    setCurrentValue("")
    setPurchaseDate("")
    setAnnualChangeRate("")
    setDescription("")
    setNotes("")
    setLinkedDebtId("")
    setIsInsured(false)
    setInsuranceValue("")
    setInsuranceExpiry("")
    setMorada("")
    setArea("")
    setQuartos("")
    setEstacionamento("")
    setMarca("")
    setModelo("")
    setAno("")
    setMatricula("")
    setQuilometros("")
    setNomeNegocio("")
    setPercentagem("")
  }

  const buildDetails = (): Record<string, unknown> => {
    const d: Record<string, unknown> = {}
    if (type === "real_estate") {
      if (morada) d.morada = morada
      if (area) d.area = parseFloat(area)
      if (quartos) d.quartos = parseInt(quartos)
      if (estacionamento) d.estacionamento = parseInt(estacionamento)
    } else if (type === "vehicle") {
      if (marca) d.marca = marca
      if (modelo) d.modelo = modelo
      if (ano) d.ano = parseInt(ano)
      if (matricula) d.matricula = matricula
      if (quilometros) d.quilometros = parseInt(quilometros)
    } else if (type === "business_equity") {
      if (nomeNegocio) d.nome_negocio = nomeNegocio
      if (percentagem) d.percentagem = parseFloat(percentagem)
    }
    return d
  }

  const handleCreate = async () => {
    if (!name.trim() || !purchasePrice) return
    setIsSubmitting(true)
    try {
      const pp = Math.round(parseFloat(purchasePrice) * 100)
      const cv = currentValue ? Math.round(parseFloat(currentValue) * 100) : pp
      await assetsApi.create({
        name: name.trim(),
        type,
        purchase_price: pp,
        current_value: cv,
        purchase_date: purchaseDate || undefined,
        annual_change_rate: annualChangeRate ? parseFloat(annualChangeRate) : undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        linked_debt_id: linkedDebtId || undefined,
        is_insured: isInsured,
        insurance_value: isInsured && insuranceValue ? Math.round(parseFloat(insuranceValue) * 100) : undefined,
        insurance_expiry: isInsured && insuranceExpiry ? insuranceExpiry : undefined,
        details: buildDetails(),
      })
      setCreateOpen(false)
      resetForm()
      setCursor(null)
      setHasMore(false)
      fetchAssets()
      fetchSummary()
      toast.success("Bem registado com sucesso")
    } catch { /* handled by apiFetch */ }
    setIsSubmitting(false)
  }

  const handleDelete = (id: string) => {
    toast("Eliminar este bem?", {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          await assetsApi.remove(id).catch(() => {})
          setCursor(null)
          setHasMore(false)
          fetchAssets()
          fetchSummary()
          toast.success("Bem eliminado com sucesso")
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    })
  }

  const appreciationPct = totalPurchasePrice > 0
    ? Math.round((totalAppreciation / totalPurchasePrice) * 10000) / 100
    : 0

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Património</h2>
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm() }}>
          <DialogTrigger render={<Button className="hidden md:inline-flex" />}>
            <Plus className="h-4 w-4 mr-1" /> Novo bem
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registar bem</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Nome</Label><Input placeholder="Ex: Apartamento T3 Talatona" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => { if (v) setType(v as AssetType) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Preço de compra (Kz)</Label><Input type="number" placeholder="0" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="font-mono" /></div>
              <div><Label>Valor actual (Kz)</Label><Input type="number" placeholder="Igual ao preço de compra" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} className="font-mono" /></div>
              <div><Label>Data de compra (opcional)</Label><Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></div>
              <div><Label>Taxa anual de valorização (%, pode ser negativo)</Label><Input type="number" step="0.1" placeholder="0" value={annualChangeRate} onChange={(e) => setAnnualChangeRate(e.target.value)} className="font-mono" /></div>

              {/* Type-specific fields */}
              {type === "real_estate" && (
                <>
                  <div><Label>Morada</Label><Input placeholder="Endereço do imóvel" value={morada} onChange={(e) => setMorada(e.target.value)} /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Area (m2)</Label><Input type="number" placeholder="0" value={area} onChange={(e) => setArea(e.target.value)} className="font-mono" /></div>
                    <div><Label>Quartos</Label><Input type="number" placeholder="0" value={quartos} onChange={(e) => setQuartos(e.target.value)} className="font-mono" /></div>
                    <div><Label>Estac.</Label><Input type="number" placeholder="0" value={estacionamento} onChange={(e) => setEstacionamento(e.target.value)} className="font-mono" /></div>
                  </div>
                </>
              )}
              {type === "vehicle" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Marca</Label><Input placeholder="Ex: Toyota" value={marca} onChange={(e) => setMarca(e.target.value)} /></div>
                    <div><Label>Modelo</Label><Input placeholder="Ex: Hilux" value={modelo} onChange={(e) => setModelo(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Ano</Label><Input type="number" placeholder="2024" value={ano} onChange={(e) => setAno(e.target.value)} className="font-mono" /></div>
                    <div><Label>Matrícula</Label><Input placeholder="LD-00-00-AA" value={matricula} onChange={(e) => setMatricula(e.target.value)} /></div>
                    <div><Label>Km</Label><Input type="number" placeholder="0" value={quilometros} onChange={(e) => setQuilometros(e.target.value)} className="font-mono" /></div>
                  </div>
                </>
              )}
              {type === "business_equity" && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Nome do negócio</Label><Input placeholder="Ex: Loja XYZ" value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)} /></div>
                  <div><Label>Participação (%)</Label><Input type="number" step="0.1" placeholder="0" value={percentagem} onChange={(e) => setPercentagem(e.target.value)} className="font-mono" /></div>
                </div>
              )}

              <div><Label>Descrição (opcional)</Label><textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 resize-none" placeholder="Descrição do bem" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div><Label>Notas (opcional)</Label><textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 resize-none" placeholder="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

              <div>
                <Label>Dívida associada (opcional)</Label>
                <Select value={linkedDebtId} onValueChange={(v) => setLinkedDebtId(v || "")}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {debts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Label className="flex-1">Tem seguro</Label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isInsured}
                  onClick={() => setIsInsured(!isInsured)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isInsured ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${isInsured ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
              {isInsured && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Valor do seguro (Kz)</Label><Input type="number" placeholder="0" value={insuranceValue} onChange={(e) => setInsuranceValue(e.target.value)} className="font-mono" /></div>
                  <div><Label>Validade do seguro</Label><Input type="date" value={insuranceExpiry} onChange={(e) => setInsuranceExpiry(e.target.value)} /></div>
                </div>
              )}

              <Button className="w-full" onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? "A registar..." : "Registar bem"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valor total do património</p>
          <p className="text-xl font-mono font-bold mt-1">{formatKz(totalValue)}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total investido (compras)</p>
          <p className="text-xl font-mono font-bold mt-1">{formatKz(totalPurchasePrice)}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valorização / Desvalorização</p>
          <p className={`text-xl font-mono font-bold mt-1 ${totalAppreciation >= 0 ? "text-green-500" : "text-red-500"}`}>
            {totalAppreciation >= 0 ? "+" : ""}{formatKz(totalAppreciation)} ({appreciationPct}%)
          </p>
        </div>
      </div>

      {/* Breakdown by type */}
      {byType.length > 0 && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 mb-8">
          {byType.map((t) => {
            const Icon = TYPE_ICONS[t.type] || Package
            return (
              <div key={t.type} className="rounded-lg bg-card p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{t.label}</span>
                </div>
                <p className="text-sm font-mono font-bold">{formatKz(t.total_value)}</p>
                <p className="text-xs text-muted-foreground">{t.count} {t.count === 1 ? "item" : "itens"}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Asset list */}
      {assets.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 mx-auto opacity-30" />
          <p className="text-muted-foreground mt-3">Nenhum bem registado</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card shadow-sm divide-y divide-border">
          {assets.map((asset) => {
            const appreciation = asset.current_value - asset.purchase_price
            const appPct = asset.purchase_price > 0
              ? Math.round((appreciation / asset.purchase_price) * 10000) / 100
              : 0
            const Icon = TYPE_ICONS[asset.type] || Package
            const keyDetail = getKeyDetail(asset)

            return (
              <div key={asset.id} className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-muted/50 active:bg-muted/50 transition-colors" onClick={() => { setDetailAssetId(asset.id); setDetailOpen(true) }}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mr-2">
                        {TYPE_LABELS[asset.type] || asset.type}
                      </span>
                      {keyDetail && <span>{keyDetail}</span>}
                      {asset.purchase_date && !keyDetail && (
                        <span>Comprado em {new Date(asset.purchase_date + "T00:00:00").toLocaleDateString("pt-AO", { month: "short", year: "numeric" })}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-mono font-semibold text-green-600">{formatKz(asset.current_value)}</p>
                    <p className={`text-xs font-mono ${appreciation >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {appreciation >= 0 ? "+" : ""}{formatKz(appreciation)} ({appPct}%)
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(asset.id) }} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" size="sm" onClick={() => fetchAssets(true)}>
            Carregar mais
          </Button>
        </div>
      )}

      <AssetDetailDialog
        item={detailAsset}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={() => { setCursor(null); setHasMore(false); fetchAssets(); fetchSummary() }}
        onDeleted={() => { setCursor(null); setHasMore(false); fetchAssets(); fetchSummary() }}
      />
    
      <MobileFAB onClick={() => setCreateOpen(true)} label="Novo bem" />
</div>
  )
}
