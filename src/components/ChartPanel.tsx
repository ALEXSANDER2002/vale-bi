'use client'

import { useMemo, memo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { makeStyles, Text } from '@fluentui/react-components'
import type { ParsedTable } from '@/types'
import { aggregateByColumn, countByColumn } from '@/lib/fileParser'

/**
 * Paleta oficial Vale S.A.:
 * Verde Vale #00807C | Amarelo Vale #EEA722 | Branco #FFFFFF
 */
const PALETTE = [
  '#00807C',  // Verde Vale
  '#EEA722',  // Amarelo Vale
]

const TOOLTIP_STYLE = {
  borderRadius: '2px',
  border: '1px solid #00807C',
  fontSize: 12,
  boxShadow: 'none',
  padding: '10px 14px',
  backgroundColor: '#FFFFFF',
  fontFamily: "'Inter', sans-serif",
}

const AXIS_TICK = { fontSize: 11, fill: '#00807C', fontFamily: "'Inter', sans-serif" }

type ChartType = 'bar' | 'line' | 'pie' | 'area'
type AggMode = 'count' | 'sum'

interface ChartPanelProps {
  table: ParsedTable
  type: ChartType
  groupBy: string
  valueCol: string
  aggMode: AggMode
}

const useStyles = makeStyles({
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '220px',
  },
  chartWrapper: {
    width: '100%',
    height: '300px',
    minHeight: '300px',
    position: 'relative',
  },
})

export default memo(function ChartPanel({ table, type, groupBy, valueCol, aggMode }: ChartPanelProps) {
  const styles = useStyles()
  const data = useMemo(
    () => aggMode === 'count'
      ? countByColumn(table.rows, groupBy)
      : aggregateByColumn(table.rows, groupBy, valueCol),
    [table.rows, groupBy, valueCol, aggMode]
  )

  const label = aggMode === 'count' ? 'Contagem' : valueCol
  const margin = { top: 8, right: 16, left: 0, bottom: 64 }

  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <Text style={{ color: '#00807C' }}>
          Sem dados para as configurações selecionadas
        </Text>
      </div>
    )
  }

  return (
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={margin} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#EEA722" vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString('pt-BR'), label]} cursor={false} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
            <Bar dataKey="value" name={label} radius={[2, 2, 0, 0]} maxBarSize={40}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        ) : type === 'line' ? (
          <LineChart data={data} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEA722" vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString('pt-BR'), label]} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
            <Line type="monotone" dataKey="value" name={label} stroke="#00807C" strokeWidth={2} dot={{ r: 4, fill: '#EEA722', strokeWidth: 0 }} activeDot={{ r: 6 }} />
          </LineChart>
        ) : type === 'area' ? (
          <AreaChart data={data} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEA722" vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString('pt-BR'), label]} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
            <Area type="monotone" dataKey="value" name={label} stroke="#EEA722" strokeWidth={2} fill="#00807C" dot={{ r: 4, fill: '#EEA722', strokeWidth: 0 }} />
          </AreaChart>
        ) : (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="46%" outerRadius={100} innerRadius={38} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString('pt-BR'), label]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  )
})
