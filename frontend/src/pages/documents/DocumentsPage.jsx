import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  getMyDocuments,
  getGlobalDocuments,
  getAllDocuments,
  uploadDocument,
  deleteDocument,
} from "../../services/documentService";
import "./DocumentsPage.css";

const CATEGORIES = ["contract", "resume", "id_proof", "policy", "handbook", "other"];
const CAT_LABELS  = { contract: "Contract", resume: "Resume", id_proof: "ID Proof", policy: "Policy", handbook: "Handbook", other: "Other" };
const CAT_ICONS   = { contract: "📜", resume: "📋", id_proof: "🪪", policy: "📘", handbook: "📗", other: "📄" };


const getViewUrl = (url, fileType) => {
  if (!url) return "#";
  if (fileType !== "pdf") return url;
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
};
const fmt = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const timeStr = (date) =>
  new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function DocumentsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isHRAdmin = ["admin", "hr"].includes(role);

  const [tab,         setTab]         = useState("my");       // my | global | all
  const [myDocs,      setMyDocs]      = useState([]);
  const [globalDocs,  setGlobalDocs]  = useState([]);
  const [allDocs,     setAllDocs]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [deleting,    setDeleting]    = useState({});
  const [showUpload,  setShowUpload]  = useState(false);
  const [catFilter,   setCatFilter]   = useState("");
  const [error,       setError]       = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const fileRef = useRef(null);

  // Upload form state
  const [form, setForm] = useState({
    name: "", description: "", category: "other", isGlobal: false,
  });

  // ── Fetch ─────────────────────────────────────────────
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "my") {
        const res = await getMyDocuments();
        setMyDocs(res.data.data.documents || []);
      } else if (tab === "global") {
        const res = await getGlobalDocuments(catFilter || undefined);
        setGlobalDocs(res.data.data.documents || []);
      } else if (tab === "all" && isHRAdmin) {
        const res = await getAllDocuments({ category: catFilter || undefined });
        setAllDocs(res.data.data.documents || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [tab, catFilter, isHRAdmin]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ── Upload ────────────────────────────────────────────
  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) return setUploadError("Please select a file.");
    if (!form.name.trim()) return setUploadError("Please enter a document name.");

    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file",        file);
      fd.append("name",        form.name);
      fd.append("description", form.description);
      fd.append("category",    form.category);
      fd.append("isGlobal",    form.isGlobal);
      await uploadDocument(fd);
      setShowUpload(false);
      setForm({ name: "", description: "", category: "other", isGlobal: false });
      if (fileRef.current) fileRef.current.value = "";
      fetchDocs();
    } catch (err) {
      setUploadError(err?.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // ── Download ─────────────────────────────────────────
  const handleDownload = async (url, name, fileType) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = fileType === "pdf" ? ".pdf" : "";
      const filename = name.endsWith(ext) ? name : `${name}${ext}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  // ── Delete ────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(d => ({ ...d, [id]: true }));
    try {
      await deleteDocument(id);
      setMyDocs(prev    => prev.filter(d => d._id !== id));
      setGlobalDocs(prev => prev.filter(d => d._id !== id));
      setAllDocs(prev   => prev.filter(d => d._id !== id));
    } catch {}
    finally { setDeleting(d => ({ ...d, [id]: false })); }
  };

  const docs = tab === "my" ? myDocs : tab === "global" ? globalDocs : allDocs;

  return (
    <DashboardLayout>
      <div className="dp-page">

        {/* ── Header ── */}
        <div className="dp-header">
          <div>
            <h1 className="dp-title">Documents</h1>
            <p className="dp-sub">Manage and access your documents</p>
          </div>
          <button className="dp-upload-btn" onClick={() => setShowUpload(s => !s)}>
            {showUpload ? "✕ Cancel" : "⬆ Upload Document"}
          </button>
        </div>

        {/* ── Upload Form ── */}
        {showUpload && (
          <div className="dp-upload-form">
            <h3 className="dp-upload-title">Upload New Document</h3>
            <form onSubmit={handleUpload}>
              <div className="dp-form-grid">
                <div className="dp-field">
                  <label>Document Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Employment Contract 2026"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="dp-field">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                  </select>
                </div>
                <div className="dp-field dp-field--full">
                  <label>Description</label>
                  <input
                    type="text"
                    placeholder="Optional description"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="dp-field dp-field--full">
                  <label>File * (PDF or Image, max 10MB)</label>
                  <input type="file" ref={fileRef} accept=".pdf,image/*" />
                </div>
                {isHRAdmin && (
                  <div className="dp-field dp-field--full dp-field--check">
                    <label className="dp-checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.isGlobal}
                        onChange={e => setForm(f => ({ ...f, isGlobal: e.target.checked }))}
                      />
                      Make this a global company document (visible to all employees)
                    </label>
                  </div>
                )}
              </div>
              {uploadError && <p className="dp-upload-error">⚠️ {uploadError}</p>}
              <div className="dp-form-actions">
                <button type="submit" className="dp-submit-btn" disabled={uploading}>
                  {uploading ? <><span className="dp-spinner dp-spinner--sm" /> Uploading...</> : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="dp-tabs">
          <button className={`dp-tab ${tab === "my" ? "dp-tab--active" : ""}`} onClick={() => setTab("my")}>
            📁 My Documents
          </button>
          <button className={`dp-tab ${tab === "global" ? "dp-tab--active" : ""}`} onClick={() => setTab("global")}>
            🌐 Company Documents
          </button>
          {isHRAdmin && (
            <button className={`dp-tab ${tab === "all" ? "dp-tab--active" : ""}`} onClick={() => setTab("all")}>
              📂 All Documents
            </button>
          )}
        </div>

        {/* ── Category Filter ── */}
        <div className="dp-filters">
          <select className="dp-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>
          <span className="dp-count">{docs.length} document{docs.length !== 1 ? "s" : ""}</span>
        </div>

        {/* ── Document Grid ── */}
        {loading ? (
          <div className="dp-state">
            <div className="dp-spinner" />
            <p>Loading documents...</p>
          </div>
        ) : error ? (
          <div className="dp-state dp-state--error">
            <p>⚠️ {error}</p>
            <button className="dp-retry" onClick={fetchDocs}>Retry</button>
          </div>
        ) : docs.length === 0 ? (
          <div className="dp-state">
            <div className="dp-state-icon">📭</div>
            <p>No documents found.</p>
            {tab === "my" && <span className="dp-state-sub">Upload your first document using the button above.</span>}
          </div>
        ) : (
          <div className="dp-grid">
            {docs.map(doc => (
              <div key={doc._id} className="dp-card">
                <div className="dp-card__top">
                  <div className="dp-card__icon">
                    {doc.fileType === "pdf" ? "📄" : "🖼️"}
                  </div>
                  <div className="dp-card__cat">
                    {CAT_ICONS[doc.category]} {CAT_LABELS[doc.category]}
                  </div>
                  {doc.isGlobal && <span className="dp-card__global">Global</span>}
                </div>

                <div className="dp-card__name">{doc.name}</div>
                {doc.description && <div className="dp-card__desc">{doc.description}</div>}

                {tab === "all" && doc.employee && (
                  <div className="dp-card__emp">
                    👤 {doc.employee.firstName} {doc.employee.lastName} · {doc.employee.employeeId}
                  </div>
                )}

                <div className="dp-card__meta">
                  <span>{fmt(doc.fileSize)}</span>
                  <span>{timeStr(doc.createdAt)}</span>
                </div>
                <div className="dp-card__uploader">
                  Uploaded by {doc.uploadedBy?.name || "—"}
                </div>

                <div className="dp-card__actions">
                  <a
                    href={getViewUrl(doc.fileUrl, doc.fileType)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dp-card__btn dp-card__btn--view"
                  >
                    👁 View
                  </a>
                  <button
                    className="dp-card__btn dp-card__btn--download"
                    onClick={() => handleDownload(doc.fileUrl, doc.name, doc.fileType)}
                  >
                    ↓ Download
                  </button>
                  {(isHRAdmin || doc.uploadedBy?._id === user?.id) && (
                    <button
                      className="dp-card__btn dp-card__btn--delete"
                      onClick={() => handleDelete(doc._id, doc.name)}
                      disabled={deleting[doc._id]}
                    >
                      {deleting[doc._id] ? <span className="dp-spinner dp-spinner--xs" /> : "🗑"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}