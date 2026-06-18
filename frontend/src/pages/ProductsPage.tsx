import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'
import type { Product, ProductForm } from '../types'
import { Plus, Search, Edit3, Trash2, Package, RefreshCw, Loader2 } from 'lucide-react'

const EMPTY_FORM: ProductForm = {
  name: '', brand: '', origin_country: '', category: '', sku: '', unit: 'pcs', hs_code: '', description: '', specifications: '',
}

export default function ProductsPage() {
  const toast = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.products.list(search, category, brand) as Product[]
      setProducts(d)
    } catch {
      toast.error('加载产品列表失败')
    } finally {
      setLoading(false)
    }
  }, [search, category, brand, toast])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name, brand: p.brand, origin_country: p.origin_country,
      category: p.category, sku: p.sku,
      unit: p.unit, hs_code: p.hs_code,
      description: p.description, specifications: p.specifications,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await api.products.update(editing.id, form as unknown as Record<string, unknown>)
        toast.success('产品信息已更新')
      } else {
        await api.products.create(form as unknown as Record<string, unknown>)
        toast.success('产品添加成功！')
      }
      setShowForm(false)
      load()
    } catch (e) {
      toast.error((e as Error).message || '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (p: Product) => {
    if (!confirm(`确定删除产品「${p.name}」吗？`)) return
    try {
      await api.products.delete(p.id)
      toast.success('产品已删除')
      load()
    } catch (e) {
      toast.error((e as Error).message || '删除失败')
    }
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">产品管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">{products.length} 个产品</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus className="w-4 h-4" />新增产品
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="搜索产品名称/SKU/HS编码..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" value={brand} onChange={e => setBrand(e.target.value)}>
          <option value="">全部品牌</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">全部分类</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>产品名称</th><th>品牌</th><th>分类</th><th>SKU</th><th>HS编码</th><th>单位</th><th>描述</th><th>操作</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-16 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />加载中...
              </td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16">
                <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 mb-3">{search || category ? '没有匹配的产品' : '还没有添加产品'}</p>
                {!search && !category && (
                  <button className="btn btn-primary btn-sm" onClick={openNew}>
                    <Plus className="w-4 h-4" />添加第一个产品
                  </button>
                )}
              </td></tr>
            ) : (
              products.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td>{p.brand ? <span className="badge" style={{background: '#eef2ff', color: '#6366f1'}}>{p.brand}</span> : '-'}</td>
                  <td>{p.category ? <span className="badge badge-sent">{p.category}</span> : '-'}</td>
                  <td className="text-sm font-mono">{p.sku || '-'}</td>
                  <td className="text-sm font-mono text-blue-600">{p.hs_code || '-'}</td>
                  <td>{p.unit || '-'}</td>
                  <td className="text-sm text-slate-500 max-w-[150px] truncate">{p.description || p.specifications || '-'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Edit3 className="w-3 h-3" /></button>
                      <button className="btn btn-ghost btn-sm text-red-500" onClick={() => remove(p)}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{editing ? '编辑产品' : '新增产品'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">产品名称 <span className="text-red-400">*</span></label>
                <input className="input" placeholder="产品全称" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">品牌</label>
                  <input className="input" placeholder="如 FAR / CHEMISAFE" value={form.brand}
                    onChange={e => setForm({ ...form, brand: e.target.value })} list="product-brands" />
                  <datalist id="product-brands">
                    {brands.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">原产国</label>
                  <input className="input" placeholder="IT / DE / SE" value={form.origin_country}
                    onChange={e => setForm({ ...form, origin_country: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">分类</label>
                  <input className="input" placeholder="如：电子元器件" value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })} list="product-categories" />
                  <datalist id="product-categories">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">SKU</label>
                  <input className="input" placeholder="库存编码" value={form.sku}
                    onChange={e => setForm({ ...form, sku: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">HS编码</label>
                  <input className="input" placeholder="海关HS编码" value={form.hs_code}
                    onChange={e => setForm({ ...form, hs_code: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">单位</label>
                  <select className="select w-full" value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}>
                    <option value="pcs">件 (pcs)</option>
                    <option value="kg">千克 (kg)</option>
                    <option value="m">米 (m)</option>
                    <option value="set">套 (set)</option>
                    <option value="pair">双 (pair)</option>
                    <option value="box">箱 (box)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">描述</label>
                <input className="input" placeholder="简短描述" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">规格参数</label>
                <textarea className="input" rows={2} placeholder="技术规格、型号参数等..."
                  value={form.specifications} onChange={e => setForm({ ...form, specifications: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn btn-primary" onClick={save} disabled={!form.name.trim() || saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />保存中...</> : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
