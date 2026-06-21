import './style.css'
import { setupLayout } from './components/layout/Sidebar'
import { initRouter } from './router'
import { loadWorkspaceInfo } from './modules/club/workspace'
import { loadSquadre } from './modules/team/squadre'

window.YFM = window.YFM || {}
window.YFM.squadraId = '33333333-3333-3333-3333-333333333333'
window.YFM.allSquadre = []
window.YFM.currentPage = 'dashboard'
window.YFM.allPlayers = []
window.YFM.allMatches = []
window.YFM.workspaceInfo = null

document.addEventListener('DOMContentLoaded', () => {
  setupLayout()
  initRouter()
  loadWorkspaceInfo()
  loadSquadre().then(() => {
    window.YFM.navigateTo('dashboard')
  })
})

// Funzioni globali per i moduli del calendario (caricate on-demand)
window.YFM.openConvocation = async (mid, readOnly) => {
  const m = await import('./modules/team/convocazioni.js')
  m.openConvocation(mid, readOnly)
}
window.YFM.openDistinta = async (mid) => {
  const m = await import('./modules/team/distinta.js')
  m.openDistinta(mid)
}
window.YFM.openFormazioneForm = async (mid) => {
  const m = await import('./modules/team/formazione.js')
  m.openFormazioneForm(mid)
}
window.YFM.openNoteAvversario = async (mid) => {
  const m = await import('./modules/team/noteAvversario.js')
  m.openNoteAvversario(mid)
}
window.YFM.openMatchDetail = async (mid) => {
  const m = await import('./modules/team/matchDetail.js')
  m.openMatchDetail(mid)
}
