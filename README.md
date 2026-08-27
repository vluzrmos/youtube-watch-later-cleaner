# 🧹 YouTube Watch Later Cleaner (Extensão Chrome)

Uma extensão moderna, rápida e segura para Google Chrome (Manifest V3) que automatiza a limpeza completa da lista **"Assistir mais tarde"** (`Watch Later`) do YouTube com apenas 1 clique.

![Extensão Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-red?style=flat-square&logo=googlechrome)
![YouTube Compatible](https://img.shields.io/badge/YouTube-Ready-FF0000?style=flat-square&logo=youtube)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## ✨ Recursos

- 🚀 **1-Clique para Limpar**: Remove todos os vídeos da lista automaticamente sem necessidade de clicar item por item.
- 📜 **Auto-Scroll Inteligente**: Faz scroll automático para carregar os vídeos seguintes da playlist até esvaziar toda a lista.
- ⚡ **Velocidade Ajustável**: Controle o intervalo entre as remoções (Rápido: 0.5s, Normal: 1.0s, Seguro: 1.5s) para evitar bloqueios do YouTube.
- 🛑 **Controle Total**: Pause ou interrompa o processo a qualquer momento.
- 🌐 **Suporte Multilíngue**: Reconhece opções do YouTube em Português, Inglês, Espanhol, Francês, Alemão e outros idiomas.
- 🎨 **Interface Premium**: Popup elegante em modo escuro com contador em tempo real e botão integrado diretamente na página do YouTube.

---

## 📥 Como Instalar no Google Chrome (ou Brave / Edge / Opera)

1. Abra o navegador Google Chrome (ou qualquer navegador baseado em Chromium como Brave, Edge ou Opera).
2. Acesse a página de extensões digitando na barra de endereços:
   ```text
   chrome://extensions
   ```
3. No canto superior direito, ative a chave **"Modo do desenvolvedor"** (Developer Mode).
4. Clique no botão **"Carregar sem compactação"** (Load unpacked) no canto superior esquerdo.
5. Selecione a pasta deste projeto:
   ```text
   /home/vluzrmos/Projects/youtube-watch-later-cleaner
   ```
6. Pronto! O ícone da extensão aparecerá na sua barra de extensões do Chrome.

---

## 🎯 Como Usar

1. Acesse sua playlist do YouTube **Assistir mais tarde**:
   👉 [https://www.youtube.com/playlist?list=WL](https://www.youtube.com/playlist?list=WL)
2. Você pode iniciar a limpeza de duas formas:
   - **Opção A (Pelo Popup)**: Clique no ícone da extensão na barra do navegador, ajuste a velocidade desejada e clique em **"Iniciar Limpeza"**.
   - **Opção B (Direto na Página)**: Clique no botão vermelho **"Limpar Assistir Mais Tarde"** injetado logo no topo da playlist.
3. A extensão irá percorrer os vídeos, abrindo o menu e clicando em remover automaticamente. Você pode acompanhar a contagem em tempo real pelo toast no canto da tela ou no popup.
4. Para parar a qualquer momento, clique em **"Interromper"** ou **"Parar"**.

---

## 📂 Estrutura do Projeto

```
youtube-watch-later-cleaner/
├── manifest.json         # Configurações do Manifest V3 da extensão
├── icons/                # Ícones da extensão em 16x16, 48x48 e 128x128
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── popup/                # Interface do popup da barra de ferramentas
│   ├── popup.html        # Estrutura visual do popup
│   ├── popup.css         # Estilização moderna e responsiva
│   └── popup.js          # Controle de eventos, comunicação e delay
├── content/              # Script injetado no YouTube
│   ├── content.js        # Automação de cliques, scroll e remoções
│   └── content.css       # Estilização do toast e botão in-page
└── README.md             # Documentação e instruções de uso
```

---

## 🔒 Privacidade & Segurança

- A extensão opera 100% localmente no seu navegador.
- Não coleta dados pessoais, senhas nem informações de navegação.
- Não realiza requisições para servidores externos.
