'use client'

import { useRef, useState, useCallback } from 'react'
import {
  makeStyles, tokens, Text, Button, Spinner,
  mergeClasses,
} from '@fluentui/react-components'
import {
  DocumentArrowUpRegular, CheckmarkCircleRegular,
  ErrorCircleRegular, DocumentRegular, DismissRegular,
} from '@fluentui/react-icons'
import { parseFile } from '@/lib/fileParser'
import { useData } from '@/context/DataContext'

interface FileUploadProps {
  onSuccess?: () => void
}

type UploadStatus = 'idle' | 'staged' | 'loading' | 'done' | 'error'

interface StagedFile {
  file: File
  size: string
}

interface UploadResult {
  fileName: string
  ok: boolean
  message: string
}

const useStyles = makeStyles({
  zone: {
    width: '100%',
    border: '1px dashed #00807C',
    borderRadius: '2px',
    paddingTop: '48px',
    paddingBottom: '48px',
    paddingLeft: '24px',
    paddingRight: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    backgroundColor: '#FFFFFF',
    transition: 'all 0.15s ease',
    textAlign: 'center',
    ':hover': {
      borderTopColor: '#EEA722',
      borderRightColor: '#EEA722',
      borderBottomColor: '#EEA722',
      borderLeftColor: '#EEA722',
      backgroundColor: '#FFFFFF',
    },
    ':focus-visible': {
      outlineColor: '#EEA722',
      outlineWidth: '1px',
      outlineStyle: 'solid',
    },
  },
  zoneDragging: {
    borderTopColor: '#EEA722',
    borderRightColor: '#EEA722',
    borderBottomColor: '#EEA722',
    borderLeftColor: '#EEA722',
    backgroundColor: '#FFFFFF',
    transform: 'scale(1.01)',
  },
  iconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '2px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #00807C',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperDragging: {
    backgroundColor: '#00807C',
    border: '1px solid #EEA722',
  },
  stagedZone: {
    width: '100%',
    borderRadius: '2px',
    paddingTop: '24px',
    paddingBottom: '24px',
    paddingLeft: '24px',
    paddingRight: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'center',
    border: '1px dashed #00807C',
    backgroundColor: '#FFFFFF',
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
    maxWidth: '520px',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#FFFFFF',
    borderRadius: '2px',
    border: '1px solid #00807C',
  },
  fileInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    textAlign: 'left',
  },
  addMoreBtn: {
    fontSize: tokens.fontSizeBase200,
    color: '#00807C',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: '4px 0',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  feedbackZone: {
    width: '100%',
    borderRadius: '2px',
    paddingTop: '24px',
    paddingBottom: '24px',
    paddingLeft: '24px',
    paddingRight: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'center',
  },
  resultList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
    maxWidth: '520px',
  },
  resultRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#FFFFFF',
    borderRadius: '2px',
    border: '1px solid #00807C',
    textAlign: 'left',
  },
})

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const VALID_EXT = ['csv', 'xlsx', 'xls']

export default function FileUpload({ onSuccess }: FileUploadProps) {
  const styles = useStyles()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [staged, setStaged] = useState<StagedFile[]>([])
  const [results, setResults] = useState<UploadResult[]>([])
  const { addTable } = useData()

  const addFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const valid: StagedFile[] = []
    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (VALID_EXT.includes(ext ?? '')) {
        valid.push({ file, size: formatBytes(file.size) })
      }
    })
    if (valid.length === 0) return
    setStaged((prev) => {
      const existing = new Set(prev.map((f) => f.file.name))
      return [...prev, ...valid.filter((f) => !existing.has(f.file.name))]
    })
    setStatus('staged')
  }, [])

  const removeStaged = (name: string) => {
    setStaged((prev) => {
      const next = prev.filter((f) => f.file.name !== name)
      if (next.length === 0) setStatus('idle')
      return next
    })
  }

  const confirmUpload = useCallback(async () => {
    if (staged.length === 0) return
    setStatus('loading')
    const res: UploadResult[] = []
    for (const { file } of staged) {
      try {
        const table = await parseFile(file)
        addTable(table)
        res.push({ fileName: file.name, ok: true, message: `${table.rowCount.toLocaleString('pt-BR')} linhas` })
      } catch (err) {
        res.push({ fileName: file.name, ok: false, message: err instanceof Error ? err.message : 'Erro ao processar' })
      }
    }
    setResults(res)
    setStatus('done')
    if (res.some((r) => r.ok)) onSuccess?.()
  }, [staged, addTable, onSuccess])

  const reset = () => {
    setStatus('idle')
    setStaged([])
    setResults([])
    if (inputRef.current) inputRef.current.value = ''
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  /* ── Loading ── */
  if (status === 'loading') {
    return (
      <div className={styles.zone} style={{ cursor: 'default' }}>
        <Spinner size="medium" />
        <Text size={300} weight="semibold" style={{ color: '#00807C' }}>Processando {staged.length} arquivo{staged.length > 1 ? 's' : ''}…</Text>
        <Text size={200} style={{ color: '#00807C' }}>Aguarde um momento</Text>
      </div>
    )
  }

  /* ── Done ── */
  if (status === 'done') {
    const successCount = results.filter((r) => r.ok).length
    return (
      <div className={styles.feedbackZone} style={{ border: '2px solid #00807C', backgroundColor: '#FFFFFF' }}>
        <CheckmarkCircleRegular fontSize={40} style={{ color: '#00807C' }} />
        <Text size={300} weight="semibold" block style={{ color: '#00807C' }}>
          {successCount} de {results.length} arquivo{results.length > 1 ? 's' : ''} importado{successCount > 1 ? 's' : ''} com sucesso
        </Text>
        <div className={styles.resultList}>
          {results.map((r) => (
            <div key={r.fileName} className={styles.resultRow}>
              {r.ok
                ? <CheckmarkCircleRegular fontSize={16} style={{ color: '#00807C', flexShrink: 0 }} />
                : <ErrorCircleRegular fontSize={16} style={{ color: '#EEA722', flexShrink: 0 }} />
              }
              <div className={styles.fileInfo}>
                <Text size={200} weight="semibold" truncate block style={{ color: '#00807C' }}>{r.fileName}</Text>
                <Text size={100} style={{ color: r.ok ? '#00807C' : '#EEA722' }}>
                  {r.message}
                </Text>
              </div>
            </div>
          ))}
        </div>
        <Button appearance="outline" size="small" onClick={reset}>
          Carregar mais arquivos
        </Button>
      </div>
    )
  }

  /* ── Staged ── */
  if (status === 'staged') {
    return (
      <div className={styles.stagedZone}>
        <DocumentArrowUpRegular fontSize={32} style={{ color: '#00807C' }} />
        <div>
          <Text size={300} weight="semibold" block style={{ color: '#00807C' }}>
            {staged.length} arquivo{staged.length > 1 ? 's' : ''} pronto{staged.length > 1 ? 's' : ''} para importar
          </Text>
          <Text size={200} style={{ color: '#00807C' }}>
            Confirme para carregar os dados na plataforma
          </Text>
        </div>

        <div className={styles.fileList}>
          {staged.map(({ file, size }) => (
            <div key={file.name} className={styles.fileRow}>
              <DocumentRegular fontSize={20} style={{ color: '#00807C', flexShrink: 0 }} />
              <div className={styles.fileInfo}>
                <Text size={200} weight="semibold" truncate block style={{ color: '#00807C' }}>{file.name}</Text>
                <Text size={100} style={{ color: '#EEA722' }}>{size}</Text>
              </div>
              <Button
                size="small"
                appearance="subtle"
                icon={<DismissRegular />}
                onClick={() => removeStaged(file.name)}
                title="Remover"
              />
            </div>
          ))}
        </div>

        {/* Adicionar mais */}
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { addFiles(e.target.files); if (inputRef.current) inputRef.current.value = '' }}
          />
          <button className={styles.addMoreBtn} onClick={() => inputRef.current?.click()}>
            + Adicionar mais arquivos
          </button>
        </>

        <div className={styles.actions}>
          <Button appearance="outline" size="medium" onClick={reset}>Cancelar</Button>
          <Button appearance="primary" size="medium" onClick={confirmUpload}>
            Importar {staged.length > 1 ? `${staged.length} arquivos` : 'arquivo'}
          </Button>
        </div>
      </div>
    )
  }

  /* ── Idle ── */
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => addFiles(e.target.files)}
      />
      <button
        className={mergeClasses(styles.zone, dragging && styles.zoneDragging)}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        type="button"
      >
        <div className={mergeClasses(styles.iconWrapper, dragging && styles.iconWrapperDragging)}>
          <DocumentArrowUpRegular
            fontSize={24}
            style={{ color: dragging ? '#FFFFFF' : '#00807C' }}
          />
        </div>
        <div>
          <Text size={300} weight="semibold" block style={{ color: '#00807C' }}>
            {dragging ? 'Solte os arquivos aqui' : 'Arraste e solte ou clique para selecionar'}
          </Text>
          <Text size={200} style={{ color: '#00807C', marginTop: '4px', display: 'block' }}>
            CSV, XLSX ou XLS · múltiplos arquivos permitidos · máximo 50 MB cada
          </Text>
        </div>
      </button>
    </>
  )
}
