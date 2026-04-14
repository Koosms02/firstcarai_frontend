'use client';

import React, { useEffect, useState } from 'react';
import { getUsers, deleteUser, type User } from '@/lib/recommendations';

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users.'))
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            {!loading && !error && (
              <p className="mt-1 text-sm text-gray-500">{users.length} total</p>
            )}
          </div>
        </div>

        {deleteError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deleteError}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">
              Loading users...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 text-sm text-red-500">
              {error}
            </div>
          ) : users.length === 0 ? (
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
                    <tr
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                    >
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
          )}
        </div>
      </main>
    </div>
  );
}
