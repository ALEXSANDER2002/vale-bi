'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  makeStyles, Text, Button, Card, Select,
  TabList, Tab, mergeClasses, Divider,
} from '@fluentui/react-components'
import {
  ArrowUploadRegular, TableMultipleRegular,
  ChevronRightRegular, ChevronDownRegular,
  SettingsRegular, CheckmarkCircleRegular, WarningRegular,
  CalendarRegular, FilterRegular, ArrowDownloadRegular,
  PrintRegular,
} from '@fluentui/react-icons'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { useData } from '@/context/DataContext'
import {
  detectPostCodeColumn, detectStatusColumn, detectGroupColumns,
  detectDateColumn, calculateHierarchicalAdherence, diagnoseMatching,
  getUninspectedPosts, getDefaultInspectionPeriod,
} from '@/lib/fileParser'
import type { AdherenceGroup, MatchDiagnostic, MatchMode } from '@/lib/fileParser'


/** Converte YYYY-MM-DD para DD/MM/AAAA */
function formatDateBR(iso: string | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

const G = '#00807C'
const Y = '#EEA722'
const W = '#FFFFFF'

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '1200px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '64px',
    paddingBottom: '64px',
    paddingLeft: '24px',
    paddingRight: '24px',
    gap: '20px',
    textAlign: 'center',
    border: `1px dashed ${G}`,
    borderRadius: '2px',
    backgroundColor: W,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  tableWrap: {
    overflowX: 'auto',
    overflowY: 'hidden',
    maxWidth: '100%',
    WebkitOverflowScrolling: 'touch',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    paddingTop: '11px',
    paddingBottom: '11px',
    paddingLeft: '16px',
    paddingRight: '16px',
    textAlign: 'left',
    fontWeight: '700',
    fontSize: '10.5px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: G,
    backgroundColor: W,
    borderBottom: `1px solid ${G}`,
    whiteSpace: 'normal',
  },
  td: {
    paddingTop: '9px',
    paddingBottom: '9px',
    paddingLeft: '16px',
    paddingRight: '16px',
    borderBottom: `1px solid ${G}`,
    whiteSpace: 'normal',
    color: G,
  },
  groupRow: {
    cursor: 'pointer',
    backgroundColor: W,
    ':hover': {
      backgroundColor: G,
      color: W,
    },
  },
  childRow: {
    backgroundColor: W,
    ':hover': {
      backgroundColor: G,
      color: W,
    },
  },
  progressCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: '180px',
  },
  expandIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    marginRight: '6px',
    verticalAlign: 'middle',
    color: 'inherit',
    flexShrink: 0,
  },
  childIndent: {
    paddingLeft: '40px',
  },
  postIndent: {
    paddingLeft: '65px',
  },
  postRow: {
    backgroundColor: '#FFF3D6',
  },
  summaryRow: {
    backgroundColor: W,
    borderTop: `1px solid ${G}`,
    borderBottom: `1px solid ${G}`,
  },
  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
    marginTop: '12px',
  },
  configField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  configLabel: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: G,
  },
  configHint: {
    fontSize: '11px',
    color: Y,
    marginTop: '2px',
  },
  detectedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: G,
  },
  manualBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: Y,
  },
  tableSelector: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px',
  },
  dateCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: 'inherit',
    fontSize: '12px',
  },
})

export default function ComparePage() {
  const styles = useStyles()
  const { tables } = useData()

  const [statusFilter, setStatusFilter] = useState<'ativo' | 'inativo'>('ativo')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [configOpen, setConfigOpen] = useState(false)
  const [diagOpen, setDiagOpen] = useState(false)
  const [uninspOpen, setUninspOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [matchMode, setMatchMode] = useState<MatchMode>('raw')
  const periodInitialized = useRef(false)

  const [baseId, setBaseId] = useState<string>('')
  const [inspId, setInspId] = useState<string>('')

  const baseTable = useMemo(() => {
    if (baseId) return tables.find((t) => t.id === baseId)
    return tables.find((t) => /base/i.test(t.name))
  }, [tables, baseId])

  const inspTable = useMemo(() => {
    if (inspId) return tables.find((t) => t.id === inspId)
    return tables.find((t) => /export/i.test(t.name))
  }, [tables, inspId])

  const autoBaseCol = useMemo(() => baseTable ? detectPostCodeColumn(baseTable) : null, [baseTable])
  const autoInspCol = useMemo(() => inspTable ? (inspTable.headers.find((h) => /t[ií]tulo/i.test(h)) ?? null) : null, [inspTable])
  const autoStatus = useMemo(() => baseTable ? detectStatusColumn(baseTable) : null, [baseTable])
  const autoGroup = useMemo(() => baseTable ? detectGroupColumns(baseTable) : { gerencia: null, dono: null }, [baseTable])
  const autoDateCol = useMemo(() => inspTable ? detectDateColumn(inspTable) : null, [inspTable])

  const [manualBaseCol, setManualBaseCol] = useState('')
  const [manualInspCol, setManualInspCol] = useState('')
  const [manualStatusCol, setManualStatusCol] = useState('')
  const [manualGerenciaCol, setManualGerenciaCol] = useState('')
  const [manualDonoCol, setManualDonoCol] = useState('')
  const [manualDateCol, setManualDateCol] = useState('')

  const baseCol = manualBaseCol || autoBaseCol || (baseTable?.headers[0] ?? '')
  const inspCol = manualInspCol || autoInspCol || (inspTable?.headers[0] ?? '')
  const statusCol = manualStatusCol || autoStatus || ''
  const gerenciaCol = manualGerenciaCol || autoGroup.gerencia || ''
  const donoCol = manualDonoCol || autoGroup.dono || ''
  const dateCol = manualDateCol || autoDateCol || ''

  // Período padrão: mês da inspeção mais recente (evita 100% por contar o ano inteiro)
  useEffect(() => {
    if (!inspTable || !dateCol || periodInitialized.current) return
    const period = getDefaultInspectionPeriod(inspTable, dateCol)
    if (period) {
      setDateFrom(period.dateFrom)
      setDateTo(period.dateTo)
      periodInitialized.current = true
    }
  }, [inspTable, dateCol])

  useEffect(() => {
    periodInitialized.current = false
  }, [inspId, manualDateCol, inspTable?.id])

  const toggleGroup = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const diagnostic = useMemo<MatchDiagnostic | null>(() => {
    if (!baseTable || !inspTable || !baseCol || !inspCol) return null
    return diagnoseMatching(
      baseTable, inspTable, baseCol, inspCol,
      statusCol || undefined, statusFilter,
      dateCol || undefined, dateFrom || undefined, dateTo || undefined,
      matchMode
    )
  }, [baseTable, inspTable, baseCol, inspCol, statusCol, statusFilter, dateCol, dateFrom, dateTo, matchMode])

  const hierarchyData = useMemo(() => {
    if (!baseTable || !inspTable || !baseCol || !inspCol || !gerenciaCol || !donoCol) return null
    return calculateHierarchicalAdherence(
      baseTable, inspTable, baseCol, inspCol,
      gerenciaCol, donoCol, statusCol || undefined, statusFilter,
      dateCol || undefined, dateFrom || undefined, dateTo || undefined,
      matchMode
    )
  }, [baseTable, inspTable, baseCol, inspCol, gerenciaCol, donoCol, statusCol, statusFilter, dateCol, dateFrom, dateTo, matchMode])

  // Expande todas as gerências por padrão ao carregar os dados
  useEffect(() => {
    if (hierarchyData && hierarchyData.length > 0) {
      setExpanded(new Set(hierarchyData.map((g) => g.name)))
    }
  }, [hierarchyData])

  const uninspectedPosts = useMemo(() => {
    if (!baseTable || !inspTable || !baseCol || !inspCol) return []
    return getUninspectedPosts(
      baseTable, inspTable, baseCol, inspCol,
      statusCol || undefined, statusFilter,
      dateCol || undefined, dateFrom || undefined, dateTo || undefined,
      matchMode
    )
  }, [baseTable, inspTable, baseCol, inspCol, statusCol, statusFilter, dateCol, dateFrom, dateTo, matchMode])


  const totals = useMemo(() => {
    if (!hierarchyData) return { total: 0, inspected: 0, adherence: 0 }
    const total = hierarchyData.reduce((s, g) => s + g.total, 0)
    const inspected = hierarchyData.reduce((s, g) => s + g.inspected, 0)
    const adherence = total > 0 ? Math.round((inspected / total) * 100) : 0
    return { total, inspected, adherence }
  }, [hierarchyData])

  const expandAll = () => {
    if (hierarchyData) setExpanded(new Set(hierarchyData.map((g) => g.name)))
  }
  const collapseAll = () => setExpanded(new Set())

  const exportAdherenceToXLSX = () => {
    if (!hierarchyData) return
    
    const wb = XLSX.utils.book_new()
    
    // 1. Planilha Resumo / Painel Geral
    const summaryRows = [
      ['PAINEL GERAL DE ADERÊNCIA - INSPEÇÕES 5S'],
      [`Base de Dados: ${baseTable?.name || 'Base'} · Export: ${inspTable?.name || 'Export'}`],
      [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
      [],
      ['Total de Postos', totals.total],
      ['Total Inspecionados', totals.inspected],
      ['Aderência Geral (%)', `${totals.adherence}%`],
      [],
      ['Gerência (VP-4)', 'Total Postos', 'Inspecionados', 'Aderência (%)', 'Última Inspeção', 'Status']
    ]
    
    hierarchyData.forEach((g) => {
      summaryRows.push([
        g.name,
        g.total,
        g.inspected,
        `${g.adherence}%`,
        g.lastInspectionDate ? formatDateBR(g.lastInspectionDate) : '—',
        g.adherence === 100 ? 'Concluído' : 'Pendente'
      ])
    })
    
    summaryRows.push([
      'TOTAL GERAL',
      totals.total,
      totals.inspected,
      `${totals.adherence}%`,
      '—',
      totals.adherence === 100 ? 'Concluído' : 'Pendente'
    ])
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
    wsSummary['!cols'] = [
      { wch: 32 }, // Gerência
      { wch: 15 }, // Total
      { wch: 15 }, // Inspecionados
      { wch: 15 }, // Aderência
      { wch: 18 }, // Última Inspeção
      { wch: 15 }  // Status
    ]
    wsSummary['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }
    ]
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Painel Geral')

    const detailedRows: (string | number)[][] = [
      ['Nível', 'Gerência', 'Coordenador / Dono', 'Quantidade Postos', 'Inspecionados', 'Aderência (%)', 'Última Inspeção', 'Status']
    ]
    
    hierarchyData.forEach((g) => {
      detailedRows.push([
        'Gerência',
        g.name,
        '',
        g.total,
        g.inspected,
        `${g.adherence}%`,
        g.lastInspectionDate ? formatDateBR(g.lastInspectionDate) : '—',
        g.adherence === 100 ? 'Concluído' : 'Pendente'
      ])
      g.children.forEach((c) => {
        detailedRows.push([
          'Coordenador',
          g.name,
          c.name,
          c.total,
          c.inspected,
          `${c.adherence}%`,
          c.lastInspectionDate ? formatDateBR(c.lastInspectionDate) : '—',
          c.adherence === 100 ? 'Concluído' : 'Pendente'
        ])
        if (c.missingPosts && c.missingPosts.length > 0) {
          c.missingPosts.forEach((post) => {
            detailedRows.push([
              'Posto Pendente',
              g.name,
              `  ↳ ${post.code} - ${post.name}`,
              '—',
              '—',
              '0%',
              '—',
              'Faltando'
            ])
          })
        }
      })
    })
    
    detailedRows.push([
      'TOTAL GERAL',
      '',
      '',
      totals.total,
      totals.inspected,
      `${totals.adherence}%`,
      '—',
      totals.adherence === 100 ? 'Concluído' : 'Pendente'
    ])
    
    const wsDetailed = XLSX.utils.aoa_to_sheet(detailedRows)
    wsDetailed['!cols'] = [
      { wch: 12 }, // Nível
      { wch: 30 }, // Gerência
      { wch: 26 }, // Coordenador
      { wch: 18 }, // Qtde Postos
      { wch: 15 }, // Inspecionados
      { wch: 15 }, // Aderência
      { wch: 18 }, // Última Inspeção
      { wch: 15 }  // Status
    ]
    XLSX.utils.book_append_sheet(wb, wsDetailed, `Aderência ${statusFilter === 'ativo' ? 'Ativos' : 'Inativos'}`)

    // 3. Planilha de Pendentes (Agrupados por Coordenador)
    const pendingRows = [['Código do Posto', 'Nome do Posto', 'Coordenador / Dono', 'Gerência (VP-4)']]
    const pendingMerges: XLSX.Range[] = []
    
    // Agrupar por coordenador
    const pendingByCoord: Record<string, typeof uninspectedPosts> = {}
    uninspectedPosts.forEach((p) => {
      const key = `${p.owner || '—'}||${p.group || '—'}`
      if (!pendingByCoord[key]) pendingByCoord[key] = []
      pendingByCoord[key].push(p)
    })
    
    const sortedPendingCoords = Object.entries(pendingByCoord).sort((a, b) => b[1].length - a[1].length)
    
    let pendingRowIdx = 1
    sortedPendingCoords.forEach(([key, list]) => {
      const [coord, ger] = key.split('||')
      pendingRows.push([`Coordenador: ${coord} (${ger})`, '', '', `Faltam ${list.length}`])
      pendingMerges.push({ s: { r: pendingRowIdx, c: 0 }, e: { r: pendingRowIdx, c: 2 } })
      pendingRowIdx++
      
      list.forEach((p) => {
        pendingRows.push([p.code, p.name || '—', p.owner || '—', p.group || '—'])
        pendingRowIdx++
      })
    })
    
    const wsPending = XLSX.utils.aoa_to_sheet(pendingRows)
    wsPending['!merges'] = pendingMerges
    wsPending['!cols'] = [
      { wch: 18 }, // Código
      { wch: 35 }, // Nome
      { wch: 26 }, // Coordenador
      { wch: 30 }  // Gerência
    ]
    XLSX.utils.book_append_sheet(wb, wsPending, 'Postos Pendentes')

    const statusText = statusFilter === 'ativo' ? 'Ativos' : 'Inativos'
    XLSX.writeFile(wb, `Relatorio_Aderencia_Vale_${statusText}.xlsx`)
  }

  const exportUninspectedToXLSX = () => {
    if (uninspectedPosts.length === 0) return
    const wb = XLSX.utils.book_new()
    const pendingRows = [['Código do Posto', 'Nome do Posto', 'Coordenador / Dono', 'Gerência (VP-4)']]
    const pendingMerges: XLSX.Range[] = []
    
    // Agrupar por coordenador
    const pendingByCoord: Record<string, typeof uninspectedPosts> = {}
    uninspectedPosts.forEach((p) => {
      const key = `${p.owner || '—'}||${p.group || '—'}`
      if (!pendingByCoord[key]) pendingByCoord[key] = []
      pendingByCoord[key].push(p)
    })
    
    const sortedPendingCoords = Object.entries(pendingByCoord).sort((a, b) => b[1].length - a[1].length)
    
    let pendingRowIdx = 1
    sortedPendingCoords.forEach(([key, list]) => {
      const [coord, ger] = key.split('||')
      pendingRows.push([`Coordenador: ${coord} (${ger})`, '', '', `Faltam ${list.length}`])
      pendingMerges.push({ s: { r: pendingRowIdx, c: 0 }, e: { r: pendingRowIdx, c: 2 } })
      pendingRowIdx++
      
      list.forEach((p) => {
        pendingRows.push([p.code, p.name || '—', p.owner || '—', p.group || '—'])
        pendingRowIdx++
      })
    })
    
    const ws = XLSX.utils.aoa_to_sheet(pendingRows)
    ws['!merges'] = pendingMerges
    ws['!cols'] = [
      { wch: 18 }, // Código
      { wch: 35 }, // Nome
      { wch: 26 }, // Coordenador
      { wch: 30 }  // Gerência
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Postos Pendentes')
    XLSX.writeFile(wb, `Postos_Pendentes_${baseTable?.name || 'Vale'}.xlsx`)
  }

  if (tables.length < 2) {
    return (
      <div className={styles.emptyState}>
        <TableMultipleRegular fontSize={40} style={{ color: '#00807C' }} />
        <div>
          <Text size={400} weight="semibold" block style={{ color: '#00807C' }}>Nenhuma tabela disponível</Text>
          <Text size={300} block style={{ color: '#00807C', marginTop: '4px' }}>
            Importe a Base de Dados e o Export para calcular aderência.
          </Text>
        </div>
        <Link href="/upload">
          <Button appearance="primary" icon={<ArrowUploadRegular />}>Importar tabelas</Button>
        </Link>
      </div>
    )
  }

  const missingConfig = !gerenciaCol || !donoCol
  const missingBaseCol = !baseCol
  const missingInspCol = !inspCol

  return (
    <div className={styles.page}>
      {/* Cabeçalho de impressão (exclusivo para PDF) */}
      <div className="print-only" style={{ display: 'none', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${G}`, paddingBottom: '10px' }}>
          <img
            src="https://upload.wikimedia.org/wikipedia/pt/thumb/c/cc/Logotipo_Vale.svg/3840px-Logotipo_Vale.svg.png"
            alt="Vale S.A."
            style={{ height: '30px', width: 'auto', objectFit: 'contain' }}
          />
          <Text size={300} weight="semibold" style={{ color: '#666666' }}>RELATÓRIO DE ADERÊNCIA 5S</Text>
        </div>
        <div style={{ marginTop: '10px', fontSize: '11px', color: '#666666', display: 'flex', justifyContent: 'space-between' }}>
          <span>Base: {baseTable?.name} | Export: {inspTable?.name}</span>
          <span>Gerado em: {new Date().toLocaleString('pt-BR')}</span>
        </div>
      </div>

      {/* ── Configuração ── */}
      <Card className="no-print" style={{ padding: '0px', overflow: 'hidden' }}>
        <div
          style={{
            paddingTop: '12px', paddingBottom: '12px',
            paddingLeft: '20px', paddingRight: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', cursor: 'pointer', flexWrap: 'wrap',
          }}
          onClick={() => setConfigOpen((v) => !v)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <SettingsRegular fontSize={16} style={{ color: '#00807C' }} />
            <Text size={300} weight="semibold" style={{ color: '#00807C' }}>Configuração do cruzamento</Text>
            {missingConfig || missingBaseCol || missingInspCol ? (
              <span className={styles.manualBadge}><WarningRegular fontSize={13} /> Revise as colunas</span>
            ) : (
              <span className={styles.detectedBadge}><CheckmarkCircleRegular fontSize={13} /> Colunas configuradas</span>
            )}
          </div>

          {!configOpen && baseTable && inspTable && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
              {[
                { label: 'Código (base)', value: baseCol },
                { label: 'Ref. (export)', value: inspCol },
                { label: 'Gerência', value: gerenciaCol },
                { label: 'Dono', value: donoCol },
                { label: 'Status', value: statusCol || '—' },
                { label: 'Data', value: dateCol || '—' },
              ].map(({ label, value }) => (
                <span
                  key={label}
                  title={label}
                  style={{
                    fontSize: '11px',
                    border: value && value !== '—' ? `1px solid ${G}` : `1px solid ${Y}`,
                    backgroundColor: W,
                    color: value && value !== '—' ? G : Y,
                    padding: '2px 8px', borderRadius: '2px', whiteSpace: 'nowrap',
                  }}
                >
                  <span>{label}: </span>
                  <strong>{value || '⚠ não detectado'}</strong>
                </span>
              ))}
            </div>
          )}

          <Button size="small" appearance="subtle" style={{ flexShrink: 0 }}>
            {configOpen ? 'Fechar' : 'Editar'}
          </Button>
        </div>

        {configOpen && (
          <>
            <Divider />
            <div style={{ padding: '16px 20px 20px' }}>
              <Text size={200} weight="semibold" block style={{ marginBottom: '8px', color: '#00807C' }}>Tabelas</Text>
              <div className={styles.tableSelector}>
                <div className={styles.configField}>
                  <span className={styles.configLabel}>Base de dados (postos)</span>
                  <Select size="small" value={baseId || baseTable?.id || ''}
                    onChange={(_, d) => { setBaseId(d.value); setManualBaseCol(''); setManualGerenciaCol(''); setManualDonoCol(''); setManualStatusCol('') }}>
                    <option value="">— detectar automaticamente —</option>
                    {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                  <span className={styles.configHint}>Detectado: <strong>{baseTable?.name ?? 'nenhuma'}</strong></span>
                </div>
                <div className={styles.configField}>
                  <span className={styles.configLabel}>Export (inspeções)</span>
                  <Select size="small" value={inspId || inspTable?.id || ''}
                    onChange={(_, d) => { setInspId(d.value); setManualInspCol(''); setManualDateCol('') }}>
                    <option value="">— detectar automaticamente —</option>
                    {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                  <span className={styles.configHint}>Detectado: <strong>{inspTable?.name ?? 'nenhuma'}</strong></span>
                </div>
              </div>

              <Divider style={{ marginBottom: '16px' }} />

              <Text size={200} weight="semibold" block style={{ marginBottom: '8px', color: '#00807C' }}>Modo de correspondência</Text>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px',
              }}>
                {(['raw', 'post'] as MatchMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setMatchMode(mode)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '2px',
                      border: `1px solid ${G}`,
                      backgroundColor: matchMode === mode ? G : W,
                      color: matchMode === mode ? W : G,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '12px', color: 'inherit' }}>
                      {mode === 'raw' ? '✅ Valor direto da coluna' : '🔍 Extrair código POST'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'inherit', marginTop: '3px' }}>
                      {mode === 'raw'
                        ? 'Compara qualquer valor da coluna selecionada (ex: ID, código, nome)'
                        : 'Extrai apenas códigos no formato POST-XXXXX dos valores'
                      }
                    </div>
                  </button>
                ))}
              </div>

              <Text size={200} weight="semibold" block style={{ marginBottom: '8px', color: '#00807C' }}>Mapeamento de colunas</Text>
              <div className={styles.configGrid}>
                <div className={styles.configField}>
                  <span className={styles.configLabel}>Código do posto (Base)</span>
                  <Select size="small" value={manualBaseCol || autoBaseCol || ''} onChange={(_, d) => setManualBaseCol(d.value)}>
                    <option value="">— detectar automaticamente —</option>
                    {baseTable?.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                  <span className={styles.configHint}>
                    {autoBaseCol ? <><CheckmarkCircleRegular fontSize={11} style={{ color: '#00807C' }} /> Auto: <strong>{autoBaseCol}</strong></>
                      : <><WarningRegular fontSize={11} style={{ color: '#EEA722' }} /> Não detectado — selecione manualmente</>}
                  </span>
                </div>

                <div className={styles.configField}>
                  <span className={styles.configLabel}>Referência ao posto (Export)</span>
                  <Select size="small" value={manualInspCol || autoInspCol || ''} onChange={(_, d) => setManualInspCol(d.value)}>
                    <option value="">— detectar automaticamente —</option>
                    {inspTable?.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                  <span className={styles.configHint}>
                    {autoInspCol ? <><CheckmarkCircleRegular fontSize={11} style={{ color: '#00807C' }} /> Auto: <strong>{autoInspCol}</strong></>
                      : <><WarningRegular fontSize={11} style={{ color: '#EEA722' }} /> Não detectado — selecione manualmente</>}
                  </span>
                </div>

                <div className={styles.configField}>
                  <span className={styles.configLabel}>Data de inspeção (Export)</span>
                  <Select size="small" value={manualDateCol || autoDateCol || ''} onChange={(_, d) => setManualDateCol(d.value)}>
                    <option value="">— sem data —</option>
                    {inspTable?.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                  <span className={styles.configHint}>
                    {autoDateCol ? <><CheckmarkCircleRegular fontSize={11} style={{ color: '#00807C' }} /> Auto: <strong>{autoDateCol}</strong></>
                      : 'Nenhuma coluna de data detectada'}
                  </span>
                </div>

                <div className={styles.configField}>
                  <span className={styles.configLabel}>Coluna de Gerência</span>
                  <Select size="small" value={manualGerenciaCol || autoGroup.gerencia || ''} onChange={(_, d) => setManualGerenciaCol(d.value)}>
                    <option value="">— detectar automaticamente —</option>
                    {baseTable?.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                  <span className={styles.configHint}>
                    {autoGroup.gerencia ? <><CheckmarkCircleRegular fontSize={11} style={{ color: '#00807C' }} /> Auto: <strong>{autoGroup.gerencia}</strong></>
                      : <><WarningRegular fontSize={11} style={{ color: '#EEA722' }} /> Não detectado — selecione manualmente</>}
                  </span>
                </div>

                <div className={styles.configField}>
                  <span className={styles.configLabel}>Coluna de Dono / Coordenador</span>
                  <Select size="small" value={manualDonoCol || autoGroup.dono || ''} onChange={(_, d) => setManualDonoCol(d.value)}>
                    <option value="">— detectar automaticamente —</option>
                    {baseTable?.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                  <span className={styles.configHint}>
                    {autoGroup.dono ? <><CheckmarkCircleRegular fontSize={11} style={{ color: '#00807C' }} /> Auto: <strong>{autoGroup.dono}</strong></>
                      : <><WarningRegular fontSize={11} style={{ color: '#EEA722' }} /> Não detectado — selecione manualmente</>}
                  </span>
                </div>

                <div className={styles.configField}>
                  <span className={styles.configLabel}>Coluna de Status (Base)</span>
                  <Select size="small" value={manualStatusCol || autoStatus || ''} onChange={(_, d) => setManualStatusCol(d.value)}>
                    <option value="">— sem filtro de status —</option>
                    {baseTable?.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                  <span className={styles.configHint}>
                    {autoStatus ? <><CheckmarkCircleRegular fontSize={11} style={{ color: '#00807C' }} /> Auto: <strong>{autoStatus}</strong></>
                      : 'Nenhuma coluna de status detectada'}
                  </span>
                </div>
              </div>

              {baseTable && inspTable && (
                <div style={{ marginTop: '16px', padding: '10px 14px', border: `1px solid ${G}`, backgroundColor: W, borderRadius: '2px', fontSize: '12px', color: G }}>
                  <strong>Lógica ({matchMode === 'raw' ? 'Valor direto' : 'POST'}):</strong>{' '}
                  {matchMode === 'raw'
                    ? <>Compara o valor exato de <em>&ldquo;{baseCol}&rdquo;</em> (Base) com <em>&ldquo;{inspCol}&rdquo;</em> (Export). Se o valor coincidir → inspecionado.</>
                    : <>Extrai o código <strong>POST-XXXXX</strong> de <em>&ldquo;{baseCol}&rdquo;</em> (Base) e busca em <em>&ldquo;{inspCol}&rdquo;</em> (Export). Se encontrar → inspecionado.</>
                  }
                  {' '}Data coletada de <em>&ldquo;{dateCol || 'não configurada'}&rdquo;</em>.
                  Agrupado por <em>&ldquo;{gerenciaCol || '?'}&rdquo;</em> / <em>&ldquo;{donoCol || '?'}&rdquo;</em>.
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* ── Filtro de período ── */}
      {baseTable && inspTable && dateCol && (
        <Card className="no-print" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FilterRegular fontSize={16} style={{ color: G }} />
              <Text size={300} weight="semibold">Filtrar período de inspeção</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text size={200} style={{ color: G }}>De:</Text>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  padding: '4px 8px', borderRadius: '2px', fontSize: '13px',
                  border: `1px solid ${G}`,
                  backgroundColor: W,
                  color: G,
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text size={200} style={{ color: G }}>Até:</Text>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  padding: '4px 8px', borderRadius: '2px', fontSize: '13px',
                  border: `1px solid ${G}`,
                  backgroundColor: W,
                  color: G,
                }}
              />
            </div>
            {(dateFrom || dateTo) && (
              <>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '2px',
                  border: `1px solid ${G}`,
                  backgroundColor: W,
                  color: G,
                }}>
                  Período: {dateFrom ? formatDateBR(dateFrom) : '…'}
                  {' — '}
                  {dateTo ? formatDateBR(dateTo) : '…'}
                </span>
                <Button size="small" appearance="subtle" onClick={() => { setDateFrom(''); setDateTo('') }}>
                  Ver todo o Export
                </Button>
              </>
            )}
            {!dateFrom && !dateTo && (
              <>
                <Text size={100} style={{ color: Y }}>
                  ⚠ Sem filtro de data: inspeções de <strong>todo o ano</strong> — aderência tende a 100%. Selecione um período.
                </Text>
                {inspTable && dateCol && (
                  <Button
                    size="small"
                    appearance="primary"
                    onClick={() => {
                      const period = getDefaultInspectionPeriod(inspTable, dateCol)
                      if (period) {
                        setDateFrom(period.dateFrom)
                        setDateTo(period.dateTo)
                      }
                    }}
                  >
                    Usar mês mais recente
                  </Button>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {/* ── Diagnóstico de matching ── */}
      {diagnostic && (
        <Card className="no-print" style={{ padding: '0px', overflow: 'hidden' }}>
          <div
            style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setDiagOpen((v) => !v)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Text size={200} weight="semibold">🔍 Diagnóstico de matching</Text>
              <span style={{ fontSize: '11px', color: G }}>
                Base: <strong>{diagnostic.baseTotal}</strong>/{diagnostic.baseRowsTotal} extraídos ·
                Export: <strong>{diagnostic.exportTotal}</strong> únicos ({diagnostic.exportRowsTotal - diagnostic.exportRowsWithoutCode}/{diagnostic.exportRowsTotal} linhas) ·
                Cruzados: <strong style={{ color: diagnostic.matchedTotal === diagnostic.baseTotal ? G : Y }}>
                  {diagnostic.matchedTotal}
                </strong>
              </span>
              {(diagnostic.baseRowsWithoutCode > 0 || diagnostic.exportRowsWithoutCode > 0) && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 600,
                  padding: '2px 8px', borderRadius: '2px', border: `1px solid ${Y}`,
                  backgroundColor: W, color: Y
                }}>
                  {diagnostic.baseRowsWithoutCode + diagnostic.exportRowsWithoutCode} sem código extraído
                </span>
              )}
              {diagnostic.matchedTotal === diagnostic.baseTotal && diagnostic.baseTotal > 0 && !dateFrom && !dateTo && (
                <span style={{ fontSize: '11px', color: Y, fontWeight: 600 }}>
                  ⚠ 100% no ano inteiro — use o filtro de período para ver aderência mensal
                </span>
              )}
            </div>
            <Button size="small" appearance="subtle">{diagOpen ? 'Fechar' : 'Ver amostras'}</Button>
          </div>

          {diagOpen && (
            <>
              <Divider />
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <Text size={200} weight="semibold" block style={{ marginBottom: '8px' }}>
                    Primeiros 10 valores da Base ({baseCol})
                  </Text>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '4px 8px', backgroundColor: W, color: G, borderBottom: `1px solid ${G}`, fontSize: '11px' }}>Valor original</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px', backgroundColor: W, color: G, borderBottom: `1px solid ${G}`, fontSize: '11px' }}>Normalizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnostic.baseSample.map((s, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${G}` }}>
                          <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{s.raw || '—'}</td>
                          <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: s.normalized ? G : Y }}>
                            {s.normalized ?? '✗ não reconhecido'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <Text size={200} weight="semibold" block style={{ marginBottom: '8px' }}>
                    Primeiros 10 valores do Export ({inspCol})
                  </Text>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '4px 8px', backgroundColor: W, color: G, borderBottom: `1px solid ${G}`, fontSize: '11px' }}>Valor original</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px', backgroundColor: W, color: G, borderBottom: `1px solid ${G}`, fontSize: '11px' }}>Código extraído</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnostic.exportSample.map((s, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${G}` }}>
                          <td style={{ padding: '4px 8px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace', fontSize: '11px' }} title={s.raw}>{s.raw || '—'}</td>
                          <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: s.extracted ? G : Y }}>
                            {s.extracted ?? '✗ não extraído'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {(diagnostic.baseFailedSamples.length > 0 || diagnostic.exportFailedSamples.length > 0) && (
                <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {diagnostic.baseFailedSamples.length > 0 && (
                    <div style={{ padding: '10px 12px', border: `1px solid ${Y}`, backgroundColor: W, borderRadius: '2px', fontSize: '11px' }}>
                      <Text size={100} weight="semibold" block style={{ marginBottom: '6px', color: Y }}>
                        Base — {diagnostic.baseRowsWithoutCode} linha(s) sem código reconhecido
                      </Text>
                      {diagnostic.baseFailedSamples.map((s, i) => (
                        <div key={i} style={{ fontFamily: 'monospace', marginTop: '2px' }}>{s}</div>
                      ))}
                    </div>
                  )}
                  {diagnostic.exportFailedSamples.length > 0 && (
                    <div style={{ padding: '10px 12px', border: `1px solid ${Y}`, backgroundColor: W, borderRadius: '2px', fontSize: '11px' }}>
                      <Text size={100} weight="semibold" block style={{ marginBottom: '6px', color: Y }}>
                        Export — {diagnostic.exportRowsWithoutCode} linha(s) sem POST no título
                      </Text>
                      {diagnostic.exportFailedSamples.map((s, i) => (
                        <div key={i} style={{ fontFamily: 'monospace', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s}>{s}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* ── Postos não inspecionados ── */}
      {baseTable && inspTable && (
        <Card className="no-print" style={{ padding: '0px', overflow: 'hidden' }}>
          <div
            style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setUninspOpen((v) => !v)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Text size={200} weight="semibold">Postos não inspecionados</Text>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 600,
                color: uninspectedPosts.length === 0 ? G : Y,
                backgroundColor: W,
                padding: '2px 8px', borderRadius: '2px',
                border: `1px solid ${uninspectedPosts.length === 0 ? G : Y}`,
              }}>
                {uninspectedPosts.length === 0 ? '✓ Todos inspecionados' : `${uninspectedPosts.length} pendentes`}
              </span>
              {uninspectedPosts.length === 0 && !dateFrom && !dateTo && (
                <Text size={100} style={{ color: Y }}>
                  — use o filtro de período para ver por mês
                </Text>
              )}
            </div>
            <Button size="small" appearance="subtle">{uninspOpen ? 'Fechar' : 'Ver lista'}</Button>
          </div>
          {uninspOpen && uninspectedPosts.length > 0 && (
            <>
              <Divider />
              <div style={{ padding: '10px 20px 0', display: 'flex', justifyContent: 'flex-end' }} className="no-print">
                <Button
                  size="small"
                  appearance="outline"
                  icon={<ArrowDownloadRegular />}
                  onClick={exportUninspectedToXLSX}
                >
                  Exportar Postos Pendentes (XLSX)
                </Button>
              </div>
              <div style={{ padding: '12px 20px', maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px 10px', backgroundColor: W, color: G, borderBottom: `1px solid ${G}`, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', width: '30%' }}>Código</th>
                      <th style={{ textAlign: 'left', padding: '6px 10px', backgroundColor: W, color: G, borderBottom: `1px solid ${G}`, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', width: '45%' }}>Nome do Posto</th>
                      <th style={{ textAlign: 'left', padding: '6px 10px', backgroundColor: W, color: G, borderBottom: `1px solid ${G}`, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', width: '25%' }}>Gerência (VP-4)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const groups: Record<string, { owner: string; group: string; posts: typeof uninspectedPosts }> = {}
                      uninspectedPosts.forEach((p) => {
                        const key = `${p.owner || '—'}||${p.group || '—'}`
                        if (!groups[key]) {
                          groups[key] = { owner: p.owner || '—', group: p.group || '—', posts: [] }
                        }
                        groups[key].posts.push(p)
                      })

                      const sortedGroups = Object.values(groups).sort((a, b) => b.posts.length - a.posts.length)

                      const rows: React.ReactNode[] = []
                      sortedGroups.forEach((grp) => {
                        rows.push(
                          <tr key={`header-${grp.owner}-${grp.group}`} style={{ backgroundColor: '#FFF3D6' }}>
                            <td colSpan={2} style={{ padding: '8px 10px', fontWeight: 'bold', color: '#7F5A00' }}>
                              Coordenador: {grp.owner} ({grp.group})
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#7F5A00', textAlign: 'right' }}>
                              Faltam {grp.posts.length}
                            </td>
                          </tr>
                        )
                        grp.posts.forEach((p) => {
                          rows.push(
                            <tr key={p.code} style={{ borderBottom: `1px solid ${G}`, backgroundColor: W }}>
                              <td style={{ padding: '6px 10px 6px 20px', fontFamily: 'monospace', color: Y, fontWeight: 600 }}>
                                ↳ {p.code}
                              </td>
                              <td style={{ padding: '6px 10px' }}>{p.name || '—'}</td>
                              <td style={{ padding: '6px 10px', color: '#666666' }}>{p.group || '—'}</td>
                            </tr>
                          )
                        })
                      })
                      return rows
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {uninspOpen && uninspectedPosts.length === 0 && (
            <>
              <Divider />
              <div style={{ padding: '20px', textAlign: 'center', color: G }}>
                <CheckmarkCircleRegular fontSize={24} />
                <Text size={200} block style={{ marginTop: '8px' }}>
                  Todos os postos {statusFilter === 'ativo' ? 'ativos' : 'inativos'} foram encontrados no Export
                  {(dateFrom || dateTo) ? ` no período selecionado` : ` (sem filtro de período — considere filtrar por mês)`}.
                </Text>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ── Resultado ── */}
      {!baseTable || !inspTable ? (
        <div className={styles.emptyState}>
          <TableMultipleRegular fontSize={40} style={{ color: G }} />
          <div>
            <Text size={400} weight="semibold" block>Tabelas não reconhecidas automaticamente</Text>
            <Text size={300} block style={{ color: G, marginTop: '4px' }}>
              Abra a configuração acima e selecione manualmente qual tabela é a Base e qual é o Export.
            </Text>
          </div>
        </div>
      ) : missingConfig ? (
        <div className={styles.emptyState}>
          <WarningRegular fontSize={40} style={{ color: Y }} />
          <div>
            <Text size={400} weight="semibold" block>Configure as colunas de agrupamento</Text>
            <Text size={300} block style={{ color: G, marginTop: '4px' }}>
              Selecione as colunas de <strong>Gerência</strong> e <strong>Coordenador/Dono</strong>.
            </Text>
          </div>
        </div>
      ) : (
        <Card style={{ padding: '0px', overflow: 'hidden' }}>
          <div className='print-only' style={{ display: 'none', padding: '20px 20px 0' }}>
            <Text weight='bold' size={400}>Relatório de Aderência</Text>
          </div>
          <div style={{ paddingTop: '16px', paddingBottom: '12px', paddingLeft: '20px', paddingRight: '20px' }}>
            <div className={styles.header}>
              <div>
                <Text size={400} weight="semibold" block>Aderência por posto inspecionado</Text>
                <Text size={200} style={{ color: G }}>
                  {baseTable.name} vs {inspTable.name}
                </Text>
              </div>
              <div style={{ display: 'flex', gap: '6px' }} className="no-print">
                <Button size="small" appearance="subtle" onClick={expandAll}>Expandir tudo</Button>
                <Button size="small" appearance="subtle" onClick={collapseAll}>Recolher tudo</Button>
                <Button size="small" appearance="outline" icon={<ArrowDownloadRegular />} onClick={exportAdherenceToXLSX}>Exportar XLSX</Button>
                <Button size="small" appearance="primary" icon={<PrintRegular />} onClick={() => window.print()}>Imprimir / PDF</Button>
              </div>
            </div>
          </div>

          {statusCol && (
            <div style={{ paddingLeft: '20px', paddingRight: '20px', paddingBottom: '12px' }}>
              <TabList selectedValue={statusFilter} onTabSelect={(_, d) => setStatusFilter(d.value as 'ativo' | 'inativo')} size="small">
                <Tab value="ativo">Postos Ativos</Tab>
                <Tab value="inativo">Postos Inativos</Tab>
              </TabList>
            </div>
          )}

          <div style={{ paddingLeft: '20px', paddingRight: '20px', paddingBottom: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '2px', border: `1px solid ${G}`, backgroundColor: W, color: G }}>
              {totals.total} postos
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '2px', border: `1px solid ${G}`, backgroundColor: W, color: G }}>
              {totals.inspected} inspecionados
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 600,
              padding: '2px 8px', borderRadius: '2px',
              border: `1px solid ${totals.adherence >= 80 ? G : Y}`,
              backgroundColor: W,
              color: totals.adherence >= 80 ? G : Y
            }}>
              {totals.adherence}% aderência geral
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 600,
              padding: '2px 8px', borderRadius: '2px',
              border: `1px solid ${totals.adherence === 100 ? G : Y}`,
              backgroundColor: W,
              color: totals.adherence === 100 ? G : Y
            }}>
              {totals.adherence === 100 ? '✓ Concluído' : '⏳ Pendente'}
            </span>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th} style={{ minWidth: '260px' }}>Gerência / Coordenador</th>
                  <th className={styles.th}>Qtde Postos</th>
                  <th className={styles.th}>Inspecionado</th>
                  <th className={styles.th} style={{ minWidth: '200px' }}>Aderência</th>
                  {dateCol && <th className={styles.th} style={{ minWidth: '130px' }}>Última inspeção</th>}
                  <th className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {hierarchyData && hierarchyData.length > 0 ? hierarchyData.map((group) => (
                  <GroupRows
                    key={group.name}
                    group={group}
                    isExpanded={expanded.has(group.name)}
                    onToggle={() => toggleGroup(group.name)}
                    styles={styles}
                    showDate={!!dateCol}
                  />
                )) : (
                  <tr>
                    <td colSpan={6} className={styles.td} style={{ textAlign: 'center', padding: '32px', color: G }}>
                      Nenhum dado encontrado com as colunas selecionadas. Verifique a configuração.
                    </td>
                  </tr>
                )}
                {hierarchyData && hierarchyData.length > 0 && (
                  <tr className={styles.summaryRow}>
                    <td className={styles.td}><Text size={200} weight="bold">TOTAL</Text></td>
                    <td className={styles.td}><Text size={200} weight="bold">{totals.total.toLocaleString('pt-BR')}</Text></td>
                    <td className={styles.td}><Text size={200} weight="bold">{totals.inspected.toLocaleString('pt-BR')}</Text></td>
                    <td className={styles.td}>
                      <div className={styles.progressCell}>
                        <div style={{ flex: 1, minWidth: '80px', height: '8px', border: `1px solid ${G}`, backgroundColor: W, borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${totals.adherence}%`, height: '100%', backgroundColor: G }} />
                        </div>
                        <Text size={200} weight="bold" style={{ minWidth: '36px', textAlign: 'right' }}>{totals.adherence}%</Text>
                      </div>
                    </td>
                    {dateCol && <td className={styles.td} />}
                    <td className={styles.td}>
                      <StatusBadge adherence={totals.adherence} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function StatusBadge({ adherence, missingCount }: { adherence: number; missingCount?: number }) {
  if (adherence === 100) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        fontSize: '11px', fontWeight: 600,
        color: G,
        backgroundColor: W,
        padding: '2px 8px', borderRadius: '2px',
        border: `1px solid ${G}`,
      }}>
        ✓ Concluído
      </span>
    )
  }
  const text = missingCount && missingCount > 0 ? `⏳ Pendente (Falta ${missingCount})` : '⏳ Pendente'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: 600,
      color: Y,
      backgroundColor: W,
      padding: '2px 8px', borderRadius: '2px',
      border: `1px solid ${Y}`,
    }}>
      {text}
    </span>
  )
}

function GroupRows({
  group, isExpanded, onToggle, styles, showDate,
}: {
  group: AdherenceGroup
  isExpanded: boolean
  onToggle: () => void
  styles: Record<string, string>
  showDate: boolean
}) {
  return (
    <>
      <tr className={styles.groupRow} onClick={onToggle}>
        <td className={styles.td}>
          <span className={styles.expandIcon}>
            {isExpanded ? <ChevronDownRegular fontSize={12} /> : <ChevronRightRegular fontSize={12} />}
          </span>
          <Text size={200} weight="semibold">{group.name}</Text>
        </td>
        <td className={styles.td}><Text size={200} weight="medium">{group.total.toLocaleString('pt-BR')}</Text></td>
        <td className={styles.td}><Text size={200} weight="medium">{group.inspected.toLocaleString('pt-BR')}</Text></td>
        <td className={styles.td}>
          <div className={styles.progressCell}>
            <div style={{ flex: 1, minWidth: '80px', height: '8px', border: `1px solid ${group.adherence >= 80 ? G : Y}`, backgroundColor: W, borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${group.adherence}%`, height: '100%', backgroundColor: group.adherence >= 80 ? G : Y }} />
            </div>
            <Text size={200} weight="semibold" style={{ minWidth: '36px', textAlign: 'right' }}>{group.adherence}%</Text>
          </div>
        </td>
        {showDate && (
          <td className={styles.td}>
            {group.lastInspectionDate ? (
              <span className={styles.dateCell}>
                <CalendarRegular fontSize={13} />
                {formatDateBR(group.lastInspectionDate)}
              </span>
            ) : (
              <Text size={100} style={{ color: G }}>—</Text>
            )}
          </td>
        )}
        <td className={styles.td}><StatusBadge adherence={group.adherence} missingCount={group.total - group.inspected} /></td>
      </tr>
      {isExpanded && group.children.flatMap((child) => {
        const rows = [
          <tr key={child.name} className={styles.childRow}>
            <td className={mergeClasses(styles.td, styles.childIndent)}>
              <Text size={200}>{child.name}</Text>
            </td>
            <td className={styles.td}><Text size={200}>{child.total.toLocaleString('pt-BR')}</Text></td>
            <td className={styles.td}><Text size={200}>{child.inspected.toLocaleString('pt-BR')}</Text></td>
            <td className={styles.td}>
              <div className={styles.progressCell}>
                <div style={{ flex: 1, minWidth: '80px', height: '8px', border: `1px solid ${child.adherence >= 80 ? G : Y}`, backgroundColor: W, borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${child.adherence}%`, height: '100%', backgroundColor: child.adherence >= 80 ? G : Y }} />
                </div>
                <Text size={200} style={{ minWidth: '36px', textAlign: 'right' }}>{child.adherence}%</Text>
              </div>
            </td>
            {showDate && (
              <td className={styles.td}>
                {child.lastInspectionDate ? (
                  <span className={styles.dateCell}>
                    <CalendarRegular fontSize={13} />
                    {formatDateBR(child.lastInspectionDate)}
                  </span>
                ) : (
                  <Text size={100} style={{ color: G }}>—</Text>
                )}
              </td>
            )}
            <td className={styles.td}><StatusBadge adherence={child.adherence} missingCount={child.total - child.inspected} /></td>
          </tr>
        ]

        if (child.missingPosts && child.missingPosts.length > 0) {
          child.missingPosts.forEach((post) => {
            rows.push(
              <tr key={`${child.name}-${post.code}`} className={styles.postRow}>
                <td className={mergeClasses(styles.td, styles.postIndent)} style={{ color: '#7F5A00', fontWeight: '500' }}>
                  ↳ {post.code} - {post.name}
                </td>
                <td className={styles.td} style={{ color: '#7F5A00' }}>—</td>
                <td className={styles.td} style={{ color: '#7F5A00' }}>—</td>
                <td className={styles.td}>
                  <div className={styles.progressCell}>
                    <div style={{ flex: 1, minWidth: '80px', height: '8px', border: `1px solid ${Y}`, backgroundColor: W, borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: '0%', height: '100%', backgroundColor: Y }} />
                    </div>
                    <Text size={200} style={{ minWidth: '36px', textAlign: 'right', color: '#7F5A00' }}>0%</Text>
                  </div>
                </td>
                {showDate && <td className={styles.td} style={{ color: '#7F5A00' }}>—</td>}
                <td className={styles.td}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: 600,
                    color: Y,
                    backgroundColor: W,
                    padding: '2px 8px', borderRadius: '2px',
                    border: `1px solid ${Y}`,
                  }}>
                    Faltando
                  </span>
                </td>
              </tr>
            )
          })
        }

        return rows
      })}
    </>
  )
}
