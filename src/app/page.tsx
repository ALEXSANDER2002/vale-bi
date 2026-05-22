'use client'

import Link from 'next/link'
import {
  makeStyles, Text, Button, Card, mergeClasses,
} from '@fluentui/react-components'
import {
  DatabaseRegular, ArrowUploadRegular, DataAreaRegular,
  TableMultipleRegular, ArrowRightRegular, DocumentTableRegular,
  GridRegular, TableRegular,
} from '@fluentui/react-icons'
import { useData } from '@/context/DataContext'
import DataTable from '@/components/DataTable'

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxWidth: '1400px',
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '16px',
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(3, 1fr)',
    },
  },
  kpiCard: {
    padding: '0px',
    overflow: 'hidden',
    border: '1px solid #00807C', // Borda sólida Verde Vale
    borderRadius: '2px',
    backgroundColor: '#FFFFFF',
    boxShadow: 'none',
  },
  kpiInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
  },
  kpiIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kpiGreen: {
    backgroundColor: '#00807C',
  },
  kpiBlue: {
    backgroundColor: '#EEA722',
  },
  kpiViolet: {
    backgroundColor: '#00807C',
  },
  actionsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(3, 1fr)',
    },
  },
  actionLink: {
    textDecoration: 'none',
    display: 'block',
  },
  actionCard: {
    padding: '0px',
    overflow: 'hidden',
    cursor: 'pointer',
    backgroundColor: '#FFFFFF',
    boxShadow: 'none',
    transition: 'transform 0.15s ease, border-color 0.15s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      borderTopColor: '#EEA722',
      borderRightColor: '#EEA722',
      borderBottomColor: '#EEA722',
      borderLeftColor: '#EEA722',
    },
  },
  actionInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    cursor: 'pointer',
  },
  actionIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    border: '1px dashed #00807C', // Verde Vale pontilhado
    borderRadius: '2px',
    backgroundColor: '#FFFFFF',
    '@media (min-width: 640px)': {
      paddingTop: '96px',
      paddingBottom: '96px',
    },
  },
  emptyIcon: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #00807C',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  tableCardHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '14px',
    paddingBottom: '14px',
    paddingLeft: '20px',
    paddingRight: '20px',
    borderBottom: '1px solid #00807C',
    backgroundColor: '#FFFFFF',
    gap: '12px',
    flexWrap: 'wrap',
    '@media (min-width: 768px)': {
      flexWrap: 'nowrap',
    },
  },
  tableCardHeadLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  tableFileIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '2px',
    background: '#FFFFFF',
    border: '1px solid #00807C',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCardActions: {
    display: 'flex',
    gap: '8px',
  },
  tableCardBody: {
    paddingTop: '16px',
    paddingBottom: '16px',
    paddingLeft: '16px',
    paddingRight: '16px',
    backgroundColor: '#FFFFFF',
    '@media (min-width: 768px)': {
      paddingLeft: '20px',
      paddingRight: '20px',
    },
  },
  statDivider: {
    display: 'none',
    '@media (min-width: 768px)': {
      display: 'block',
      width: '1px',
      backgroundColor: '#00807C',
      alignSelf: 'stretch',
    },
  },
})

const quickActions = [
  {
    href: '/upload', label: 'Importar tabela', desc: 'CSV, XLSX ou XLS',
    icon: ArrowUploadRegular,
    iconBg: '#00807C',
    iconColor: '#FFFFFF',
    accent: '#FFFFFF',
    borderColor: '#00807C',
  },
  {
    href: '/charts', label: 'Gráficos', desc: 'Barras, linha, área, pizza',
    icon: DataAreaRegular,
    iconBg: '#EEA722',
    iconColor: '#FFFFFF',
    accent: '#FFFFFF',
    borderColor: '#EEA722',
  },
  {
    href: '/compare', label: 'Análise de Aderência', desc: 'Conformidade entre arquivos',
    icon: TableMultipleRegular,
    iconBg: '#00807C',
    iconColor: '#FFFFFF',
    accent: '#FFFFFF',
    borderColor: '#00807C',
  },
]

export default function HomePage() {
  const styles = useStyles()
  const { tables, updateTableRows } = useData()
  const totalRows = tables.reduce((s, t) => s + t.rowCount, 0)
  const totalCols = tables.reduce((s, t) => s + t.headers.length, 0)

  return (
    <div className={styles.page}>
      {/* KPIs */}
      <div className={styles.kpiRow}>
        {[
          {
            label: 'Tabelas importadas', value: tables.length,
            Icon: DatabaseRegular, bg: styles.kpiGreen,
            sub: tables.length === 1 ? 'tabela' : 'tabelas',
          },
          {
            label: 'Total de registros', value: totalRows.toLocaleString('pt-BR'),
            Icon: GridRegular, bg: styles.kpiBlue,
            sub: 'linhas',
          },
          {
            label: 'Total de colunas', value: totalCols,
            Icon: TableRegular, bg: styles.kpiViolet,
            sub: 'colunas',
          },
        ].map(({ label, value, Icon, bg, sub }) => (
          <Card key={label} className={styles.kpiCard}>
            <div className={styles.kpiInner}>
              <div className={mergeClasses(styles.kpiIcon, bg)}>
                <Icon fontSize={22} style={{ color: '#FFFFFF' }} />
              </div>
              <div>
                <Text size={700} weight="bold" block style={{ color: '#00807C', lineHeight: 1, letterSpacing: '-0.5px' }}>
                  {value}
                </Text>
                <Text size={200} block style={{ color: '#00807C', marginTop: '4px', fontWeight: 500 }}>
                  {label}
                </Text>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className={styles.actionsRow}>
          {quickActions.map(({ href, label, desc, icon: Icon, iconBg, iconColor, accent, borderColor }) => (
            <Link key={href} href={href} className={styles.actionLink}>
              <Card className={styles.actionCard} style={{ border: `1px solid ${borderColor}`, borderRadius: '2px' }}>
                <div className={styles.actionInner}>
                  <div className={styles.actionIcon} style={{ backgroundColor: iconBg }}>
                    <Icon fontSize={18} style={{ color: iconColor }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size={300} weight="semibold" block style={{ color: '#00807C' }}>{label}</Text>
                    <Text size={200} style={{ color: '#00807C' }}>{desc}</Text>
                  </div>
                  <ArrowRightRegular fontSize={14} style={{ color: '#00807C', flexShrink: 0 }} />
                </div>
              </Card>
            </Link>
          ))}
      </div>

      {/* Tables */}
      {tables.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <DatabaseRegular fontSize={30} style={{ color: '#00807C' }} />
          </div>
          <div>
            <Text size={500} weight="semibold" block style={{ color: '#00807C' }}>Nenhuma tabela importada</Text>
            <Text size={300} block style={{ color: '#00807C', marginTop: '6px', maxWidth: '380px' }}>
              Importe um arquivo CSV ou XLSX para visualizar e analisar seus dados na plataforma Vale Analytics.
            </Text>
          </div>
          <Link href="/upload">
            <Button appearance="primary" icon={<ArrowUploadRegular />} size="large"
              style={{ backgroundColor: '#00807C', borderColor: '#00807C' }}>
              Importar primeira tabela
            </Button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={styles.sectionTitle}>
            <Text size={300} weight="semibold" style={{ color: '#00807C' }}>
              {tables.length} tabela{tables.length !== 1 ? 's' : ''} importada{tables.length !== 1 ? 's' : ''}
            </Text>
          </div>
          {tables.map((table) => (
            <Card key={table.id} style={{ padding: '0px', overflow: 'hidden', border: '1px solid #00807C', borderRadius: '2px', boxShadow: 'none' }}>
              <div className={styles.tableCardHead}>
                <div className={styles.tableCardHeadLeft}>
                  <div className={styles.tableFileIcon}>
                    <DocumentTableRegular fontSize={16} style={{ color: '#00807C' }} />
                  </div>
                  <div>
                    <Text size={300} weight="semibold" block style={{ color: '#00807C' }}>{table.name}</Text>
                    <Text size={100} style={{ color: '#00807C' }}>
                      {table.rowCount.toLocaleString('pt-BR')} linhas · {table.headers.length} colunas ·{' '}
                      {table.fileType.toUpperCase()} · {table.uploadedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </div>
                </div>
                <div className={styles.tableCardActions}>
                  <Link href="/charts">
                    <Button appearance="outline" size="small" icon={<DataAreaRegular />}>Gráficos</Button>
                  </Link>
                  <Link href="/compare">
                    <Button appearance="outline" size="small" icon={<TableMultipleRegular />}>Comparar</Button>
                  </Link>
                </div>
              </div>
              <div className={styles.tableCardBody}>
                <DataTable
                  table={table}
                  maxRows={50}
                  maxHeight={700}
                  editable
                  onUpdate={(rows) => updateTableRows(table.id, rows)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
