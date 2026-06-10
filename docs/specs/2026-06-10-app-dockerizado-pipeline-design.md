# Design — `app-dockerizado-pipeline`

**Data:** 2026-06-10
**Repo:** 1 de 3 do portfólio DevOps freelance
**Status:** aprovado, pronto para plano de implementação

---

## Objetivo

Demonstrar a capacidade de containerizar uma aplicação do zero e automatizar
seu ciclo de build e entrega via CI/CD. A narrativa para o cliente:

> "Automatizo o ciclo de build e entrega de aplicações via container,
> garantindo que qualquer push gere uma imagem pronta para uso."

O foco do repo é **Docker + pipeline**, não o app. O app existe para ter algo
real para containerizar e testar, mas é deliberadamente enxuto.

## Decisões (tomadas no brainstorming)

| Decisão | Escolha | Motivo |
|---|---|---|
| Stack do app | Node.js 20 + Express | Comum em vagas de startup; multi-stage clássico |
| Testes | `node:test` (nativo) + `supertest` | Zero dependência de runner externo; testa app sem socket |
| Registry | GitHub Container Registry (GHCR), imagem pública | Gratuito para imagem pública; `GITHUB_TOKEN` sem secret manual |
| Escopo do app | API REST mini: `/health` + CRUD in-memory `/tasks` | Real o bastante para teste de verdade, simples o bastante para não roubar o foco |
| Persistência | Nenhuma (in-memory) | Banco é o tema do Repo 3 (docker-compose); aqui inflaria escopo |

## Arquitetura

### Estrutura de pastas

```
app-dockerizado-pipeline/
├── src/
│   ├── app.js              # cria e exporta a app Express (SEM listen) → testável
│   ├── server.js           # bootstrap: importa app + listen na PORT
│   └── routes/tasks.js     # router do CRUD in-memory de /tasks
├── test/
│   └── tasks.test.js       # health + CRUD via supertest
├── Dockerfile              # multi-stage: deps → runtime non-root
├── .dockerignore
├── .gitignore
├── .github/workflows/ci.yml
├── package.json
├── docs/specs/             # este documento
└── README.md
```

### Unidades e responsabilidades

- **`src/app.js`** — monta a instância Express, registra middlewares (JSON parser)
  e rotas, e **exporta** a app. Não chama `listen`. Isso é o que permite ao
  supertest injetar requests direto no objeto, sem abrir porta TCP.
- **`src/server.js`** — único ponto que faz I/O de rede: importa `app` e chama
  `app.listen(process.env.PORT || 3000)`. É o `CMD` do container.
- **`src/routes/tasks.js`** — `express.Router` com o CRUD. Estado em um array/Map
  em memória, encapsulado no módulo (não exposto globalmente).

### Endpoints

| Método | Rota | Resposta |
|---|---|---|
| GET | `/health` | `{ status: "ok", uptime }` |
| GET | `/tasks` | lista de tasks |
| POST | `/tasks` | cria task (body `{ title }`), retorna 201 |
| GET | `/tasks/:id` | task ou 404 |
| DELETE | `/tasks/:id` | 204 ou 404 |

Configuração via env: `PORT` (default 3000) — segue 12-factor.

## Dockerfile (multi-stage)

- **Stage `deps`** (`node:20-alpine`): copia `package*.json`, roda
  `npm ci --omit=dev` para instalar só dependências de produção.
- **Stage final** (`node:20-alpine`): copia `node_modules` do stage `deps` e o
  `src/`, cria e usa um usuário não-root, `EXPOSE 3000`,
  `CMD ["node", "src/server.js"]`.

**Trade-off consciente:** copiar `node_modules` entre stages assume mesma
arquitetura/libc entre build e runtime. Seguro aqui porque todas as dependências
são puro-JS (Express). Se no futuro entrar dependência com binário nativo
(bcrypt, sharp), trocar para `npm ci --omit=dev` dentro do stage final. Isso
fica registrado no README como decisão consciente.

`.dockerignore` exclui: `node_modules`, `.git`, `test`, `*.md`, `.github`.

## Pipeline — `.github/workflows/ci.yml`

Dois jobs:

1. **`test`** — dispara em todo `push` e `pull_request`:
   checkout → `setup-node@v4` (cache npm) → `npm ci` → `npm test`.

2. **`build-and-push`** — só em `push` na branch `main`, com `needs: test`
   (não publica imagem se o teste falhar):
   - `permissions: { contents: read, packages: write }`
   - login no GHCR via `docker/login-action` usando `${{ github.actor }}` e
     `${{ secrets.GITHUB_TOKEN }}`
   - `docker/metadata-action` gera tags: `latest` e o `sha` curto do commit
   - `docker/build-push-action` builda e dá push para
     `ghcr.io/<owner>/app-dockerizado-pipeline`

## Testes

`test/tasks.test.js` com `node:test` + `supertest`, importando `src/app.js`:

- `GET /health` retorna 200 e `status: "ok"`
- `POST /tasks` cria e retorna 201 com id
- `GET /tasks` lista a task criada
- `GET /tasks/:id` inexistente retorna 404
- `DELETE /tasks/:id` retorna 204 e some da lista

## README

Cobre: o problema que resolve, como rodar local (`npm install && npm start` e
via `docker build`/`docker run`), como o pipeline funciona (diagrama do fluxo
push → test → build → push GHCR), e a stack usada. Inclui a nota do trade-off
do `node_modules` cross-stage.

## Fora de escopo (YAGNI)

- Banco de dados / persistência (Repo 3)
- Autenticação, rate limiting (não agrega à narrativa deste repo)
- Deploy em cluster / Kubernetes (Repo 2)
- Healthcheck do Docker / orquestração (Repo 2 e 3)
