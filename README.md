# BigQuery Release Notes Viewer & Share App

Uma aplicação web completa construída com **Python Flask** no back-end e **HTML, CSS (Vanilla) e JavaScript** puros no front-end. O projeto coleta em tempo real o feed oficial de notas de atualização (release notes) do Google Cloud BigQuery, formata-as de maneira elegante e permite compartilhá-las instantaneamente no Twitter/X.

## 🚀 Funcionalidades

- **Coleta em Tempo Real:** Faz o parse do feed Atom XML oficial do BigQuery da Google Cloud.
- **Visualização Premium (Dark Mode):** Interface moderna com glassmorphism (efeito de vidro), transições fluidas e visual escuro nativo.
- **Filtros e Busca Dinâmica:**
  - Busca de texto instantânea por título e conteúdo.
  - Tags/filtros dinâmicos baseados no tipo de atualização (*Feature*, *Announcement*, *Issue*, *Breaking Change*, etc.).
- **Visualização Detalhada:** Cada nota pode ser expandida individualmente na interface para leitura do conteúdo HTML nativo.
- **Rascunho de Tweet Simplificado:** Abre um compositor de Tweets flutuante para a nota selecionada, formatado de forma limpa (limite de 280 caracteres), apontando a URL de referência e permitindo postar no X com um clique.

## 🛠️ Tecnologias Utilizadas

- **Back-end:** Python 3.11+, Flask
- **Front-end:** HTML5 semântico, Vanilla CSS (estilos personalizados), JavaScript moderno (ES6)
- **Integração Externa:** Requests (para requisição do XML), XML ElementTree (para parsing), Twitter/X Web Intents

## 📋 Pré-requisitos

Certifique-se de possuir o Python instalado em seu computador.

## 🔧 Instalação e Execução Local

1. Clone o repositório ou navegue até a pasta do projeto:
   ```bash
   cd bq-release-notes
   ```

2. Instale as dependências listadas no `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```

3. Inicie o servidor Flask:
   ```bash
   python app.py
   ```

4. Acesse o aplicativo no seu navegador pelo endereço:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

## 📂 Estrutura do Projeto

```text
bq-release-notes/
├── app.py                  # Servidor Flask e parseador do Feed XML
├── requirements.txt        # Dependências do projeto (Flask, requests)
├── .gitignore              # Configuração de arquivos ignorados pelo Git
├── README.md               # Instruções gerais do projeto (Este arquivo)
├── templates/
│   └── index.html          # Template HTML principal
└── static/
    ├── app.js              # Lógica de renderização, filtros e modal no client-side
    └── style.css           # Estilização completa e temas visuais
```
