'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { makeStyles, Text, Button } from '@fluentui/react-components'
import { ArrowUploadRegular, NavigationRegular } from '@fluentui/react-icons'
import { useData } from '@/context/DataContext'
import { useShell } from './AppShell'

/* ═══════════════════════════════════════
   Somente estas 3 cores — sem rgba
   ═══════════════════════════════════════ */
const G = '#00807C'   // Verde Vale
const Y = '#EEA722'   // Amarelo Vale
const W = '#FFFFFF'   // Branco

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/':        { title: 'Dashboard',  subtitle: 'Visão geral dos dados importados' },
  '/upload':  { title: 'Importar',   subtitle: 'Carregue arquivos CSV ou XLSX' },
  '/charts':  { title: 'Gráficos',   subtitle: 'Visualize e analise seus dados' },
  '/compare': { title: 'Aderência',  subtitle: 'Análise de conformidade entre tabelas' },
}

const useStyles = makeStyles({
  header: {
    height: '60px',
    backgroundColor: W,
    borderBottom: `1px solid ${G}`, // 1px Verde Vale
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: '24px',
    paddingRight: '24px',
    flexShrink: 0,
    gap: '12px',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
    flex: 1,
  },
  hamburger: {
    display: 'flex',
    '@media (min-width: 768px)': { display: 'none' },
  },
  pageTitle: {
    fontWeight: 700,
    fontSize: '15px',
    color: G, // Verde Vale
  },
  divider: {
    width: '1.5px',
    height: '18px',
    backgroundColor: Y, // Amarelo Vale
    flexShrink: 0,
  },
  subtitle: {
    display: 'none',
    '@media (min-width: 640px)': {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },

  /* Tag "Vale Analytics" — Verde Vale sólido */
  valeTag: {
    display: 'none',
    '@media (min-width: 768px)': {
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      paddingTop: '5px',
      paddingBottom: '5px',
      paddingLeft: '12px',
      paddingRight: '12px',
      borderRadius: '99px',
      backgroundColor: G,
      border: `1px solid ${G}`,
    },
  },

  /* Badge individual de tabela — Amarelo Vale sólido */
  tableBadge: {
    display: 'none',
    '@media (min-width: 640px)': {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
  },
})

export default function Header() {
  const styles = useStyles()
  const pathname = usePathname()
  const { tables } = useData()
  const { toggleMobile } = useShell()
  const meta = pageMeta[pathname] ?? { title: 'Vale Analytics', subtitle: '' }

  return (
    <header className={styles.header}>

      {/* ── Lado esquerdo ── */}
      <div className={styles.left}>
        <div className={styles.hamburger}>
          <Button
            appearance="subtle"
            icon={<NavigationRegular style={{ color: G }} />}
            onClick={toggleMobile}
            aria-label="Menu"
          />
        </div>

        <Text className={styles.pageTitle}>{meta.title}</Text>

        {meta.subtitle && (
          <div className={styles.subtitle}>
            <div className={styles.divider} />
            <Text size={200} style={{ color: G, fontWeight: 500 }}>
              {meta.subtitle}
            </Text>
          </div>
        )}
      </div>

      {/* ── Lado direito ── */}
      <div className={styles.right}>

        {/* Badges das tabelas — Verde Vale sólido */}
        {tables.length > 0 && (
          <div className={styles.tableBadge}>
            {tables.slice(0, 2).map((t) => (
              <span
                key={t.id}
                style={{
                  backgroundColor: G,
                  color: W,
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '99px',
                  whiteSpace: 'nowrap',
                  border: `1px solid ${Y}`,
                }}
              >
                {t.name.length > 16 ? t.name.slice(0, 16) + '…' : t.name}
              </span>
            ))}
            {tables.length > 2 && (
              <span
                style={{
                  backgroundColor: Y,
                  color: W,
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '99px',
                }}
              >
                +{tables.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Tag "Vale Analytics" — sempre visível no desktop */}
        <div className={styles.valeTag}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: Y, flexShrink: 0 }} />
          <Text style={{ fontSize: '11px', fontWeight: 700, color: W, letterSpacing: '0.04em' }}>
            Vale Analytics
          </Text>
        </div>

        {/* Botão de importar quando não há tabelas */}
        {tables.length === 0 && (
          <Link href="/upload">
            <Button
              size="small"
              icon={<ArrowUploadRegular style={{ color: W }} />}
              style={{
                backgroundColor: G,
                color: W,
                border: `1px solid ${Y}`,
                fontWeight: 600,
              }}
            >
              Importar dados
            </Button>
          </Link>
        )}

      </div>
    </header>
  )
}
