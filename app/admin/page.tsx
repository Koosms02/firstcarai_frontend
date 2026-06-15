'use client';

import React, { useEffect, useState } from 'react';
import { getUsers, deleteUser, getDocuments, getPreferences, type User, type Document, type Preference } from '@/lib/recommendations';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PAYSLIP: 'Payslip',
  BANK_STATEMENT: 'Bank Statement',
  UTILITY_BILL: 'Utility Bill (Proof of Res)',
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [activeTable, setActiveTable] = useState<'user' | 'document' | 'preference'>('user');

  useEffect(() => {
    Promise.all([
      getUsers().catch(() => [] as User[]),
      getDocuments().catch(() => [] as Document[]),
      getPreferences().catch(() => [] as Preference[]),
    ])
      .then(([u, d, p]) => {
        setUsers(u);
        setDocuments(d);
        setPreferences(p);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load data.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(userId: string) {
    setDeletingId(userId);
    setDeleteError('');
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setConfirmId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  }

  const tables = [
    { key: 'user' as const, label: 'User', count: users.length },
    { key: 'document' as const, label: 'Document', count: documents.length },
    { key: 'preference' as const, label: 'Preference', count: preferences.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="14" fill="#2563eb" />
          <path d="M7 16 C7.5 13 9 11.5 11 11 L17 11 C19 11.5 20.5 13 21 16 Z" fill="white" />
          <rect x="6" y="16" width="16" height="4" rx="2" fill="white" />
          <circle cx="10" cy="20.5" r="2" fill="#2563eb" />
          <circle cx="18" cy="20.5" r="2" fill="#2563eb" />
        </svg>
        <span className="text-lg font-bold text-gray-900">FirstCar</span>
        <span className="ml-2 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 uppercase tracking-wide">
          Admin
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Table tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
          {tables.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTable(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTable === t.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
              {!loading && (
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  activeTable === t.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {deleteError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deleteError}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">
              Loading...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 text-sm text-red-500">
              {error}
            </div>
          ) : (
            <>
              {/* ─── User Table ─── */}
              {activeTable === 'user' && (
                users.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700">No users yet</p>
                    <p className="text-xs text-gray-400">Users will appear here once they sign up.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Location</th>
                        <th className="px-6 py-3">Gender</th>
                        <th className="px-6 py-3">Salary</th>
                        <th className="px-6 py-3">Credit score</th>
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <React.Fragment key={user.id}>
                          <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{user.email}</td>
                            <td className="px-6 py-4 text-gray-500 capitalize">{user.location ?? '—'}</td>
                            <td className="px-6 py-4 text-gray-500 capitalize">{user.gender ?? '—'}</td>
                            <td className="px-6 py-4 text-gray-500">
                              {user.netSalary != null ? `R ${user.netSalary.toLocaleString()}` : '—'}
                            </td>
                            <td className="px-6 py-4 text-gray-500">{user.creditScore ?? '—'}</td>
                            <td className="px-6 py-4 text-right">
                              {confirmId === user.id ? null : (
                                <button
                                  onClick={() => { setConfirmId(user.id); setDeleteError(''); }}
                                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>

                          {confirmId === user.id && (
                            <tr key={`${user.id}-confirm`} className="bg-red-50 border-b border-red-100 last:border-0">
                              <td colSpan={6} className="px-6 py-4">
                                <div className="flex items-center justify-between gap-4">
                                  <p className="text-sm font-medium text-red-700">
                                    Delete <span className="font-semibold">{user.email}</span>? This cannot be undone.
                                  </p>
                                  <div className="flex gap-2 shrink-0">
                                    <button
                                      onClick={() => handleDelete(user.id)}
                                      disabled={deletingId === user.id}
                                      className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {deletingId === user.id ? 'Deleting...' : 'Confirm delete'}
                                    </button>
                                    <button
                                      onClick={() => setConfirmId(null)}
                                      disabled={deletingId === user.id}
                                      className="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-white disabled:opacity-60"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* ─── Document Table ─── */}
              {activeTable === 'document' && (
                documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700">No documents yet</p>
                    <p className="text-xs text-gray-400">Documents will appear here once users upload them.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <th className="px-6 py-3">User</th>
                        <th className="px-6 py-3">Document Type</th>
                        <th className="px-6 py-3">File Name</th>
                        <th className="px-6 py-3">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{doc.userEmail ?? doc.userId}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              doc.documentType === 'PAYSLIP'
                                ? 'bg-green-50 text-green-700'
                                : doc.documentType === 'BANK_STATEMENT'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">{doc.fileName}</td>
                          <td className="px-6 py-4 text-gray-500">{formatDate(doc.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* ─── Preference Table ─── */}
              {activeTable === 'preference' && (
                preferences.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700">No preferences yet</p>
                    <p className="text-xs text-gray-400">Preferences will appear here once users select their preferred car.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        <th className="px-6 py-3">User</th>
                        <th className="px-6 py-3">Car</th>
                        <th className="px-6 py-3">Year</th>
                        <th className="px-6 py-3">Price</th>
                        <th className="px-6 py-3">Monthly Cost</th>
                        <th className="px-6 py-3">Selected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preferences.map((pref) => (
                        <tr key={pref.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{pref.userEmail ?? pref.userId}</td>
                          <td className="px-6 py-4 text-gray-700">
                            <span className="text-xs text-blue-600 uppercase font-semibold">{pref.carMake}</span>{' '}
                            <span className="font-medium">{pref.carModel}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">{pref.carYear ?? '—'}</td>
                          <td className="px-6 py-4 text-gray-500">
                            {pref.carPrice != null ? `R ${pref.carPrice.toLocaleString()}` : '—'}
                          </td>
                          <td className="px-6 py-4 text-gray-700 font-medium">
                            R {Math.round(pref.estimatedMonthlyCost).toLocaleString()}/mo
                          </td>
                          <td className="px-6 py-4 text-gray-500">{formatDate(pref.selectedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
