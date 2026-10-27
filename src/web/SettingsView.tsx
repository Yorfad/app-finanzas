import { useState, type ChangeEvent, type FormEvent } from 'react';
import { todayISO } from '../core/dates';
import { CURRENCIES } from '../core/money';
import { useFinance } from '../state/FinanceProvider';

export function SettingsView() {
  const { settings, updateSettings, exportData, importData } = useFinance();
  const [msg, setMsg] = useState('');

  const download = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `finanzas-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const n = await importData(JSON.parse(await file.text()));
      setMsg(`Importado: ${n} registros nuevos o actualizados.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se pudo importar el archivo');
    }
  };

  return (
    <section>
      <div className="block">
        <h3>Moneda</h3>
        <div className="card pad">
          <select value={settings.currency} onChange={(e) => updateSettings({ currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} · {c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <CloudSection />

      <div className="block">
        <h3>Copia de seguridad</h3>
        <div className="card pad stack">
          <p className="muted small">Descarga todos tus datos en un archivo o restáuralos (se combinan con los actuales).</p>
          <div className="row-actions">
            <button className="btn" onClick={download}>Exportar</button>
            <label className="btn">
              Importar
              <input type="file" accept="application/json,.json" onChange={upload} hidden />
            </label>
          </div>
          {msg && <p className="small">{msg}</p>}
        </div>
      </div>
    </section>
  );
}

function CloudSection() {
  const { sync } = useFinance();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await sync.signIn(email.trim());
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="block">
      <h3>Nube</h3>
      <div className="card pad stack">
        {sync.status === 'off' && (
          <p className="muted small">
            Modo local: tus datos se guardan solo en este dispositivo. Para sincronizar entre dispositivos,
            configura Supabase (ver README) — tus datos actuales se subirán al conectarte.
          </p>
        )}

        {sync.status === 'signedOut' &&
          (sent ? (
            <p className="small">📧 Te enviamos un enlace a <b>{email}</b>. Ábrelo en este dispositivo para entrar.</p>
          ) : (
            <form className="stack" onSubmit={submit}>
              <p className="muted small">Entra con tu correo para respaldar y sincronizar tus datos.</p>
              <input type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button className="btn primary" type="submit">Enviar enlace de acceso</button>
              {err && <p className="error">{err}</p>}
            </form>
          ))}

        {sync.user && (
          <>
            <p className="small">Conectado como <b>{sync.user.email}</b></p>
            <p className="muted small">
              {sync.status === 'syncing'
                ? 'Sincronizando…'
                : sync.lastSync
                  ? `Última sincronización: ${new Date(sync.lastSync).toLocaleTimeString()}`
                  : 'Pendiente de sincronizar'}
            </p>
            {sync.status === 'error' && <p className="error">Error: {sync.error}</p>}
            <div className="row-actions">
              <button className="btn primary" onClick={sync.run} disabled={sync.status === 'syncing'}>Sincronizar ahora</button>
              <button className="btn" onClick={sync.signOut}>Cerrar sesión</button>
            </div>
          </>
        )}

        {sync.status === 'error' && !sync.user && <p className="error">Error: {sync.error}</p>}
      </div>
    </div>
  );
}
