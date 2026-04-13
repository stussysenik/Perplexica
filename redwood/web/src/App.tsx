import type { ReactNode } from 'react'

import { FatalErrorBoundary, RedwoodProvider } from '@redwoodjs/web'
import { RedwoodApolloProvider } from '@redwoodjs/web/apollo'

import FatalErrorPage from 'src/pages/FatalErrorPage'
import { ThemeProvider } from 'src/lib/theme'
import { SessionProvider } from 'src/lib/session'
import { SettingsProvider } from 'src/lib/settings'
import SignInGate from 'src/components/Auth/SignInGate'

import './index.css'

interface AppProps {
  children?: ReactNode
}

const App = ({ children }: AppProps) => (
  <FatalErrorBoundary page={FatalErrorPage}>
    {/*
      Every browser tab reads "Find Your Own Answer" — the product voice is
      the title, per-page suffixes would feel like admin furniture. Pages
      that used to call `document.title = '… — FYOA'` have had those lines
      removed so they can't fight this template back to per-page strings.
    */}
    <RedwoodProvider titleTemplate="Find Your Own Answer">
      <RedwoodApolloProvider
        graphQLClientConfig={{
          httpLinkConfig: { credentials: 'include' },
        }}
      >
        <SettingsProvider>
          <ThemeProvider>
            <SessionProvider>
              <SignInGate>{children}</SignInGate>
            </SessionProvider>
          </ThemeProvider>
        </SettingsProvider>
      </RedwoodApolloProvider>
    </RedwoodProvider>
  </FatalErrorBoundary>
)

export default App
