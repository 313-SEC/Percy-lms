import { useEffect, useState } from 'react'
import { aiApi, coursesApi, type AIProvider } from '../api/client'
import { useUIStore } from '../store/uiStore'

interface GeneratedModule { title: string; description: string; topics: string[] }
interface GeneratedCourse { title: string; description: string; modules: GeneratedModule[] }

export default function AICreator() {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState('')
  const [prompt, setPrompt] = useState('')
  const [numModules, setNumModules] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GeneratedCourse | null>(null)
  const [importing, setImporting] = useState(false)
  const addToast = useUIStore((s) => s.addToast)

  useEffect(() => {
    aiApi.providers().then((r) => {
      const enabled = r.data.filter((p) => p.is_enabled)
      setProviders(enabled)
      if (enabled[0]) setSelectedProvider(enabled[0].provider_name)
    }).catch(() => {})
  }, [])

  const generate = async () => {
    if (!prompt.trim() || !selectedProvider) return
    setGenerating(true)
    setResult(null)
    try {
      const res = await aiApi.generateCourse(prompt, selectedProvider, numModules)
      setResult(res.data)
    } catch (e: any) {
      addToast({ message: e?.response?.data?.detail || 'Generation failed', type: 'error', icon: 'error' })
    } finally {
      setGenerating(false)
    }
  }

  const importCourse = async () => {
    if (!result) return
    setImporting(true)
    try {
      // Create the course
      const courseRes = await coursesApi.create({
        title: result.title,
        description: result.description,
        color: '#9d00ff',
        category: 'AI Generated',
      })
      const courseId = courseRes.data.id

      // Create each module
      for (const mod of result.modules) {
        await coursesApi.createModule(courseId, {
          title: mod.title,
          description: mod.description + (mod.topics?.length ? '\n\nTopics:\n- ' + mod.topics.join('\n- ') : ''),
        })
      }

      addToast({ message: `Course "${result.title}" created successfully!`, type: 'success', icon: 'school' })
      setResult(null)
      setPrompt('')
    } catch {
      addToast({ message: 'Failed to import course', type: 'error', icon: 'error' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="cursor-blink">AI Course Creator</h2>
        <p className="text-muted text-sm" style={{ marginTop: 'var(--space-2)' }}>
          Generate a structured course outline using AI, then import it to BLACKSITE: Academy.
        </p>
      </div>

      {providers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-7)' }}>
          <span className="material-icons" style={{ fontSize: 48, color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-3)' }}>
            auto_awesome
          </span>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            No AI providers configured. Go to Settings to add your API keys.
          </p>
          <a href="/settings" className="btn btn-primary">Configure AI Providers</a>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="grid-2" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">AI Provider</label>
              <select className="input" value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}>
                {providers.map((p) => (
                  <option key={p.provider_name} value={p.provider_name}>
                    {p.provider_name.charAt(0).toUpperCase() + p.provider_name.slice(1)} — {p.model_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Modules to generate</label>
              <input
                type="number"
                className="input"
                min={1}
                max={20}
                value={numModules}
                onChange={(e) => setNumModules(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Course Topic / Prompt</label>
            <textarea
              className="input"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. 'Intermediate Python programming for data science, covering pandas, NumPy, and visualization'"
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={generate}
            disabled={generating || !prompt.trim()}
            style={{ width: '100%', justifyContent: 'center', padding: 'var(--space-3)' }}
          >
            {generating ? (
              <>
                <span className="animate-spin material-icons" style={{ fontSize: 18 }}>refresh</span>
                Generating...
              </>
            ) : (
              <>
                <span className="material-icons" style={{ fontSize: 18 }}>auto_awesome</span>
                Generate Course Outline
              </>
            )}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3>{result.title}</h3>
            <button className="btn btn-secondary" onClick={importCourse} disabled={importing}>
              <span className="material-icons" style={{ fontSize: 16 }}>download</span>
              {importing ? 'Importing...' : 'Import to BLACKSITE'}
            </button>
          </div>

          {result.description && (
            <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-5)' }}>{result.description}</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {result.modules.map((mod, i) => (
              <div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                  <span className="badge badge-purple" style={{ flexShrink: 0, marginTop: 2 }}>Module {i + 1}</span>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>{mod.title}</div>
                    {mod.description && <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-2)' }}>{mod.description}</p>}
                    {mod.topics?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                        {mod.topics.map((t, j) => (
                          <span key={j} className="badge badge-cyan">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
