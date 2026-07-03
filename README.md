# 🎯 BetTrack

Gerenciador de apostas esportivas pessoal com controle de bankroll, histórico de apostas e relatórios.

## ✨ Funcionalidades

- **Dashboard** — Visão geral do bankroll com saldo total e por casa
- **Casas de Apostas** — Gerenciamento de contas com saldos individuais
- **Histórico** — Registro completo de todas as apostas com filtros
- **Relatórios** — Análise de desempenho com gráficos
- **Check-in de Contas** — Controle diário de logins nas casas
- **Fundos** — Gerenciamento de depósitos e saques (Mercado Pago)
- **Login com Google** — Autenticação via Firebase Auth

## 🛠️ Tecnologias

- HTML, CSS, JavaScript (Vanilla)
- Firebase Authentication (Google Sign-In)
- Cloud Firestore (banco de dados)
- Firebase Hosting

## 🚀 Configuração

1. Clone o repositório:
   ```bash
   git clone https://github.com/BKB06/bettrack.git
   cd bettrack
   ```

2. Crie seu projeto no [Firebase Console](https://console.firebase.google.com/)

3. Copie o arquivo de configuração e preencha com suas credenciais:
   ```bash
   cp firebase-config.example.js firebase-config.js
   ```

4. Edite `firebase-config.js` com as credenciais do seu projeto Firebase (encontre em: Firebase Console → Configurações do Projeto → Seus apps → Config)

5. Configure as **Firestore Security Rules** no Firebase Console para proteger os dados dos usuários

6. Abra `index.html` no navegador ou faça deploy com Firebase Hosting:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy
   ```

## 📁 Estrutura

```
├── index.html              # Dashboard principal
├── casas.html              # Gerenciamento de casas de apostas
├── historico.html           # Histórico de apostas
├── relatorio.html           # Relatórios e análises
├── logins.html              # Check-in diário de contas
├── fundos.html              # Controle de fundos
├── 404.html                 # Página de erro
├── app.js                   # Lógica principal e camada de dados
├── firebase-config.example.js  # Template de configuração Firebase
├── styles.css               # Estilos globais
├── firebase.json            # Configuração do Firebase Hosting
└── .firebaserc              # Projeto Firebase vinculado
```

## 📝 Licença

Este projeto é de uso pessoal. Sinta-se livre para usar como referência.
