import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  processContentWithAi,
  fetchNotes,
  saveNoteToDb,
  deleteNoteFromDb,
} from "./services/aiService";

function App() {
  const [title, setTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedNotes, setSavedNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  // New state: active AI mode
  const [activeMode, setActiveMode] = useState("summarize"); // 'summarize' | 'action_items' | 'qa'

  // 1. Initial Load: Fetch saved notes from SQL Server LocalDB
  const loadNotes = async () => {
    try {
      const data = await fetchNotes();
      setSavedNotes(data);
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  //Filter notes in sidebar
  // 2. Filter notes in sidebar
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return savedNotes;
    const q = searchQuery.toLowerCase();
    return savedNotes.filter(
      (n) =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q)),
    );
  }, [savedNotes, searchQuery]);

  // 3. Process with Llama 3.2, then persist to database
  const handleProcessAndSave = async () => {
    if (!noteContent.trim()) {
      setError("Please enter some text to summarize.");
      return;
    }

    setLoading(true);
    setError("");
    setSummary("");

    try {
      // Step A: Call AI endpoint with selected mode
      const aiResult = await processContentWithAi(noteContent, activeMode);
      const outputText = aiResult.result;
      setSummary(outputText);

      // Step B: Persist to SQL Server LocalDB
      const saved = await saveNoteToDb({
        title: title.trim(),
        content: noteContent,
        summary: outputText,
      });

      setTitle(saved.title);
      setSelectedId(saved.id);

      // Step C: Add newly saved note to the top of the sidebar list
      setSavedNotes((prev) => [saved, ...prev]);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Failed to process note. Ensure SmartNotesApi and Ollama are active.",
      );
    } finally {
      setLoading(false);
    }
  };

  // 4. Delete note from SQL Server LocalDB
  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Prevents selecting the note when clicking delete
    try {
      await deleteNoteFromDb(id);
      setSavedNotes((prev) =>
        prev.filter((note) => (note.id || note.Id) !== id),
      );
      if (selectedId === id) {
        handleNewNote();
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  // 5. Select an existing note from the sidebar to view it
  const handleSelectNote = (note) => {
    setSelectedId(note.id || note.Id);
    setTitle(note.title || "");
    setNoteContent(note.content);
    setSummary(note.summary);
    setError("");
  };

  // 6. Reset editor for a new note
  const handleNewNote = () => {
    setSelectedId(null);
    setTitle("");
    setNoteContent("");
    setSummary("");
    setError("");
  };

  // 7. Clipboard Copy
  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = noteContent.trim()
    ? noteContent.trim().split(/\s+/).length
    : 0;
  const charCount = noteContent.length;

  const modeLabels = {
    summarize: { title: "Executive Summary", btn: "✨ Summarize & Save" },
    action_items: {
      title: "Action Items & Checklist",
      btn: "✅ Extract Tasks & Save",
    },
    qa: { title: "AI Copilot Answer", btn: "💡 Ask / Explain & Save" },
  };

  return (
    <div style={styles.container}>
      {/* --- SIDEBAR --- */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.brandRow}>
            <span style={styles.brandBadge}>Local AI</span>
            <span style={styles.modelTag}>Llama 3.2</span>
          </div>
          <h2 style={styles.sidebarTitle}>Notes Library</h2>
        </div>

        <button onClick={handleNewNote} style={styles.newNoteBtn}>
          <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span> New Note
        </button>

        <div style={{ marginBottom: "14px" }}>
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.noteList}>
          {filteredNotes.length === 0 ? (
            <div style={styles.emptyNotice}>
              {searchQuery
                ? "No notes match your search."
                : "No saved notes yet."}
            </div>
          ) : (
            filteredNotes.map((note) => {
              const currentId = note.id || note.Id;
              const isSelected = currentId === selectedId;
              return (
                <div
                  key={currentId}
                  onClick={() => handleSelectNote(note)}
                  style={{
                    ...styles.noteCard,
                    ...(isSelected ? styles.noteCardSelected : {}),
                  }}
                >
                  <div style={styles.noteCardHeader}>
                    <strong style={styles.noteCardTitle}>
                      {note.title || "Untitled Note"}
                    </strong>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(currentId, e)}
                      style={styles.deleteBtn}
                      title="Delete Note"
                    >
                      ×
                    </button>
                  </div>
                  <p style={styles.noteSnippet}>
                    {note.content.length > 70
                      ? note.content.slice(0, 70) + "..."
                      : note.content}
                  </p>
                  <small style={styles.noteDate}>
                    {new Date(note.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* --- WORKSPACE --- */}
      <main style={styles.workspace}>
        <header style={styles.topBar}>
          <div>
            <h1 style={styles.mainHeading}>
              {selectedId ? "Edit / View Note" : "Create New Note"}
            </h1>
            <p style={styles.subHeading}>
              Select an AI mode to generate summaries, action items, or direct
              answers.
            </p>
          </div>
          <div style={styles.statusIndicator}>
            <span style={styles.pulseDot}></span>
            <span
              style={{ fontSize: "13px", color: "#475569", fontWeight: 500 }}
            >
              Ollama Engine Ready
            </span>
          </div>
        </header>

        {/* AI Mode Selector Tabs */}
        <div style={styles.modeSelectorContainer}>
          <button
            type="button"
            onClick={() => setActiveMode("summarize")}
            style={{
              ...styles.modePill,
              ...(activeMode === "summarize" ? styles.modePillActive : {}),
            }}
          >
            📑 Summarize
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("action_items")}
            style={{
              ...styles.modePill,
              ...(activeMode === "action_items" ? styles.modePillActive : {}),
            }}
          >
            ✅ Action Items
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("qa")}
            style={{
              ...styles.modePill,
              ...(activeMode === "qa" ? styles.modePillActive : {}),
            }}
          >
            💡 Ask / Explain
          </button>
        </div>

        {/* Note Editor Card */}
        <div style={styles.editorCard}>
          <input
            type="text"
            placeholder="Note title (auto-generated if left empty)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.titleInput}
          />

          <textarea
            rows={9}
            placeholder={
              activeMode === "qa"
                ? "Type your question or paste code/text you want explained..."
                : activeMode === "action_items"
                  ? "Paste meeting minutes or project updates to extract tasks from..."
                  : "Paste or write your notes here to generate a summary..."
            }
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            style={styles.contentArea}
          />

          <div style={styles.editorFooter}>
            <div style={styles.statsRow}>
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{charCount} characters</span>
            </div>

            <button
              onClick={handleProcessAndSave}
              disabled={loading || !noteContent.trim()}
              style={{
                ...styles.actionBtn,
                ...(loading || !noteContent.trim()
                  ? styles.actionBtnDisabled
                  : {}),
              }}
            >
              {loading ? (
                <span style={styles.btnContent}>
                  <span style={styles.spinner}></span> Processing with Llama...
                </span>
              ) : (
                modeLabels[activeMode].btn
              )}
            </button>
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span style={{ fontWeight: 600 }}>Error:</span> {error}
          </div>
        )}

        {/* AI Output Card */}
        {summary && (
          <section style={styles.summaryCard}>
            <div style={styles.summaryHeader}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontSize: "16px" }}>⚡</span>
                <h3 style={styles.summaryHeading}>
                  {modeLabels[activeMode].title}
                </h3>
              </div>
              <button onClick={handleCopy} style={styles.copyBtn}>
                {copied ? "✓ Copied" : "📋 Copy Output"}
              </button>
            </div>

            <div style={styles.summaryContent}>
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    overflow: "hidden",
  },
  sidebar: {
    width: "340px",
    backgroundColor: "#ffffff",
    borderRight: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    padding: "24px 18px",
    boxSizing: "border-box",
  },
  sidebarHeader: { marginBottom: "16px" },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  brandBadge: {
    backgroundColor: "#e0e7ff",
    color: "#4338ca",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    padding: "2px 8px",
    borderRadius: "12px",
  },
  modelTag: { fontSize: "12px", color: "#64748b", fontWeight: 500 },
  sidebarTitle: {
    fontSize: "20px",
    fontWeight: 700,
    margin: 0,
    color: "#0f172a",
  },
  newNoteBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "11px",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: "14px",
  },
  searchInput: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    fontSize: "13px",
    backgroundColor: "#f8fafc",
    outline: "none",
    boxSizing: "border-box",
  },
  noteList: { flex: 1, overflowY: "auto", paddingRight: "4px" },
  noteCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "12px 14px",
    marginBottom: "10px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  noteCardSelected: {
    borderColor: "#6366f1",
    backgroundColor: "#f5f3ff",
    boxShadow: "0 1px 3px rgba(99, 102, 241, 0.12)",
  },
  noteCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "8px",
  },
  noteCardTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#1e293b",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "16px",
    lineHeight: "1",
    padding: "0 4px",
  },
  noteSnippet: {
    fontSize: "12px",
    color: "#64748b",
    margin: "6px 0 8px 0",
    lineHeight: 1.4,
  },
  noteDate: { fontSize: "11px", color: "#94a3b8" },
  emptyNotice: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "13px",
    marginTop: "30px",
  },
  workspace: {
    flex: 1,
    padding: "36px 48px",
    overflowY: "auto",
    boxSizing: "border-box",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  mainHeading: {
    fontSize: "24px",
    fontWeight: 700,
    margin: 0,
    color: "#0f172a",
  },
  subHeading: { fontSize: "14px", color: "#64748b", margin: "4px 0 0 0" },
  statusIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#ffffff",
    padding: "6px 14px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
  },
  pulseDot: {
    width: "8px",
    height: "8px",
    backgroundColor: "#10b981",
    borderRadius: "50%",
    display: "inline-block",
  },
  modeSelectorContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
  },
  modePill: {
    padding: "8px 16px",
    borderRadius: "20px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  modePillActive: {
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    borderColor: "#4f46e5",
    boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)",
  },
  editorCard: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
    marginBottom: "20px",
  },
  titleInput: {
    width: "100%",
    border: "none",
    borderBottom: "1px solid #e2e8f0",
    padding: "8px 0 12px 0",
    fontSize: "18px",
    fontWeight: 600,
    color: "#0f172a",
    outline: "none",
    marginBottom: "16px",
    boxSizing: "border-box",
  },
  contentArea: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: "15px",
    lineHeight: "1.6",
    color: "#334155",
    resize: "vertical",
    boxSizing: "border-box",
  },
  editorFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "16px",
    marginTop: "12px",
  },
  statsRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "#94a3b8",
  },
  actionBtn: {
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  actionBtnDisabled: { backgroundColor: "#a5b4fc", cursor: "not-allowed" },
  btnContent: { display: "flex", alignItems: "center", gap: "8px" },
  spinner: {
    width: "12px",
    height: "12px",
    border: "2px solid #ffffff",
    borderTop: "2px solid transparent",
    borderRadius: "50%",
    display: "inline-block",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fee2e2",
    borderRadius: "6px",
    padding: "12px 16px",
    marginBottom: "20px",
    fontSize: "14px",
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    border: "1px solid #e0e7ff",
    padding: "24px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
  },
  summaryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "14px",
    marginBottom: "16px",
  },
  summaryHeading: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#312e81",
  },
  copyBtn: {
    backgroundColor: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#475569",
    cursor: "pointer",
  },
  summaryContent: { fontSize: "15px", lineHeight: "1.7", color: "#334155" },
};

export default App;
