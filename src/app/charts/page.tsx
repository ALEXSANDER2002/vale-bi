'use client'

import { useState } from 'react'
import {
  makeStyles, tokens, Text, Button, Select, Card, mergeClasses,
  ToggleButton,
} from '@fluentui/react-components'
import {
  AddRegular, DismissRegular, ArrowUploadRegular, DataAreaRegular,
} from '@fluentui/react-icons'
import Link from 'next/link'
import ChartPanel from '@/components/ChartPanel'
import { useData } from '@/context/DataContext'
import { detectCategoricalColumns, detectNumericColumns } from '@/lib/fileParser'

type ChartType = 'bar' | 'line' | 'area' | 'pie'
type AggMode = 'count' | 'sum'

interface ChartCfg {
  id: string
  tableId: string
  type: ChartType
  groupBy: string
  valueCol: string
  aggMode: AggMode
}

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Linha' },
  { value: 'area', label: 'Área' },
  { value: 'pie', label: 'Pizza' },
]

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '1400px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '16px',
    '@media (min-width: 1024px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(560px, 1fr))',
    },
  },
  chartCardHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '16px',
    paddingRight: '16px',
    borderBottom: '1px solid #00807C',
    backgroundColor: '#FFFFFF',
  },
  chartCardBody: {
    paddingTop: '16px',
    paddingBottom: '16px',
    paddingLeft: '16px',
    paddingRight: '16px',
    minHeight: '320px',
  },
  typeSegment: {
    display: 'flex',
    gap: '4px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '48px',
    paddingBottom: '48px',
    paddingLeft: '24px',
    paddingRight: '24px',
    gap: '16px',
    textAlign: 'center',
    border: '1px dashed #00807C',
    borderRadius: '2px',
    backgroundColor: '#FFFFFF',
    '@media (min-width: 640px)': {
      paddingTop: '80px',
      paddingBottom: '80px',
    },
  },
})

export default function ChartsPage() {
  const styles = useStyles()
  const { tables } = useData()
  const [configs, setConfigs] = useState<ChartCfg[]>([])

  const addChart = () => {
    if (!tables.length) return
    const table = tables[0]
    const categorical = detectCategoricalColumns(table)
    const numeric = detectNumericColumns(table)
    setConfigs((p) => [
      ...p,
      {
        id: Math.random().toString(36).slice(2),
        tableId: table.id,
        type: 'bar',
        groupBy: categorical[0] ?? table.headers[0],
        valueCol: numeric[0] ?? table.headers[1] ?? table.headers[0],
        aggMode: 'count',
      },
    ])
  }

  const update = (id: string, patch: Partial<ChartCfg>) =>
    setConfigs((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const remove = (id: string) =>
    setConfigs((p) => p.filter((c) => c.id !== id))

  if (!tables.length) {
    return (
      <div className={styles.emptyState}>
        <DataAreaRegular fontSize={40} style={{ color: '#00807C' }} />
        <div>
          <Text size={400} weight="semibold" block style={{ color: '#00807C' }}>Nenhuma tabela disponível</Text>
          <Text size={300} block style={{ color: '#00807C', marginTop: '4px' }}>
            Importe um arquivo CSV ou XLSX para criar gráficos.
          </Text>
        </div>
        <Link href="/upload">
          <Button appearance="primary" icon={<ArrowUploadRegular />}>Importar tabela</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Text size={300} style={{ color: '#00807C' }}>
          {configs.length === 0
            ? 'Clique em "Adicionar gráfico" para começar'
            : `${configs.length} gráfico${configs.length !== 1 ? 's' : ''} configurado${configs.length !== 1 ? 's' : ''}`}
        </Text>
        <Button appearance="primary" icon={<AddRegular />} onClick={addChart}>
          Adicionar gráfico
        </Button>
      </div>

      {configs.length === 0 && (
        <div className={styles.emptyState}>
          <DataAreaRegular fontSize={40} style={{ color: '#00807C' }} />
          <Text size={300} style={{ color: '#00807C' }}>
            Adicione um gráfico para começar a visualizar seus dados
          </Text>
        </div>
      )}

      <div className={styles.grid}>
        {configs.map((cfg) => {
          const table = tables.find((t) => t.id === cfg.tableId)
          if (!table) return null
          const numeric = detectNumericColumns(table)

          return (
            <Card key={cfg.id} style={{ padding: '0px', overflow: 'hidden', border: '1px solid #00807C', borderRadius: '2px', boxShadow: 'none' }}>
              <div className={styles.chartCardHead}>
                <Select
                  size="small"
                  value={cfg.tableId}
                  onChange={(_, d) => {
                    const t = tables.find((t) => t.id === d.value)!
                    const cat = detectCategoricalColumns(t)
                    const num = detectNumericColumns(t)
                    update(cfg.id, {
                      tableId: d.value,
                      groupBy: cat[0] ?? t.headers[0],
                      valueCol: num[0] ?? t.headers[1] ?? t.headers[0],
                    })
                  }}
                  style={{ minWidth: '130px' }}
                >
                  {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>

                <div className={styles.typeSegment}>
                  {CHART_TYPES.map(({ value, label }) => (
                    <ToggleButton
                      key={value}
                      size="small"
                      checked={cfg.type === value}
                      onClick={() => update(cfg.id, { type: value })}
                    >
                      {label}
                    </ToggleButton>
                  ))}
                </div>

                <Select
                  size="small"
                  value={cfg.groupBy}
                  onChange={(_, d) => update(cfg.id, { groupBy: d.value })}
                  style={{ flex: 1, minWidth: '120px' }}
                >
                  {table.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </Select>

                <Select
                  size="small"
                  value={cfg.aggMode}
                  onChange={(_, d) => update(cfg.id, { aggMode: d.value as AggMode })}
                  style={{ width: '110px' }}
                >
                  <option value="count">Contagem</option>
                  <option value="sum">Soma</option>
                </Select>

                {cfg.aggMode === 'sum' && (
                  <Select
                    size="small"
                    value={cfg.valueCol}
                    onChange={(_, d) => update(cfg.id, { valueCol: d.value })}
                    style={{ minWidth: '120px' }}
                  >
                    {(numeric.length > 0 ? numeric : table.headers).map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </Select>
                )}

                <Button
                  size="small"
                  appearance="subtle"
                  icon={<DismissRegular />}
                  onClick={() => remove(cfg.id)}
                  style={{ marginLeft: 'auto', flexShrink: 0 }}
                />
              </div>

              <div className={styles.chartCardBody}>
                <ChartPanel
                  table={table}
                  type={cfg.type}
                  groupBy={cfg.groupBy}
                  valueCol={cfg.valueCol}
                  aggMode={cfg.aggMode}
                />
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
