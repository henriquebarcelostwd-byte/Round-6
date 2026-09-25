# ROUND 6: THE LAST GAME

Jogo 2D completo em **Canvas + JavaScript puro** (sem dependências, sem build), inspirado no universo de *Round 6 / Squid Game*.
Mistura **top-down** (dormitório, corredores, exploração, votações, fugas) e **side-view** (jogos, cutscenes), com transições
cinematográficas que mantêm o mesmo personagem.

> Obra de fã, sem afiliação com a Netflix ou com os criadores da série. Personagens principais são originais.

## Como jogar

**Arquivo único:** baixe `dist/round6.html` e abra no navegador — o jogo inteiro está dentro dele (funciona em computador e celular;
no celular, deixe o aparelho na horizontal: aparecem joystick e botões na tela). Para regerar: `node tools/bundle.js`.

Ou abra `index.html` junto com as pastas `js/` e `css/` num navegador moderno (Chrome, Edge, Firefox). Se o navegador bloquear arquivos locais, sirva a pasta:

```bash
python3 -m http.server 8000   # depois abra http://localhost:8000
```

### Controles

| Tecla | Ação |
|---|---|
| WASD / setas | mover · navegar menus |
| SHIFT | correr / esquivar |
| E | interagir, falar, pegar itens |
| ESPAÇO / ENTER | ação, pular, confirmar |
| J · K · L | soco · chute · agarrar |
| I | bloquear |
| C | agachar / furtivo |
| Q | ação alternativa (varia por jogo) |
| TAB | relações (dormitório) |
| 5–8 | emotes no dormitório (compráveis na loja) |
| ESC / P | pausa (nas cutscenes: **segure ESC** para pular, **P** pausa) |
| F3 | contador de FPS |
| Toque | joystick à esquerda, botões ESPAÇO/E/SHIFT/Q à direita, II pausa, ESC pular/voltar |

## Conteúdo

- **Menu principal animado** (dormitório com beliches, porquinho enchendo de dinheiro, guardas, jogadores, luzes):
  JOGAR · CONTINUAR · NOVO JOGO · SELEÇÃO DE TEMPORADA · SELEÇÃO DE JOGO · DESAFIOS EXTRAS · LOJA · GALERIA · CONFIGURAÇÕES · CRÉDITOS.
- **Criação de personagem**: nome, número (1–456), corpo, idade, pele, cabelo e cor, altura, porte, óculos, barba, marca, roupa
  civil. Dentro dos jogos o uniforme verde com número é obrigatório.
- **456 participantes** gerados com nome, número, personalidade, atributos (coragem, inteligência, força, velocidade, confiança,
  medo, lealdade, traição), relações, memória do que você fez e habilidades.
- **Campanha em 3 temporadas** com cutscenes, dormitório explorável, eventos aleatórios, motim noturno, votações O/X reais e
  escolhas com consequências:
  - T1: Ddakji, Batatinha Frita 1-2-3, Dalgona, Cabo de Guerra, Bolinhas de Gude, Ponte de Vidro, Squid Game.
  - T2: Pão ou Loteria, Pedra-Papel-Tesoura Menos Um (+ evento cinematográfico), Batatinha Frita, Seis Pernas
    (Ddakji, Bisseokchigi, Gonggi, Pião, Jegi), Mingle, A Revolta.
  - T3: Esconde-Esconde, Pular Corda, Sky Squid Game, jantar final, vitória, **A Fuga** (rotas A túnel, B elevador, C e D secretas).
- **7 finais**: Vitória, Fuga, Sacrifício, Segredo, Dark, Vida Comum, Êxodo — cada um com cutscene própria, seguido da tela
  WINNER, despedida e créditos com cenas do jogo ao fundo.
- **Prêmio**: ₩100.000.000 por eliminado, porquinho e HUD (PRIZE MONEY / PLAYERS ALIVE).
- **Dificuldades** Normal, Difícil e Extremo. **Checkpoints** automáticos a cada capítulo (localStorage), com
  "tentar novamente" após a derrota.
- **Desafios extras**: 10 variantes dos jogos oficiais + 5 jogos originais marcados como EXTRA
  (Clock Run, Color Rooms, Number Hunt, Falling Tiles, Freeze Challenge).
- **Loja** de cosméticos (sem vantagem de jogo) comprados com fichas: roupas para os extras, animações de vitória, rastros,
  números especiais, emotes, títulos, skins de interface, efeitos de vitória e trilhas sonoras.
- **Galeria**: personagens com atributos, finais (reveja as cutscenes), cenas desbloqueadas e estatísticas.
- Áudio 100% procedural (WebAudio) com música dinâmica por intensidade.

Dica: na tela SELEÇÃO DE JOGO, digite **4 5 6** para liberar todos os jogos e temporadas.

## Estrutura

```
index.html            carrega os scripts em ordem (namespace global window.R6)
js/core/              util, input, áudio, save, câmera, partículas, UI, engine (cenas e transições)
js/art/               personagens articulados (3 vistas), props, cenários side-view
js/world/             roster dos 456, estado da campanha, tilemap + A*, atores top-down
js/systems/           diálogo, cutscenes, eliminações, HUD, base dos jogos, furtividade
js/games/             os jogos da campanha e os extras
js/scenes/            dormitório, votações, história, campanha, finais, menus, criação, loja/galeria/pausa
tools/                testes automatizados com Playwright
```

## Testes

```bash
node tools/flow.js first 900        # joga a campanha inteira sozinho (menu → criação → … → créditos → menu)
node tools/flow.js random 900       # idem, com escolhas aleatórias (explora outros ramos)
node tools/flow.js first 600 3      # começa pela temporada 3
node tools/run.js '{"url":"index.html?game=glassbridge","steps":[{"wait":1500},{"shot":"ponte"}]}'
```

Atalhos de depuração no console: `R6.debug.play('mingle')`, `R6.debug.chapter('h1_vote')`, `R6.debug.win()`,
`R6.debug.lose()`. A URL `index.html?game=ID&mode=practice&variant=...` abre um jogo direto.
