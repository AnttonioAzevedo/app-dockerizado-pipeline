# app-dockerizado-pipeline

API REST em Node.js + Express para gerenciamento de tasks, containerizada
e com pipeline de CI/CD (GitHub Actions → GHCR).

## Como funciona

Todo `push` na branch `main` roda os testes automaticamente e, se
passarem, builda e publica uma nova imagem Docker pronta para deploy.

## Stack

- Node.js 20 + Express
- Testes: `node:test` (nativo) + `supertest`
- Docker (multi-stage build, runtime non-root)
- CI/CD: GitHub Actions + GitHub Container Registry (GHCR)

## Endpoints

| Método | Rota | Resposta |
|---|---|---|
| GET | `/health` | `{ status: "ok", uptime }` |
| GET | `/tasks` | lista de tasks |
| POST | `/tasks` | cria task (body `{ title }`), retorna 201 |
| GET | `/tasks/:id` | task ou 404 |
| DELETE | `/tasks/:id` | 204 ou 404 |

Configuração via variável de ambiente `PORT` (default `3000`).

## Rodando localmente

```bash
npm install
npm start
# ou, para rodar os testes:
npm test
```

## Rodando via Docker

```bash
docker build -t app-dockerizado-pipeline .
docker run --rm -p 3000:3000 app-dockerizado-pipeline
curl http://localhost:3000/health
```

## Pipeline CI/CD

```
push/PR → npm test
            │
            └─ (se push em main e testes passarem)
                  → build da imagem Docker
                  → push para ghcr.io/<owner>/app-dockerizado-pipeline
                     (tags: latest e <sha curto>)
```

## Nota: `node_modules` entre stages

O Dockerfile copia `node_modules` do stage `deps` para o stage final em vez
de rodar `npm ci --omit=dev` novamente no stage final. Isso é seguro porque
todas as dependências de produção (Express) são puro-JS, sem binários
nativos. Se uma dependência com binário nativo (ex.: `bcrypt`, `sharp`) for
adicionada no futuro, trocar para instalar as dependências diretamente no
stage final, pois binários compilados podem não ser compatíveis entre as
imagens usadas em cada stage.

## Fora de escopo

- Banco de dados / persistência
- Autenticação, rate limiting
- Deploy em cluster / Kubernetes
- Healthcheck do Docker / orquestração
