'use client'

import { useRouter } from 'next/navigation'
import {
  makeStyles, Text, Button, Badge, Card, CardHeader,
} from '@fluentui/react-components'
import {
  DocumentTableRegular, DeleteRegular, DataAreaRegular,
  TableMultipleRegular, InfoRegular,
} from '@fluentui/react-icons'
import Link from 'next/link'
import FileUpload from '@/components/FileUpload'
import { useData } from '@/context/DataContext'

const useStyles = makeStyles({
  page: {
    maxWidth: '720px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  info: {
    display: 'flex',
    gap: '12px',
    paddingTop: '14px',
    paddingBottom: '14px',
    paddingLeft: '16px',
    paddingRight: '16px',
    borderRadius: '2px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #00807C',
  },
  tableItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: '2px',
    border: '1px solid #00807C',
    backgroundColor: '#FFFFFF',
    marginBottom: '8px',
  },
  tableItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
    flex: 1,
  },
  tableIcon: {
    width: '34px',
    height: '34px',
    borderRadius: '2px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #00807C',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tableActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
    marginLeft: '12px',
  },
})

export default function UploadPage() {
  const styles = useStyles()
  const router = useRouter()
  const { tables, removeTable } = useData()

  return (
    <div className={styles.page}>
      {/* Upload zone */}
      <Card style={{ border: '1px solid #00807C', borderRadius: '2px', boxShadow: 'none' }}>
        <CardHeader
          header={<Text weight="semibold" size={400} style={{ color: '#00807C' }}>Selecionar arquivo</Text>}
          description={
            <Text size={200} style={{ color: '#00807C' }}>
              Importe dados para análise
            </Text>
          }
        />
        <FileUpload onSuccess={() => router.push('/')} />
      </Card>

      {/* Tips */}
      <div className={styles.info}>
        <InfoRegular fontSize={18} style={{ color: '#EEA722', flexShrink: 0, marginTop: '1px' }} />
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            'A primeira linha deve conter os cabeçalhos das colunas.',
            'Para XLSX com múltiplas abas, apenas a primeira aba será importada.',
            'Arquivos com o mesmo nome substituirão a versão anterior.',
            'Importe duas ou mais tabelas para usar o recurso de comparação.',
          ].map((tip, i) => (
            <li key={i}>
              <Text size={200} style={{ color: '#00807C' }}>
                <span style={{ color: '#EEA722', fontWeight: 600, marginRight: '6px' }}>·</span>
                {tip}
              </Text>
            </li>
          ))}
        </ul>
      </div>

      {/* Loaded tables */}
      {tables.length > 0 && (
        <Card style={{ border: '1px solid #00807C', borderRadius: '2px', boxShadow: 'none' }}>
          <CardHeader
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text weight="semibold" size={400} style={{ color: '#00807C' }}>Tabelas carregadas</Text>
                <Badge style={{ backgroundColor: '#EEA722', color: '#FFFFFF', borderRadius: '2px', border: '1px solid #EEA722' }}>{tables.length}</Badge>
              </div>
            }
          />
          <div>
            {tables.map((table) => (
              <div key={table.id} className={styles.tableItem}>
                <div className={styles.tableItemLeft}>
                  <div className={styles.tableIcon}>
                    <DocumentTableRegular fontSize={15} style={{ color: '#00807C' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Text size={300} weight="medium" block truncate style={{ maxWidth: '360px', color: '#00807C' }}>
                      {table.name}
                    </Text>
                    <Text size={100} style={{ color: '#00807C' }}>
                      {table.rowCount.toLocaleString('pt-BR')} linhas · {table.headers.length} colunas · {table.fileType.toUpperCase()}
                    </Text>
                  </div>
                </div>
                <div className={styles.tableActions}>
                  <Link href="/charts">
                    <Button appearance="subtle" size="small" icon={<DataAreaRegular />} title="Ver gráficos" />
                  </Link>
                  <Link href="/compare">
                    <Button appearance="subtle" size="small" icon={<TableMultipleRegular />} title="Comparar" />
                  </Link>
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<DeleteRegular style={{ color: '#EEA722' }} />}
                    title="Remover tabela"
                    onClick={() => removeTable(table.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
