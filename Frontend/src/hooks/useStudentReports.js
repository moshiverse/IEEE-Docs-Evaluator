import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { fetchClassRoster, fetchStudentReports } from '../services/dashboardService';
import { extractSubmissionMeta } from '../utils/dashboardUtils';

const DOC_TYPES = ['SRS', 'SDD', 'SPMP', 'STD'];

export function useStudentReports(groupCode) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewedIds, setViewedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('viewedReportIds') || '[]');
    } catch { return []; }
  });

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchStudentReports(groupCode);
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch reports', error);
    } finally {
      setLoading(false);
    }
  }, [groupCode]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    fetchClassRoster()
      .then((roster) => {
        const members = roster.filter(
          (s) => s.groupCode?.toUpperCase() === groupCode?.toUpperCase(),
        );
        setTeamMembers(members);
      })
      .catch(() => {});
  }, [groupCode]);

  // ── Real-time subscription ────────────────────────────────────────────────
  // When the professor hits Send Result, the student sees the new evaluation
  // appear without clicking Check for Updates.

  useEffect(() => {
    if (!groupCode) return;

    const channel = supabase
      .channel(`student-reports-${groupCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'evaluation_history',
          // Only fire when is_sent flips to true — avoids unnecessary reloads
          filter: 'is_sent=eq.true',
        },
        (payload) => {
          const fileName = payload.new?.file_name || '';
          // Only reload if this update is relevant to this student's group code
          if (fileName.toLowerCase().includes(groupCode.toLowerCase())) {
            loadReports();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupCode, loadReports]);

  // ── Viewed tracking ───────────────────────────────────────────────────────

  function markViewed(id) {
    setViewedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem('viewedReportIds', JSON.stringify(next));
      return next;
    });
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (selectedDocType) {
        const docType = extractSubmissionMeta(r.fileName).documentType;
        if (docType !== selectedDocType) return false;
      }
      if (query) {
        const searchable = [r.fileName, r.evaluatedAt].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    });
  }, [reports, selectedDocType, searchQuery]);

  const docStats = useMemo(() =>
    DOC_TYPES.map((type) => ({
      type,
      count: reports.filter(
        (r) => extractSubmissionMeta(r.fileName).documentType === type,
      ).length,
    })),
  [reports]);

  return {
    reports: filteredReports,
    allReportCount: reports.length,
    loading,
    teamMembers,
    docStats,
    docTypes: DOC_TYPES,
    selectedDocType,
    setSelectedDocType,
    searchQuery,
    setSearchQuery,
    viewedIds,
    markViewed,
    refresh: loadReports,
  };
}