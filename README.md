# 🎯 BetTrack

[![Qualidade](https://github.com/BKB06/bettrack/actions/workflows/ci.yml/badge.svg)](https://github.com/BKB06/bettrack/actions/workflows/ci.yml)

Gerenciador pessoal de banca e apostas esportivas, com autenticação Google e sincronização pelo Firebase.

> O BetTrack é uma ferramenta de organização. Ele não recomenda apostas nem garante resultados financeiros.

## Funcionalidades

- dashboard de patrimônio, exposição e desempenho;
- cadastro de casas e controle de saldo;
- registro de apostas, incluindo freebets e importação de cupom por OCR;
- liquidação, reversão, filtros e calendário do histórico;
- depósitos, saques e transferências entre contas;
- relatório de ROI, taxa de acerto e evolução da banca;
- check-in diário nas casas de aposta;
- dados isolados por usuário autenticado.

## Tecnologias

- HTML, CSS e JavaScript sem framework;
- Firebase Authentication e Cloud Firestore;
- Firebase Hosting;
- Node.js apenas para build, validação e testes;
- GitHub Actions para integração contínua.

## Começando

### Pré-requisitos

- Node.js 20 ou superior;
- um projeto no [Firebase Console](https://console.firebase.google.com/);
- Google como provedor habilitado em **Authentication → Sign-in method**.

### Instalação

```bash
git clone https://github.com/BKB06/bettrack.git
cd bettrack
npm install
cp firebase-config.example.js firebase-config.js
```

Preencha `firebase-config.js` com a configuração web exibida em **Configurações do projeto → Seus apps**. Não coloque chaves de conta de serviço nesse arquivo.

Depois, inicie o ambiente local:

```bash
npm run dev
```

Abra `http://127.0.0.1:4173`. O servidor local entrega somente o conteúdo de `dist/`; não abra os arquivos HTML diretamente, pois a autenticação precisa de uma origem autorizada.

No Firebase, adicione `127.0.0.1` aos domínios autorizados do Authentication. Adicione também `localhost` se usar esse endereço durante o desenvolvimento. Publique as regras do Firestore antes de usar dados reais.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Gera e serve o site localmente. |
| `npm run build` | Cria em `dist/` somente os arquivos permitidos no deploy. |
| `npm run check` | Valida JavaScript, páginas e configuração de publicação. |
| `npm test` | Executa os testes das regras de negócio. |
| `npm run validate` | Executa todas as verificações usadas na integração contínua. |

## Publicação no Firebase

Valide o projeto antes do deploy:

```bash
npm run validate
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,hosting
```

O `firebase.json` publica exclusivamente `dist/`. Isso é uma barreira de segurança importante: a raiz do repositório, o histórico Git, arquivos de teste e configurações locais não podem ser enviados ao Hosting.

Também é possível gerar `firebase-config.js` durante o build usando estas variáveis:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID` (opcional)

## Estrutura

```text
├── *.html                 # Telas do produto
├── app.js                 # Firebase e interface compartilhada
├── core.js                # Regras puras, validação e normalização
├── firebase-client.js     # Inicialização versionada do Firebase
├── styles.css             # Design system e responsividade
├── scripts/               # Build, servidor local e verificações
├── tests/                 # Testes automatizados
├── firestore.rules        # Isolamento de dados por UID
├── firebase.json          # Hosting seguro e regras
├── docs/ROADMAP.md        # Melhorias planejadas
└── .github/               # CI e modelo de pull request
```

## Segurança e contribuição

- Leia [SECURITY.md](SECURITY.md) para relatar vulnerabilidades de forma privada.
- Leia [CONTRIBUTING.md](CONTRIBUTING.md) antes de enviar uma pull request.
- Consulte a [lista priorizada de melhorias](docs/ROADMAP.md).

## Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE).
