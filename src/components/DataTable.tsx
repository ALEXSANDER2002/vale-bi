'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  makeStyles, tokens, Text, Input, Button,
  Table, TableHeader, TableRow, TableHeaderCell,
  TableBody, TableCell, TableCellLayout,
  mergeClasses, Checkbox, Badge, Tooltip,
} from '@fluentui/react-components'
import {
  SearchRegular, ChevronUpRegular, ChevronDownRegular, ArrowSortRegular,
  EditRegular, SaveRegular, DismissRegular, DeleteRegular,
  CheckmarkRegular, WarningRegular,
} from '@fluentui/react-icons'
import type { ParsedTable, SortDirection } from '@/types'

interface DataTableProps {
  table: ParsedTable
  maxRows?: number
  maxHeight?: number
  editable?: boolean
  onUpdate?: (rows: Record<string, string>[]) => void
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  searchWrap: {
    maxWidth: '260px',
    flex: 1,
    minWidth: '140px',
  },
  // Banner de edição
  editBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: '2px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #EEA722',
    flexWrap: 'wrap',
  },
  editBannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  editBannerActions: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  tableWrap: {
    overflowX: 'auto',
    overflowY: 'auto',
    borderRadius: '2px',
    border: '1px solid #00807C',
    maxWidth: '100%',
    WebkitOverflowScrolling: 'touch',
  },
  tableWrapEditing: {
    border: '1px solid #EEA722',
  },
  headerCell: {
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'normal',
    paddingLeft: '12px',
    paddingRight: '12px',
    paddingTop: '9px',
    paddingBottom: '9px',
    minWidth: '220px',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #00807C',
    ':hover': {
      backgroundColor: '#EEA722',
      color: '#FFFFFF',
    },
  },
  headerCellCheckbox: {
    width: '42px',
    minWidth: '42px',
    paddingLeft: '10px',
    paddingRight: '10px',
    position: 'sticky',
    top: 0,
    left: 0,
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #00807C',
  },
  headerCellActions: {
    width: '44px',
    minWidth: '44px',
    paddingLeft: '6px',
    paddingRight: '6px',
    position: 'sticky',
    top: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #00807C',
    textAlign: 'center',
  },
  bodyCell: {
    paddingLeft: '12px',
    paddingRight: '12px',
    paddingTop: '5px',
    paddingBottom: '5px',
    minWidth: '220px',
  },
  bodyCellCheckbox: {
    width: '42px',
    minWidth: '42px',
    paddingLeft: '10px',
    paddingRight: '10px',
    position: 'sticky',
    left: 0,
    zIndex: 1,
    backgroundColor: 'inherit',
  },
  bodyCellActions: {
    width: '44px',
    minWidth: '44px',
    paddingLeft: '6px',
    paddingRight: '6px',
    position: 'sticky',
    right: 0,
    zIndex: 1,
    backgroundColor: 'inherit',
    textAlign: 'center',
  },
  cellContent: {
    whiteSpace: 'normal',
    overflow: 'visible',
    textOverflow: 'clip',
    maxWidth: '100%',
    display: 'block',
    fontSize: tokens.fontSizeBase200,
  },
  // Célula em modo edit
  cellEditable: {
    cursor: 'text',
    ':hover': {
      outline: '1px solid #EEA722',
      zIndex: 3,
      position: 'relative',
    },
  },
  cellEditing: {
    padding: '0px',
    backgroundColor: '#FFFFFF',
  },
  cellInput: {
    width: '100%',
    minWidth: '120px',
    fontSize: tokens.fontSizeBase200,
    border: 'none',
    outline: '1px solid #EEA722',
    borderRadius: '2px',
    padding: '4px 8px',
    backgroundColor: '#FFFFFF',
    fontFamily: 'inherit',
    color: '#00807C',
  },
  // Linha deletada
  rowDeleted: {
    textDecoration: 'line-through',
    backgroundColor: '#FFFFFF !important',
  },
  rowSelected: {
    backgroundColor: '#EEA722 !important',
  },
  sortIcon: {
    verticalAlign: 'middle',
    marginLeft: '4px',
    color: '#00807C',
  },
  sortIconActive: {
    color: '#EEA722',
  },
})

// Componente interno para célula editável
function EditableCell({
  value,
  onSave,
  className,
  contentClassName,
  isSelected,
}: {
  value: string
  onSave: (v: string) => void
  className: string
  contentClassName: string
  isSelected?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const styles = useStyles()

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commit = () => {
    setEditing(false)
    onSave(draft)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <TableCell className={mergeClasses(className, styles.cellEditing)}>
        <input
          ref={inputRef}
          className={styles.cellInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') cancel()
          }}
          autoFocus
        />
      </TableCell>
    )
  }

  return (
    <TableCell
      className={mergeClasses(className, styles.cellEditable)}
      onDoubleClick={() => { setDraft(value); setEditing(true) }}
      title="Duplo clique para editar"
    >
      <TableCellLayout>
        <span
          className={contentClassName}
          title={value}
          style={isSelected ? { color: '#FFFFFF' } : { color: '#00807C' }}
        >
          {value || <span style={{ color: isSelected ? '#FFFFFF' : '#EEA722', fontStyle: 'italic' }}>—</span>}
        </span>
      </TableCellLayout>
    </TableCell>
  )
}

export default function DataTable({
  table, maxRows, maxHeight = 420, editable = false, onUpdate,
}: DataTableProps) {
  const styles = useStyles()
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>('asc')

  // Modo edição
  const [editMode, setEditMode] = useState(false)
  // Cópia local das linhas enquanto edita (mapa por índice original)
  const [draftRows, setDraftRows] = useState<Record<string, string>[]>([])
  // Linhas marcadas para exclusão (por índice no draftRows)
  const [deletedIdxs, setDeletedIdxs] = useState<Set<number>>(new Set())
  // Linhas selecionadas para exclusão em lote
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set())

  // Entra no modo de edição: copia as linhas atuais
  const startEdit = () => {
    setDraftRows(table.rows.map((r) => ({ ...r })))
    setDeletedIdxs(new Set())
    setSelectedIdxs(new Set())
    setEditMode(true)
  }

  // Descarta alterações
  const cancelEdit = () => {
    setEditMode(false)
    setDraftRows([])
    setDeletedIdxs(new Set())
    setSelectedIdxs(new Set())
  }

  // Salva: remove as linhas deletadas e persiste
  const saveEdit = useCallback(() => {
    const saved = draftRows.filter((_, i) => !deletedIdxs.has(i))
    onUpdate?.(saved)
    setEditMode(false)
    setDraftRows([])
    setDeletedIdxs(new Set())
    setSelectedIdxs(new Set())
  }, [draftRows, deletedIdxs, onUpdate])

  // Atualiza célula no draft
  const updateCell = useCallback((rowIdx: number, col: string, value: string) => {
    setDraftRows((prev) => prev.map((r, i) => i === rowIdx ? { ...r, [col]: value } : r))
  }, [])

  // Toggle exclusão de linha
  const toggleDelete = (idx: number) => {
    setDeletedIdxs((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  // Toggle seleção (para exclusão em lote)
  const toggleSelect = (idx: number) => {
    setSelectedIdxs((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const selectAll = () => {
    const allVisible = new Set(
      visibleRows.map((r) => r.__originalIdx as number)
    )
    if ([...allVisible].every((i) => selectedIdxs.has(i))) {
      setSelectedIdxs(new Set())
    } else {
      setSelectedIdxs(allVisible)
    }
  }

  // Excluir selecionados de uma vez
  const deleteSelected = () => {
    setDeletedIdxs((prev) => {
      const next = new Set(prev)
      selectedIdxs.forEach((i) => next.add(i))
      return next
    })
    setSelectedIdxs(new Set())
  }

  // Restaurar selecionados
  const restoreSelected = () => {
    setDeletedIdxs((prev) => {
      const next = new Set(prev)
      selectedIdxs.forEach((i) => next.delete(i))
      return next
    })
    setSelectedIdxs(new Set())
  }

  // Fonte de dados: draft em edição ou original
  const sourceRows = editMode ? draftRows : table.rows

  const filtered = useMemo(() => {
    if (!search.trim()) return sourceRows.map((r, i) => ({ ...r, __originalIdx: i }))
    const q = search.toLowerCase()
    return sourceRows
      .map((r, i) => ({ ...r, __originalIdx: i }))
      .filter((row) =>
        Object.entries(row).some(([k, v]) => k !== '__originalIdx' && String(v).toLowerCase().includes(q))
      )
  }, [sourceRows, search])

  const sorted = useMemo(() => {
    if (!sortCol) return filtered
    return [...filtered].sort((a, b) => {
      const av = ((a as Record<string, any>)[sortCol] as string) ?? ''
      const bv = ((b as Record<string, any>)[sortCol] as string) ?? ''
      const numA = parseFloat(av)
      const numB = parseFloat(bv)
      const cmp = !isNaN(numA) && !isNaN(numB) ? numA - numB : av.localeCompare(bv, 'pt-BR')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortCol, sortDir])

  const visibleRows = maxRows && !editMode ? sorted.slice(0, maxRows) : sorted

  const handleSort = (col: string) => {
    if (editMode) return // desabilita ordenação no modo edição
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (editMode) return null
    if (sortCol !== col) return <ArrowSortRegular fontSize={12} className={styles.sortIcon} />
    if (sortDir === 'asc') return <ChevronUpRegular fontSize={12} className={mergeClasses(styles.sortIcon, styles.sortIconActive)} />
    return <ChevronDownRegular fontSize={12} className={mergeClasses(styles.sortIcon, styles.sortIconActive)} />
  }

  const deletedCount = deletedIdxs.size
  const selectedCount = selectedIdxs.size
  const pendingCount = draftRows.length - deletedCount
  const allVisibleSelected = visibleRows.length > 0 &&
    visibleRows.every((r) => selectedIdxs.has(r.__originalIdx as number))

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {!editMode && (
            <div className={styles.searchWrap}>
              <Input
                size="small"
                placeholder="Buscar em qualquer coluna…"
                value={search}
                onChange={(_, d) => setSearch(d.value)}
                contentBefore={<SearchRegular fontSize={14} />}
                style={{ width: '100%' }}
              />
            </div>
          )}
          <Text size={100} style={{ color: '#00807C', flexShrink: 0 }}>
            {editMode
              ? <><strong style={{ color: '#EEA722' }}>{deletedCount}</strong> para excluir · <strong>{pendingCount}</strong> restantes</>
              : <>{visibleRows.length.toLocaleString('pt-BR')} / {(editMode ? draftRows.length : table.rowCount).toLocaleString('pt-BR')} registros</>
            }
          </Text>
        </div>

        <div className={styles.toolbarRight}>
          {editable && !editMode && (
            <Button
              size="small"
              appearance="subtle"
              icon={<EditRegular fontSize={14} />}
              onClick={startEdit}
            >
              Editar tabela
            </Button>
          )}
          {editMode && selectedCount > 0 && (
            <>
              <Button
                size="small"
                appearance="subtle"
                icon={<DeleteRegular fontSize={14} />}
                style={{ color: '#EEA722' }}
                onClick={deleteSelected}
              >
                Excluir {selectedCount} selecionada{selectedCount !== 1 ? 's' : ''}
              </Button>
              <Button
                size="small"
                appearance="subtle"
                onClick={restoreSelected}
              >
                Restaurar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Banner do modo de edição */}
      {editMode && (
        <div className={styles.editBanner}>
          <div className={styles.editBannerLeft}>
            <WarningRegular fontSize={16} style={{ color: '#EEA722', flexShrink: 0 }} />
            <Text size={200} style={{ color: '#00807C' }}>
              <strong>Modo de edição:</strong> marque as linhas para excluir ou
              {' '}<strong>dê duplo clique em qualquer célula</strong> para editar o valor.
              {deletedCount > 0 && (
                <span style={{ marginLeft: '8px' }}>
                  <Badge size="small" style={{ backgroundColor: '#EEA722', color: '#FFFFFF', border: '1px solid #EEA722' }}>
                    {deletedCount} linha{deletedCount !== 1 ? 's' : ''} marcada{deletedCount !== 1 ? 's' : ''} para exclusão
                  </Badge>
                </span>
              )}
            </Text>
          </div>
          <div className={styles.editBannerActions}>
            <Button
              size="small"
              appearance="outline"
              icon={<DismissRegular fontSize={13} />}
              onClick={cancelEdit}
            >
              Descartar
            </Button>
            <Button
              size="small"
              appearance="primary"
              icon={<SaveRegular fontSize={13} />}
              onClick={saveEdit}
              style={{ backgroundColor: '#00807C' }}
            >
              Salvar alterações{deletedCount > 0 ? ` (−${deletedCount})` : ''}
            </Button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div
        className={mergeClasses(styles.tableWrap, editMode && styles.tableWrapEditing)}
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <Table
          size="small"
          noNativeElements={false}
          style={{
            minWidth: `${Math.max(1400, table.headers.length * 300) + (editMode ? 86 : 0)}px`,
          }}
        >
          <TableHeader>
            <TableRow style={{
              borderBottomWidth: '1px',
              borderBottomStyle: 'solid',
              borderBottomColor: editMode ? '#EEA722' : '#00807C',
            }}>
              {/* Coluna de seleção em modo edição */}
              {editMode && (
                <TableHeaderCell className={styles.headerCellCheckbox}>
                  <Tooltip content="Selecionar todos visíveis" relationship="label">
                    <Checkbox
                      checked={allVisibleSelected ? true : selectedCount > 0 ? 'mixed' : false}
                      onChange={selectAll}
                    />
                  </Tooltip>
                </TableHeaderCell>
              )}

              {table.headers.map((h) => (
                <TableHeaderCell
                  key={h}
                  className={styles.headerCell}
                  onClick={() => handleSort(h)}
                  sortDirection={
                    !editMode && sortCol === h ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Text size={100} weight="semibold">{h}</Text>
                    <SortIcon col={h} />
                  </span>
                </TableHeaderCell>
              ))}

              {/* Coluna de ação (excluir) em modo edição */}
              {editMode && (
                <TableHeaderCell className={styles.headerCellActions}>
                  <Text size={100} style={{ color: '#00807C' }}>Ação</Text>
                </TableHeaderCell>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.headers.length + (editMode ? 2 : 0)}
                  style={{ textAlign: 'center', padding: '32px' }}
                >
                  <Text size={200} style={{ color: '#00807C' }}>
                    Nenhum resultado encontrado
                  </Text>
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row, visibleI) => {
                const origIdx = row.__originalIdx as number
                const isDeleted = deletedIdxs.has(origIdx)
                const isSelected = selectedIdxs.has(origIdx)
                const rowBg = isSelected
                  ? '#EEA722'
                  : '#FFFFFF'

                return (
                  <TableRow
                    key={origIdx}
                    style={{
                      backgroundColor: rowBg,
                    }}
                  >
                    {/* Checkbox de seleção */}
                    {editMode && (
                      <TableCell className={styles.bodyCellCheckbox} style={{ backgroundColor: rowBg }}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelect(origIdx)}
                        />
                      </TableCell>
                    )}

                    {/* Células de dados */}
                    {table.headers.map((h) => {
                      if (editMode && !isDeleted) {
                        return (
                          <EditableCell
                            key={h}
                            value={(draftRows[origIdx]?.[h] ?? '')}
                            onSave={(v) => updateCell(origIdx, h, v)}
                            className={styles.bodyCell}
                            contentClassName={styles.cellContent}
                            isSelected={isSelected}
                          />
                        )
                      }
                      return (
                        <TableCell key={h} className={styles.bodyCell}>
                          <TableCellLayout>
                            <span
                              className={styles.cellContent}
                              title={(row as Record<string, any>)[h] ?? ''}
                              style={
                                isDeleted
                                  ? { textDecoration: 'line-through', color: '#EEA722' }
                                  : isSelected
                                  ? { color: '#FFFFFF' }
                                  : { color: '#00807C' }
                              }
                            >
                              {(row as Record<string, any>)[h] ?? ''}
                            </span>
                          </TableCellLayout>
                        </TableCell>
                      )
                    })}

                    {/* Botão de excluir/restaurar linha */}
                    {editMode && (
                      <TableCell className={styles.bodyCellActions} style={{ backgroundColor: rowBg }}>
                        <Tooltip
                          content={isDeleted ? 'Restaurar linha' : 'Marcar para exclusão'}
                          relationship="label"
                        >
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={isDeleted
                              ? <CheckmarkRegular fontSize={13} style={{ color: '#00807C' }} />
                              : <DeleteRegular fontSize={13} style={{ color: isSelected ? '#FFFFFF' : '#EEA722' }} />
                            }
                            onClick={() => toggleDelete(origIdx)}
                            style={{ minWidth: 'auto', padding: '4px' }}
                          />
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Atalhos de teclado info */}
      {editMode && (
        <Text size={100} style={{ color: tokens.colorNeutralForeground4, textAlign: 'right' }}>
          Duplo clique para editar célula · Enter para confirmar · Esc para cancelar
        </Text>
      )}
    </div>
  )
}
