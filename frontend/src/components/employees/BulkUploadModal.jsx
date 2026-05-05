import { useState, useRef } from 'react';
import { employeeAPI } from '../../utils/phase2Api';
import toast from 'react-hot-toast';

const BulkUploadModel = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  if (!isOpen) return null;

  const handleFile = (f) => {
    if (!f?.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file only');
      return;
    }
    setFile(f);
    setResults(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await employeeAPI.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employee-upload-template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template');
    }
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Please select a CSV file'); return; }
    setLoading(true);
    try {
      const res = await employeeAPI.bulkUpload(file);
      setResults(res.data.data);
      if (res.data.data.summary.created > 0) {
        toast.success(`${res.data.data.summary.created} employees created!`);
        onSuccess?.();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setFile(null); setResults(null); };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">📦 Bulk Upload Employees</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {!results ? (
            <>
              {/* Step 1: Download template */}
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Step 1 — Download Template
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Fill in the CSV template with employee data
                  </div>
                </div>
                <button className="btn-ghost" style={{ padding: '8px 16px', whiteSpace: 'nowrap', fontSize: 13 }} onClick={handleDownloadTemplate}>
                  ⬇ Template
                </button>
              </div>

              {/* Step 2: Upload */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                  Step 2 — Upload Filled CSV
                </div>
                <div
                  className={`file-drop ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                  onClick={() => inputRef.current?.click()}
                >
                  <input ref={inputRef} type="file" accept=".csv" onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
                  {file ? (
                    <div>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--violet-light)', marginBottom: 4 }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>☁️</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Drop your CSV here
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>or click to browse</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Results */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total',   value: results.summary.total,   color: '#a78bfa' },
                  { label: 'Created', value: results.summary.created,  color: 'var(--success)' },
                  { label: 'Skipped', value: results.summary.skipped,  color: 'var(--warning)' },
                  { label: 'Failed',  value: results.summary.failed,   color: 'var(--error)' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {results.results.created.length > 0 && (
                <div style={{ background: 'var(--success-dim)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 12 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>
                    ✅ CREATED EMPLOYEES (save these credentials!)
                  </div>
                  <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                    {results.results.created.map((c, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{c.employeeId}</span>
                        <span>{c.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{c.email}</span>
                        <span style={{ color: 'var(--violet-light)', marginLeft: 'auto' }}>🔑 {c.password}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.results.skipped.length > 0 && (
                <div style={{ background: '#f59e0b11', border: '1px solid #f59e0b33', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 12 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--warning)', marginBottom: 6 }}>⚠️ SKIPPED</div>
                  {results.results.skipped.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email} — {s.reason}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {results ? (
            <>
              <button className="btn-ghost" style={{ padding: '10px 20px' }} onClick={handleReset}>Upload Another</button>
              <button className="btn-primary" style={{ padding: '10px 24px', width: 'auto' }} onClick={onClose}>Done</button>
            </>
          ) : (
            <>
              <button className="btn-ghost" style={{ padding: '10px 20px' }} onClick={onClose}>Cancel</button>
              <button className="btn-primary" style={{ padding: '10px 24px', width: 'auto' }} onClick={handleUpload} disabled={!file || loading}>
                {loading && <span className="btn-loader" />}
                {loading ? 'Uploading...' : 'Upload CSV'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModel;
