# Modelo de dados

O esquema local executável está em src/server/db.ts, migração 1 em migrations. Os IDs de contas, tarefas e oportunidades são UUID. Negócios demonstrativos usam identificadores estáveis; importações usam hash da fonte e sourceId.

| Grupo | Tabelas |
|---|---|
| Acesso | users, workspaces, sessions, auth_tokens, outbox, provider_sessions |
| Catálogo | locations, businesses |
| Descoberta | searches |
| Execução | jobs |
| Créditos | credit_entries |
| Comercial | analyses, leads, activities |
| Qualidade e privacidade | suppressions, corrections, privacy_requests, audit_events |
| Controlo de frequência | rate_limits |

Evidências, tarefas geográficas e resultados da IA são JSON validados, embutidos nos registos correspondentes. O esquema foi simplificado em relação ao plano conceptual inicial; não há tabelas separadas para todos os campos de evidência, facturação ou equipas.

Cada workspace pertence a um utilizador no MVP. Leads são únicos por workspace/business. Actividades referenciam workspace/lead numa FK composta. Análises, mensagens e pesquisas consultam sempre o workspace da sessão. Os créditos têm eventos grant, reserve, consume e release; cada job/kind é único.

Disponível = grant − reserve + release. Reservado = reserve − release − consume. Gasto = consume. O débito final não volta a reduzir disponível, porque a reserva já o fez.

Montantes são inteiros em centavos de MZN e opcionais. Datas persistem como ISO UTC; a interface mostra Africa/Maputo. O catálogo de negócios não contém notas ou avaliações comerciais privadas dos utilizadores.

supabase/migrations contém uma fundação PostgreSQL com RLS e RPC de reserva. Ainda exige adaptador, conclusão/libertação transaccionais e testes contra PostgreSQL real antes de substituir o SQLite. Não foi aplicada nem certificada por testes de RLS nesta entrega.
