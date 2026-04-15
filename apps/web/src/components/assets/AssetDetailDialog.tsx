"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Pencil, Trash2, X, RefreshCw,
  Home, Car, MapPin, Gem, Paintbrush, Monitor,
  Sofa, TreeDeciduous, Briefcase, Package,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from "@/lib/api/assets"
import { debtsApi, type Debt } from "@/lib/api/debts"
import { formatKz } from "@/lib/format"

const TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: "real_estate", label: "Imóvel" },
  { value: "vehicle", label: "Veículo" },
  { value: "land", label: "Terreno" },
  { value: "jewelry", label: "Jóias" },
  { value: "art", label: "Arte" },
  { value: "electronics", label: "Electrónicos" },
  { value: "furniture", label: "Mobiliário" },
  { value: "livestock", label: "Gado" },
  { value: "business_equity", label: "Participação em negócio" },
  { value: "other", label: "Outro" },
]

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.value, t.label]))

const TYPE_ICONS: Record<string, React.ElementType> = {
  real_estate: Home,
  vehicle: Car,
  land: MapPin,
  jewelry: Gem,
  art: Paintbrush,
  electronics: Monitor,
  furniture: Sofa,
  livestock: TreeDeciduous,
  business_equity: Briefcase,
  other: Package,
}

function getKeyDetail(asset: Asset): string | null {
  const d = asset.details || {}
  if (asset.type === "real_estate") {
    const parts: string[] = []
    if (d.quartos) parts.push(`${d.quartos} quartos`)
    if (d.area) parts.push(`${d.area} m²`)
    if (d.morada) parts.push(String(d.morada))
    return parts.join(", ") || null
  }
  if (asset.type === "vehicle") {
    const parts: string[] = []
    if (d.marca) parts.push(String(d.marca))
    if (d.modelo) parts.push(String(d.modelo))
    if (d.ano) parts.push(String(d.ano))
    if (d.matricula) parts.push(String(d.matricula))
    return parts.join(" ") || null
  }
  if (asset.type === "business_equity") {
    const parts: string[] = []
    if (d.nome_negocio) parts.push(String(d.nome_negocio))
    if (d.percentagem) parts.push(`${d.percentagem}%`)
    return parts.join(" -- ") || null
  }
  return null
}

interface Props {
  item: Asset | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
  onDeleted?: () => void
  contextHeaders?: Record<string, string>
}

export function AssetDetailDialog({
  item,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  contextHeaders,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [revalueOpen, setRevalueOpen] = useState(false)
  const [error, setError] = useState("")

  // Debts for linking
  const [debts, setDebts] = useState<Debt[]>([])

  // Edit form state
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

  // Revalue form
  const [revalueAmount, setRevalueAmount] = useState("")

  useEffect(() => {
    const opts = contextHeaders ? { headers: contextHeaders } : undefined
    debtsApi.list(opts).then(setDebts).catch(() => {})
  }, [contextHeaders])

  useEffect(() => {
    if (item && isEditing) {
      setName(item.name)
      setType(item.type as AssetType)
      setPurchasePrice(String(item.purchase_price / 100))
      setCurrentValue(String(item.current_value / 100))
      setPurchaseDate(item.purchase_date || "")
      setAnnualChangeRate(item.annual_change_rate != null ? String(item.annual_change_rate) : "")
      setDescription(item.description || "")
      setNotes(item.notes || "")
      setLinkedDebtId(item.linked_debt_id || "")
      setIsInsured(item.is_insured)
      setInsuranceValue(item.insurance_value != null ? String(item.insurance_value / 100) : "")
      setInsuranceExpiry(item.insurance_expiry || "")

      const d = item.details || {}
      setMorada(String(d.morada || ""))
      setArea(String(d.area || ""))
      setQuartos(String(d.quartos || ""))
      setEstacionamento(String(d.estacionamento || ""))
      setMarca(String(d.marca || ""))
      setModelo(String(d.modelo || ""))
      setAno(String(d.ano || ""))
      setMatricula(String(d.matricula || ""))
      setQuilometros(String(d.quilometros || ""))
      setNomeNegocio(String(d.nome_negocio || ""))
      setPercentagem(String(d.percentagem || ""))
    }
  }, [item, isEditing])

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

  const handleDelete = () => {
    if (!item) return
    toast(`Eliminar o bem "${item.name}"?`, {
      description: "Esta acção não pode ser revertida.",
      action: {
        label: "Eliminar",
        onClick: async () => {
          setIsDeleting(true)
          try {
            const opts = contextHeaders ? { headers: contextHeaders } : undefined
            await assetsApi.remove(item.id, opts)
            onOpenChange(false)
            onDeleted?.()
            toast.success("Bem eliminado com sucesso")
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erro ao eliminar"
            setError(message)
          } finally {
            setIsDeleting(false)
          }
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    })
  }

  const handleSave = async () => {
    if (!item || !name.trim()) return
    setIsSubmitting(true)
    setError("")
    try {
      const opts = contextHeaders ? { headers: contextHeaders } : undefined
      await assetsApi.update(item.id, {
        name: name.trim(),
        type,
        purchase_price: Math.round(parseFloat(purchasePrice) * 100),
        current_value: Math.round(parseFloat(currentValue) * 100),
        purchase_date: purchaseDate || undefined,
        annual_change_rate: annualChangeRate ? parseFloat(annualChangeRate) : undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        linked_debt_id: linkedDebtId || undefined,
        is_insured: isInsured,
        insurance_value: isInsured && insuranceValue ? Math.round(parseFloat(insuranceValue) * 100) : undefined,
        insurance_expiry: isInsured && insuranceExpiry ? insuranceExpiry : undefined,
        details: buildDetails(),
      }, opts)
      setIsEditing(false)
      onUpdated?.()
      toast.success("Bem actualizado com sucesso")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao actualizar"
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevalue = async () => {
    if (!item || !revalueAmount) return
    setIsSubmitting(true)
    setError("")
    try {
      const opts = contextHeaders ? { headers: contextHeaders } : undefined
      await assetsApi.revalue(item.id, {
        current_value: Math.round(parseFloat(revalueAmount) * 100),
      }, opts)
      setRevalueOpen(false)
      setRevalueAmount("")
      onUpdated?.()
      toast.success("Valor actualizado com sucesso")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao reavaliar"
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!item) return null

  const appreciation = item.current_value - item.purchase_price
  const appreciationPct = item.purchase_price > 0
    ? Math.round((appreciation / item.purchase_price) * 10000) / 100
    : 0
  const Icon = TYPE_ICONS[item.type] || Package
  const keyDetail = getKeyDetail(item)
  const linkedDebt = debts.find((d) => d.id === item.linked_debt_id)

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setError(""); setIsEditing(false); setRevalueOpen(false) } }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${appreciation >= 0 ? "text-green-500" : "text-red-500"}`} />
              {isEditing ? "Editar bem" : item.name}
            </span>
          </DialogTitle>
        </DialogHeader>

        {revalueOpen ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Valor actual: <span className="font-mono font-semibold">{formatKz(item.current_value)}</span></p>
            <div><Label>Novo valor (Kz)</Label><Input type="number" placeholder="0" value={revalueAmount} onChange={(e) => setRevalueAmount(e.target.value)} className="font-mono" autoFocus /></div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRevalueOpen(false)}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button className="flex-1" onClick={handleRevalue} disabled={isSubmitting}>
                {isSubmitting ? "A guardar..." : "Reavaliar"}
              </Button>
            </div>
          </div>
        ) : isEditing ? (
          <div className="space-y-4 py-2">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
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
            <div><Label>Preço de compra (Kz)</Label><Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="font-mono" /></div>
            <div><Label>Valor actual (Kz)</Label><Input type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} className="font-mono" /></div>
            <div><Label>Data de compra (opcional)</Label><Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></div>
            <div><Label>Taxa anual de valorização (%)</Label><Input type="number" step="0.1" placeholder="0" value={annualChangeRate} onChange={(e) => setAnnualChangeRate(e.target.value)} className="font-mono" /></div>

            {/* Type-specific fields */}
            {type === "real_estate" && (
              <>
                <div><Label>Morada</Label><Input value={morada} onChange={(e) => setMorada(e.target.value)} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Área (m2)</Label><Input type="number" value={area} onChange={(e) => setArea(e.target.value)} className="font-mono" /></div>
                  <div><Label>Quartos</Label><Input type="number" value={quartos} onChange={(e) => setQuartos(e.target.value)} className="font-mono" /></div>
                  <div><Label>Estac.</Label><Input type="number" value={estacionamento} onChange={(e) => setEstacionamento(e.target.value)} className="font-mono" /></div>
                </div>
              </>
            )}
            {type === "vehicle" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Marca</Label><Input value={marca} onChange={(e) => setMarca(e.target.value)} /></div>
                  <div><Label>Modelo</Label><Input value={modelo} onChange={(e) => setModelo(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Ano</Label><Input type="number" value={ano} onChange={(e) => setAno(e.target.value)} className="font-mono" /></div>
                  <div><Label>Matrícula</Label><Input value={matricula} onChange={(e) => setMatricula(e.target.value)} /></div>
                  <div><Label>Km</Label><Input type="number" value={quilometros} onChange={(e) => setQuilometros(e.target.value)} className="font-mono" /></div>
                </div>
              </>
            )}
            {type === "business_equity" && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Nome do negócio</Label><Input value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)} /></div>
                <div><Label>Participação (%)</Label><Input type="number" step="0.1" value={percentagem} onChange={(e) => setPercentagem(e.target.value)} className="font-mono" /></div>
              </div>
            )}

            <div><Label>Descrição (opcional)</Label><textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div><Label>Notas (opcional)</Label><textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

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
                <div><Label>Valor do seguro (Kz)</Label><Input type="number" value={insuranceValue} onChange={(e) => setInsuranceValue(e.target.value)} className="font-mono" /></div>
                <div><Label>Validade</Label><Input type="date" value={insuranceExpiry} onChange={(e) => setInsuranceExpiry(e.target.value)} /></div>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? "A guardar..." : "Guardar"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Type & detail */}
            <div className="text-center py-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {TYPE_LABELS[item.type] || item.type}
              </span>
              {keyDetail && (
                <p className="text-xs text-muted-foreground mt-1">{keyDetail}</p>
              )}
            </div>

            {/* Values */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Preço de compra</p>
                <p className="font-mono font-bold">{formatKz(item.purchase_price)}</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Valor actual</p>
                <p className="font-mono font-bold">{formatKz(item.current_value)}</p>
              </div>
            </div>

            {/* Appreciation */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Valorização</p>
              <p className={`text-2xl font-mono font-bold ${appreciation >= 0 ? "text-green-500" : "text-red-500"}`}>
                {appreciation >= 0 ? "+" : ""}{formatKz(appreciation)}
              </p>
              <p className={`text-sm font-mono ${appreciation >= 0 ? "text-green-500" : "text-red-500"}`}>
                ({appreciationPct}%)
              </p>
            </div>

            {/* Extra info */}
            <div className="space-y-2 text-sm text-muted-foreground">
              {item.purchase_date && (
                <p>Data de compra: {new Date(item.purchase_date + "T00:00:00").toLocaleDateString("pt-AO")}</p>
              )}
              {item.annual_change_rate != null && item.annual_change_rate !== 0 && (
                <p>Taxa anual: <span className="font-mono">{item.annual_change_rate}%</span></p>
              )}
              {item.last_valuation_date && (
                <p>Última avaliação: {new Date(item.last_valuation_date + "T00:00:00").toLocaleDateString("pt-AO")}</p>
              )}
              {linkedDebt && (
                <p>Dívida associada: <span className="font-medium text-foreground">{linkedDebt.name}</span></p>
              )}
              {item.is_insured && (
                <div>
                  <p>Seguro: <span className="font-mono">{item.insurance_value ? formatKz(item.insurance_value) : "Sim"}</span></p>
                  {item.insurance_expiry && (
                    <p>Validade: {new Date(item.insurance_expiry + "T00:00:00").toLocaleDateString("pt-AO")}</p>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm">{item.description}</p>
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground mb-1">Notas</p>
                <p className="text-sm">{item.notes}</p>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => { setRevalueOpen(true); setRevalueAmount(String(item.current_value / 100)) }}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reavaliar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { TYPE_OPTIONS, TYPE_LABELS, TYPE_ICONS, getKeyDetail }
