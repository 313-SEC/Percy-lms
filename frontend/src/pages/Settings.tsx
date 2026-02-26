import { useEffect, useState } from 'react'
import { aiApi, type AIProvider, type AIProviderConfig } from '../api/client'
import { useUIStore } from '../store/uiStore'

const PROVIDERS = [
  { name: 'openai', label: 'OpenAI (ChatGPT)', defaultModel: 'gpt-4o-mini', needsKey: true },
  { name: 'anthropic', label: 'Anthropic (Claude)', defaultModel: 'claude-haiku-4-5-20251001', needsKey: true },
  { name: 'gemini', label: 'Google Gemini', defaultModel: 'gemini-1.5-flash', needsKey: true },
  { name: 'ollama', label: 'Ollama (Local LLM)', defaultModel: 'llama3.2', needsKey: false, hasBaseUrl: true },
  { name: 'huggingface', label: 'HuggingFace', defaultModel: 'mistralai/Mistral-7B-Instruct-v0.3', needsKey: true },
]

function ProviderCard({ meta, current, onSave }: {
  meta: typeof PROVIDERS[0]
  current?: AIProvider
  onSave: (config: AIProviderConfig) => Promise<void>
}) {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(current?.model_name ?? meta.defaultModel)
  const [baseUrl, setBaseUrl] = useState(current?.base_url ?? 'http://localhost:11434')
  const [enabled, setEnabled] = useState(current?.is_enabled ?? false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await onSave({
      provider_name: meta.name,
      api_key: apiKey || undefined,
      model_name: model,
      base_url: meta.hasBaseUrl ? baseUrl : undefined,
      is_enabled: enabled,
    })
    setApiKey('')
    setSaving(false)
  }

  return (
    <div className="card" style={{ borderColor: enabled ? 'var(--cyan)' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div>
          <div style={{ fontWeight: 700 }}>{meta.label}</div>
          {current?.has_api_key && (
            <span className="badge badge-green" style={{ marginTop: 4 }}>Key configured</span>
          )}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            style={{ accentColor: 'var(--cyan)' }}
          />
          <span className="text-sm">Enabled</span>
        </label>
      </div>

      {meta.needsKey && (
        <div className="form-group">
          <label className="form-label">API Key {current?.has_api_key ? '(leave blank to keep current)' : ''}</label>
          <input
            className="input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={current?.has_api_key ? '••••••••••••' : 'sk-...'}
          />
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Model</label>
        <input className="input" value={model} onChange={(e) => setModel(e.target.value)} />
      </div>

      {meta.hasBaseUrl && (
        <div className="form-group">
          <label className="form-label">Base URL</label>
          <input className="input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://localhost:11434" />
        </div>
      )}

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}

export default function Settings() {
  const [configured, setConfigured] = useState<AIProvider[]>([])
  const addToast = useUIStore((s) => s.addToast)

  const load = () => aiApi.providers().then((r) => setConfigured(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const saveProvider = async (config: AIProviderConfig) => {
    await aiApi.saveProvider(config)
    addToast({ message: `${config.provider_name} saved`, type: 'success', icon: 'check' })
    load()
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 className="cursor-blink">Settings</h2>
        <p className="text-muted text-sm" style={{ marginTop: 'var(--space-2)' }}>
          Configure AI providers. API keys are encrypted at rest.
        </p>
      </div>

      <h3 style={{ marginBottom: 'var(--space-4)' }}>AI Providers</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {PROVIDERS.map((meta) => (
          <ProviderCard
            key={meta.name}
            meta={meta}
            current={configured.find((c) => c.provider_name === meta.name)}
            onSave={saveProvider}
          />
        ))}
      </div>

      <div className="divider" />

      <div className="card">
        <h3 style={{ marginBottom: 'var(--space-3)' }}>NotebookLM Integration</h3>
        <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-4)' }}>
          Export your notes as Markdown to import into Google NotebookLM.
          Go to the Notes page and click the download icon to export all notes.
        </p>
        <ol className="text-sm" style={{ color: 'var(--text-secondary)', paddingLeft: 'var(--space-5)', lineHeight: 2 }}>
          <li>Go to Notes → Click the export icon</li>
          <li>Save the <code>.md</code> file</li>
          <li>Open <a href="https://notebooklm.google.com" target="_blank" rel="noreferrer">NotebookLM</a></li>
          <li>Create a new notebook → Add source → Upload the Markdown file</li>
        </ol>
      </div>
    </div>
  )
}
