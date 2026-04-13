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
    <RedwoodProvider titleTemplate="%PageTitle | FYOA">
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
