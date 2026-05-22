'use client'

import { memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { makeStyles, mergeClasses, Text, Button, Tooltip } from '@fluentui/react-components'
import {
  HomeRegular, HomeFilled,
  ArrowUploadRegular, ArrowUploadFilled,
  DataAreaRegular, DataAreaFilled,
  TableMultipleRegular, TableMultipleFilled,
  DeleteRegular,
  ChevronLeftRegular, ChevronRightRegular,
} from '@fluentui/react-icons'
import { useData } from '@/context/DataContext'
import { useShell } from './AppShell'

/* ═══════════════════════════════════════════════════════════════════
   PALETA — somente estas 3 cores, sem nenhuma transparência
   ══════════════════════════════════════════════════════════════════ */
const G  = '#00807C'   // Verde Vale
const Y  = '#EEA722'   // Amarelo Vale
const W  = '#FFFFFF'   // Branco

interface SidebarProps {
  onNavigate?: () => void
}

const useStyles = makeStyles({
  sidebar: {
    width: '100%',
    flexShrink: 0,
    height: '100%',
    backgroundColor: G,          // fundo verde Vale
    display: 'flex',
    flexDirection: 'column',
    borderRight: `1px solid ${Y}`, // linha amarela Vale
  },

  /* Faixa amarela no topo */
  topBar: {
    height: '4px',
    backgroundColor: Y,
    flexShrink: 0,
  },

  /* Cabeçalho com logo */
  logo: {
    height: '62px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '18px',
    paddingRight: '18px',
    borderBottom: `1px solid ${W}`,
    flexShrink: 0,
  },
  logoCollapsed: {
    height: '62px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: `1px solid ${W}`,
    flexShrink: 0,
  },
  logoImg: {
    height: '30px',
    width: 'auto',
    objectFit: 'contain',
    flexShrink: 0,
    filter: 'brightness(0) invert(1)',  // força branco puro
  },
  logoImgWrapCollapsed: {
    width: '32px',
    height: '30px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
  },
  logoImgCollapsed: {
    height: '30px',
    width: 'auto',
    minWidth: '120px',
    objectFit: 'cover',
    objectPosition: 'left center',
    filter: 'brightness(0) invert(1)',
    flexShrink: 0,
  },

  /* Navegação */
  nav: {
    flex: 1,
    overflowY: 'auto',
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '10px',
    paddingRight: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  /* Rótulo de seção */
  sectionLabel: {
    paddingLeft: '10px',
    paddingRight: '10px',
    marginTop: '10px',
    marginBottom: '4px',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: W,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  /* Item de navegação — inativo */
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '12px',
    paddingRight: '10px',
    borderRadius: '2px',
    cursor: 'pointer',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 500,
    color: W,
    position: 'relative',
    ':hover': {
      backgroundColor: Y,   // hover: Amarelo Vale sólido
      color: W,
    },
  },

  /* Item de navegação — ativo */
  navItemActive: {
    backgroundColor: W,   // fundo branco
    color: G,             // texto Verde Vale
    fontWeight: 700,
    ':hover': {
      backgroundColor: W,
      color: G,
    },
  },

  /* Barra lateral do item ativo — Amarelo Vale */
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '4px',
    height: '24px',
    backgroundColor: Y,
    borderRadius: '0 4px 4px 0',
  },

  /* Item de tabela */
  tableItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '10px',
    paddingRight: '6px',
    borderRadius: '2px',
    ':hover': {
      backgroundColor: Y,
    },
  },
  tableItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
    flex: 1,
  },
  tableIconDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: Y,    // ponto Amarelo Vale
    flexShrink: 0,
  },

  /* Badge de contagem */
  countBadge: {
    backgroundColor: Y,
    color: W,
    fontSize: '9px',
    fontWeight: 700,
    padding: '1px 7px',
    borderRadius: '99px',
    letterSpacing: '0.04em',
  },

  /* Rodapé */
  footer: {
    paddingTop: '12px',
    paddingBottom: '14px',
    paddingLeft: '18px',
    paddingRight: '18px',
    borderTop: `1px solid ${W}`,
    flexShrink: 0,
  },

  /* Botão de minimizar */
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '12px',
    paddingRight: '10px',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: W,
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    marginTop: 'auto',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
    ':hover': {
      backgroundColor: Y,
      color: W,
    },
  },

  collapsedBadge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    backgroundColor: Y,
    color: W,
    fontSize: '8px',
    fontWeight: 700,
    borderRadius: '50%',
    width: '14px',
    height: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
})

const navItems = [
  { href: '/',        label: 'Dashboard',  Icon: HomeRegular,          IconActive: HomeFilled },
  { href: '/upload',  label: 'Importar',   Icon: ArrowUploadRegular,   IconActive: ArrowUploadFilled },
  { href: '/charts',  label: 'Gráficos',   Icon: DataAreaRegular,      IconActive: DataAreaFilled },
  { href: '/compare', label: 'Aderência',  Icon: TableMultipleRegular, IconActive: TableMultipleFilled },
]

function Sidebar({ onNavigate }: SidebarProps) {
  const styles = useStyles()
  const pathname = usePathname()
  const { tables, removeTable } = useData()
  const { sidebarCollapsed, toggleSidebar } = useShell()

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleSidebar()
  }

  return (
    <aside className={styles.sidebar}>

      {/* ── Faixa amarela no topo ── */}
      <div className={styles.topBar} />

      {/* ── Logo ── */}
      <div className={sidebarCollapsed ? styles.logoCollapsed : styles.logo}>
        {sidebarCollapsed ? (
          <div className={styles.logoImgWrapCollapsed}>
            <img
              src="https://upload.wikimedia.org/wikipedia/pt/thumb/c/cc/Logotipo_Vale.svg/3840px-Logotipo_Vale.svg.png"
              alt="Vale"
              className={styles.logoImgCollapsed}
            />
          </div>
        ) : (
          <img
            src="https://upload.wikimedia.org/wikipedia/pt/thumb/c/cc/Logotipo_Vale.svg/3840px-Logotipo_Vale.svg.png"
            alt="Vale S.A."
            className={styles.logoImg}
          />
        )}
      </div>

      {/* ── Navegação ── */}
      <nav className={styles.nav}>
        {!sidebarCollapsed && <span className={styles.sectionLabel}>Menu</span>}

        {navItems.map(({ href, label, Icon, IconActive }) => {
          const active = pathname === href
          const content = (
            <Link
              key={href}
              href={href}
              className={mergeClasses(styles.navItem, active && styles.navItemActive)}
              onClick={onNavigate}
              style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
            >
              {active && !sidebarCollapsed && <span className={styles.activeBar} />}

              {active
                ? <IconActive fontSize={16} style={{ color: G, flexShrink: 0 }} />
                : <Icon      fontSize={16} style={{ color: W, flexShrink: 0 }} />
              }

              {!sidebarCollapsed && label}
            </Link>
          )

          if (sidebarCollapsed) {
            return (
              <Tooltip key={href} content={label} relationship="label" positioning="after">
                {content}
              </Tooltip>
            )
          }

          return content
        })}

        {/* ── Tabelas importadas ── */}
        {tables.length > 0 && (
          <>
            {sidebarCollapsed ? (
              <Tooltip content={`${tables.length} tabelas importadas`} relationship="label" positioning="after">
                <Link
                  href="/"
                  className={styles.navItem}
                  style={{ justifyContent: 'center', marginTop: '12px' }}
                >
                  <TableMultipleRegular fontSize={16} style={{ color: W, flexShrink: 0 }} />
                  <span className={styles.collapsedBadge}>{tables.length}</span>
                </Link>
              </Tooltip>
            ) : (
              <>
                <span className={styles.sectionLabel} style={{ marginTop: '18px' }}>
                  <span>Tabelas</span>
                  <span className={styles.countBadge}>{tables.length}</span>
                </span>

                {tables.map((table) => (
                  <div key={table.id} className={styles.tableItem}>
                    <div className={styles.tableItemLeft}>
                      <span className={styles.tableIconDot} />
                      <div style={{ minWidth: 0 }}>
                        <Text block truncate style={{ color: W, fontSize: '12px', fontWeight: 500, maxWidth: '128px' }}>
                          {table.name}
                        </Text>
                        <Text style={{ color: W, fontSize: '10.5px' }}>
                          {table.rowCount.toLocaleString('pt-BR')} linhas
                        </Text>
                      </div>
                    </div>
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<DeleteRegular fontSize={13} style={{ color: W }} />}
                      onClick={() => removeTable(table.id)}
                      title="Remover tabela"
                      style={{ minWidth: 'auto', padding: '3px' }}
                    />
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ── Botão de alternar colapso ── */}
        <button
          type="button"
          onClick={handleToggle}
          className={styles.toggleBtn}
          style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
        >
          {sidebarCollapsed ? (
            <ChevronRightRegular fontSize={16} style={{ color: W }} />
          ) : (
            <>
              <ChevronLeftRegular fontSize={16} style={{ color: W }} />
              <span>Recolher menu</span>
            </>
          )}
        </button>
      </nav>

      {/* ── Rodapé ── */}
      {!sidebarCollapsed && (
        <div className={styles.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: Y, flexShrink: 0 }} />
            <Text style={{ color: W, fontSize: '10.5px', fontWeight: 600 }}>
              © {new Date().getFullYear()} Vale S.A.
            </Text>
          </div>
          <Text style={{ color: W, fontSize: '9px', letterSpacing: '0.06em' }}>
            Todos os direitos reservados
          </Text>
        </div>
      )}

    </aside>
  )
}

export default memo(Sidebar)
