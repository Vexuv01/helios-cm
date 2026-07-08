# HELIOS CM Enterprise — Alpha Readiness Audit

## Obiettivo
Verificare se HELIOS è pronto per diventare una Alpha pubblicabile e utilizzabile realmente su helios.vexuvo.com.

## Criteri Alpha
- Build verde
- Lint verde
- Supabase unica fonte dati
- Nessun dato hardcoded operativo
- Construction Workspace centrale
- WBS reale
- Weekly reale
- Foto reali
- Repository/Service separati dalla UI
- UX fluida per uso quotidiano PM Construction
- Deploy Vercel ready

## Workspaces ufficiali
1. Portfolio
2. Control Room
3. Construction Workspace
4. Document Control

## Stato funzionale
| Area | Stato |
|---|---|
| Portfolio | Ready |
| Control Room | Ready |
| Construction Workspace | In Alpha |
| WBS reale | Ready |
| Weekly reale | Ready |
| Photos | In Alpha |
| Document Control | Mancante |
| Issue Register | Mancante |
| Decision Log | Mancante |
| Login reale | Da consolidare |
| Deploy Vercel | Da finalizzare |

## Priorità tecniche prima della pubblicazione
1. Document Control reale
2. Issue Register reale
3. Decision Log reale
4. Hardening UX
5. Ruoli/login reali
6. Deploy Vercel + dominio
7. Test con dati reali di progetto

## Decisione CTO
Da ora ogni sprint deve:
- aggiungere valore operativo reale;
- non creare pagine inutili;
- ruotare attorno alla WBS activity;
- usare Supabase;
- essere buildabile e committabile;
- essere orientato al deploy.
