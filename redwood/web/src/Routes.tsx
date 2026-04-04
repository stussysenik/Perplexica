import { Router, Route, Set } from '@redwoodjs/router'
import AppLayout from 'src/layouts/AppLayout/AppLayout'

const Routes = () => {
  return (
    <Router>
      <Set wrap={AppLayout}>
        <Route path="/" page={HomePage} name="home" />
        <Route path="/discover" page={DiscoverPage} name="discover" />
        <Route path="/library" page={LibraryPage} name="library" />
      </Set>
      <Route path="/s/{slug}" page={SharedPage} name="shared" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
