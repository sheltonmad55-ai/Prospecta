# Fluxos do utilizador

```mermaid
flowchart TD
 A[Página inicial] --> B[Criar conta / Entrar / Demo]
 B --> C[Perfil comercial]
 C --> D[Escolher zona e categoria]
 D --> E[Pesquisa assíncrona]
 E --> F[Resultados e origem]
 F --> G[Ficha da empresa]
 G --> H[Reservar 1 crédito e analisar]
 H --> I{Resultado válido?}
 I -->|Sim| J[Guardar análise e consumir crédito]
 I -->|Falha definitiva| K[Libertar reserva]
 J --> L[Editar e guardar mensagem]
 L --> M[Copiar / Abrir WhatsApp se houver telefone]
 G --> N[Guardar oportunidade]
 M --> N
 N --> O[Etapa / Notas / Seguimento]
```

Privacidade: Conta → Exportar → Descarregar JSON; ou Conta → Pedir eliminação → Administração → Processar. A eliminação remove os dados privados da conta; o catálogo partilhado autorizado permanece.

Não contacto: Ficha → Motivo → Bloqueio no espaço. Correcção: Ficha → Sinalizar → Administração → Rever. A revisão sinaliza que o pedido foi lido; a alteração do catálogo requer reimportação autorizada da linha corrigida.

Recuperação demo: pedir na entrada, consultar caixa local pela conta ainda autenticada ou pelo operador com scripts/outbox.ts, abrir ligação e definir nova palavra-passe. Produção: depende do serviço de autenticação e correio configurados.
