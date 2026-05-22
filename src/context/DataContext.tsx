'use client'

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
import type { ParsedTable, ChartConfig } from '@/types'

interface DataContextValue {
  tables: ParsedTable[]
  charts: ChartConfig[]
  addTable: (table: ParsedTable) => void
  removeTable: (id: string) => void
  updateTableRows: (id: string, rows: Record<string, string>[]) => void
  addChart: (chart: ChartConfig) => void
  removeChart: (index: number) => void
  getTableById: (id: string) => ParsedTable | undefined
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState<ParsedTable[]>([])
  const [charts, setCharts] = useState<ChartConfig[]>([])

  const addTable = useCallback((table: ParsedTable) => {
    setTables((prev) => {
      const exists = prev.find((t) => t.name === table.name)
      if (exists) {
        return prev.map((t) => (t.name === table.name ? table : t))
      }
      return [...prev, table]
    })
  }, [])

  const removeTable = useCallback((id: string) => {
    setTables((prev) => prev.filter((t) => t.id !== id))
    setCharts((prev) => prev.filter((c) => c.tableId !== id))
  }, [])

  const updateTableRows = useCallback((id: string, rows: Record<string, string>[]) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, rows, rowCount: rows.length } : t
      )
    )
  }, [])

  const addChart = useCallback((chart: ChartConfig) => {
    setCharts((prev) => [...prev, chart])
  }, [])

  const removeChart = useCallback((index: number) => {
    setCharts((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const getTableById = useCallback(
    (id: string) => tables.find((t) => t.id === id),
    [tables]
  )

  const value = useMemo<DataContextValue>(() => ({
    tables, charts, addTable, removeTable, updateTableRows, addChart, removeChart, getTableById,
  }), [tables, charts, addTable, removeTable, updateTableRows, addChart, removeChart, getTableById])

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
