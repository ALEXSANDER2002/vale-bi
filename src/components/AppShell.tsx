'use client'

import { useState, createContext, useContext, useCallback } from 'react'
import {
  FluentProvider, makeStyles, tokens,
  DrawerBody, OverlayDrawer,
} from '@fluentui/react-components'
import { valeTheme } from '@/lib/theme'
import Sidebar from './Sidebar'
import Header from './Header'

interface ShellContextValue {
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
  toggleMobile: () => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  toggleSidebar: () => void
}

const ShellContext = createContext<ShellContextValue>({
  mobileOpen: false,
  setMobileOpen: () => {},
  toggleMobile: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  toggleSidebar: () => {},
})

export function useShell() {
  return useContext(ShellContext)
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  desktopSidebar: {
    display: 'none',
    '@media (min-width: 768px)': {
      display: 'flex',
      transition: 'width 0.2s ease',
    },
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 0',
    overflow: 'hidden',
    minWidth: 0,
  },
  main: {
    flex: '1 1 0',
    overflowY: 'auto',
    padding: '20px 16px',
    '@media (min-width: 768px)': {
      padding: '28px',
    },
  },
  drawerBody: {
    padding: '0',
  },
})

export default function AppShell({ children }: { children: React.ReactNode }) {
  const styles = useStyles()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), [])
  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), [])

  return (
    <FluentProvider theme={valeTheme} style={{ height: '100%' }}>
      <ShellContext.Provider
        value={{
          mobileOpen,
          setMobileOpen,
          toggleMobile,
          sidebarCollapsed,
          setSidebarCollapsed,
          toggleSidebar,
        }}
      >
        <div className={styles.root}>
          {/* Desktop sidebar */}
          <div
            className={styles.desktopSidebar}
            style={{ width: sidebarCollapsed ? '72px' : '232px' }}
          >
            <Sidebar />
          </div>

          {/* Mobile drawer */}
          <OverlayDrawer
            open={mobileOpen}
            onOpenChange={(_, { open }) => setMobileOpen(open)}
            position="start"
            size="small"
            style={{ backgroundColor: '#00807C' }}
          >
            <DrawerBody className={styles.drawerBody}>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </DrawerBody>
          </OverlayDrawer>

          <div className={styles.body}>
            <Header />
            <main className={styles.main}>{children}</main>
          </div>
        </div>
      </ShellContext.Provider>
    </FluentProvider>
  )
}
