import { useEffect, useState } from 'react';
import { syncSubmissionsWithBackend, analyzeDocumentWithAI, getEvaluationHistory } from './api'; 
import { supabase } from './supabaseClient';

const FileIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', color: '#64748b' }}>
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        <polyline points="13 2 13 9 20 9"></polyline>
    </svg>
);

const TeacherDashboard = ({ user }) => {
    const [currentView, setCurrentView] = useState('dashboard');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // Modal & AI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFileForAi, setSelectedFileForAi] = useState(null);
    const [aiResult, setAiResult] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

    const getDisplayType = (mimeType) => {
        if (mimeType === 'application/vnd.google-apps.document') return 'Google Doc';
        return 'Document';
    };

    const loadSubmissions = async () => {
        try {
            setLoading(true);
            setError('');
            // Calls our new clean endpoint to parse the Sheet and return the file URLs
            const data = await syncSubmissionsWithBackend();
            setFiles(data);
        } catch (err) {
            setError("Failed to load submissions: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        try {
            setLoadingHistory(true);
            const data = await getEvaluationHistory();
            setHistoryLogs(data);
        } catch (err) {
            setError("Failed to load history: " + err.message);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (currentView === 'dashboard') {
            loadSubmissions(); 
        } else if (currentView === 'reports') {
            loadHistory();
        }
    }, [currentView]);

    const handleManualSync = async () => {
        try {
            setIsSyncing(true);
            setError('');
            const data = await syncSubmissionsWithBackend(); 
            setFiles(data);
        } catch (err) {
            setError("Sync failed: " + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleAnalyzeClick = (file) => {
        setSelectedFileForAi(file);
        setAiResult('');
        setIsModalOpen(true);
    };

    const triggerAnalysis = async (modelName) => {
        setIsAnalyzing(true);
        setAiResult('');
        try {
            const data = await analyzeDocumentWithAI(selectedFileForAi.id, selectedFileForAi.name, modelName);
            setAiResult(data.analysis || data);
            if (currentView === 'reports') loadHistory();
        } catch (err) {
            setAiResult('Error: ' + err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const sortedFiles = [...files].sort((a, b) => {
        if (sortConfig.key === 'name') {
            return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
        if (sortConfig.key === 'date') {
            return sortConfig.direction === 'asc' 
                ? new Date(a.submittedAt) - new Date(b.submittedAt) 
                : new Date(b.submittedAt) - new Date(a.submittedAt);
        }
        return 0;
    });

    const styles = {
        root: { display: 'flex', height: '100vh', width: '100vw', fontFamily: "'DM Sans', sans-serif", backgroundColor: '#f0f2f7', overflow: 'hidden' },
        sidebar: { width: '240px', backgroundColor: '#0f172a', color: '#e2e8f0', padding: '28px 20px', display: 'flex', flexDirection: 'column', flexShrink: 0 },
        sidebarBrand: { fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' },
        sidebarRole: { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '36px' },
        navItemActive: { padding: '10px 14px', borderRadius: '8px', backgroundColor: '#e11d48', color: '#ffffff', fontWeight: '600', cursor: 'pointer', marginBottom: '4px' },
        navItem: { padding: '10px 14px', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer', marginBottom: '4px' },
        signOutBtn: { marginTop: 'auto', background: 'none', color: '#94a3b8', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', textAlign: 'left' },
        main: { flex: 1, padding: '36px 40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        headerTitle: { fontSize: '24px', margin: '0 0 8px 0', color: '#0F172A', fontWeight: '700' },
        subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
        syncBtn: { backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
        card: { backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' },
        tableContainer: { maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' },
        table: { width: '100%', borderCollapse: 'collapse' },
        th: { position: 'sticky', top: 0, padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', zIndex: 1, cursor: 'pointer' },
        td: { padding: '14px 16px', fontSize: '14px', color: '#1e293b', borderBottom: '1px solid #f1f5f9' },
        badge: { backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
        analyzeBtn: { color: '#059669', background: 'none', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '5px 12px', fontSize: '13px', cursor: 'pointer' },
    };

    return (
        <div style={styles.root}>
            <style>
                {`
                @keyframes pulse-light {
                    0% { background-color: #ffffff; }
                    50% { background-color: #eff6ff; }
                    100% { background-color: #ffffff; }
                }
                .loading-row { animation: pulse-light 1.5s infinite ease-in-out; }
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: #f1f5f9; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `}
            </style>

            <aside style={styles.sidebar}>
                <div style={styles.sidebarBrand}>IEEE Docs</div>
                <div style={styles.sidebarRole}>Evaluator</div>
                <nav>
                    <div style={currentView === 'dashboard' ? styles.navItemActive : styles.navItem} onClick={() => setCurrentView('dashboard')}>
                        Dashboard
                    </div>
                    <div style={currentView === 'reports' ? styles.navItemActive : styles.navItem} onClick={() => setCurrentView('reports')}>
                        AI Reports
                    </div>
                </nav>
                <button onClick={() => supabase.auth.signOut()} style={styles.signOutBtn}>Sign Out</button>
            </aside>

            <main style={styles.main}>
                {error && <div style={{ color: 'red', padding: '10px', background: '#fff1f1', borderRadius: '8px' }}>{error}</div>}

                {currentView === 'dashboard' && (
                    <>
                        <header style={styles.header}>
                            <div>
                                <h1 style={styles.headerTitle}>Live Submissions Dashboard</h1>
                                <p style={styles.subtitle}>Sourced directly from the Google Sheets tracker</p>
                            </div>
                            <button onClick={handleManualSync} style={styles.syncBtn} disabled={isSyncing}>
                                {isSyncing ? "Fetching Updates..." : "Sync Latest Submissions"}
                            </button>
                        </header>

                        <div style={styles.card}>
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th} onClick={() => requestSort('name')}>Submission Identity</th>
                                            <th style={styles.th}>Type</th>
                                            <th style={styles.th} onClick={() => requestSort('date')}>Date Submitted</th>
                                            <th style={styles.th}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading || isSyncing ? (
                                            [...Array(5)].map((_, i) => (
                                                <tr key={i} className="loading-row">
                                                    <td colSpan="4" style={{ height: '50px', borderBottom: '1px solid #f1f5f9' }}></td>
                                                </tr>
                                            ))
                                        ) : sortedFiles.length === 0 ? (
                                            <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No submissions found in the tracker.</td></tr>
                                        ) : sortedFiles.map(file => {
                                            const displayType = getDisplayType(file.mimeType);
                                            return (
                                                <tr key={file.id}>
                                                    <td style={styles.td}>
                                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                                            <FileIcon />
                                                            <a href={file.webViewLink} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#1e293b', fontWeight: '500' }}>{file.name}</a>
                                                        </div>
                                                    </td>
                                                    <td style={styles.td}><span style={styles.badge}>{displayType}</span></td>
                                                    <td style={styles.td}>{file.submittedAt}</td>
                                                    <td style={styles.td}>
                                                        <button onClick={() => handleAnalyzeClick(file)} style={styles.analyzeBtn}>Run AI Analysis</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {currentView === 'reports' && (
                    <>
                        <header style={styles.header}>
                            <div>
                                <h1 style={styles.headerTitle}>AI Evaluation History</h1>
                                <p style={styles.subtitle}>Saved results from Supabase Database</p>
                            </div>
                            <button onClick={loadHistory} style={{ ...styles.syncBtn, backgroundColor: '#2563eb' }}>Refresh History</button>
                        </header>

                        <div style={styles.card}>
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Date Analyzed</th>
                                            <th style={styles.th}>Document Name</th>
                                            <th style={styles.th}>Model</th>
                                            <th style={styles.th}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingHistory ? (
                                            [...Array(5)].map((_, i) => (
                                                <tr key={i} className="loading-row">
                                                    <td colSpan="4" style={{ height: '50px', borderBottom: '1px solid #f1f5f9' }}></td>
                                                </tr>
                                            ))
                                        ) : historyLogs.length === 0 ? (
                                            <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No evaluations saved.</td></tr>
                                        ) : historyLogs.map(log => (
                                            <tr key={log.id}>
                                                <td style={styles.td}>{new Date(log.evaluatedAt).toLocaleString()}</td>
                                                <td style={styles.td}><span style={{fontWeight: '500'}}>{log.fileName}</span></td>
                                                <td style={styles.td}><span style={styles.badge}>{log.modelUsed}</span></td>
                                                <td style={styles.td}>
                                                    <button onClick={() => setSelectedHistoryItem(log)} style={styles.analyzeBtn}>View Full Report</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* MODALS */}
                {isModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                            <h2 style={{marginTop: 0, color: '#1e293b'}}>Analyze: {selectedFileForAi?.name}</h2>
                            {!isAnalyzing && !aiResult && (
                                <div>
                                    <p style={{color: '#64748b'}}>Select an AI model to evaluate this document.</p>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                        <button onClick={() => triggerAnalysis('openai')} style={styles.syncBtn}>Use OpenAI (GPT)</button>
                                        <button onClick={() => triggerAnalysis('openrouter')} style={{ ...styles.syncBtn, backgroundColor: '#19526d' }}>Use Google (GEMINI)</button>
                                    </div>
                                </div>
                            )}
                            {isAnalyzing && <div style={{ padding: '20px', textAlign: 'center', color: '#2563eb', fontWeight: '500' }}>Extracting text and running analysis...</div>}
                            {aiResult && (
                                <div>
                                    <h3 style={{color: '#1e293b'}}>AI Evaluation Result:</h3>
                                    <div style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: '1.6' }}>{aiResult}</div>
                                </div>
                            )}
                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => setIsModalOpen(false)} style={{ backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedHistoryItem && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '700px', maxHeight: '85vh', overflowY: 'auto' }}>
                            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
                                <h2 style={{marginTop: 0, marginBottom: '5px', color: '#1e293b'}}>Saved Evaluation Report</h2>
                                <p style={{margin: 0, color: '#64748b', fontSize: '14px'}}>File: {selectedHistoryItem.fileName}</p>
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155', lineHeight: '1.6' }}>{selectedHistoryItem.evaluationResult}</div>
                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => setSelectedHistoryItem(null)} style={{ backgroundColor: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Close Report</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TeacherDashboard;