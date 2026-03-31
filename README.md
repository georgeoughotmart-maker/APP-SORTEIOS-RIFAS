# Sorteio Inteligente 🎯

Um aplicativo moderno e responsivo para gerenciamento de rifas e sorteios, desenvolvido com React, Tailwind CSS e Framer Motion.

## 🚀 Funcionalidades

- **Grade de Números**: Visualização clara de números disponíveis, reservados e sorteados.
- **Reserva de Números**: Participantes podem escolher seus números e preencher nome/telefone.
- **Modo Administrador**:
  - Acesso protegido por senha (`admin123`).
  - Visualização de dados privados dos participantes.
  - Configuração do sorteio (total de números, descrição do prêmio, valor e imagem).
  - Cancelamento de reservas.
  - Realização do sorteio com prioridade para números reservados.
- **Persistência Local**: Todos os dados são salvos no navegador (`localStorage`).
- **Design Responsivo**: Funciona perfeitamente em celulares e computadores.

## 🛠️ Tecnologias

- **React 19**
- **Tailwind CSS 4**
- **Lucide React** (Ícones)
- **Framer Motion** (Animações)
- **Vite** (Build Tool)

## 📦 Como rodar localmente

1. Clone o repositório:
   ```bash
   git clone <url-do-seu-repositorio>
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 🌐 Como subir no GitHub

1. Crie um novo repositório no GitHub.
2. No seu terminal, dentro da pasta do projeto:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <url-do-seu-repositorio-github>
   git push -u origin main
   ```

## ⚡ Como subir na Vercel

1. Acesse [vercel.com](https://vercel.com) e conecte sua conta do GitHub.
2. Clique em **"Add New"** > **"Project"**.
3. Importe o repositório do seu GitHub.
4. Nas configurações de build, a Vercel deve detectar automaticamente o **Vite**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Clique em **Deploy**.

---

Desenvolvido com ❤️ para facilitar seus sorteios!
