export interface ParsedTable {
  id: string
  name: string
  headers: string[]
  rows: Record<string, string>[]
  uploadedAt: Date
  rowCount: number
  fileType: 'csv' | 'xlsx'
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area'
  xAxis: string
  yAxis: string
  tableId: string
  title: string
}

export type SortDirection = 'asc' | 'desc'

export interface TableFilter {
  column: string
  value: string
}
