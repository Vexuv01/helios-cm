# HELIOS CM Enterprise — Architecture Audit

_Generato automaticamente il 2026-07-13T11:04:10.273Z._

## 1. Riepilogo quantitativo

| Metrica | Valore |
| --- | --- |
| File sorgente JS/JSX/TS/TSX | 94 |
| File CSS | 13 |
| Righe sorgente complessive | 11342 |
| Righe CSS complessive | 5410 |
| Import pesanti statici | 7 |
| File con accesso diretto Supabase | 21 |
| Selettori CSS duplicati tra file | 50 |


## 2. File prioritari

| File | Righe | Import | Byte |
| --- | --- | --- | --- |
| src/pages/project-workspace/ConstructionWorkspace.jsx | 645 | 7 | 20436 |
| src/pages/project-workspace/ProjectWeekly.jsx | 686 | 5 | 19454 |
| src/pages/project-workspace/ProjectForecast.jsx | 876 | 6 | 28534 |
| src/pages/project-workspace/ProjectDashboard.jsx | 359 | 7 | 12248 |
| src/pages/Portfolio.jsx | 564 | 5 | 16239 |
| src/services/constructionEngine.service.js | 477 | 2 | 15565 |
| src/domain/reporting/executiveReportEngine.js | 248 | 0 | 7299 |
| src/features/reports/services/executiveReportService.js | 83 | 4 | 2117 |
| src/features/reports/services/executiveNotesService.js | 134 | 1 | 3344 |
| src/features/reports/renderers/weeklyManagementPptRenderer.js | 646 | 1 | 13493 |
| src/features/weekly/excel/weeklyExcelService.js | 204 | 1 | 4570 |
| src/features/forecast/excel/recoveryExcelService.js | 249 | 1 | 5659 |
| src/features/forecast/services/recoveryForecastService.js | 202 | 1 | 6300 |
| src/styles/construction-workspace.css | 1471 | 0 | 27082 |
| src/styles/dashboard.css | 702 | 0 | 12392 |
| src/styles/forecast.css | 447 | 0 | 8054 |
| src/styles/executive-notes.css | 415 | 0 | 7659 |
| src/styles/portfolio.css | 526 | 0 | 9067 |


## 3. File sorgente più grandi

| File | Righe | Import | Byte |
| --- | --- | --- | --- |
| src/pages/project-workspace/ProjectForecast.jsx | 876 | 6 | 28534 |
| src/pages/project-workspace/ProjectWeekly.jsx | 686 | 5 | 19454 |
| src/features/reports/renderers/weeklyManagementPptRenderer.js | 646 | 1 | 13493 |
| src/pages/project-workspace/ConstructionWorkspace.jsx | 645 | 7 | 20436 |
| src/pages/Portfolio.jsx | 564 | 5 | 16239 |
| src/pages/project-workspace/ProjectExecutiveNotes.jsx | 499 | 4 | 12587 |
| src/services/constructionEngine.service.js | 477 | 2 | 15565 |
| src/pages/project-workspace/ProjectWbs.jsx | 476 | 5 | 16497 |
| src/pages/project-workspace/ProjectDashboard.jsx | 359 | 7 | 12248 |
| src/features/forecast/excel/recoveryExcelService.js | 249 | 1 | 5659 |
| src/domain/reporting/executiveReportEngine.js | 248 | 0 | 7299 |
| src/features/construction-photos/ActivityPhotos.jsx | 247 | 2 | 6996 |
| src/features/control-room/ProjectControlRoom.jsx | 239 | 0 | 7950 |
| src/features/construction-documents/ActivityDocuments.jsx | 217 | 2 | 6584 |
| src/features/weekly/excel/weeklyExcelService.js | 204 | 1 | 4570 |
| src/features/forecast/services/recoveryForecastService.js | 202 | 1 | 6300 |
| src/features/weekly/hooks/useWeeklyWorkspace.js | 199 | 3 | 5575 |
| src/domain/construction-intelligence/timeline.engine.js | 175 | 0 | 5252 |
| src/features/wbs/services/wbsService.js | 165 | 3 | 5701 |
| src/features/weekly/services/weeklyService.js | 152 | 4 | 3596 |
| src/features/construction-activity/components/ActivityDrawer.jsx | 134 | 1 | 6330 |
| src/features/reports/services/executiveNotesService.js | 134 | 1 | 3344 |
| src/features/wbs/import/excelImporter.js | 129 | 3 | 3665 |
| src/features/weekly/repositories/weeklyRepository.js | 128 | 1 | 3153 |
| src/features/projects/layouts/ProjectWorkspaceLayout.jsx | 123 | 6 | 3028 |
| src/features/wbs/repositories/wbsRepository.js | 123 | 1 | 3779 |
| src/domain/construction-intelligence/progress.engine.js | 121 | 0 | 3634 |
| src/features/construction-workspace/components/ExecutionMode.jsx | 119 | 0 | 3279 |
| src/features/construction-workspace/components/ActivityCommandCenter.jsx | 111 | 0 | 2704 |
| src/features/auth/context/AuthContext.jsx | 108 | 3 | 2304 |


## 4. Componenti React con maggiore complessità indicativa

Lo score è solamente diagnostico: righe + peso di state, effect, callback e handler.

| File | Righe | useState | useEffect | useCallback | Handler | Score |
| --- | --- | --- | --- | --- | --- | --- |
| src/pages/project-workspace/ProjectForecast.jsx | 876 | 9 | 1 | 1 | 8 | 1176 |
| src/pages/project-workspace/ProjectWeekly.jsx | 686 | 13 | 1 | 1 | 2 | 1006 |
| src/pages/project-workspace/ConstructionWorkspace.jsx | 645 | 12 | 1 | 1 | 0 | 925 |
| src/pages/Portfolio.jsx | 564 | 8 | 1 | 0 | 3 | 784 |
| src/pages/project-workspace/ProjectWbs.jsx | 476 | 8 | 1 | 1 | 1 | 686 |
| src/pages/project-workspace/ProjectExecutiveNotes.jsx | 499 | 6 | 1 | 0 | 1 | 659 |
| src/pages/project-workspace/ProjectDashboard.jsx | 359 | 4 | 2 | 2 | 1 | 529 |
| src/features/construction-photos/ActivityPhotos.jsx | 247 | 8 | 2 | 1 | 3 | 507 |
| src/features/construction-documents/ActivityDocuments.jsx | 217 | 10 | 1 | 1 | 2 | 477 |
| src/features/control-room/ProjectControlRoom.jsx | 239 | 0 | 0 | 0 | 0 | 239 |
| src/features/auth/context/AuthContext.jsx | 108 | 4 | 1 | 0 | 0 | 218 |
| src/features/projects/layouts/ProjectWorkspaceLayout.jsx | 123 | 1 | 1 | 0 | 0 | 173 |
| src/features/auth/pages/LoginPage.jsx | 81 | 4 | 0 | 0 | 1 | 171 |
| src/features/construction-activity/components/ActivityDrawer.jsx | 134 | 1 | 0 | 0 | 0 | 154 |
| src/features/projects/context/ProjectContext.jsx | 47 | 3 | 1 | 1 | 0 | 147 |
| src/features/construction-workspace/components/ExecutionMode.jsx | 119 | 0 | 0 | 0 | 0 | 119 |
| src/features/construction-workspace/components/ActivityCommandCenter.jsx | 111 | 0 | 0 | 0 | 0 | 111 |
| src/features/construction-workspace/components/PlanningMode.jsx | 105 | 0 | 0 | 0 | 0 | 105 |
| src/app/routes.jsx | 101 | 0 | 0 | 0 | 0 | 101 |
| src/features/weekly/components/WeeklyActivityCard.jsx | 77 | 0 | 0 | 0 | 0 | 77 |
| src/features/auth/guards/ProtectedRoute.jsx | 45 | 0 | 0 | 0 | 1 | 55 |
| src/features/weekly/components/WeeklyDiscipline.jsx | 55 | 0 | 0 | 0 | 0 | 55 |
| src/features/construction-workspace/components/ConstructionTree.jsx | 51 | 0 | 0 | 0 | 0 | 51 |
| src/features/construction-workspace/components/ActivityHeader.jsx | 46 | 0 | 0 | 0 | 0 | 46 |
| src/features/weekly/components/WeeklyToolbar.jsx | 41 | 0 | 0 | 0 | 0 | 41 |


## 5. Import pesanti

| File | Package | Tipo import |
| --- | --- | --- |
| src/features/forecast/excel/recoveryExcelService.js | xlsx | statico |
| src/features/reports/renderers/weeklyManagementPptRenderer.js | pptxgenjs | statico |
| src/features/wbs/import/excelParser.js | xlsx | statico |
| src/features/wbs/import/templateDownloader.js | xlsx | statico |
| src/features/weekly/excel/weeklyExcelService.js | xlsx | statico |
| src/lib/supabaseClient.js | @supabase/supabase-js | statico |
| src/pages/project-workspace/ProjectDashboard.jsx | recharts | statico |


## 6. Dipendenze dei file prioritari

| File | Dipendenza | Tipo |
| --- | --- | --- |
| src/features/forecast/excel/recoveryExcelService.js | xlsx | package |
| src/features/forecast/services/recoveryForecastService.js | ../../../lib/supabaseClient | locale |
| src/features/reports/renderers/weeklyManagementPptRenderer.js | pptxgenjs | package |
| src/features/reports/services/executiveNotesService.js | ../../../lib/supabaseClient | locale |
| src/features/reports/services/executiveReportService.js | ../../../lib/supabaseClient | locale |
| src/features/reports/services/executiveReportService.js | ../../../domain/reporting/executiveReportEngine | locale |
| src/features/reports/services/executiveReportService.js | ../renderers/weeklyManagementPptRenderer | locale |
| src/features/reports/services/executiveReportService.js | ./executiveNotesService | locale |
| src/features/weekly/excel/weeklyExcelService.js | xlsx | package |
| src/pages/Portfolio.jsx | react | package |
| src/pages/Portfolio.jsx | react-router-dom | package |
| src/pages/Portfolio.jsx | ../features/portfolio/services/portfolioService | locale |
| src/pages/Portfolio.jsx | ../features/reports/services/executiveReportService | locale |
| src/pages/Portfolio.jsx | ../styles/portfolio.css | locale |
| src/pages/project-workspace/ConstructionWorkspace.jsx | react | package |
| src/pages/project-workspace/ConstructionWorkspace.jsx | react-router-dom | package |
| src/pages/project-workspace/ConstructionWorkspace.jsx | ../../lib/supabaseClient | locale |
| src/pages/project-workspace/ConstructionWorkspace.jsx | ../../features/wbs/import/excelImporter | locale |
| src/pages/project-workspace/ConstructionWorkspace.jsx | ../../features/wbs/import/templateDownloader | locale |
| src/pages/project-workspace/ConstructionWorkspace.jsx | ../../services/wbsWeightEngine | locale |
| src/pages/project-workspace/ConstructionWorkspace.jsx | ../../styles/construction-workspace.css | locale |
| src/pages/project-workspace/ProjectDashboard.jsx | react | package |
| src/pages/project-workspace/ProjectDashboard.jsx | react-router-dom | package |
| src/pages/project-workspace/ProjectDashboard.jsx | recharts | package |
| src/pages/project-workspace/ProjectDashboard.jsx | ../../features/forecast/services/recoveryForecastService | locale |
| src/pages/project-workspace/ProjectDashboard.jsx | ../../lib/supabaseClient | locale |
| src/pages/project-workspace/ProjectDashboard.jsx | ../../services/constructionEngine.service | locale |
| src/pages/project-workspace/ProjectDashboard.jsx | ../../styles/dashboard.css | locale |
| src/pages/project-workspace/ProjectForecast.jsx | react | package |
| src/pages/project-workspace/ProjectForecast.jsx | react-router-dom | package |
| src/pages/project-workspace/ProjectForecast.jsx | ../../features/forecast/services/recoveryForecastService | locale |
| src/pages/project-workspace/ProjectForecast.jsx | ../../lib/supabaseClient | locale |
| src/pages/project-workspace/ProjectForecast.jsx | ../../features/forecast/excel/recoveryExcelService | locale |
| src/pages/project-workspace/ProjectForecast.jsx | ../../styles/forecast.css | locale |
| src/pages/project-workspace/ProjectWeekly.jsx | react | package |
| src/pages/project-workspace/ProjectWeekly.jsx | react-router-dom | package |
| src/pages/project-workspace/ProjectWeekly.jsx | ../../lib/supabaseClient | locale |
| src/pages/project-workspace/ProjectWeekly.jsx | ../../features/weekly/excel/weeklyExcelService | locale |
| src/pages/project-workspace/ProjectWeekly.jsx | ../../styles/construction-workspace.css | locale |
| src/services/constructionEngine.service.js | ../domain/construction-engine | locale |
| src/services/constructionEngine.service.js | ../lib/supabaseClient | locale |


## 7. Moduli locali più importati

| Modulo | Importazioni | Importato da |
| --- | --- | --- |
| src/lib/supabaseClient.js | 21 | src/features/auth/context/AuthContext.jsx<br>src/features/auth/repositories/authRepository.js<br>src/features/construction-documents/repositories/documentRepository.js<br>src/features/construction-documents/services/documentService.js<br>src/features/construction-photos/services/photoService.js<br>src/features/construction-workspace/services/activityWorkspaceService.js |
| src/features/projects/context/useProject.js | 10 | src/features/projects/context/ProjectContext.jsx<br>src/features/projects/layouts/ProjectWorkspaceLayout.jsx<br>src/features/weekly/hooks/useWeeklyWorkspace.js<br>src/pages/project-workspace/ProjectAnalytics.jsx<br>src/pages/project-workspace/ProjectCommissioning.jsx<br>src/pages/project-workspace/ProjectDocuments.jsx |
| src/domain/construction-engine/index.js | 4 | src/domain/index.js<br>src/features/wbs/services/wbsService.js<br>src/services/constructionEngine.service.js<br>src/services/constructionSnapshot.service.js |
| src/features/auth/context/auth-context.js | 4 | src/features/auth/context/AuthContext.jsx<br>src/features/auth/guards/ProtectedRoute.jsx<br>src/features/auth/index.js<br>src/features/auth/pages/LoginPage.jsx |
| src/features/forecast/services/recoveryForecastService.js | 3 | src/features/projects/layouts/ProjectWorkspaceLayout.jsx<br>src/pages/project-workspace/ProjectDashboard.jsx<br>src/pages/project-workspace/ProjectForecast.jsx |
| src/features/auth/index.js | 2 | src/app/routes.jsx<br>src/main.jsx |
| src/domain/construction-intelligence/index.js | 2 | src/domain/construction-engine/constructionEngine.js<br>src/domain/index.js |
| src/domain/constructionSnapshot/constructionSnapshot.model.js | 2 | src/domain/constructionSnapshot/constructionSnapshot.engine.js<br>src/domain/constructionSnapshot/index.js |
| src/domain/project/project.model.js | 2 | src/domain/index.js<br>src/repositories/projectRepository.js |
| src/domain/constructionSnapshot/index.js | 2 | src/domain/index.js<br>src/services/constructionSnapshot.service.js |
| src/features/construction-workspace/services/activityMetrics.js | 2 | src/features/construction-workspace/services/activityHealth.js<br>src/features/construction-workspace/services/activityViewModel.js |
| src/services/constructionEngine.service.js | 2 | src/features/portfolio/services/portfolioExecutiveService.js<br>src/pages/project-workspace/ProjectDashboard.jsx |
| src/features/portfolio/repositories/projectRepository.js | 2 | src/features/portfolio/services/portfolioExecutiveService.js<br>src/features/portfolio/services/portfolioService.js |
| src/features/reports/services/executiveNotesService.js | 2 | src/features/reports/services/executiveReportService.js<br>src/pages/project-workspace/ProjectExecutiveNotes.jsx |
| src/shared/events/constructionEvents.js | 2 | src/features/wbs/services/wbsService.js<br>src/features/weekly/services/weeklyService.js |
| src/features/wbs/repositories/wbsRepository.js | 2 | src/features/wbs/services/wbsService.js<br>src/services/constructionSnapshot.service.js |
| src/features/wbs/services/wbsService.js | 2 | src/features/weekly/services/weeklyService.js<br>src/pages/project-workspace/ProjectWbs.jsx |
| src/styles/construction-workspace.css | 2 | src/pages/project-workspace/ConstructionWorkspace.jsx<br>src/pages/project-workspace/ProjectWeekly.jsx |
| src/app/routes.jsx | 1 | src/App.jsx |
| src/pages/Portfolio.jsx | 1 | src/app/routes.jsx |
| src/features/projects/layouts/ProjectWorkspaceLayout.jsx | 1 | src/app/routes.jsx |
| src/pages/project-workspace/ProjectDashboard.jsx | 1 | src/app/routes.jsx |
| src/pages/project-workspace/ConstructionWorkspace.jsx | 1 | src/app/routes.jsx |
| src/pages/project-workspace/ProjectWeekly.jsx | 1 | src/app/routes.jsx |
| src/pages/project-workspace/ProjectForecast.jsx | 1 | src/app/routes.jsx |
| src/pages/project-workspace/ProjectExecutiveNotes.jsx | 1 | src/app/routes.jsx |
| src/pages/project-workspace/ProjectDocuments.jsx | 1 | src/app/routes.jsx |
| src/pages/project-workspace/ProjectIssues.jsx | 1 | src/app/routes.jsx |
| src/pages/project-workspace/ProjectCommissioning.jsx | 1 | src/app/routes.jsx |
| src/pages/project-workspace/ProjectAnalytics.jsx | 1 | src/app/routes.jsx |


## 8. Accessi Supabase rilevati

Gli accessi presenti direttamente nelle pagine o in servizi applicativi sono candidati alla separazione in repository.

| File | Query .from() | Layer attuale |
| --- | --- | --- |
| src/features/forecast/services/recoveryForecastService.js | 10 | service |
| src/pages/project-workspace/ProjectWeekly.jsx | 10 | page |
| src/features/weekly/repositories/weeklyRepository.js | 7 | repository |
| src/pages/project-workspace/ConstructionWorkspace.jsx | 7 | page |
| src/features/construction-photos/services/photoService.js | 6 | service |
| src/features/wbs/import/excelImporter.js | 6 | altro |
| src/services/constructionEngine.service.js | 6 | service |
| src/features/construction-documents/repositories/documentRepository.js | 4 | repository |
| src/features/construction-workspace/services/activityWorkspaceService.js | 4 | service |
| src/features/portfolio/repositories/projectRepository.js | 4 | repository |
| src/features/reports/services/executiveReportService.js | 4 | service |
| src/features/wbs/repositories/wbsRepository.js | 4 | repository |
| src/features/construction-documents/services/documentService.js | 3 | service |
| src/features/reports/services/executiveNotesService.js | 3 | service |
| src/pages/project-workspace/ProjectForecast.jsx | 3 | page |
| src/features/auth/context/AuthContext.jsx | 1 | altro |
| src/features/projects/services/projectWorkspaceService.js | 1 | service |
| src/pages/project-workspace/ProjectDashboard.jsx | 1 | page |
| src/repositories/projectRepository.js | 1 | repository |
| src/services/constructionSnapshot.service.js | 1 | service |
| src/features/auth/repositories/authRepository.js | 0 | repository |


## 9. Indicatori di duplicazione

| Pattern | Occorrenze | File principali |
| --- | --- | --- |
| Supabase query | 86 | src/features/forecast/services/recoveryForecastService.js (10)<br>src/pages/project-workspace/ProjectWeekly.jsx (10)<br>src/features/weekly/repositories/weeklyRepository.js (7)<br>src/pages/project-workspace/ConstructionWorkspace.jsx (7)<br>src/features/construction-photos/services/photoService.js (6)<br>src/features/wbs/import/excelImporter.js (6)<br>src/services/constructionEngine.service.js (6)<br>src/features/construction-documents/repositories/documentRepository.js (4) |
| Promise.all | 7 | src/features/reports/services/executiveReportService.js (2)<br>src/features/construction-workspace/services/activityWorkspaceService.js (1)<br>src/features/weekly/hooks/useWeeklyWorkspace.js (1)<br>src/features/weekly/services/weeklyService.js (1)<br>src/pages/project-workspace/ProjectForecast.jsx (1)<br>src/services/constructionEngine.service.js (1) |
| Loading state | 23 | src/pages/project-workspace/ConstructionWorkspace.jsx (3)<br>src/pages/project-workspace/ProjectDashboard.jsx (3)<br>src/pages/project-workspace/ProjectWeekly.jsx (3)<br>src/features/auth/context/AuthContext.jsx (2)<br>src/features/construction-documents/ActivityDocuments.jsx (2)<br>src/features/construction-photos/ActivityPhotos.jsx (2)<br>src/features/weekly/hooks/useWeeklyWorkspace.js (2)<br>src/pages/project-workspace/ProjectExecutiveNotes.jsx (2) |
| Error state | 42 | src/pages/Portfolio.jsx (9)<br>src/features/construction-photos/ActivityPhotos.jsx (8)<br>src/pages/project-workspace/ProjectWbs.jsx (8)<br>src/features/construction-documents/ActivityDocuments.jsx (7)<br>src/features/weekly/hooks/useWeeklyWorkspace.js (4)<br>src/pages/project-workspace/ProjectExecutiveNotes.jsx (4)<br>src/features/auth/pages/LoginPage.jsx (2) |
| Alert gestione errori | 16 | src/pages/project-workspace/ProjectForecast.jsx (10)<br>src/pages/project-workspace/ProjectWeekly.jsx (3)<br>src/pages/project-workspace/ConstructionWorkspace.jsx (2)<br>src/pages/project-workspace/ProjectWbs.jsx (1) |
| Number normalization | 241 | src/pages/project-workspace/ProjectForecast.jsx (40)<br>src/pages/Portfolio.jsx (14)<br>src/features/wbs/repositories/wbsRepository.js (13)<br>src/pages/project-workspace/ProjectWeekly.jsx (13)<br>src/pages/project-workspace/ConstructionWorkspace.jsx (11)<br>src/features/forecast/services/recoveryForecastService.js (9)<br>src/features/portfolio/repositories/projectRepository.js (8)<br>src/features/construction-workspace/services/activityMetrics.js (7) |
| Date construction | 81 | src/domain/reporting/executiveReportEngine.js (14)<br>src/services/constructionEngine.service.js (11)<br>src/features/forecast/services/recoveryForecastService.js (7)<br>src/pages/project-workspace/ProjectForecast.jsx (7)<br>src/pages/project-workspace/ProjectExecutiveNotes.jsx (5)<br>src/domain/construction-intelligence/progress.engine.js (4)<br>src/features/weekly/repositories/weeklyRepository.js (4)<br>src/features/forecast/excel/recoveryExcelService.js (3) |
| Locale date formatting | 2 | src/features/reports/renderers/weeklyManagementPptRenderer.js (1)<br>src/pages/project-workspace/ProjectExecutiveNotes.jsx (1) |
| Weekly status literals | 71 | src/domain/workflows/weeklyWorkflow.js (31)<br>src/pages/project-workspace/ProjectWeekly.jsx (12)<br>src/features/forecast/services/recoveryForecastService.js (4)<br>src/features/reports/services/executiveNotesService.js (4)<br>src/features/weekly/services/weeklyService.js (4)<br>src/pages/project-workspace/ProjectForecast.jsx (4)<br>src/services/constructionEngine.service.js (4)<br>src/pages/project-workspace/ProjectExecutiveNotes.jsx (3) |
| Activity mapping | 63 | src/pages/project-workspace/ProjectForecast.jsx (9)<br>src/features/reports/renderers/weeklyManagementPptRenderer.js (7)<br>src/pages/project-workspace/ConstructionWorkspace.jsx (7)<br>src/pages/project-workspace/ProjectWeekly.jsx (6)<br>src/services/constructionEngine.service.js (5)<br>src/pages/project-workspace/ProjectDashboard.jsx (4)<br>src/pages/project-workspace/ProjectExecutiveNotes.jsx (3)<br>src/pages/project-workspace/ProjectWbs.jsx (3) |
| XLSX utilities | 18 | src/features/forecast/excel/recoveryExcelService.js (6)<br>src/features/weekly/excel/weeklyExcelService.js (6)<br>src/features/wbs/import/templateDownloader.js (5)<br>src/features/wbs/import/excelParser.js (1) |


## 10. CSS più grandi

| File | Righe | Byte |
| --- | --- | --- |
| src/styles/construction-workspace.css | 1471 | 27082 |
| src/styles/dashboard.css | 702 | 12392 |
| src/styles/wbs.css | 536 | 9205 |
| src/styles/portfolio.css | 526 | 9067 |
| src/styles/forecast.css | 447 | 8054 |
| src/styles/executive-notes.css | 415 | 7659 |
| src/features/control-room/control-room.css | 379 | 6207 |
| src/styles/weekly.css | 290 | 5102 |
| src/App.css | 185 | 2891 |
| src/styles/ui.css | 164 | 2884 |
| src/styles/project-workspace.css | 153 | 2615 |
| src/index.css | 112 | 2169 |
| src/styles/global.css | 30 | 568 |


## 11. Selettori CSS presenti in più file

| Selettore | Numero file | File |
| --- | --- | --- |
| 163 | 10 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/executive-notes.css<br>src/styles/forecast.css<br>src/styles/portfolio.css<br>src/styles/project-workspace.css<br>src/styles/ui.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| 184 | 10 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/executive-notes.css<br>src/styles/forecast.css<br>src/styles/portfolio.css<br>src/styles/project-workspace.css<br>src/styles/ui.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| 23 | 10 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/executive-notes.css<br>src/styles/forecast.css<br>src/styles/portfolio.css<br>src/styles/project-workspace.css<br>src/styles/ui.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| 0 | 10 | src/features/control-room/control-room.css<br>src/index.css<br>src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css<br>src/styles/portfolio.css<br>src/styles/project-workspace.css<br>src/styles/ui.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| 42 | 10 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/executive-notes.css<br>src/styles/forecast.css<br>src/styles/portfolio.css<br>src/styles/project-workspace.css<br>src/styles/ui.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| 6 | 7 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/executive-notes.css<br>src/styles/forecast.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| 197 | 7 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css<br>src/styles/portfolio.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| 94 | 7 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css<br>src/styles/portfolio.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| border: 1px solid rgba(148 | 6 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| 5vw | 6 | src/features/control-room/control-room.css<br>src/styles/dashboard.css<br>src/styles/portfolio.css<br>src/styles/project-workspace.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| minmax(0 | 6 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/executive-notes.css<br>src/styles/forecast.css<br>src/styles/portfolio.css<br>src/styles/wbs.css |
| 68 | 5 | src/features/control-room/control-room.css<br>src/styles/dashboard.css<br>src/styles/portfolio.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| 158 | 5 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css<br>src/styles/portfolio.css |
| 11 | 5 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css<br>src/styles/portfolio.css |
| rgba(15 | 5 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/executive-notes.css<br>src/styles/forecast.css |
| rgba(2 | 5 | src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| 189 | 5 | src/styles/construction-workspace.css<br>src/styles/executive-notes.css<br>src/styles/forecast.css<br>src/styles/portfolio.css<br>src/styles/weekly.css |
| 248 | 5 | src/styles/construction-workspace.css<br>src/styles/executive-notes.css<br>src/styles/forecast.css<br>src/styles/portfolio.css<br>src/styles/weekly.css |
| 130 | 5 | src/styles/construction-workspace.css<br>src/styles/global.css<br>src/styles/portfolio.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| 246 | 5 | src/styles/construction-workspace.css<br>src/styles/global.css<br>src/styles/portfolio.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| 113 | 5 | src/styles/construction-workspace.css<br>src/styles/forecast.css<br>src/styles/portfolio.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg | 4 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| #38bdf8 | 4 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| display: grid; grid-template-columns: repeat(4 | 4 | src/features/control-room/control-room.css<br>src/styles/dashboard.css<br>src/styles/portfolio.css<br>src/styles/wbs.css |
| 255 | 4 | src/index.css<br>src/styles/dashboard.css<br>src/styles/portfolio.css<br>src/styles/ui.css |
| 235 | 4 | src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css<br>src/styles/project-workspace.css |
| 165 | 4 | src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css<br>src/styles/portfolio.css |
| 29 | 4 | src/styles/construction-workspace.css<br>src/styles/executive-notes.css<br>src/styles/forecast.css<br>src/styles/portfolio.css |
| grid-template-columns: repeat(2 | 4 | src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css<br>src/styles/portfolio.css |
| transparent 34%) | 4 | src/styles/dashboard.css<br>src/styles/global.css<br>src/styles/wbs.css<br>src/styles/weekly.css |
| border-color: rgba(34 | 3 | src/features/control-room/control-room.css<br>src/styles/dashboard.css<br>src/styles/wbs.css |
| display: grid; grid-template-columns: minmax(0 | 3 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/dashboard.css |
| display: grid; grid-template-columns: repeat(5 | 3 | src/features/control-room/control-room.css<br>src/styles/construction-workspace.css<br>src/styles/portfolio.css |
| background: rgba(239 | 3 | src/features/control-room/control-room.css<br>src/styles/portfolio.css<br>src/styles/wbs.css |
| 59 | 3 | src/index.css<br>src/styles/construction-workspace.css<br>src/styles/forecast.css |
| 0.94) | 3 | src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css |
| rgba(37 | 3 | src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css |
| 99 | 3 | src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css |
| 0.12) | 3 | src/styles/construction-workspace.css<br>src/styles/forecast.css<br>src/styles/wbs.css |
| width: 100%; box-sizing: border-box; border: 1px solid rgba(148 | 3 | src/styles/construction-workspace.css<br>src/styles/executive-notes.css<br>src/styles/forecast.css |
| border-color: rgba(56 | 3 | src/styles/construction-workspace.css<br>src/styles/executive-notes.css<br>src/styles/forecast.css |
| border-color: rgba(96 | 3 | src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css |
| 250 | 3 | src/styles/construction-workspace.css<br>src/styles/dashboard.css<br>src/styles/forecast.css |
| transparent 32%) | 3 | src/styles/executive-notes.css<br>src/styles/project-workspace.css<br>src/styles/ui.css |
| display: grid; grid-template-columns: repeat(2 | 3 | src/styles/executive-notes.css<br>src/styles/portfolio.css<br>src/styles/wbs.css |
| 0.14) | 3 | src/styles/global.css<br>src/styles/ui.css<br>src/styles/weekly.css |
| background: rgba(148 | 3 | src/styles/portfolio.css<br>src/styles/project-workspace.css<br>src/styles/wbs.css |
| .counter | 2 | src/App.css<br>src/index.css |
| 0.18); background: rgba(2 | 2 | src/features/control-room/control-room.css<br>src/styles/weekly.css |
| border-color: rgba(239 | 2 | src/features/control-room/control-room.css<br>src/styles/dashboard.css |


## 12. Interpretazione architetturale

Questo documento raccoglie segnali quantitativi. Prima di ogni estrazione o spostamento di codice sarà necessario verificare:

1. responsabilità effettiva del modulo;
2. contratti dati in ingresso e uscita;
3. dipendenze da Supabase, Auth e RLS;
4. utilizzo del Construction Snapshot;
5. eventuali calcoli duplicati nel Reporting Engine;
6. compatibilità con i dati esistenti;
7. impatto sul caricamento iniziale e sui chunk Vite.
