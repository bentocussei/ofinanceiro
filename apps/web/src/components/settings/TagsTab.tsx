"use client"

import {
  Plus,
  Tag as TagIcon,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { tagsApi, type Tag } from "@/lib/api/tags"

// ---------------------------------------------------------------------------
// TagsTab — shared between personal and family settings
// ---------------------------------------------------------------------------

export function TagsTab() {
  const [tags, setTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#3b82f6")

  const TAG_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]

  const fetchTags = () => {
    tagsApi.list().then(setTags).catch(() => {})
  }

  useEffect(() => {
    fetchTags()
  }, [])

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    try {
      await tagsApi.create({ name: newTagName.trim(), color: newTagColor })
      setNewTagName("")
      setNewTagColor("#3b82f6")
      fetchTags()
      toast.success("Etiqueta criada com sucesso")
    } catch {
      toast.error("Erro ao criar etiqueta")
    }
  }

  const handleDeleteTag = (id: string) => {
    toast("Eliminar esta etiqueta?", {
      action: {
        label: "Eliminar",
        onClick: async () => {
          await tagsApi.remove(id).catch(() => {})
          fetchTags()
          toast.success("Etiqueta eliminada")
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    })
  }

  return (
    <div className="max-w-lg">
      <section className="rounded-xl bg-card shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <TagIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold">Etiquetas</h2>
            <p className="text-xs text-muted-foreground">Organize transaccoes com etiquetas personalizadas</p>
          </div>
        </div>

        {/* Tag list */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                {tag.name}
                <button onClick={() => handleDeleteTag(tag.id)} className="text-muted-foreground hover:text-red-500 ml-1">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground mb-4">Nenhuma etiqueta criada</p>
        )}

        {/* Create tag */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Nome da etiqueta</Label>
            <Input
              placeholder="Ex: Urgente"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cor</Label>
            <div className="flex gap-1">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewTagColor(c)}
                  className={`h-8 w-8 rounded-md border-2 transition-colors ${
                    newTagColor === c ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button size="sm" onClick={handleCreateTag} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Criar
          </Button>
        </div>
      </section>
    </div>
  )
}
