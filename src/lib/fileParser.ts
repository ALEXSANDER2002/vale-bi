import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { ParsedTable } from '@/types'

/** Modo de correspondência entre as tabelas */
export type MatchMode = 'raw' | 'post'

/** Extrai/normaliza o código de correspondência conforme o modo escolhido */
function extractCode(value: string, mode: MatchMode): string | null {
  if (!value?.trim()) return null
  if (mode === 'post') return extractPostCode(value)
  // Modo raw: usa o valor inteiro, normalizado (trim + uppercase)
  const normalized = value.trim().toUpperCase()
  return normalized || null
}


function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function parseFile(file: File): Promise<ParsedTable> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'csv') return parseCsv(file)
  if (ext === 'xlsx' || ext === 'xls') return parseXlsx(file)
  throw new Error('Formato de arquivo não suportado. Use CSV ou XLSX.')
}

function parseCsv(file: File): Promise<ParsedTable> {
  return new Promise((resolve, reject) => {
    const tryParse = (encoding: string) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (encoding === 'UTF-8' && text.includes('\uFFFD')) {
          tryParse('windows-1252')
          return
        }
        // Auto-detect delimiter: count occurrences of ';' vs ','
        const firstLine = text.split('\n')[0] ?? ''
        const semicolonCount = (firstLine.match(/;/g) ?? []).length
        const commaCount = (firstLine.match(/,/g) ?? []).length
        const delimiter = semicolonCount > commaCount ? ';' : ','

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          delimiter,
          complete(results) {
            const headers = results.meta.fields ?? []
            const rows = results.data as Record<string, string>[]
            resolve({ id: generateId(), name: file.name.replace(/\.[^.]+$/, ''), headers, rows, uploadedAt: new Date(), rowCount: rows.length, fileType: 'csv' })
          },
          error(err: { message: string }) { reject(new Error(err.message)) },
        })
      }
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo'))
      reader.readAsText(file, encoding)
    }
    tryParse('UTF-8')
  })
}

async function parseXlsx(file: File): Promise<ParsedTable> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  
  // Extrai headers da primeira linha preservando a ordem original
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const headers: string[] = []
  
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
    const cell = sheet[cellAddress]
    const header = cell ? String(cell.v).trim() : ''
    headers.push(header || `COL_${col + 1}`)
  }
  
  // Converte para JSON mantendo a ordem das colunas
  const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: '',
    raw: false,
    header: headers,
    range: XLSX.utils.encode_range({
      s: { r: range.s.r + 1, c: range.s.c },
      e: { r: range.e.r, c: range.e.c },
    }),
    blankrows: false,
  })
  
  // Reconstrói os dados garantindo que todas as colunas apareçam
  const rows = jsonData.map((row: Record<string, any>) => {
    const newRow: Record<string, string> = {}
    headers.forEach((h) => {
      newRow[h] = String(row[h] ?? '').trim()
    })
    return newRow
  })
  
  return { 
    id: generateId(), 
    name: file.name.replace(/\.[^.]+$/, ''), 
    headers, 
    rows, 
    uploadedAt: new Date(), 
    rowCount: rows.length, 
    fileType: 'xlsx' 
  }
}

export function detectNumericColumns(table: ParsedTable): string[] {
  return table.headers.filter((h) => {
    const sample = table.rows.slice(0, 30).map((r) => r[h])
    const numericCount = sample.filter((v) => v !== '' && !isNaN(Number(v))).length
    return numericCount > sample.length * 0.6
  })
}

export function detectCategoricalColumns(table: ParsedTable): string[] {
  return table.headers.filter((h) => {
    const values = table.rows.map((r) => r[h]).filter((v) => v !== undefined && v !== '')
    if (values.length === 0) return false
    const unique = new Set(values)
    // Exclude columns that are mostly numeric
    const numericCount = values.slice(0, 30).filter((v) => v !== '' && !isNaN(Number(v))).length
    if (numericCount > values.slice(0, 30).length * 0.6) return false
    return unique.size <= 40 && unique.size > 1
  })
}

export function aggregateByColumn(
  rows: Record<string, string>[],
  groupBy: string,
  valueCol: string
): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = row[groupBy] ?? 'N/A'
    const val = parseFloat(row[valueCol]) || 0
    map.set(key, (map.get(key) ?? 0) + val)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)
}

export function countByColumn(
  rows: Record<string, string>[],
  groupBy: string
): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = row[groupBy] ?? 'N/A'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)
}

/** Retorna os dados de comparação entre N tabelas para uma coluna */
export function buildCrossTableData(
  tables: ParsedTable[],
  groupByCol: string,
  aggMode: 'count' | 'sum',
  valueCol: string
): Record<string, string | number>[] {
  const allKeys = new Set<string>()

  const tableCounts = tables.map((t) => {
    const data =
      aggMode === 'count'
        ? countByColumn(t.rows, groupByCol)
        : aggregateByColumn(t.rows, groupByCol, valueCol)
    data.forEach((d) => allKeys.add(d.name))
    return { tableId: t.id, tableName: t.name, data }
  })

  const keys = Array.from(allKeys).slice(0, 20)

  return keys.map((key) => {
    const item: Record<string, string | number> = { name: key }
    tableCounts.forEach(({ tableName, data }) => {
      item[tableName] = data.find((d) => d.name === key)?.value ?? 0
    })
    return item
  })
}

export interface ColumnStats {
  column: string
  count: number
  unique: number
  numeric: boolean
  min?: number
  max?: number
  avg?: number
  sum?: number
  topValue?: string
  topCount?: number
}

export function getColumnStats(rows: Record<string, string>[], column: string): ColumnStats {
  const values = rows.map((r) => r[column] ?? '').filter((v) => v !== '')
  const unique = new Set(values)
  const numbers = values.map((v) => parseFloat(v)).filter((v) => !isNaN(v))
  const isNumeric = numbers.length > values.length * 0.6

  const countMap = new Map<string, number>()
  values.forEach((v) => countMap.set(v, (countMap.get(v) ?? 0) + 1))
  const topEntry = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1])[0]

  return {
    column,
    count: values.length,
    unique: unique.size,
    numeric: isNumeric,
    min: isNumeric ? Math.min(...numbers) : undefined,
    max: isNumeric ? Math.max(...numbers) : undefined,
    avg: isNumeric ? numbers.reduce((a, b) => a + b, 0) / numbers.length : undefined,
    sum: isNumeric ? numbers.reduce((a, b) => a + b, 0) : undefined,
    topValue: topEntry?.[0],
    topCount: topEntry?.[1],
  }
}

/** Retorna colunas comuns entre todas as tabelas */
export function getCommonColumns(tables: ParsedTable[]): string[] {
  if (tables.length === 0) return []
  return tables[0].headers.filter((h) => tables.every((t) => t.headers.includes(h)))
}

/** Normaliza parte numérica do código (ex: 11494 → 011494) */
function normalizePostDigits(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (!d) return ''
  // Códigos Vale costumam ter 6 dígitos
  if (d.length > 0 && d.length < 6) return d.padStart(6, '0')
  return d
}

/** Limpa separadores e espaços de um código bruto */
function cleanCodeText(text: string): string {
  return text.trim().replace(/\s+/g, '').replace(/[–—_]/g, '-').toUpperCase()
}

/** Normaliza sufixo do código (numérico ou alfanumérico, ex: 011494, 5S) */
function formatPostSuffix(raw: string): string | null {
  const s = raw.replace(/\s+/g, '').toUpperCase()
  if (!s || s.length < 2) return null
  if (!/^[A-Z0-9]+$/.test(s)) return null
  // Precisa ter ao menos um dígito (evita falsos positivos como "INS")
  if (!/\d/.test(s)) return null

  if (/^\d+$/.test(s)) return normalizePostDigits(s)
  return s
}

/** Monta código normalizado POST-XXXX */
function toPostCode(suffix: string): string | null {
  const formatted = formatPostSuffix(suffix)
  return formatted ? `POST-${formatted}` : null
}

/**
 * Extrai o identificador de posto de um texto (Base ou Export).
 * Suporta: POST-011494, POST- 5S, Post-018524, POST 011494, POST011494, etc.
 */
function extractPostCode(text: string): string | null {
  if (!text?.trim()) return null
  const trimmed = text.trim()

  // 1. Valor inteiro da célula é um código
  const direct = normalizePostCode(trimmed)
  if (direct) return direct

  // 2. Busca padrão POST/WS em qualquer parte do texto (títulos de incidente)
  const pattern = /(?:POSTO|POST|WORKSTATION|WKS|WS)[\s\-_–—]*([A-Za-z0-9]{2,})/gi
  pattern.lastIndex = 0
  const match = pattern.exec(trimmed)
  if (match?.[1]) return toPostCode(match[1])

  return null
}

/**
 * Normaliza um código de posto quando a célula contém só o código.
 */
function normalizePostCode(code: string): string | null {
  if (!code?.trim()) return null
  const trimmed = cleanCodeText(code)

  const withPrefix = trimmed.match(/^(?:POST-?|POSTO-?|WORKSTATION-?|WKS-?|WS-?)([A-Z0-9]{2,})$/i)
  if (withPrefix) return toPostCode(withPrefix[1])

  if (/^\d{4,}$/.test(trimmed)) return `POST-${normalizePostDigits(trimmed)}`

  return null
}

export interface AdherenceRow {
  name: string
  total: number
  inspected: number
  adherence: number
}

export interface MissingPost {
  code: string
  name: string
}

export interface AdherenceChild {
  name: string
  total: number
  inspected: number
  adherence: number
  lastInspectionDate?: string
  status: 'concluido' | 'pendente'
  missingPosts: MissingPost[]
}


export interface AdherenceGroup {
  name: string
  total: number
  inspected: number
  adherence: number
  lastInspectionDate?: string
  status: 'concluido' | 'pendente'
  children: AdherenceChild[]
}

/**
 * Verifica se o valor de status corresponde ao filtro desejado.
 * Evita falsos positivos: "inativo" NÃO deve bater com o filtro "ativo".
 */
function matchesStatus(value: string, filter: string): boolean {
  const val = value.toLowerCase().trim()
  const f = filter.toLowerCase().trim()

  if (f === 'ativo') {
    // Aceita: "ativo", "active", "a", "sim", "yes", "1", "true"
    // Rejeita qualquer coisa que comece com "in" antes de "ativ" (ex: "inativo")
    return (
      val === 'ativo' || val === 'active' || val === 'a' ||
      val === 'sim' || val === 'yes' || val === '1' || val === 'true' ||
      (val.startsWith('ativ') && !val.startsWith('inativ'))
    )
  }

  if (f === 'inativo') {
    // Aceita: "inativo", "inactive", "i", "nao", "não", "no", "0", "false"
    return (
      val === 'inativo' || val === 'inactive' || val === 'i' ||
      val === 'nao' || val === 'não' || val === 'no' || val === '0' || val === 'false' ||
      val.startsWith('inativ')
    )
  }

  // Filtro genérico: correspondência exata
  return val === f
}

/** Tenta parsear uma data em vários formatos para comparação (retorna string YYYY-MM-DD ou original) */
export function parseToComparableDate(raw: string): string {
  if (!raw) return ''
  // ISO: 2026-01-15
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  // DD/MM/YYYY ou DD-MM-YYYY
  const dmy = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  // DD-Mon-YYYY (ex: 02-Jan-2026)
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  }
  const dMonY = raw.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})/)
  if (dMonY) {
    const m = months[dMonY[2].toLowerCase()]
    if (m) return `${dMonY[3]}-${m}-${dMonY[1]}`
  }
  return raw
}

/** Monta mapa código inspecionado → data (respeitando filtro de período) */
function buildInspectedCodesMap(
  inspTable: ParsedTable,
  inspCol: string,
  dateCol?: string,
  dateFrom?: string,
  dateTo?: string,
  matchMode: MatchMode = 'raw'
): Map<string, string> {
  const inspectedDates = new Map<string, string>()
  const from = dateFrom ? parseToComparableDate(dateFrom) : ''
  const to = dateTo ? parseToComparableDate(dateTo) : ''
  const usePeriod = !!(dateCol && (from || to))

  for (const row of inspTable.rows) {
    const raw = row[inspCol] ?? ''
    const code = extractCode(raw, matchMode)
    if (!code) continue

    const rowDate = dateCol ? parseToComparableDate(row[dateCol] ?? '') : ''
    if (usePeriod) {
      if (from && rowDate < from) continue
      if (to && rowDate > to) continue
    }

    const existing = inspectedDates.get(code)
    if (!existing || rowDate > parseToComparableDate(existing)) {
      inspectedDates.set(code, dateCol ? (row[dateCol] ?? '') : '')
    }
  }

  return inspectedDates
}

/** Período padrão: mês da inspeção mais recente no Export */
export function getDefaultInspectionPeriod(
  inspTable: ParsedTable,
  dateCol: string
): { dateFrom: string; dateTo: string } | null {
  let maxDate = ''
  for (const row of inspTable.rows) {
    const parsed = parseToComparableDate(row[dateCol] ?? '')
    if (/^\d{4}-\d{2}-\d{2}$/.test(parsed) && parsed > maxDate) maxDate = parsed
  }
  if (!maxDate) return null

  const [year, month] = maxDate.split('-')
  const lastDay = new Date(Number(year), Number(month), 0).getDate()
  return {
    dateFrom: `${year}-${month}-01`,
    dateTo: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function calculateHierarchicalAdherence(
  baseTable: ParsedTable,
  inspTable: ParsedTable,
  baseCol: string,
  inspCol: string,
  groupCol: string,
  subGroupCol: string,
  statusCol?: string,
  statusFilter?: string,
  dateCol?: string,
  dateFrom?: string,
  dateTo?: string,
  matchMode: MatchMode = 'raw'
): AdherenceGroup[] {
  const inspectedDates = buildInspectedCodesMap(inspTable, inspCol, dateCol, dateFrom, dateTo, matchMode)
  const inspectedCodes = new Set(inspectedDates.keys())

  const filteredRows = statusCol && statusFilter
    ? baseTable.rows.filter((r) => matchesStatus(r[statusCol] ?? '', statusFilter))
    : baseTable.rows

  // Detect post name column
  const nameCol = baseTable.headers.find((h) => /nome.*posto|workstation.*name/i.test(h))
  const codeToName = new Map<string, string>()

  const tree = new Map<string, Map<string, Set<string>>>()
  for (const row of filteredRows) {
    const raw = row[baseCol] ?? ''
    const code = extractCode(raw, matchMode)
    if (!code) continue

    const name = nameCol ? (row[nameCol] ?? '') : ''
    codeToName.set(code, name)

    const group = row[groupCol] ?? 'N/A'
    const sub = row[subGroupCol] ?? 'N/A'
    if (!tree.has(group)) tree.set(group, new Map())
    const subMap = tree.get(group)!
    if (!subMap.has(sub)) subMap.set(sub, new Set())
    subMap.get(sub)!.add(code)
  }

  return Array.from(tree.entries())
    .map(([groupName, subMap]) => {
      const children: AdherenceChild[] = Array.from(subMap.entries())
        .map(([subName, codes]) => {
          const total = codes.size
          const inspectedList = [...codes].filter((c) => inspectedCodes.has(c))
          const inspected = inspectedList.length
          const adherence = total > 0 ? Math.round((inspected / total) * 100) : 0
          const dates = inspectedList.map((c) => inspectedDates.get(c) ?? '').filter(Boolean)
          const lastInspectionDate = dates.sort().at(-1)

          const missingPosts = [...codes]
            .filter((c) => !inspectedCodes.has(c))
            .map((c) => ({
              code: c,
              name: codeToName.get(c) ?? '',
            }))

          return {
            name: subName,
            total,
            inspected,
            adherence,
            lastInspectionDate,
            status: adherence === 100 ? 'concluido' : 'pendente',
            missingPosts,
          } satisfies AdherenceChild
        })
        .sort((a, b) => b.total - a.total)

      const total = children.reduce((s, c) => s + c.total, 0)
      const inspected = children.reduce((s, c) => s + c.inspected, 0)
      const adherence = total > 0 ? Math.round((inspected / total) * 100) : 0
      const groupDates = children.map((c) => c.lastInspectionDate ?? '').filter(Boolean)
      const lastInspectionDate = groupDates.sort().at(-1)
      return {
        name: groupName,
        total,
        inspected,
        adherence,
        lastInspectionDate,
        status: adherence === 100 ? 'concluido' : 'pendente',
        children,
      } satisfies AdherenceGroup
    })
    .sort((a, b) => b.total - a.total)
}

export function detectStatusColumn(table: ParsedTable): string | null {
  for (const h of table.headers) {
    if (/status/i.test(h)) return h
  }
  return null
}

export function detectDateColumn(table: ParsedTable): string | null {
  for (const h of table.headers) {
    if (/data\s*incidente|data.*cria|cria.*data|data.*aber|data.*inspe|created|resolv.*date|open.*date|close.*date/i.test(h)) return h
  }
  for (const h of table.headers) {
    if (/^data$/i.test(h) || /\bdate\b/i.test(h)) return h
  }
  // Fallback: coluna com nome contendo "data" ou "date"
  for (const h of table.headers) {
    if (/data|date/i.test(h)) return h
  }
  return null
}

export function detectGroupColumns(table: ParsedTable): { gerencia: string | null; dono: string | null } {
  let gerencia: string | null = null
  let dono: string | null = null
  for (const h of table.headers) {
    if (!gerencia && /VP[-\s]?4|ger[eê]ncia/i.test(h)) gerencia = h
    if (!dono && /dono|owner/i.test(h)) dono = h
  }
  if (!gerencia) {
    for (const h of table.headers) {
      if (/VP[-\s]?3/i.test(h)) { gerencia = h; break }
    }
  }
  return { gerencia, dono }
}

/**
 * Calcula aderência entre tabela base (postos) e tabela de inspeções.
 * baseCol: coluna com código do posto na base (ex: CodigoPosto/WorkstationCode)
 * inspCol: coluna com referência ao posto nas inspeções (ex: Título do Incidente)
 * groupCol: coluna opcional para agrupar resultados (ex: VP-5, DonoPosto)
 */
export function calculateAdherence(
  baseTable: ParsedTable,
  inspTable: ParsedTable,
  baseCol: string,
  inspCol: string,
  groupCol?: string,
  matchMode: MatchMode = 'raw'
): AdherenceRow[] {
  const inspectedCodes = new Set<string>()
  for (const row of inspTable.rows) {
    const raw = row[inspCol] ?? ''
    const code = extractCode(raw, matchMode)
    if (code) inspectedCodes.add(code)
  }

  if (!groupCol) {
    const baseCodes = new Set<string>()
    for (const row of baseTable.rows) {
      const raw = row[baseCol] ?? ''
      const code = extractCode(raw, matchMode)
      if (code) baseCodes.add(code)
    }
    const total = baseCodes.size
    const inspected = [...baseCodes].filter((c) => inspectedCodes.has(c)).length
    const adherence = total > 0 ? Math.round((inspected / total) * 100) : 0
    return [{ name: 'Total', total, inspected, adherence }]
  }

  const groups = new Map<string, Set<string>>()
  for (const row of baseTable.rows) {
    const raw = row[baseCol] ?? ''
    const code = extractCode(raw, matchMode)
    const group = row[groupCol] ?? 'N/A'
    if (!code) continue
    if (!groups.has(group)) groups.set(group, new Set())
    groups.get(group)!.add(code)
  }

  return Array.from(groups.entries())
    .map(([name, codes]) => {
      const total = codes.size
      const inspected = [...codes].filter((c) => inspectedCodes.has(c)).length
      const adherence = total > 0 ? Math.round((inspected / total) * 100) : 0
      return { name, total, inspected, adherence }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 30)
}

export function detectPostCodeColumn(table: ParsedTable): string | null {
  for (const h of table.headers) {
    const sample = table.rows.slice(0, 40).map((r) => r[h] ?? '')
    const postCount = sample.filter((v) => extractPostCode(v) !== null).length
    if (postCount > sample.length * 0.5) return h
  }
  return null
}

export interface UninspectedPost {
  code: string
  name: string
  owner: string
  group?: string
}

export function getUninspectedPosts(
  baseTable: ParsedTable,
  inspTable: ParsedTable,
  baseCol: string,
  inspCol: string,
  statusCol?: string,
  statusFilter?: string,
  dateCol?: string,
  dateFrom?: string,
  dateTo?: string,
  matchMode: MatchMode = 'raw'
): UninspectedPost[] {
  const inspectedCodes = buildInspectedCodesMap(inspTable, inspCol, dateCol, dateFrom, dateTo, matchMode)

  const filteredRows = statusCol && statusFilter
    ? baseTable.rows.filter((r) => matchesStatus(r[statusCol] ?? '', statusFilter))
    : baseTable.rows

  const nameCol = baseTable.headers.find((h) => /nome.*posto|workstation.*name/i.test(h))
  const ownerCol = baseTable.headers.find((h) => /dono|owner/i.test(h))
  const groupCol = baseTable.headers.find((h) => /VP-4|VP-3|gerencia|gerência/i.test(h))

  const result: UninspectedPost[] = []
  for (const row of filteredRows) {
    const raw = row[baseCol] ?? ''
    const code = extractCode(raw, matchMode)
    if (!code) continue
    if (!inspectedCodes.has(code)) {
      result.push({
        code,
        name: nameCol ? (row[nameCol] ?? '') : '',
        owner: ownerCol ? (row[ownerCol] ?? '') : '',
        group: groupCol ? (row[groupCol] ?? '') : '—',
      })
    }
  }
  return result
}

export interface MatchDiagnostic {
  baseSample: { raw: string; normalized: string | null }[]
  exportSample: { raw: string; extracted: string | null }[]
  baseTotal: number
  exportTotal: number
  matchedTotal: number
  baseRowsTotal: number
  baseRowsWithoutCode: number
  exportRowsTotal: number
  exportRowsWithoutCode: number
  baseFailedSamples: string[]
  exportFailedSamples: string[]
}

/** Retorna amostras dos códigos extraídos de ambas as tabelas para diagnóstico */
export function diagnoseMatching(
  baseTable: ParsedTable,
  inspTable: ParsedTable,
  baseCol: string,
  inspCol: string,
  statusCol?: string,
  statusFilter?: string,
  dateCol?: string,
  dateFrom?: string,
  dateTo?: string,
  matchMode: MatchMode = 'raw'
): MatchDiagnostic {
  const filteredRows = statusCol && statusFilter
    ? baseTable.rows.filter((r) => matchesStatus(r[statusCol] ?? '', statusFilter))
    : baseTable.rows

  const baseCodes = new Set<string>()
  const baseFailedSamples: string[] = []
  let baseRowsWithoutCode = 0

  const baseSample = filteredRows.slice(0, 10).map((r) => {
    const raw = r[baseCol] ?? ''
    const normalized = extractCode(raw, matchMode)
    if (normalized) baseCodes.add(normalized)
    return { raw, normalized }
  })

  for (const r of filteredRows) {
    const raw = r[baseCol] ?? ''
    const code = extractCode(raw, matchMode)
    if (code) baseCodes.add(code)
    else {
      baseRowsWithoutCode++
      if (baseFailedSamples.length < 8 && raw.trim()) baseFailedSamples.push(raw.trim())
    }
  }

  const inspectedMap = buildInspectedCodesMap(inspTable, inspCol, dateCol, dateFrom, dateTo, matchMode)
  const inspectedCodes = new Set(inspectedMap.keys())

  const exportFailedSamples: string[] = []
  let exportRowsWithoutCode = 0
  let exportRowsInPeriod = 0

  const from = dateFrom ? parseToComparableDate(dateFrom) : ''
  const to = dateTo ? parseToComparableDate(dateTo) : ''
  const usePeriod = !!(dateCol && (from || to))

  for (const r of inspTable.rows) {
    if (usePeriod) {
      const rowDate = parseToComparableDate(r[dateCol!] ?? '')
      if (from && rowDate < from) continue
      if (to && rowDate > to) continue
    }
    exportRowsInPeriod++

    const raw = r[inspCol] ?? ''
    const extracted = extractCode(raw, matchMode)
    if (!extracted && raw.trim()) {
      exportRowsWithoutCode++
      if (exportFailedSamples.length < 8) exportFailedSamples.push(raw.trim().slice(0, 120))
    }
  }

  const exportSample = inspTable.rows.slice(0, 10).map((r) => {
    const raw = r[inspCol] ?? ''
    return { raw, extracted: extractCode(raw, matchMode) }
  })

  const matchedTotal = [...baseCodes].filter((c) => inspectedCodes.has(c)).length

  return {
    baseSample,
    exportSample,
    baseTotal: baseCodes.size,
    exportTotal: inspectedCodes.size,
    matchedTotal,
    baseRowsTotal: filteredRows.length,
    baseRowsWithoutCode,
    exportRowsTotal: exportRowsInPeriod || inspTable.rows.length,
    exportRowsWithoutCode,
    baseFailedSamples,
    exportFailedSamples,
  }
}
