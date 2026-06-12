import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Plus, Search, Edit3, Trash2, Eye } from 'lucide-react'

export default function KnowledgePage() {
  const [articles, setArticles] = useState<Array<Record<string, unknown>>>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showView, setShowView] = useState<Record<string, unknown> | null>(null)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState({ title: '', content: '', category: '', tags: '' })

  const load = () => api.knowledge.list(search, category).then(d => setArticles(d as Array<Record<string, unknown>>)).catch(() => {})
  const loadCats = () => api.knowledge.categories().then(d => setCategories(d as string[])).catch(() => {})

  useEffect(() => { load(); loadCats() }, [search, category])

  const save = async () => {
    if (editing) await api.knowledge.update(editing.id as number, form)
    else await api.knowledge.create(form)
    setShowForm(false); load(); loadCats()
  }

  const remove = async (id: number) => { if (!confirm('确定删除？')) return; await api.knowledge.delete(id); load() }

  const view = async (a: Record<string, unknown>) => {
    const detail = await api.knowledge.get(a.id as number)
    setShowView(detail as Record<string, unknown>)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">知识库</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ title: '', content: '', category: '', tags: '' }); setShowForm(true) }}>
          <Plus className="w-4 h-4" />新建文章
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="搜索标题/内容/标签..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">全部分类</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((a: Record<string, unknown>) => (
          <div key={a.id as number} className="card p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => view(a)}>
            <h3 className="font-medium mb-1 line-clamp-2">{a.title as string}</h3>
            <div className="flex gap-2 mb-2">
              <span className="badge badge-sent">{a.category as string || '未分类'}</span>
              <span className="text-xs text-slate-400 flex items-center gap-1"><Eye className="w-3 h-3" />{a.view_count as number}</span>
            </div>
            <p className="text-sm text-slate-500 line-clamp-3">{a.content as string}</p>
            <div className="flex gap-1 mt-3" onClick={e => e.stopPropagation()}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(a); setForm(a as typeof form); setShowForm(true) }}><Edit3 className="w-3 h-3" /></button>
              <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(a.id as number)}><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* View Modal */}
      {showView && (
        <div className="modal-backdrop" onClick={() => setShowView(null)}>
          <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">{showView.title as string}</h2>
            <div className="flex gap-2 mb-4">
              <span className="badge badge-sent">{showView.category as string || '未分类'}</span>
              <span className="text-xs text-slate-400">浏览 {showView.view_count as number} 次</span>
            </div>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700">
              {showView.content as string}
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn btn-ghost" onClick={() => setShowView(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal max-w-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{editing ? '编辑文章' : '新建文章'}</h3>
            <div className="space-y-3">
              <input className="input" placeholder="标题 *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="分类" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                <input className="input" placeholder="标签 (逗号分隔)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
              </div>
              <textarea className="input font-mono text-sm" rows={10} placeholder="内容 (Markdown)" value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={save} disabled={!form.title}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
