import { useCallback, useEffect, useMemo, useState } from 'react';
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

  function markViewed(id) {
    setViewedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem('viewedReportIds', JSON.stringify(next));
      return next;
    });
  }

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
